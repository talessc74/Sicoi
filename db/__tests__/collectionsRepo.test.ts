import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import crypto from 'crypto';
import { runMigrations } from '../migrate';
import {
  listCollections,
  getCollection,
  createCollection,
  saveCollection,
  insertPhase4AssemblyPhotoMetadata,
  attachPhotoBytes,
  getPhotoFile
} from '../collectionsRepo';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import type { OsteologicalCollection } from '../../src/types/sgccco';
import { generateSignaturePayload } from '../../src/services/auditService';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

function serverSideSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 1,
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
     DELETE FROM phase4_photos; DELETE FROM phase2_photos; DELETE FROM phase1_photos; DELETE FROM phase2_forms;
     DELETE FROM phase1_forms; DELETE FROM collections; COMMIT;`
  );
});

afterAll(async () => {
  await pool.end();
});

describe('collectionsRepo', () => {
  it('cria e recupera um conjunto pelo NIC', async () => {
    const col = baseCollection('NIC-REPO-0001');
    await createCollection(pool, col);

    const loaded = await getCollection(pool, 'NIC-REPO-0001');
    expect(loaded?.nic).toBe('NIC-REPO-0001');
    expect(loaded?.createdByTechnician).toBe('Técnico de Teste');
  });

  it('lista os conjuntos criados, mais recentes primeiro', async () => {
    await createCollection(pool, baseCollection('NIC-REPO-0002'));
    await createCollection(pool, baseCollection('NIC-REPO-0003'));

    const list = await listCollections(pool);
    expect(list.map((c) => c.nic)).toEqual(expect.arrayContaining(['NIC-REPO-0002', 'NIC-REPO-0003']));
  });

  it('salva alterações de Fase 1 e reflete nas tabelas derivadas (phase1_forms)', async () => {
    const col = baseCollection('NIC-REPO-0004');
    await createCollection(pool, col);

    col.phase1.equipeEnvolvidaLimpeza = { value: 'Equipe Alfa', isAiSuggested: false };
    col.phase1.tipoMaterial = { value: ['ossos', 'dentes'], isAiSuggested: false };
    await saveCollection(pool, col);

    const { rows } = await pool.query('SELECT equipe_envolvida_limpeza, tipo_material FROM phase1_forms WHERE nic = $1', [
      'NIC-REPO-0004'
    ]);
    expect(rows[0].equipe_envolvida_limpeza).toBe('Equipe Alfa');
    expect(rows[0].tipo_material).toEqual(['ossos', 'dentes']);

    const reloaded = await getCollection(pool, 'NIC-REPO-0004');
    expect(reloaded?.phase1.equipeEnvolvidaLimpeza.value).toBe('Equipe Alfa');
  });

  it('grava as descrições de 1ª costela e patela da coleta genética em phase1_forms', async () => {
    const col = baseCollection('NIC-REPO-0010');
    await createCollection(pool, col);

    col.phase1.exameGenetico = { value: ['primeira_costela', 'patela'], isAiSuggested: false };
    col.phase1.geneticoPrimeiraCostelaDescricao = { value: 'Fragmento esternal da 1ª costela esquerda', isAiSuggested: false };
    col.phase1.geneticoPatelaDescricao = { value: 'Patela direita íntegra', isAiSuggested: false };
    await saveCollection(pool, col);

    const { rows } = await pool.query(
      'SELECT genetico_primeira_costela_descricao, genetico_patela_descricao FROM phase1_forms WHERE nic = $1',
      ['NIC-REPO-0010']
    );
    expect(rows[0].genetico_primeira_costela_descricao).toBe('Fragmento esternal da 1ª costela esquerda');
    expect(rows[0].genetico_patela_descricao).toBe('Patela direita íntegra');
  });

  it('salva conjuntos antigos, que não têm as descrições de 1ª costela e patela', async () => {
    const col = baseCollection('NIC-REPO-0011');
    delete (col.phase1 as any).geneticoPrimeiraCostelaDescricao;
    delete (col.phase1 as any).geneticoPatelaDescricao;
    await createCollection(pool, col);
    col.phase1.equipeEnvolvidaLimpeza = { value: 'Equipe Beta', isAiSuggested: false };
    await saveCollection(pool, col);

    const { rows } = await pool.query(
      'SELECT equipe_envolvida_limpeza, genetico_patela_descricao FROM phase1_forms WHERE nic = $1',
      ['NIC-REPO-0011']
    );
    expect(rows[0].equipe_envolvida_limpeza).toBe('Equipe Beta');
    expect(rows[0].genetico_patela_descricao).toBeNull();
  });

  it('rejeita uma assinatura cujo hash não confere com o payload recalculado no servidor', async () => {
    const col = baseCollection('NIC-REPO-0005');
    await createCollection(pool, col);

    col.signatures = [
      {
        phaseNumber: 1,
        signedBy: 'usr-1',
        signedByName: 'Técnico X',
        signedByRole: 'tecnico',
        signedAt: new Date().toISOString(),
        sha256Hash: 'hash-forjado-nao-corresponde-ao-payload',
        status: 'locked'
      }
    ];

    await expect(saveCollection(pool, col)).rejects.toThrow(/Assinatura inválida/);
  });

  it('aceita uma assinatura cujo hash confere com o payload canônico recalculado', async () => {
    const col = baseCollection('NIC-REPO-0006');
    await createCollection(pool, col);

    const timestamp = new Date().toISOString();
    const payload = generateSignaturePayload({
      nic: col.nic,
      phaseNumber: 1,
      signedBy: 'usr-1',
      role: 'tecnico',
      timestamp,
      dataSnapshotJson: JSON.stringify(col.phase1)
    });
    const validHash = serverSideSha256(payload);

    col.signatures = [
      {
        phaseNumber: 1,
        signedBy: 'usr-1',
        signedByName: 'Técnico X',
        signedByRole: 'tecnico',
        signedAt: timestamp,
        sha256Hash: validHash,
        status: 'locked'
      }
    ];

    await expect(saveCollection(pool, col)).resolves.not.toThrow();
    const { rows } = await pool.query('SELECT status FROM signatures WHERE nic = $1', ['NIC-REPO-0006']);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('locked');
  });

  it('registra a fotografia oficial de montagem da Fase 4 (metadado + bytes) e devolve os bytes reais depois', async () => {
    const col = baseCollection('NIC-REPO-0007');
    await createCollection(pool, col);

    const photoId = crypto.randomUUID();
    const photo = {
      id: photoId,
      category: 'montagem_completa',
      url: `/api/collections/NIC-REPO-0007/photos/${photoId}/file`,
      sha256Hash: serverSideSha256('bytes-da-foto-de-montagem'),
      author: 'Dra. Curadora',
      timestamp: new Date().toISOString()
    };

    await insertPhase4AssemblyPhotoMetadata(pool, photo, col.nic);
    await attachPhotoBytes(pool, 'phase4_photos', photoId, Buffer.from('bytes-da-foto-de-montagem'), 'image/jpeg', 25, 4032, 3024);

    const file = await getPhotoFile(pool, 'phase4_photos', col.nic, photoId);
    expect(file?.mimetype).toBe('image/jpeg');
    expect(file?.data.toString()).toBe('bytes-da-foto-de-montagem');
  });
});
