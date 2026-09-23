import { OsteologicalCollection, GraphNode, GraphEdge } from '../types/sgccco';

/**
 * Motor do Grafo de Conhecimento Forense (§16).
 * Constrói nós e arestas estritamente rastreáveis com proveniência de registro para cada elo.
 */
export function buildForensicKnowledgeGraph(collections: OsteologicalCollection[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Set<string>();

  const addNode = (node: GraphNode) => {
    if (!nodeMap.has(node.id)) {
      nodeMap.add(node.id);
      nodes.push(node);
    }
  };

  collections.forEach(col => {
    // 1. Nó do Conjunto (NIC)
    const nicNodeId = col.nic;
    addNode({
      id: nicNodeId,
      label: col.nic,
      type: 'nic',
      properties: {
        nic: col.nic,
        currentPhase: col.currentPhase,
        originInstitution: col.legalOrigin.originInstitution,
        presumedIndividualsCount: col.phase1.preliminaryBoxes.length,
        createdAt: col.createdAt
      }
    });

    // 2. Caixas da Fase 1
    col.phase1.preliminaryBoxes.forEach(box => {
      const boxNodeId = `BOX-${box.id}`;
      addNode({
        id: boxNodeId,
        label: box.boxCode,
        type: 'caixa',
        properties: {
          code: box.boxCode,
          status: box.cleaningStatus,
          presumedIndividual: box.presumedIndividualLabel
        }
      });

      edges.push({
        id: `e-${col.nic}-${boxNodeId}`,
        source: col.nic,
        target: boxNodeId,
        relation: 'armazenado_em',
        provenance: {
          recordId: box.id,
          field: 'phase1.preliminaryBoxes',
          version: 1,
          createdAt: col.createdAt
        }
      });
    });

    // 3. Localização Física (Fase 3 ou Fase 6)
    if (col.phase6.finalLocations && col.phase6.finalLocations.length > 0) {
      col.phase6.finalLocations.forEach((loc, idx) => {
        const locNodeId = `LOC-DEF-${col.nic}-${idx}`;
        const locLabel = `${loc.location.facility} · ${loc.location.rack} · ${loc.location.shelf}`;
        addNode({
          id: locNodeId,
          label: locLabel,
          type: 'localizacao',
          properties: {
            facility: loc.location.facility,
            room: loc.location.room,
            rack: loc.location.rack,
            shelf: loc.location.shelf,
            type: 'definitivo'
          }
        });

        edges.push({
          id: `e-${col.nic}-${locNodeId}`,
          source: col.nic,
          target: locNodeId,
          relation: 'armazenado_em',
          provenance: {
            recordId: col.nic,
            field: 'phase6.finalLocations',
            version: 1,
            createdAt: loc.storedAt || col.createdAt
          }
        });
      });
    } else if (col.phase3.boxLocations && col.phase3.boxLocations.length > 0) {
      col.phase3.boxLocations.forEach((bloc, idx) => {
        const locNodeId = `LOC-PROV-${col.nic}-${idx}`;
        const locLabel = `Provisório · ${bloc.location.room} · ${bloc.location.rack}`;
        addNode({
          id: locNodeId,
          label: locLabel,
          type: 'localizacao',
          properties: {
            facility: bloc.location.facility,
            room: bloc.location.room,
            rack: bloc.location.rack,
            shelf: bloc.location.shelf,
            type: 'provisorio'
          }
        });

        edges.push({
          id: `e-${col.nic}-${locNodeId}`,
          source: col.nic,
          target: locNodeId,
          relation: 'armazenado_em',
          provenance: {
            recordId: col.nic,
            field: 'phase3.boxLocations',
            version: 1,
            createdAt: bloc.placedAt || bloc.allocatedAt || col.createdAt
          }
        });
      });
    }

    // 4. Indivíduos (Fase 4)
    if (col.phase4.individuals) {
      col.phase4.individuals.forEach(ind => {
        const indNodeId = `${col.nic}-${ind.code}`;
        addNode({
          id: indNodeId,
          label: `${col.nic} / ${ind.code}`,
          type: 'individuo',
          properties: {
            code: ind.code,
            confidence: ind.confidence,
            sexEstimate: ind.biologicalProfile.sexEstimate.value,
            ageCategory: ind.biologicalProfile.ageCategory.value,
            statureCm: ind.biologicalProfile.statureCm.estimatedValue,
            diagnosticElement: ind.mniDiagnosticElement
          }
        });

        edges.push({
          id: `e-${col.nic}-${indNodeId}`,
          source: col.nic,
          target: indNodeId,
          relation: 'possui_individuo',
          provenance: {
            recordId: ind.id,
            field: 'phase4.individuals',
            version: col.phase4.curationVersionNumber,
            createdAt: col.createdAt
          }
        });

        // 4.1 Métodos Utilizados
        const methodSexId = `METH-${ind.biologicalProfile.sexEstimate.methodCode.replace(/\s+/g, '_')}`;
        addNode({
          id: methodSexId,
          label: ind.biologicalProfile.sexEstimate.methodCode,
          type: 'metodo',
          properties: {
            category: 'Estimativa de Sexo',
            ref: ind.biologicalProfile.sexEstimate.bibliographicRef
          }
        });

        edges.push({
          id: `e-${indNodeId}-${methodSexId}`,
          source: indNodeId,
          target: methodSexId,
          relation: 'analisado_por_metodo',
          provenance: {
            recordId: ind.id,
            field: 'biologicalProfile.sexEstimate.methodCode',
            version: col.phase4.curationVersionNumber,
            createdAt: col.createdAt
          }
        });

        const methodStatureId = `METH-${ind.biologicalProfile.statureCm.methodCode.replace(/\s+/g, '_')}`;
        addNode({
          id: methodStatureId,
          label: ind.biologicalProfile.statureCm.methodCode,
          type: 'metodo',
          properties: {
            category: 'Estimativa de Estatura',
            ref: ind.biologicalProfile.statureCm.bibliographicRef
          }
        });

        edges.push({
          id: `e-${indNodeId}-${methodStatureId}`,
          source: indNodeId,
          target: methodStatureId,
          relation: 'analisado_por_metodo',
          provenance: {
            recordId: ind.id,
            field: 'biologicalProfile.statureCm.methodCode',
            version: col.phase4.curationVersionNumber,
            createdAt: col.createdAt
          }
        });
      });
    }

    // 4.2 Elementos Ósseos (Fase 4)
    if (col.phase4.skeletalElements) {
      col.phase4.skeletalElements.forEach(elem => {
        const elemNodeId = `ELEM-${col.nic}-${elem.anatomicalCode}`;
        addNode({
          id: elemNodeId,
          label: elem.namePt,
          type: 'elemento',
          properties: {
            code: elem.anatomicalCode,
            region: elem.region,
            side: elem.side,
            presence: elem.presence,
            preservation: elem.preservationQuality
          }
        });

        // Conecta ao indivíduo associado ou ao conjunto
        const parentId = elem.associatedIndividualId
          ? `${col.nic}-IND-01`
          : col.nic;

        edges.push({
          id: `e-${parentId}-${elemNodeId}`,
          source: parentId,
          target: elemNodeId,
          relation: 'contem_elemento',
          provenance: {
            recordId: elem.id,
            field: 'phase4.skeletalElements',
            version: col.phase4.curationVersionNumber,
            createdAt: col.createdAt
          }
        });
      });
    }

    // 5. Patologias (Fase 5)
    if (col.phase5.pathologies) {
      col.phase5.pathologies.forEach(p => {
        const pathNodeId = `PATH-${p.id}`;
        const rawLabel = p.taxonomyLabel || p.termControlled || p.taxonomyCode || 'Patologia';
        addNode({
          id: pathNodeId,
          label: rawLabel.split('-')[0].trim() || 'Patologia',
          type: 'patologia',
          properties: {
            code: p.taxonomyCode || p.category,
            location: p.anatomicLocationOnBone || p.associatedElementCode,
            timing: p.timingEstimate,
            description: p.description || p.notes
          }
        });

        const targetIndNodeId = `${col.nic}-IND-01`;
        edges.push({
          id: `e-${targetIndNodeId}-${pathNodeId}`,
          source: targetIndNodeId,
          target: pathNodeId,
          relation: 'apresenta_patologia',
          provenance: {
            recordId: p.id,
            field: 'phase5.pathologies',
            version: 1,
            createdAt: col.createdAt
          }
        });
      });
    }

    // 6. Exames complementares (Fase 5)
    const examsList = col.phase5.complementaryExams || col.phase5.exams || [];
    examsList.forEach(ex => {
      const examNodeId = `EXAM-${ex.id}`;
      addNode({
        id: examNodeId,
        label: `Tomografia CT (${ex.fileName})`,
        type: 'exame',
        properties: {
          modality: ex.modalityCode || 'CT',
          date: ex.date || col.createdAt
        }
      });

      const targetIndNodeId = `${col.nic}-IND-01`;
      edges.push({
        id: `e-${targetIndNodeId}-${examNodeId}`,
        source: targetIndNodeId,
        target: examNodeId,
        relation: 'possui_exame',
        provenance: {
          recordId: ex.id,
          field: 'phase5.exams',
          version: 1,
          createdAt: ex.date || col.createdAt
        }
      });
    });
  });

  return { nodes, edges };
}

export const buildKnowledgeGraph = buildForensicKnowledgeGraph;
