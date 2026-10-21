import { describe, it, expect } from 'vitest';
import { computeGraphForCollection } from '../../../db/graphSync';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import type { OsteologicalCollection } from '../../types/sgccco';

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 5,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1: createEmptyPhase1Data(),
    phase2: createEmptyPhase2Data(),
    phase3: { boxLocations: [] },
    phase4: {
      curationVersionNumber: 1,
      curationVersionStatus: 'rascunho',
      curatorAuthor: 'x',
      individuals: [
        {
          id: 'ind-1',
          code: 'IND-01',
          confidence: 'alta',
          odontogram: [],
          biologicalProfile: {
            sexEstimate: { value: 'feminino', methodCode: 'Phenice_1969', bibliographicRef: 'x', notes: '' },
            ageCategory: { value: 'adulto_maduro', estimatedRangeYears: '35-50', methodCode: 'x', bibliographicRef: 'x' },
            statureCm: { estimatedValue: 165, methodCode: 'Trotter_1952', bibliographicRef: 'x' },
            ancestryIndication: { traitsObserved: '', methodCode: 'x', bibliographicRef: 'x' }
          }
        }
      ],
      skeletalElements: []
    },
    phase5: {
      pathologies: [
        {
          id: 'path-1',
          individualId: 'ind-1',
          taxonomyLabel: 'Artrose severa',
          timingEstimate: 'ante_mortem'
        } as any
      ],
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

describe('computeGraphForCollection — Hubs Ontológicos Cross-COI', () => {
  it('gera nó de Hub para Sexo Feminino e conecta ao indivíduo', () => {
    const col = baseCollection('COI-033');
    const { nodes, edges } = computeGraphForCollection(col);

    const sexHub = nodes.find((n) => n.id === 'HUB-SEX-FEMININO');
    expect(sexHub).toBeDefined();
    expect(sexHub?.type).toBe('conceito_biologico');
    expect(sexHub?.label).toBe('Sexo: Feminino');

    const sexEdge = edges.find((e) => e.target === 'HUB-SEX-FEMININO');
    expect(sexEdge).toBeDefined();
    expect(sexEdge?.relation).toBe('perfil_sexo');
    expect(sexEdge?.source).toBe('COI-033-IND-01');
  });

  it('gera nó de Hub para Faixa Etária e conecta ao indivíduo', () => {
    const col = baseCollection('COI-033');
    const { nodes, edges } = computeGraphForCollection(col);

    const ageHub = nodes.find((n) => n.id === 'HUB-AGE-ADULTO_MADURO');
    expect(ageHub).toBeDefined();
    expect(ageHub?.type).toBe('conceito_biologico');
    expect(ageHub?.label).toContain('Adulto Maduro');

    const ageEdge = edges.find((e) => e.target === 'HUB-AGE-ADULTO_MADURO');
    expect(ageEdge).toBeDefined();
    expect(ageEdge?.relation).toBe('perfil_etario');
    expect(ageEdge?.source).toBe('COI-033-IND-01');
  });

  it('gera nó de Hub para Patologia compartilhada com slug normalizado', () => {
    const col = baseCollection('COI-033');
    const { nodes, edges } = computeGraphForCollection(col);

    const pathHub = nodes.find((n) => n.id === 'HUB-PATH-ARTROSE_SEVERA');
    expect(pathHub).toBeDefined();
    expect(pathHub?.type).toBe('conceito_patologico');
    expect(pathHub?.label).toContain('Artrose severa');

    const pathEdge = edges.find((e) => e.target === 'HUB-PATH-ARTROSE_SEVERA');
    expect(pathEdge).toBeDefined();
    expect(pathEdge?.relation).toBe('instancia_patologia');
  });
});
