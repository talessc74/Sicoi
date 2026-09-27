import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import crypto from 'crypto';
import { runMigrations } from '../migrate';
import { createCollection, getCollection, listCollections, saveCollection, type Actor } from '../collectionsRepo';
import {
  adminDeleteBox,
  adminRestoreBox,
  listAdminActions,
  listDeletedCollections,
  restoreAllCollections,
  restoreCollection,
  softDeleteAllCollections,
  softDeleteCollection
} from '../adminRepo';
import { HistoryViolationError } from '../historyGuard';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import { generateSignaturePayload } from '../../src/services/auditService';
import type { OsteologicalCollection, PhaseSignature } from '../../src/types/sgccco';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

const admin: Actor = { id: 'admin-1', name: 'Dra. Administradora', role: 'administrador' };

function baseCollection(nic: string, boxes: { id: string; boxCode: string }[] = []): OsteologicalCollection {
  const phase1 = { ...createEmptyPhase1Data(), preliminaryBoxes: boxes.map((b) => ({ ...b, presumedIndividualLabel: '', currentLocation: '', qrCode: `SIGCOI://BOX/${b.id}` })) };
  return {
    nic,
    currentPhase: 1,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: {},
    phase1,
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

function lockedPhase1Signature(collection: OsteologicalCollection): PhaseSignature {
  const dataSnapshotJson = JSON.stringify(collection.phase1);
  const payload = generateSignaturePayload({
    nic: collection.nic,
    phaseNumber: 1,
    signedBy: 'tecnico-1',
    role: 'tecnico',
    timestamp: '2026-09-27T10:00:00.000Z',
    dataSnapshotJson
  });
  return {
    phaseNumber: 1,
    signedBy: 'tecnico-1',
    signedByName: 'Técnico de teste',
    signedByRole: 'tecnico',
    signedAt: '2026-09-27T10:00:00.000Z',
    sha256Hash: crypto.createHash('sha256').update(payload, 'utf-8').digest('hex'),
    status: 'locked',
    dataSnapshotJson
  };
}

beforeAll(async () => {
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query(
    `BEGIN; SET LOCAL sigcoi.allow_wipe = 'on'; DELETE FROM admin_actions; DELETE FROM change_log; DELETE FROM pop_step_audit;
     DELETE FROM custody_chain; DELETE FROM signatures; DELETE FROM phase2_photos; DELETE FROM phase1_photos;
     DELETE FROM phase2_forms; DELETE FROM phase1_forms; DELETE FROM collections; COMMIT;`
  );
});

describe('exclusão e restauração de conjunto (soft delete)', () => {
  it('exclui um conjunto: some de listCollections, mas continua recuperável por getCollection', async () => {
    const collection = baseCollection('NIC-2026-0900');
    await createCollection(pool, collection);

    await softDeleteCollection(pool, collection.nic, admin, 'Cadastro duplicado por engano');

    expect(await listCollections(pool)).toEqual([]);
    expect(await getCollection(pool, collection.nic)).not.toBeNull();
  });

  it('restaurar traz o conjunto de volta para listCollections', async () => {
    const collection = baseCollection('NIC-2026-0901');
    await createCollection(pool, collection);
    await softDeleteCollection(pool, collection.nic, admin, 'motivo');

    await restoreCollection(pool, collection.nic, admin);

    expect((await listCollections(pool)).map((c) => c.nic)).toEqual([collection.nic]);
  });

  it('recusa excluir um conjunto já excluído', async () => {
    const collection = baseCollection('NIC-2026-0902');
    await createCollection(pool, collection);
    await softDeleteCollection(pool, collection.nic, admin, 'motivo');

    await expect(softDeleteCollection(pool, collection.nic, admin, 'de novo')).rejects.toThrow('já está excluído');
  });

  it('recusa restaurar um conjunto que não está excluído', async () => {
    const collection = baseCollection('NIC-2026-0903');
    await createCollection(pool, collection);

    await expect(restoreCollection(pool, collection.nic, admin)).rejects.toThrow('não está excluído');
  });

  it('um conjunto excluído não pode ser salvo (editado) sem ser restaurado antes', async () => {
    const collection = baseCollection('NIC-2026-0904');
    await createCollection(pool, collection);
    await softDeleteCollection(pool, collection.nic, admin, 'motivo');

    await expect(saveCollection(pool, { ...collection, currentPhase: 2 }, admin)).rejects.toThrow(HistoryViolationError);
  });

  it('grava a exclusão e a restauração na trilha de ações administrativas', async () => {
    const collection = baseCollection('NIC-2026-0905');
    await createCollection(pool, collection);

    await softDeleteCollection(pool, collection.nic, admin, 'Motivo X');
    await restoreCollection(pool, collection.nic, admin);

    const actions = await listAdminActions(pool);
    expect(actions.map((a) => a.kind)).toEqual(['restaurar_conjunto', 'excluir_conjunto']); // mais recente primeiro
    expect(actions[1].reason).toBe('Motivo X');
    expect(actions[1].actorName).toBe('Dra. Administradora');
  });

  it('listDeletedCollections mostra quem excluiu, quando e por quê', async () => {
    const collection = baseCollection('NIC-2026-0906');
    await createCollection(pool, collection);
    await softDeleteCollection(pool, collection.nic, admin, 'Motivo Y');

    const deleted = await listDeletedCollections(pool);
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toMatchObject({ nic: collection.nic, deletedByName: 'Dra. Administradora', deletedReason: 'Motivo Y' });
  });
});

describe('excluir e restaurar todos os conjuntos', () => {
  it('esconde todos os conjuntos ativos e devolve quantos foram afetados', async () => {
    await createCollection(pool, baseCollection('NIC-2026-0910'));
    await createCollection(pool, baseCollection('NIC-2026-0911'));

    const affected = await softDeleteAllCollections(pool, admin, 'Reinício do ambiente');

    expect(affected).toBe(2);
    expect(await listCollections(pool)).toEqual([]);
  });

  it('não afeta um conjunto já excluído individualmente (não conta duas vezes)', async () => {
    const a = baseCollection('NIC-2026-0912');
    const b = baseCollection('NIC-2026-0913');
    await createCollection(pool, a);
    await createCollection(pool, b);
    await softDeleteCollection(pool, a.nic, admin, 'motivo');

    const affected = await softDeleteAllCollections(pool, admin, 'motivo geral');

    expect(affected).toBe(1); // só o NIC-0913, que ainda estava ativo
  });

  it('restaurar tudo traz todos de volta', async () => {
    await createCollection(pool, baseCollection('NIC-2026-0914'));
    await createCollection(pool, baseCollection('NIC-2026-0915'));
    await softDeleteAllCollections(pool, admin, 'motivo');

    const affected = await restoreAllCollections(pool, admin);

    expect(affected).toBe(2);
    expect(await listCollections(pool)).toHaveLength(2);
  });
});

describe('exclusão e restauração de uma caixa', () => {
  it('exclui uma caixa antes da Fase 1 ser assinada: some das caixas ativas, sem precisar reabrir nada', async () => {
    const collection = baseCollection('NIC-2026-0920', [{ id: 'cx-1', boxCode: 'CX-0920' }]);
    await createCollection(pool, collection);

    const saved = await adminDeleteBox(pool, collection.nic, 'cx-1', admin, 'Caixa cadastrada em duplicidade');

    const box = saved.phase1.preliminaryBoxes.find((b) => b.id === 'cx-1')!;
    expect(box.deletedAt).toBeTruthy();
    expect(box.deletedByName).toBe('Dra. Administradora');
    expect(box.deletedReason).toBe('Caixa cadastrada em duplicidade');
    expect(saved.signatures).toEqual([]); // nada foi assinado, nada precisou reabrir
  });

  it('excluir uma caixa de uma Fase 1 já assinada reabre a fase automaticamente, com a mesma justificativa', async () => {
    const collection = baseCollection('NIC-2026-0921', [{ id: 'cx-1', boxCode: 'CX-0921' }]);
    collection.signatures = [lockedPhase1Signature(collection)];
    await createCollection(pool, collection);

    const saved = await adminDeleteBox(pool, collection.nic, 'cx-1', admin, 'Retificação pós-assinatura');

    const signature = saved.signatures.find((s) => s.phaseNumber === 1)!;
    expect(signature.status).toBe('unlocked_for_revision');
    expect(signature.reopenJustification).toBe('Retificação pós-assinatura');
    expect(signature.reopenedBy).toBe('Dra. Administradora');
    expect(saved.phase1.preliminaryBoxes[0].deletedAt).toBeTruthy();
  });

  it('restaurar uma caixa exclui a marca e ela some da lista de excluídas', async () => {
    const collection = baseCollection('NIC-2026-0922', [{ id: 'cx-1', boxCode: 'CX-0922' }]);
    await createCollection(pool, collection);
    await adminDeleteBox(pool, collection.nic, 'cx-1', admin, 'motivo');

    const restored = await adminRestoreBox(pool, collection.nic, 'cx-1', admin);

    const box = restored.phase1.preliminaryBoxes.find((b) => b.id === 'cx-1')!;
    expect(box.deletedAt).toBeUndefined();
    expect(box.deletedReason).toBeUndefined();
  });

  it('recusa excluir uma caixa que não existe', async () => {
    const collection = baseCollection('NIC-2026-0923');
    await createCollection(pool, collection);

    await expect(adminDeleteBox(pool, collection.nic, 'cx-inexistente', admin, 'motivo')).rejects.toThrow('não encontrada');
  });

  it('recusa excluir uma caixa já excluída', async () => {
    const collection = baseCollection('NIC-2026-0924', [{ id: 'cx-1', boxCode: 'CX-0924' }]);
    await createCollection(pool, collection);
    await adminDeleteBox(pool, collection.nic, 'cx-1', admin, 'primeira vez');

    await expect(adminDeleteBox(pool, collection.nic, 'cx-1', admin, 'segunda vez')).rejects.toThrow('já está excluída');
  });

  it('grava a exclusão da caixa na trilha de ações administrativas', async () => {
    const collection = baseCollection('NIC-2026-0925', [{ id: 'cx-1', boxCode: 'CX-0925' }]);
    await createCollection(pool, collection);

    await adminDeleteBox(pool, collection.nic, 'cx-1', admin, 'Motivo Z');

    const [action] = await listAdminActions(pool);
    expect(action).toMatchObject({ kind: 'excluir_caixa', nic: collection.nic, boxId: 'cx-1', reason: 'Motivo Z' });
  });
});
