import { describe, it, expect } from 'vitest';
import { createEmptyPhase0Data, createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import type {
  OsteologicalCollection,
  PhaseNumber,
  PhaseSignature,
  Phase4Data,
  Phase5Data,
  Phase6Data
} from '../../types/sgccco';
import { listCollectionPendencies, countPendencies } from '../collectionPendencies';

function makeCollection(currentPhase: PhaseNumber, signedPhases: PhaseNumber[] = []): OsteologicalCollection {
  const phase1 = createEmptyPhase1Data();
  phase1.preliminaryBoxes = [
    { id: 'CX-COI-007', boxCode: 'COI-007', presumedIndividualLabel: 'Caixa', currentLocation: 'Bancada', qrCode: 'qr' }
  ];
  const signatures = signedPhases.map(
    (phaseNumber) =>
      ({
        phaseNumber,
        signedBy: 'u1',
        signedByName: 'Técnico',
        signedByRole: 'tecnico',
        signedAt: '2026-10-16T10:00:00.000Z',
        sha256Hash: 'h',
        status: 'locked'
      }) as PhaseSignature
  );
  return {
    nic: 'COI-007',
    createdAt: '2026-10-16T09:00:00.000Z',
    createdByTechnician: 'Técnico',
    currentPhase,
    signatures,
    custodyChain: [],
    legalOrigin: {},
    phase0: createEmptyPhase0Data(),
    phase1,
    phase2: createEmptyPhase2Data(),
    phase3: { boxLocations: [] },
    phase4: { curationVersionNumber: 1, curationVersionStatus: 'rascunho', curatorAuthor: '', individuals: [], skeletalElements: [] } as unknown as Phase4Data,
    phase5: { pathologies: [], complementaryExams: [] } as unknown as Phase5Data,
    phase6: { finalLocations: [], publicQrActive: false } as unknown as Phase6Data
  } as OsteologicalCollection;
}

describe('pendências do conjunto', () => {
  it('conjunto novo: só a assinatura da Fase 0, sem NMI', () => {
    const result = listCollectionPendencies(makeCollection(0));
    expect(result).toHaveLength(1);
    expect(result[0].phase).toBe(0);
    expect(result[0].items).toEqual(['assinatura da Fase 0']);
    expect(JSON.stringify(result)).not.toContain('NMI');
  });

  it('Fase 1 aberta lista os campos vazios do A.1 e a assinatura', () => {
    const result = listCollectionPendencies(makeCollection(1, [0]));
    expect(result.map((r) => r.phase)).toEqual([1]);
    expect(result[0].items).toContain('equipe envolvida');
    expect(result[0].items).toContain('tipo de material');
    expect(result[0].items[result[0].items.length - 1]).toBe('assinatura da Fase 1');
  });

  it('Fase 2 aponta as caixas que ainda não estão secas', () => {
    const result = listCollectionPendencies(makeCollection(2, [0, 1]));
    expect(result[0].items).toContain('caixas ainda sem status "Seca": COI-007');
  });

  it('NMI só aparece a partir da Fase 4, junto com o resto do que falta nela', () => {
    const result = listCollectionPendencies(makeCollection(4, [0, 1, 2, 3]));
    expect(result.map((r) => r.phase)).toEqual([4]);
    expect(result[0].items).toEqual([
      'foto da montagem completa (ou justificativa de ausência)',
      'assinatura da montagem (Técnico)',
      'NMI: nenhum indivíduo cadastrado no inventário',
      'assinatura do inventário (Curador)'
    ]);
  });

  it('fase reaberta (sem assinatura travada) volta a aparecer', () => {
    const c = makeCollection(3, [0, 1, 2]);
    c.signatures[1] = { ...c.signatures[1], status: 'unlocked_for_revision' };
    expect(listCollectionPendencies(c).map((r) => r.phase)).toEqual([1, 3]);
  });

  it('conjunto antigo, sem Fase 0, não ganha pendência retroativa nela', () => {
    const c = makeCollection(1);
    delete (c as Partial<OsteologicalCollection>).phase0;
    expect(listCollectionPendencies(c).map((r) => r.phase)).toEqual([1]);
  });

  it('conjunto com todas as fases assinadas não tem pendência', () => {
    const c = makeCollection(7, [0, 1, 2, 3, 4, 5, 6]);
    expect(countPendencies(listCollectionPendencies(c))).toBe(0);
  });
});
