import crypto from 'crypto';
import type { OsteologicalCollection, PhaseSignature } from '../src/types/sgccco';
import {
  generateSignaturePayload,
  LEGACY_SIGNATURE_PAYLOAD_PREFIXES,
  SIGNATURE_PAYLOAD_PREFIX
} from '../src/services/auditService';

const acceptedPrefixes = [SIGNATURE_PAYLOAD_PREFIX, ...LEGACY_SIGNATURE_PAYLOAD_PREFIXES];

export function signatureMatchesCurrentPhase(collection: OsteologicalCollection, sig: PhaseSignature): boolean {
  const phase = sig.phaseNumber === 1 ? collection.phase1 : sig.phaseNumber === 2 ? collection.phase2 : null;
  if (!phase) return true; // Fases 3–7 ainda não têm validação no servidor.

  const data = {
    nic: collection.nic,
    phaseNumber: sig.phaseNumber,
    signedBy: sig.signedBy,
    role: sig.signedByRole,
    timestamp: sig.signedAt,
    dataSnapshotJson: JSON.stringify(phase)
  };

  return acceptedPrefixes.some((prefix) => {
    const payload = generateSignaturePayload(data, prefix);
    const hash = crypto.createHash('sha256').update(payload, 'utf-8').digest('hex');
    return hash === sig.sha256Hash;
  });
}
