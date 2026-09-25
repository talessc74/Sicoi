/**
 * Motor do Grafo de Conhecimento Forense (§16), agora server-side e persistido.
 *
 * Substitui src/services/graphEngine.ts (cálculo client-side, efêmero, com uma lista
 * de propriedades escolhidas a dedo). Princípio central: se um dado foi coletado em
 * qualquer fase e está no banco, ele deve aparecer no grafo — então, em vez de listar
 * campo por campo, cada nó de "formulário" (A.1, A.2, caixa, assinatura, evento de
 * custódia...) herda TODAS as chaves do registro de origem como `properties`. Um campo
 * novo adicionado a uma fase (ex.: quando os apêndices do POP-02 definirem "região" ou
 * "completude da caixa") aparece automaticamente no grafo na próxima gravação, sem
 * precisar editar este arquivo — só a lista de *tipos* de entidade precisa de código novo.
 *
 * Dados legalmente restritos (§7 — legalOrigin) nunca entram no grafo, pela mesma regra
 * já aplicada em toda a aplicação.
 */
import type { PoolClient } from 'pg';
import type { GraphNode, GraphEdge, OsteologicalCollection } from '../src/types/sgccco';

/**
 * Remove o envelope FieldWithAiSuggestion<T> (`{ value, isAiSuggested, ... }`), preservando
 * o valor real. Detecta o envelope pelas chaves de metadado (isAiSuggested/transcriptSnippet/
 * confirmedByUser), não pela presença de `value` — um campo ainda não preenchido tem
 * `value: undefined`, e `undefined` some da serialização JSON antes mesmo de chegar aqui
 * (via fetch/JSON.stringify no cliente), então a chave `value` pode estar genuinamente
 * ausente do objeto sem deixar de ser um envelope.
 */
function unwrapFieldValues(record: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries(record)) {
    const isFieldWrapper =
      raw && typeof raw === 'object' && !Array.isArray(raw) && ('isAiSuggested' in raw || 'transcriptSnippet' in raw || 'confirmedByUser' in raw);
    if (isFieldWrapper) {
      out[key] = 'value' in raw ? raw.value ?? null : null;
    } else {
      out[key] = raw;
    }
  }
  return out;
}

function nodeFromRecord(id: string, type: GraphNode['type'], label: string, record: Record<string, any>): GraphNode {
  return { id, type, label, properties: unwrapFieldValues(record) };
}

function edge(
  id: string,
  source: string,
  target: string,
  relation: GraphEdge['relation'],
  provenance: GraphEdge['provenance']
): GraphEdge {
  return { id, source, target, relation, confidence: 'EXTRACTED', provenance };
}

/** Constrói nós e arestas do grafo forense para um único conjunto (usado tanto na sincronização quanto em testes). */
export function computeGraphForCollection(col: OsteologicalCollection): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const addNode = (node: GraphNode) => {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
  };

  const nic = col.nic;

  // 1. Conjunto (NIC) — só metadados não-restritos; legalOrigin nunca entra no grafo.
  addNode({
    id: nic,
    type: 'nic',
    label: nic,
    properties: {
      nic: col.nic,
      currentPhase: col.currentPhase,
      createdAt: col.createdAt,
      createdByTechnician: col.createdByTechnician
    }
  });

  // 2. Formulário A.1 (Fase 1) — todo campo do A.1 vira propriedade, genericamente.
  const { preliminaryBoxes, photos: phase1Photos, ...phase1Fields } = col.phase1;
  const a1NodeId = `A1-${nic}`;
  addNode(nodeFromRecord(a1NodeId, 'formulario_a1', `Formulário A.1 — ${nic}`, phase1Fields));
  edges.push(edge(`e-${nic}-${a1NodeId}`, nic, a1NodeId, 'tem_formulario_a1', {
    recordId: nic,
    field: 'phase1',
    version: 1,
    createdAt: col.createdAt
  }));

  // 3. Formulário A.2 (Fase 2)
  const { photos: phase2Photos, ...phase2Fields } = col.phase2;
  const a2NodeId = `A2-${nic}`;
  addNode(nodeFromRecord(a2NodeId, 'formulario_a2', `Formulário A.2 — ${nic}`, phase2Fields));
  edges.push(edge(`e-${nic}-${a2NodeId}`, nic, a2NodeId, 'tem_formulario_a2', {
    recordId: nic,
    field: 'phase2',
    version: 1,
    createdAt: col.createdAt
  }));

  // 4. Caixas (número de caixa, status, localização atual — Fase 1)
  preliminaryBoxes.forEach((box) => {
    const boxNodeId = `BOX-${box.id}`;
    addNode(nodeFromRecord(boxNodeId, 'caixa', box.boxCode, box));
    edges.push(edge(`e-${nic}-${boxNodeId}`, nic, boxNodeId, 'contem_caixa', {
      recordId: box.id,
      field: 'phase1.preliminaryBoxes',
      version: 1,
      createdAt: col.createdAt
    }));
  });

  // 5. Fotos (A.1 e A.2)
  const allPhotos = [
    ...phase1Photos.map((p) => ({ photo: p, sourceNode: a1NodeId, field: 'phase1.photos' })),
    ...phase2Photos.map((p) => ({ photo: p, sourceNode: a2NodeId, field: 'phase2.photos' }))
  ];
  allPhotos.forEach(({ photo, sourceNode, field }) => {
    const photoNodeId = `FOTO-${photo.id}`;
    addNode(nodeFromRecord(photoNodeId, 'foto', `Foto ${photo.category}`, photo));
    edges.push(edge(`e-${sourceNode}-${photoNodeId}`, sourceNode, photoNodeId, 'tem_foto', {
      recordId: photo.id,
      field,
      version: 1,
      createdAt: photo.timestamp || col.createdAt
    }));
  });

  // 6. Localização física (Fase 3 provisória ou Fase 6 definitiva)
  if (col.phase6?.finalLocations && col.phase6.finalLocations.length > 0) {
    col.phase6.finalLocations.forEach((loc, idx) => {
      const locNodeId = `LOC-DEF-${nic}-${idx}`;
      addNode(nodeFromRecord(locNodeId, 'localizacao', `${loc.location.facility} · ${loc.location.rack} · ${loc.location.shelf}`, {
        ...loc.location,
        type: 'definitivo',
        storedAt: loc.storedAt
      }));
      edges.push(edge(`e-${nic}-${locNodeId}`, nic, locNodeId, 'armazenado_em', {
        recordId: nic,
        field: 'phase6.finalLocations',
        version: 1,
        createdAt: loc.storedAt || col.createdAt
      }));
    });
  } else if (col.phase3?.boxLocations && col.phase3.boxLocations.length > 0) {
    col.phase3.boxLocations.forEach((bloc, idx) => {
      const locNodeId = `LOC-PROV-${nic}-${idx}`;
      addNode(nodeFromRecord(locNodeId, 'localizacao', `Provisório · ${bloc.location.room} · ${bloc.location.rack}`, {
        ...bloc.location,
        type: 'provisorio',
        allocatedAt: bloc.allocatedAt,
        placedAt: bloc.placedAt
      }));
      edges.push(edge(`e-${nic}-${locNodeId}`, nic, locNodeId, 'armazenado_em', {
        recordId: nic,
        field: 'phase3.boxLocations',
        version: 1,
        createdAt: bloc.placedAt || bloc.allocatedAt || col.createdAt
      }));
    });
  }

  // 7. Indivíduos, elementos, patologias, exames (Fase 4/5) — mantidos como antes,
  // portados do graphEngine.ts client-side original.
  if (col.phase4?.individuals) {
    col.phase4.individuals.forEach((ind) => {
      const indNodeId = `${nic}-${ind.code}`;
      addNode(nodeFromRecord(indNodeId, 'individuo', `${nic} / ${ind.code}`, {
        code: ind.code,
        confidence: ind.confidence,
        sexEstimate: ind.biologicalProfile.sexEstimate.value,
        ageCategory: ind.biologicalProfile.ageCategory.value,
        statureCm: ind.biologicalProfile.statureCm.estimatedValue,
        diagnosticElement: ind.nmiDiagnosticElement
      }));
      edges.push(edge(`e-${nic}-${indNodeId}`, nic, indNodeId, 'possui_individuo', {
        recordId: ind.id,
        field: 'phase4.individuals',
        version: col.phase4.curationVersionNumber,
        createdAt: col.createdAt
      }));

      const methodSexId = `METH-${ind.biologicalProfile.sexEstimate.methodCode.replace(/\s+/g, '_')}`;
      addNode(nodeFromRecord(methodSexId, 'metodo', ind.biologicalProfile.sexEstimate.methodCode, {
        category: 'Estimativa de Sexo',
        ref: ind.biologicalProfile.sexEstimate.bibliographicRef
      }));
      edges.push(edge(`e-${indNodeId}-${methodSexId}`, indNodeId, methodSexId, 'analisado_por_metodo', {
        recordId: ind.id,
        field: 'biologicalProfile.sexEstimate.methodCode',
        version: col.phase4.curationVersionNumber,
        createdAt: col.createdAt
      }));

      const methodStatureId = `METH-${ind.biologicalProfile.statureCm.methodCode.replace(/\s+/g, '_')}`;
      addNode(nodeFromRecord(methodStatureId, 'metodo', ind.biologicalProfile.statureCm.methodCode, {
        category: 'Estimativa de Estatura',
        ref: ind.biologicalProfile.statureCm.bibliographicRef
      }));
      edges.push(edge(`e-${indNodeId}-${methodStatureId}`, indNodeId, methodStatureId, 'analisado_por_metodo', {
        recordId: ind.id,
        field: 'biologicalProfile.statureCm.methodCode',
        version: col.phase4.curationVersionNumber,
        createdAt: col.createdAt
      }));
    });
  }

  if (col.phase4?.skeletalElements) {
    col.phase4.skeletalElements.forEach((elem) => {
      const elemNodeId = `ELEM-${nic}-${elem.anatomicalCode}`;
      addNode(nodeFromRecord(elemNodeId, 'elemento', elem.namePt, {
        code: elem.anatomicalCode,
        region: elem.region,
        side: elem.side,
        presence: elem.presence,
        preservation: elem.preservationQuality
      }));
      const parentId = elem.associatedIndividualId ? `${nic}-IND-01` : nic;
      edges.push(edge(`e-${parentId}-${elemNodeId}`, parentId, elemNodeId, 'contem_elemento', {
        recordId: elem.id,
        field: 'phase4.skeletalElements',
        version: col.phase4.curationVersionNumber,
        createdAt: col.createdAt
      }));
    });
  }

  if (col.phase5?.pathologies) {
    col.phase5.pathologies.forEach((p) => {
      const pathNodeId = `PATH-${p.id}`;
      const rawLabel = p.taxonomyLabel || p.termControlled || p.taxonomyCode || 'Patologia';
      addNode(nodeFromRecord(pathNodeId, 'patologia', rawLabel.split('-')[0].trim() || 'Patologia', {
        code: p.taxonomyCode || p.category,
        location: p.anatomicLocationOnBone || p.associatedElementCode,
        timing: p.timingEstimate,
        description: p.description || p.notes
      }));
      const targetIndNodeId = `${nic}-IND-01`;
      edges.push(edge(`e-${targetIndNodeId}-${pathNodeId}`, targetIndNodeId, pathNodeId, 'apresenta_patologia', {
        recordId: p.id,
        field: 'phase5.pathologies',
        version: 1,
        createdAt: col.createdAt
      }));
    });
  }

  const examsList = col.phase5?.complementaryExams || col.phase5?.exams || [];
  examsList.forEach((ex: any) => {
    const examNodeId = `EXAM-${ex.id}`;
    addNode(nodeFromRecord(examNodeId, 'exame', `Tomografia CT (${ex.fileName})`, {
      modality: ex.modalityCode || 'CT',
      date: ex.date || col.createdAt
    }));
    const targetIndNodeId = `${nic}-IND-01`;
    edges.push(edge(`e-${targetIndNodeId}-${examNodeId}`, targetIndNodeId, examNodeId, 'possui_exame', {
      recordId: ex.id,
      field: 'phase5.exams',
      version: 1,
      createdAt: ex.date || col.createdAt
    }));
  });

  // 8. Assinaturas — cobre "responsáveis" e "datas".
  col.signatures.forEach((sig) => {
    const sigNodeId = `SIG-${nic}-${sig.phaseNumber}-${sig.signedAt}`;
    addNode(nodeFromRecord(sigNodeId, 'assinatura', `${sig.signedByName} · Fase ${sig.phaseNumber}`, sig));
    edges.push(edge(`e-${nic}-${sigNodeId}`, nic, sigNodeId, 'assinado_por', {
      recordId: sigNodeId,
      field: 'signatures',
      version: 1,
      createdAt: sig.signedAt
    }));
  });

  // 9. Cadeia de custódia — cobre "onde está arquivado" e "consultas" (purpose = consulta_pesquisa).
  col.custodyChain.forEach((event) => {
    const eventNodeId = `CUSTODY-${event.id}`;
    addNode(nodeFromRecord(eventNodeId, 'evento_custodia', `${event.sourceLocation} → ${event.targetLocation}`, event));
    edges.push(edge(`e-${nic}-${eventNodeId}`, nic, eventNodeId, 'evento_de_custodia', {
      recordId: event.id,
      field: 'custodyChain',
      version: 1,
      createdAt: event.timestamp
    }));
  });

  return { nodes, edges };
}

/**
 * Sincroniza o grafo persistido de um conjunto — delete+insert completo por NIC,
 * dentro da mesma transação de createCollection/saveCollection. Seguro porque o
 * grafo é inteiramente derivado (nunca é a fonte de verdade de nada).
 */
export async function syncGraphForCollection(client: PoolClient, collection: OsteologicalCollection): Promise<void> {
  const { nodes, edges } = computeGraphForCollection(collection);

  await client.query('DELETE FROM graph_nodes WHERE nic = $1', [collection.nic]);

  for (const node of nodes) {
    // Nós de vocabulário compartilhado (ex.: método de estimativa) não pertencem a um
    // único conjunto — ficam com nic NULL para nunca serem apagados pelo DELETE acima
    // quando outro conjunto que os referencia for salvo de novo.
    const nodeNic = node.type === 'metodo' ? null : collection.nic;
    await client.query(
      `INSERT INTO graph_nodes (id, nic, node_type, label, properties, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (id) DO UPDATE SET
         node_type = EXCLUDED.node_type,
         label = EXCLUDED.label,
         properties = EXCLUDED.properties,
         updated_at = now()`,
      [node.id, nodeNic, node.type, node.label, JSON.stringify(node.properties)]
    );
  }

  for (const e of edges) {
    await client.query(
      `INSERT INTO graph_edges (id, nic, source_id, target_id, relation, confidence, provenance, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (id) DO UPDATE SET
         source_id = EXCLUDED.source_id,
         target_id = EXCLUDED.target_id,
         relation = EXCLUDED.relation,
         confidence = EXCLUDED.confidence,
         provenance = EXCLUDED.provenance,
         updated_at = now()`,
      [e.id, collection.nic, e.source, e.target, e.relation, e.confidence, JSON.stringify(e.provenance)]
    );
  }
}
