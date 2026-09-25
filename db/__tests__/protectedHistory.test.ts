import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import crypto from 'crypto';
import { runMigrations } from '../migrate';
import {
  getCollection,
  createCollection,
  saveCollection,
  wipeAllCollections,
  listChangeLog,
  verifyChangeLogChain,
  Actor
} from '../collectionsRepo';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import type { OsteologicalCollection, PhaseSignature } from '../../src/types/sgccco';
import { generateSignaturePayload } from '../../src/services/auditService';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';
const pool = new Pool({ connectionString: TEST_DATABASE_URL });

const TECNICO: Actor = { id: 'usr-tec', name: 'Técnica Ana', role: 'tecnico' };
const CURADOR: Actor = { id: 'usr-cur', name: 'Curador Bruno', role: 'curador' };

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 1,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnica Ana',
    signatures: [],
    custodyChain: [],
    legalOrigin: {},
    phase1: {
      ...createEmptyPhase1Data(),
      equipeEnvolvidaLimpeza: { value: 'Equipe Alfa', isAiSuggested: false },
      tipoMaterial: { value: ['ossos'], isAiSuggested: false }
    },
    phase2: createEmptyPhase2Data(),
    phase3: { boxLocations: [] },
    phase4: { curationVersionNumber: 1, curationVersionStatus: 'rascunho', curatorAuthor: 'x', individuals: [], skeletalElements: [] },
    phase5: {},
    phase6: { finalLocations: [], publicQrActive: false }
  } as unknown as OsteologicalCollection;
}

/** Assina a fase como o navegador faz: hash sobre JSON.stringify da fase, na ordem em memória. */
function sign(col: OsteologicalCollection, phaseNumber: 1 | 2 | 3 | 4 | 5 | 6, actor: Actor): PhaseSignature {
  const signedAt = new Date(Date.now() + Math.floor(Math.random() * 1000)).toISOString();
  const payload = generateSignaturePayload({
    nic: col.nic,
    phaseNumber,
    signedBy: actor.id!,
    role: actor.role!,
    timestamp: signedAt,
    dataSnapshotJson: JSON.stringify((col as any)[`phase${phaseNumber}`])
  });
  return {
    phaseNumber,
    signedBy: actor.id!,
    signedByName: actor.name!,
    signedByRole: actor.role as any,
    signedAt,
    sha256Hash: crypto.createHash('sha256').update(payload).digest('hex'),
    status: 'locked'
  };
}

async function createSignedPhase1(nic: string): Promise<OsteologicalCollection> {
  const col = baseCollection(nic);
  await createCollection(pool, col, TECNICO);
  col.signatures = [sign(col, 1, TECNICO)];
  await saveCollection(pool, col, TECNICO);
  // Volta do banco como o navegador recebe depois de recarregar a página: o JSONB
  // devolve as chaves da fase em outra ordem.
  return (await getCollection(pool, nic))!;
}

beforeAll(async () => {
  await runMigrations(pool);
});

beforeEach(async () => {
  await wipeAllCollections(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('assinaturas: fim do falso "Assinatura inválida"', () => {
  it('depois de assinar e recarregar do banco, o conjunto continua salvando normalmente', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0001');
    expect(JSON.stringify(reloaded.phase1)).not.toBe(JSON.stringify(baseCollection('x').phase1)); // ordem mudou

    reloaded.phase2 = { ...reloaded.phase2, equipeEnvolvidaLimpeza: { value: 'Equipe Beta', isAiSuggested: false } };
    await expect(saveCollection(pool, reloaded, TECNICO)).resolves.toBeDefined();
  });

  it('guarda a cópia exata do conteúdo assinado, que confere com o hash', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0002');
    const sig = reloaded.signatures[0];
    expect(sig.dataSnapshotJson).toBeDefined();
    const recomputed = crypto
      .createHash('sha256')
      .update(
        generateSignaturePayload({
          nic: reloaded.nic,
          phaseNumber: 1,
          signedBy: sig.signedBy,
          role: sig.signedByRole,
          timestamp: sig.signedAt,
          dataSnapshotJson: sig.dataSnapshotJson!
        })
      )
      .digest('hex');
    expect(recomputed).toBe(sig.sha256Hash);

    const { rows } = await pool.query('SELECT data_snapshot FROM signatures WHERE nic = $1', ['NIC-HIST-0002']);
    expect(rows[0].data_snapshot).toBe(sig.dataSnapshotJson);
  });

  it('o navegador não consegue apagar a cópia: o servidor a restaura do banco', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0003');
    const semCopia = { ...reloaded, signatures: reloaded.signatures.map(({ dataSnapshotJson, ...s }) => s) };
    const saved = await saveCollection(pool, semCopia as any, TECNICO);
    expect(saved.signatures[0].dataSnapshotJson).toBe(reloaded.signatures[0].dataSnapshotJson);
  });

  it('recusa assinatura nova cujo hash não confere com o conteúdo enviado', async () => {
    const col = baseCollection('NIC-HIST-0004');
    await createCollection(pool, col, TECNICO);
    col.signatures = [{ ...sign(col, 1, TECNICO), sha256Hash: 'a'.repeat(64) }];
    await expect(saveCollection(pool, col, TECNICO)).rejects.toThrow(/Assinatura inválida/);
  });
});

describe('histórico protegido pelo servidor', () => {
  it('não deixa remover uma assinatura já gravada', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0010');
    await expect(saveCollection(pool, { ...reloaded, signatures: [] }, TECNICO)).rejects.toThrow(/não pode ser removida/);
  });

  it('não deixa trocar quem assinou', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0011');
    const trocado = { ...reloaded, signatures: [{ ...reloaded.signatures[0], signedByName: 'Outra Pessoa' }] };
    await expect(saveCollection(pool, trocado, TECNICO)).rejects.toThrow(/não pode ser alterado/);
  });

  it('não deixa alterar uma fase assinada sem reabrir', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0012');
    reloaded.phase1 = { ...reloaded.phase1, equipeEnvolvidaLimpeza: { value: 'Equipe Adulterada', isAiSuggested: false } };
    await expect(saveCollection(pool, reloaded, TECNICO)).rejects.toThrow(/assinada e travada/);
  });

  it('não deixa reabrir sem justificativa', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0013');
    const reaberta = { ...reloaded, signatures: [{ ...reloaded.signatures[0], status: 'unlocked_for_revision' as const }] };
    await expect(saveCollection(pool, reaberta, CURADOR)).rejects.toThrow(/justificativa/);
  });

  it('reabrir com justificativa, corrigir e assinar de novo mantém as duas versões', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0014');
    const reaberta: OsteologicalCollection = {
      ...reloaded,
      signatures: [
        {
          ...reloaded.signatures[0],
          status: 'unlocked_for_revision',
          reopenJustification: 'Correção do nome da equipe',
          reopenedBy: 'Curador Bruno',
          reopenedAt: new Date().toISOString()
        }
      ]
    };
    await saveCollection(pool, reaberta, CURADOR);

    const corrigida = (await getCollection(pool, 'NIC-HIST-0014'))!;
    corrigida.phase1 = { ...corrigida.phase1, equipeEnvolvidaLimpeza: { value: 'Equipe Alfa Corrigida', isAiSuggested: false } };
    await saveCollection(pool, corrigida, CURADOR);
    corrigida.signatures = [...corrigida.signatures, sign(corrigida, 1, CURADOR)];
    const saved = await saveCollection(pool, corrigida, CURADOR);

    expect(saved.signatures).toHaveLength(2);
    expect(saved.signatures[0].status).toBe('unlocked_for_revision');
    expect(saved.signatures[0].reopenJustification).toBe('Correção do nome da equipe');
    expect(JSON.parse(saved.signatures[0].dataSnapshotJson!).equipeEnvolvidaLimpeza.value).toBe('Equipe Alfa');
    expect(JSON.parse(saved.signatures[1].dataSnapshotJson!).equipeEnvolvidaLimpeza.value).toBe('Equipe Alfa Corrigida');

    // A justificativa da reabertura não pode ser reescrita depois.
    const reescrita = (await getCollection(pool, 'NIC-HIST-0014'))!;
    reescrita.signatures[0] = { ...reescrita.signatures[0], reopenJustification: 'Outro motivo' };
    await expect(saveCollection(pool, reescrita, CURADOR)).rejects.toThrow(/justificativa da reabertura/);
  });

  it('não deixa remover nem alterar registro de custódia', async () => {
    const col = baseCollection('NIC-HIST-0015');
    col.custodyChain = [
      {
        id: 'cst-1',
        timestamp: new Date().toISOString(),
        sourceLocation: 'Entrada',
        targetLocation: 'Bancada',
        carrierPerson: 'Ana',
        receiverPerson: 'Ana',
        carrierSignatureHash: 'h',
        receiverSignatureHash: 'h',
        purpose: 'recebimento_entrada',
        status: 'concluido',
        boxIds: []
      } as any
    ];
    await createCollection(pool, col, TECNICO);
    await expect(saveCollection(pool, { ...col, custodyChain: [] }, TECNICO)).rejects.toThrow(/custódia/);
    await expect(
      saveCollection(pool, { ...col, custodyChain: [{ ...col.custodyChain[0], targetLocation: 'Outro lugar' }] }, TECNICO)
    ).rejects.toThrow(/custódia/);
  });
});

describe('registro de alterações', () => {
  it('registra campo, valor anterior, valor novo, quem e quando', async () => {
    const col = baseCollection('NIC-HIST-0020');
    await createCollection(pool, col, TECNICO);
    col.phase1 = { ...col.phase1, corSacoLavagem: { value: 'azul', isAiSuggested: false } };
    await saveCollection(pool, col, TECNICO);
    col.phase1 = { ...col.phase1, corSacoLavagem: { value: 'verde', isAiSuggested: false } };
    await saveCollection(pool, col, CURADOR);

    const log = await listChangeLog(pool, 'NIC-HIST-0020');
    expect(log[0].kind).toBe('criacao');
    const mudancas = log.filter((e) => e.path === 'phase1.corSacoLavagem');
    expect(mudancas.map((e) => [e.oldValue, e.newValue, e.actorName])).toEqual([
      ['', 'azul', 'Técnica Ana'],
      ['azul', 'verde', 'Curador Bruno']
    ]);
  });

  it('registra assinatura e reabertura como eventos', async () => {
    const reloaded = await createSignedPhase1('NIC-HIST-0021');
    await saveCollection(
      pool,
      {
        ...reloaded,
        signatures: [{ ...reloaded.signatures[0], status: 'unlocked_for_revision', reopenJustification: 'Revisão', reopenedBy: 'Curador Bruno' }]
      },
      CURADOR
    );
    const kinds = (await listChangeLog(pool, 'NIC-HIST-0021')).map((e) => e.kind);
    expect(kinds).toContain('assinatura');
    expect(kinds).toContain('reabertura');
  });

  it('a corrente de hashes confere, e acusa uma entrada adulterada', async () => {
    const col = baseCollection('NIC-HIST-0022');
    await createCollection(pool, col, TECNICO);
    col.phase1 = { ...col.phase1, corSacoLavagem: { value: 'azul', isAiSuggested: false } };
    await saveCollection(pool, col, TECNICO);

    const log = await listChangeLog(pool, 'NIC-HIST-0022');
    expect(verifyChangeLogChain(log, 'NIC-HIST-0022')).toEqual({ ok: true, brokenAtId: null });

    const adulterado = log.map((e) => (e.path === 'phase1.corSacoLavagem' ? { ...e, newValue: 'vermelho' } : e));
    expect(verifyChangeLogChain(adulterado, 'NIC-HIST-0022').ok).toBe(false);
  });
});

describe('proteção no próprio banco (gatilhos)', () => {
  it('recusa apagar ou alterar registro de alterações, assinatura e custódia direto no banco', async () => {
    await createSignedPhase1('NIC-HIST-0030');
    await expect(pool.query(`UPDATE change_log SET note = 'x' WHERE nic = 'NIC-HIST-0030'`)).rejects.toThrow(/Histórico protegido/);
    await expect(pool.query(`DELETE FROM change_log WHERE nic = 'NIC-HIST-0030'`)).rejects.toThrow(/Histórico protegido/);
    await expect(pool.query(`DELETE FROM signatures WHERE nic = 'NIC-HIST-0030'`)).rejects.toThrow(/Histórico protegido/);
    await expect(pool.query(`UPDATE signatures SET signed_by_name = 'x' WHERE nic = 'NIC-HIST-0030'`)).rejects.toThrow(
      /Histórico protegido/
    );
    await expect(pool.query(`DELETE FROM collections WHERE nic = 'NIC-HIST-0030'`)).rejects.toThrow(/Histórico protegido/);
  });

  it('a limpeza total do ambiente (dados de exemplo / testar do zero) continua funcionando', async () => {
    await createSignedPhase1('NIC-HIST-0031');
    await wipeAllCollections(pool);
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM change_log`);
    expect(rows[0].n).toBe(0);
  });
});
