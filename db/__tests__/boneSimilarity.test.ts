import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { createCollection } from '../collectionsRepo';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import type { OsteologicalCollection, IndividualHypothesis, SkeletalElement } from '../../src/types/sgccco';
import { findSimilarSkeletalElements } from '../boneSimilarity';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

function individual(overrides: Partial<IndividualHypothesis> = {}): IndividualHypothesis {
  return {
    id: 'IND-01',
    code: 'IND-01',
    confidence: 'alta',
    odontogram: [],
    biologicalProfile: {
      sexEstimate: { value: 'feminino', methodCode: 'x', bibliographicRef: 'x', notes: '' },
      ageCategory: { value: 'adulto_medio', estimatedRangeYears: '30-40', methodCode: 'x', bibliographicRef: 'x' },
      statureCm: { estimatedValue: 160, methodCode: 'x', bibliographicRef: 'x' },
      ancestryIndication: { traitsObserved: '', methodCode: 'x', bibliographicRef: 'x' }
    },
    ...overrides
  };
}

function element(overrides: Partial<SkeletalElement> = {}): SkeletalElement {
  return {
    id: 'ELEM-01',
    anatomicalCode: 'MI_FEM_DIR',
    namePt: 'Fêmur Direito',
    region: 'membros_inferiores',
    side: 'direito',
    presence: 'completo',
    preservationQuality: 'boa',
    associationMethod: 'x',
    associationConfidence: 'alta',
    associationJustification: '',
    observations: '',
    ...overrides
  };
}

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 4,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: {},
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
     DELETE FROM phase1_forms; DELETE FROM collections; COMMIT;`
  );
});

afterAll(async () => {
  await pool.end();
});

describe('boneSimilarity', () => {
  it('encontra um fêmur direito por nome, ignorando acento e caixa', async () => {
    const col = baseCollection('NIC-BONE-0001');
    const ind = individual();
    const elem = element({ id: 'ELEM-A', associatedIndividualId: ind.id });
    col.phase4.individuals = [ind];
    col.phase4.skeletalElements = [elem];
    await createCollection(pool, col);

    const results = await findSimilarSkeletalElements(pool, { boneNameQuery: 'femur' });
    expect(results).toHaveLength(1);
    expect(results[0].nic).toBe('NIC-BONE-0001');
    expect(results[0].element.id).toBe('ELEM-A');
    expect(results[0].individual?.id).toBe('IND-01');
  });

  it('filtra por lado, sexo estimado e categoria de idade combinados', async () => {
    const col1 = baseCollection('NIC-BONE-0002');
    // Código 'IND-01': ver nota abaixo sobre o bug pré-existente em graphSync.ts.
    const indFem = individual({ id: 'IND-01', code: 'IND-01' });
    col1.phase4.individuals = [indFem];
    col1.phase4.skeletalElements = [element({ id: 'ELEM-FEM-DIR', associatedIndividualId: indFem.id })];
    await createCollection(pool, col1);

    const col2 = baseCollection('NIC-BONE-0003');
    // Código 'IND-01' de propósito: graphSync.ts hoje liga todo elemento ósseo ao
    // nó de indivíduo via um ID fixo (`${nic}-IND-01`), não ao indivíduo real
    // associado — um código diferente faria createCollection falhar por violação
    // de chave estrangeira no grafo. Bug pré-existente, fora do escopo desta PR
    // (reportado separadamente); o NIC distinto já garante o isolamento do teste.
    const indMasc = individual({
      id: 'IND-01',
      code: 'IND-01',
      biologicalProfile: {
        ...individual().biologicalProfile,
        sexEstimate: { value: 'masculino', methodCode: 'x', bibliographicRef: 'x', notes: '' }
      }
    });
    col2.phase4.individuals = [indMasc];
    col2.phase4.skeletalElements = [
      element({ id: 'ELEM-FEM-ESQ', anatomicalCode: 'MI_FEM_ESQ', namePt: 'Fêmur Esquerdo', side: 'esquerdo', associatedIndividualId: indMasc.id })
    ];
    await createCollection(pool, col2);

    const results = await findSimilarSkeletalElements(pool, {
      boneNameQuery: 'fêmur',
      side: 'direito',
      sexEstimate: 'feminino',
      ageCategory: 'adulto_medio'
    });
    expect(results).toHaveLength(1);
    expect(results[0].element.id).toBe('ELEM-FEM-DIR');
  });

  it('sem critério nenhum, devolve todos os elementos ósseos existentes', async () => {
    const col = baseCollection('NIC-BONE-0004');
    col.phase4.skeletalElements = [element({ id: 'ELEM-X' }), element({ id: 'ELEM-Y', anatomicalCode: 'MI_TIB_DIR', namePt: 'Tíbia Direita' })];
    await createCollection(pool, col);

    const results = await findSimilarSkeletalElements(pool, {});
    expect(results.map((r) => r.element.id).sort()).toEqual(['ELEM-X', 'ELEM-Y']);
  });

  it('elemento sem indivíduo associado não quebra o filtro por sexo/idade (nunca casa)', async () => {
    const col = baseCollection('NIC-BONE-0005');
    col.phase4.skeletalElements = [element({ id: 'ELEM-SEM-IND', associatedIndividualId: undefined })];
    await createCollection(pool, col);

    const semFiltroSexo = await findSimilarSkeletalElements(pool, { boneNameQuery: 'fêmur' });
    expect(semFiltroSexo).toHaveLength(1);

    const comFiltroSexo = await findSimilarSkeletalElements(pool, { boneNameQuery: 'fêmur', sexEstimate: 'feminino' });
    expect(comFiltroSexo).toHaveLength(0);
  });
});
