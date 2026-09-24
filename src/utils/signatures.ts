import { PhaseNumber, PhaseSignature } from '../types/sgccco';

// Uma fase pode acumular mais de um registro de assinatura ao longo do tempo
// (reabertura pericial preserva o registro anterior em vez de apagá-lo, para
// manter o histórico forense completo). O registro que vale para decidir se a
// fase está travada agora é sempre o mais recente — nunca o primeiro do array.
export function getLatestPhaseSignature(
  signatures: PhaseSignature[],
  phase: PhaseNumber
): PhaseSignature | undefined {
  for (let i = signatures.length - 1; i >= 0; i--) {
    if (signatures[i].phaseNumber === phase) return signatures[i];
  }
  return undefined;
}
