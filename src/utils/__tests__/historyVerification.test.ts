import { describe, it, expect } from 'vitest';
import { checkSignatureSnapshots } from '../historyVerification';
import { calculateSha256, generateSignaturePayload, LEGACY_SIGNATURE_PAYLOAD_PREFIXES } from '../../services/auditService';
import type { PhaseSignature } from '../../types/sgccco';

async function buildSignature(overrides: Partial<PhaseSignature> & { dataSnapshotJson: string }): Promise<PhaseSignature> {
  const base = {
    phaseNumber: 1,
    signedBy: 'user-1',
    signedByName: 'Perito X',
    signedByRole: 'tecnico',
    signedAt: '2026-09-27T10:00:00.000Z',
    status: 'locked' as const,
    ...overrides
  };
  const payload = generateSignaturePayload({
    nic: 'NIC-2026-0841',
    phaseNumber: base.phaseNumber,
    signedBy: base.signedBy,
    role: base.signedByRole,
    timestamp: base.signedAt,
    dataSnapshotJson: base.dataSnapshotJson
  });
  const sha256Hash = await calculateSha256(payload);
  return { ...base, sha256Hash } as PhaseSignature;
}

describe('checkSignatureSnapshots', () => {
  it('confere quando o hash bate com a cópia guardada', async () => {
    const signature = await buildSignature({ dataSnapshotJson: '{"equipe":"Alfa"}' });

    const [result] = await checkSignatureSnapshots('NIC-2026-0841', [signature]);

    expect(result.status).toBe('confere');
  });

  it('não confere quando a cópia guardada foi adulterada depois de assinada', async () => {
    const signature = await buildSignature({ dataSnapshotJson: '{"equipe":"Alfa"}' });
    const adulterada = { ...signature, dataSnapshotJson: '{"equipe":"Beta"}' };

    const [result] = await checkSignatureSnapshots('NIC-2026-0841', [adulterada]);

    expect(result.status).toBe('nao_confere');
  });

  it('marca como "sem_copia" uma assinatura anterior à cópia de conteúdo', async () => {
    const signature = await buildSignature({ dataSnapshotJson: '{"equipe":"Alfa"}' });
    const { dataSnapshotJson, ...semCopia } = signature;

    const [result] = await checkSignatureSnapshots('NIC-2026-0841', [semCopia as any]);

    expect(result.status).toBe('sem_copia');
  });

  it('reconhece uma assinatura gerada com um prefixo legado', async () => {
    const legacyPrefix = LEGACY_SIGNATURE_PAYLOAD_PREFIXES[0];
    const dataSnapshotJson = '{"equipe":"Alfa"}';
    const payload = generateSignaturePayload(
      { nic: 'NIC-2026-0841', phaseNumber: 1, signedBy: 'user-1', role: 'tecnico', timestamp: '2026-09-27T10:00:00.000Z', dataSnapshotJson },
      legacyPrefix
    );
    const sha256Hash = await calculateSha256(payload);
    const signature: PhaseSignature = {
      phaseNumber: 1,
      signedBy: 'user-1',
      signedByName: 'Perito X',
      signedByRole: 'tecnico',
      signedAt: '2026-09-27T10:00:00.000Z',
      status: 'locked',
      dataSnapshotJson,
      sha256Hash
    } as PhaseSignature;

    const [result] = await checkSignatureSnapshots('NIC-2026-0841', [signature]);

    expect(result.status).toBe('confere');
  });
});
