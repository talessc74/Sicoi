import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../src/data/phaseDefaults';
import {
  generateSignaturePayload,
  LEGACY_SIGNATURE_PAYLOAD_PREFIXES,
  SIGNATURE_PAYLOAD_PREFIX
} from '../../src/services/auditService';
import type { OsteologicalCollection, PhaseSignature } from '../../src/types/sgccco';
import { signatureMatchesCurrentPhase } from '../signatureValidation';

const collection = {
  nic: 'NIC-TESTE-0843',
  phase1: createEmptyPhase1Data(),
  phase2: createEmptyPhase2Data()
} as OsteologicalCollection;

function signedPhase2(prefix: string): PhaseSignature {
  const signature = {
    phaseNumber: 2,
    signedBy: 'tecnico-1',
    signedByName: 'Técnico de teste',
    signedByRole: 'tecnico',
    signedAt: '2026-09-24T10:00:00.000Z',
    status: 'locked'
  } as PhaseSignature;
  const payload = generateSignaturePayload({
    nic: collection.nic,
    phaseNumber: signature.phaseNumber,
    signedBy: signature.signedBy,
    role: signature.signedByRole,
    timestamp: signature.signedAt,
    dataSnapshotJson: JSON.stringify(collection.phase2)
  }, prefix);
  signature.sha256Hash = createHash('sha256').update(payload, 'utf-8').digest('hex');
  return signature;
}

describe('verificação de assinatura da Fase 2', () => {
  it.each([SIGNATURE_PAYLOAD_PREFIX, ...LEGACY_SIGNATURE_PAYLOAD_PREFIXES])(
    'aceita o prefixo histórico %s',
    (prefix) => expect(signatureMatchesCurrentPhase(collection, signedPhase2(prefix))).toBe(true)
  );

  it('rejeita dados alterados depois da assinatura, mesmo com prefixo antigo', () => {
    const signature = signedPhase2(LEGACY_SIGNATURE_PAYLOAD_PREFIXES[0]);
    const changed = {
      ...collection,
      phase2: { ...collection.phase2, dryingConfirmationAllBoxes: !collection.phase2.dryingConfirmationAllBoxes }
    };
    expect(signatureMatchesCurrentPhase(changed, signature)).toBe(false);
  });

  it('rejeita hash inventado', () => {
    expect(signatureMatchesCurrentPhase(collection, { ...signedPhase2(SIGNATURE_PAYLOAD_PREFIX), sha256Hash: 'inválido' })).toBe(false);
  });
});
