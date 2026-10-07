import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { createCollection } from '../collectionsRepo';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import type { OsteologicalCollection, IndividualHypothesis } from '../../src/types/sgccco';
import { findSimilarIndividuals } from '../individualReferenceSearch';

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
      sexEstimate: { value: 'feminino', methodCode: 'metodo-a', bibliographicRef: 'x', notes: '' },
      ageCategory: { value: 'adulto_medio', estimatedRangeYears: '30-40', methodCode: 'metodo-b', bibliographicRef: 'x' },
      statureCm: { estimatedValue: 160, methodCode: 'x', bibliographicRef: 'x' },
      ancestryIndication: { traitsObserved: '', methodCode: 'x', bibliographicRef: 'x' }
    },
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

describe('individualReferenceSearch', () => {
  it('encontra indivíduo de outro conjunto com mesmo sexo e mesmo método de estimativa', async () => {
    const col1 = baseCollection('NIC-REF-0001');
    const reference = individual();
    col1.phase4.individuals = [reference];
    await createCollection(pool, col1);

    const col2 = baseCollection('NIC-REF-0002');
    const match = individual();
    col2.phase4.individuals = [match];
    await createCollection(pool, col2);

    const results = await findSimilarIndividuals(pool, 'NIC-REF-0001', reference.id, reference.biologicalProfile);
    expect(results).toHaveLength(1);
    expect(results[0].nic).toBe('NIC-REF-0002');
    expect(results[0].sharedTraits.length).toBeGreaterThan(0);
    expect(results[0].sharedTraits[0]).toContain('Sexo estimado');
  });

  it('não casa quando o valor é igual mas o método de estimativa é diferente', async () => {
    const col1 = baseCollection('NIC-REF-0003');
    const reference = individual();
    col1.phase4.individuals = [reference];
    await createCollection(pool, col1);

    const col2 = baseCollection('NIC-REF-0004');
    const differentMethod = individual({
      biologicalProfile: {
        ...individual().biologicalProfile,
        sexEstimate: { value: 'feminino', methodCode: 'metodo-outro', bibliographicRef: 'x', notes: '' },
        ageCategory: { value: 'jovem', estimatedRangeYears: '18-25', methodCode: 'metodo-outro', bibliographicRef: 'x' }
      }
    });
    col2.phase4.individuals = [differentMethod];
    await createCollection(pool, col2);

    const results = await findSimilarIndividuals(pool, 'NIC-REF-0003', reference.id, reference.biologicalProfile);
    expect(results).toHaveLength(0);
  });

  it('nunca inclui o próprio indivíduo de referência no resultado', async () => {
    const col = baseCollection('NIC-REF-0005');
    const reference = individual();
    col.phase4.individuals = [reference];
    await createCollection(pool, col);

    const results = await findSimilarIndividuals(pool, 'NIC-REF-0005', reference.id, reference.biologicalProfile);
    expect(results).toHaveLength(0);
  });

  it('limita a 20 resultados mesmo com mais indivíduos compatíveis no acervo', async () => {
    const reference = individual();
    const refCol = baseCollection('NIC-REF-LIMIT-REFERENCE');
    refCol.phase4.individuals = [reference];
    await createCollection(pool, refCol);

    for (let i = 0; i < 25; i++) {
      const col = baseCollection(`NIC-REF-LIMIT-${String(i).padStart(3, '0')}`);
      col.phase4.individuals = [individual()];
      await createCollection(pool, col);
    }

    const results = await findSimilarIndividuals(pool, 'NIC-REF-LIMIT-REFERENCE', reference.id, reference.biologicalProfile);
    expect(results).toHaveLength(20);
  });
});
