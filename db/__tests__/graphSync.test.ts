import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { createCollection, saveCollection } from '../collectionsRepo';
import { computeGraphForCollection } from '../graphSync';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import type { OsteologicalCollection } from '../../src/types/sgccco';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 1,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1: createEmptyPhase1Data(),
    phase2: createEmptyPhase2Data(),
    phase3: { boxLocations: [] },
    phase4: { curationVersionNumber: 1, curationVersionStatus: 'rascunho', curatorAuthor: 'x', individuals: [], skeletalElements: [] },
    phase5: {
      pathologies: [],
      complementaryExams: [],
      physicalBoneMarking: { techniqueUsed: 'x', completed: false, elementsMarkedCount: 0 },
      finalPackagingInertMaterial: { materialUsed: 'x', boxesCompletedCount: 0 },
      phase5Checklist: {
        pathologiesReviewed: false,
        examsAttached: false,
        finalPhotosRegistered: false,
        boneMarkingCompleted: false,
        inertPackagingCompleted: false
      }
    },
    phase6: { finalLocations: [], publicQrActive: false }
  } as unknown as OsteologicalCollection;
}

beforeAll(async () => {
  await runMigrations(pool);
});

beforeEach(async () => {
  await pool.query(
    `BEGIN; SET LOCAL sigcoi.allow_wipe = 'on'; DELETE FROM change_log; DELETE FROM pop_step_audit; DELETE FROM custody_chain; DELETE FROM signatures;
     DELETE FROM phase2_photos; DELETE FROM phase1_photos; DELETE FROM phase2_forms;
     DELETE FROM phase1_forms; DELETE FROM graph_edges; DELETE FROM graph_nodes; DELETE FROM collections; COMMIT;`
  );
});

afterAll(async () => {
  await pool.end();
});

describe('computeGraphForCollection', () => {
  it('gera um nó de formulário A.1 com TODO campo do phase1 como propriedade, sem lista fixa', () => {
    const col = baseCollection('NIC-GRAPH-0001');
    col.phase1.tipoMaterial = { value: ['ossos', 'dentes'], isAiSuggested: false };
    col.phase1.corSacoLavagem = { value: 'Azul', isAiSuggested: false };

    const { nodes } = computeGraphForCollection(col);
    const a1 = nodes.find((n) => n.id === 'A1-NIC-GRAPH-0001');
    expect(a1).toBeDefined();
    expect(a1!.properties.tipoMaterial).toEqual(['ossos', 'dentes']);
    expect(a1!.properties.corSacoLavagem).toBe('Azul');
    // Prova de generalidade: TODO campo declarado em Phase1Data aparece, sem seleção manual.
    expect(Object.keys(a1!.properties)).toEqual(expect.arrayContaining(Object.keys(col.phase1).filter((k) => k !== 'preliminaryBoxes' && k !== 'photos')));
  });

  it('gera um nó de caixa por preliminaryBoxes, ligado ao conjunto por contem_caixa', () => {
    const col = baseCollection('NIC-GRAPH-0002');
    col.phase1.preliminaryBoxes = [
      { id: 'box-1', boxCode: 'CX-001', presumedIndividualLabel: 'IND-01', currentLocation: 'Sala A', qrCode: 'qr-1' }
    ];

    const { nodes, edges } = computeGraphForCollection(col);
    const boxNode = nodes.find((n) => n.id === 'BOX-box-1');
    expect(boxNode?.type).toBe('caixa');
    expect(boxNode?.properties.boxCode).toBe('CX-001');

    const boxEdge = edges.find((e) => e.target === 'BOX-box-1');
    expect(boxEdge?.relation).toBe('contem_caixa');
    expect(boxEdge?.source).toBe('NIC-GRAPH-0002');
    expect(boxEdge?.confidence).toBe('EXTRACTED');
  });

  it('gera nós de assinatura e evento de custódia, cobrindo responsáveis/datas/consultas', () => {
    const col = baseCollection('NIC-GRAPH-0003');
    col.signatures = [
      {
        phaseNumber: 1,
        signedBy: 'usr-1',
        signedByName: 'Técnico X',
        signedByRole: 'tecnico',
        signedAt: '2026-01-01T10:00:00.000Z',
        sha256Hash: 'hash-1',
        status: 'locked'
      }
    ];
    col.custodyChain = [
      {
        id: 'cst-1',
        timestamp: '2026-01-02T10:00:00.000Z',
        sourceLocation: 'Galpão A',
        targetLocation: 'Sala de Consulta',
        carrierPerson: 'Fulano',
        receiverPerson: 'Pesquisadora Y',
        carrierSignatureHash: 'h1',
        receiverSignatureHash: 'h2',
        purpose: 'consulta_pesquisa',
        status: 'concluido',
        boxIds: ['box-1']
      }
    ];

    const { nodes, edges } = computeGraphForCollection(col);
    const sigNode = nodes.find((n) => n.type === 'assinatura');
    expect(sigNode?.properties.signedByName).toBe('Técnico X');
    expect(edges.some((e) => e.relation === 'assinado_por' && e.target === sigNode!.id)).toBe(true);

    const custodyNode = nodes.find((n) => n.type === 'evento_custodia');
    expect(custodyNode?.properties.purpose).toBe('consulta_pesquisa');
    expect(edges.some((e) => e.relation === 'evento_de_custodia' && e.target === custodyNode!.id)).toBe(true);
  });

  it('liga elemento/patologia/exame ao indivíduo real associado, não a um "IND-01" fixo', () => {
    const col = baseCollection('NIC-GRAPH-0004');
    col.phase4.individuals = [
      {
        id: 'ind-id-1',
        code: 'IND-01',
        confidence: 'alta',
        odontogram: [],
        biologicalProfile: {
          sexEstimate: { value: 'masculino', methodCode: 'x', bibliographicRef: 'x', notes: '' },
          ageCategory: { value: 'adulto_medio', estimatedRangeYears: '30-40', methodCode: 'x', bibliographicRef: 'x' },
          statureCm: { estimatedValue: 170, methodCode: 'x', bibliographicRef: 'x' },
          ancestryIndication: { traitsObserved: '', methodCode: 'x', bibliographicRef: 'x' }
        }
      },
      {
        id: 'ind-id-2',
        code: 'IND-02',
        confidence: 'alta',
        odontogram: [],
        biologicalProfile: {
          sexEstimate: { value: 'feminino', methodCode: 'x', bibliographicRef: 'x', notes: '' },
          ageCategory: { value: 'jovem', estimatedRangeYears: '18-25', methodCode: 'x', bibliographicRef: 'x' },
          statureCm: { estimatedValue: 160, methodCode: 'x', bibliographicRef: 'x' },
          ancestryIndication: { traitsObserved: '', methodCode: 'x', bibliographicRef: 'x' }
        }
      }
    ];
    col.phase4.skeletalElements = [
      {
        id: 'elem-1',
        anatomicalCode: 'MI_FEM_ESQ',
        namePt: 'Fêmur Esquerdo',
        region: 'membros_inferiores',
        side: 'esquerdo',
        presence: 'completo',
        preservationQuality: 'boa',
        associatedIndividualId: 'ind-id-2',
        associationMethod: 'x',
        associationConfidence: 'alta',
        associationJustification: '',
        observations: ''
      }
    ];
    col.phase5.pathologies = [{ id: 'path-1', individualId: 'ind-id-2', taxonomyLabel: 'Fratura antiga' } as any];
    col.phase5.complementaryExams = [
      {
        id: 'exam-1',
        individualId: 'ind-id-2',
        examType: 'tomografia_computadorizada_dicom',
        fileUrl: 'x',
        fileName: 'tc.dcm',
        parametersExtractedByMethodPrepop: { normalizedMethodName: 'x' }
      } as any
    ];

    const { edges } = computeGraphForCollection(col);
    const elemEdge = edges.find((e) => e.relation === 'contem_elemento');
    const pathEdge = edges.find((e) => e.relation === 'apresenta_patologia');
    const examEdge = edges.find((e) => e.relation === 'possui_exame');

    // Todos os três associados a IND-02 (ind-id-2) — nenhum deveria cair no IND-01.
    expect(elemEdge?.source).toBe('NIC-GRAPH-0004-IND-02');
    expect(pathEdge?.source).toBe('NIC-GRAPH-0004-IND-02');
    expect(examEdge?.source).toBe('NIC-GRAPH-0004-IND-02');
  });

  it('sem indivíduo associado (ou id que não existe), liga ao próprio nó do conjunto', () => {
    const col = baseCollection('NIC-GRAPH-0005');
    col.phase4.skeletalElements = [
      {
        id: 'elem-orfao',
        anatomicalCode: 'MI_TIB_DIR',
        namePt: 'Tíbia Direita',
        region: 'membros_inferiores',
        side: 'direito',
        presence: 'completo',
        preservationQuality: 'boa',
        associatedIndividualId: 'id-que-nao-existe',
        associationMethod: 'x',
        associationConfidence: 'alta',
        associationJustification: '',
        observations: ''
      }
    ];

    const { edges } = computeGraphForCollection(col);
    const elemEdge = edges.find((e) => e.relation === 'contem_elemento');
    expect(elemEdge?.source).toBe('NIC-GRAPH-0005');
  });
});

describe('syncGraphForCollection (via createCollection/saveCollection)', () => {
  it('persiste nós e arestas ao criar um conjunto, e atualiza (não duplica) ao salvar de novo', async () => {
    const col = baseCollection('NIC-GRAPH-0010');
    col.phase1.preliminaryBoxes = [
      { id: 'box-a', boxCode: 'CX-A', presumedIndividualLabel: 'IND-01', currentLocation: 'Sala A', qrCode: 'qr-a' }
    ];
    await createCollection(pool, col);

    const { rows: firstNodes } = await pool.query('SELECT id FROM graph_nodes WHERE nic = $1', [col.nic]);
    expect(firstNodes.length).toBeGreaterThan(0);
    expect(firstNodes.map((r) => r.id)).toEqual(expect.arrayContaining(['NIC-GRAPH-0010', 'A1-NIC-GRAPH-0010', 'A2-NIC-GRAPH-0010', 'BOX-box-a']));

    col.phase1.preliminaryBoxes[0].currentLocation = 'Sala B';
    await saveCollection(pool, col);

    const { rows: secondNodes } = await pool.query('SELECT id, node_type, properties FROM graph_nodes WHERE nic = $1', [col.nic]);
    expect(secondNodes).toHaveLength(firstNodes.length); // sem duplicação
    const boxRow = secondNodes.find((r) => r.id === 'BOX-box-a');
    expect(boxRow?.properties.currentLocation).toBe('Sala B'); // refletiu a atualização

    const { rows: edgeRows } = await pool.query('SELECT relation FROM graph_edges WHERE nic = $1', [col.nic]);
    expect(edgeRows.some((r) => r.relation === 'contem_caixa')).toBe(true);
  });
});
