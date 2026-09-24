import { describe, it, expect } from 'vitest';
import { getLatestPhaseSignature } from '../signatures';
import { PhaseSignature } from '../../types/sgccco';

describe('getLatestPhaseSignature', () => {
  it('retorna undefined quando não há assinatura para a fase', () => {
    expect(getLatestPhaseSignature([], 1)).toBeUndefined();
  });

  it('retorna a única assinatura quando não há reabertura', () => {
    const sigs: PhaseSignature[] = [
      { phaseNumber: 1, signedBy: 'u1', signedByName: 'A', signedByRole: 'tecnico', signedAt: 't1', sha256Hash: 'h1', status: 'locked' }
    ];
    expect(getLatestPhaseSignature(sigs, 1)?.sha256Hash).toBe('h1');
  });

  it(
    'após reabertura preservada (não apagada) + reassinatura, retorna a assinatura mais ' +
    'recente (locked) em vez da primeira do array (que ficou unlocked_for_revision)',
    () => {
      const sigs: PhaseSignature[] = [
        {
          phaseNumber: 1,
          signedBy: 'u1',
          signedByName: 'Técnico Original',
          signedByRole: 'tecnico',
          signedAt: 't1',
          sha256Hash: 'h1-original',
          status: 'unlocked_for_revision',
          reopenedBy: 'Dra. Curadora',
          reopenedAt: 't2',
          reopenJustification: 'Retificação pericial necessária'
        },
        {
          phaseNumber: 1,
          signedBy: 'u1',
          signedByName: 'Técnico Original',
          signedByRole: 'tecnico',
          signedAt: 't3',
          sha256Hash: 'h1-nova',
          status: 'locked'
        }
      ];

      const latest = getLatestPhaseSignature(sigs, 1);
      expect(latest?.status).toBe('locked');
      expect(latest?.sha256Hash).toBe('h1-nova');

      // A assinatura antiga (com a justificativa da reabertura) continua no array —
      // é isso que garante que o evento de reabertura nunca desaparece do histórico.
      expect(sigs.find((s) => s.reopenJustification)?.reopenJustification).toBe(
        'Retificação pericial necessária'
      );
    }
  );

  it('ignora assinaturas de outras fases', () => {
    const sigs: PhaseSignature[] = [
      { phaseNumber: 1, signedBy: 'u1', signedByName: 'A', signedByRole: 'tecnico', signedAt: 't1', sha256Hash: 'h1', status: 'locked' },
      { phaseNumber: 2, signedBy: 'u1', signedByName: 'A', signedByRole: 'tecnico', signedAt: 't2', sha256Hash: 'h2', status: 'locked' }
    ];
    expect(getLatestPhaseSignature(sigs, 2)?.sha256Hash).toBe('h2');
  });
});
