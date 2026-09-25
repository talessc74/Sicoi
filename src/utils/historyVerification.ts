import type { PhaseSignature } from '../types/sgccco';
import { calculateSha256, generateSignaturePayload, LEGACY_SIGNATURE_PAYLOAD_PREFIXES, SIGNATURE_PAYLOAD_PREFIX } from '../services/auditService';

export interface SignatureCheck {
  signature: PhaseSignature;
  status: 'confere' | 'nao_confere' | 'sem_copia';
}

/**
 * Recalcula, no navegador, o lacre de cada assinatura a partir da cópia guardada do
 * conteúdo assinado. Assinaturas anteriores à cópia (sem dataSnapshotJson) não têm
 * como ser reconferidas e aparecem como "sem cópia".
 */
export async function checkSignatureSnapshots(nic: string, signatures: PhaseSignature[]): Promise<SignatureCheck[]> {
  const prefixes = [SIGNATURE_PAYLOAD_PREFIX, ...LEGACY_SIGNATURE_PAYLOAD_PREFIXES];
  const results: SignatureCheck[] = [];
  for (const signature of signatures) {
    if (!signature.dataSnapshotJson) {
      results.push({ signature, status: 'sem_copia' });
      continue;
    }
    let matches = false;
    for (const prefix of prefixes) {
      const payload = generateSignaturePayload(
        {
          nic,
          phaseNumber: signature.phaseNumber,
          signedBy: signature.signedBy,
          role: signature.signedByRole,
          timestamp: signature.signedAt,
          dataSnapshotJson: signature.dataSnapshotJson
        },
        prefix
      );
      if ((await calculateSha256(payload)) === signature.sha256Hash) {
        matches = true;
        break;
      }
    }
    results.push({ signature, status: matches ? 'confere' : 'nao_confere' });
  }
  return results;
}
