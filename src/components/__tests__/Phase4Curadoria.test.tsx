// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase4Curadoria } from '../Phase4Curadoria';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import type { OsteologicalCollection, UserProfile, IndividualHypothesis } from '../../types/sgccco';

function makeIndividual(overrides: Partial<IndividualHypothesis> = {}): IndividualHypothesis {
  return {
    id: 'ind-id-1',
    code: 'IND-01',
    confidence: 'alta',
    justification: 'Concordância anatômica e antimeria.',
    associatedBoxId: 'CX-01',
    status: 'ativo',
    biologicalProfile: {
      sexEstimate: {
        value: 'indeterminado',
        methodCode: 'Phenice 1969',
        bibliographicRef: 'Phenice (1969)',
        notes: ''
      },
      ageCategory: {
        value: 'adulto_medio',
        estimatedRangeYears: '30 - 45 anos',
        methodCode: 'Suchey-Brooks 1990',
        bibliographicRef: 'Suchey-Brooks (1990)',
        notes: ''
      },
      statureCm: {
        estimatedValue: 170.0,
        marginErrorCm: 3.5,
        methodCode: 'Trotter & Gleser 1952',
        measuredElement: 'Fêmur direito',
        bibliographicRef: 'Trotter & Gleser 1952'
      },
      ancestryIndication: {
        traitsObserved: '',
        methodCode: 'Hefner 2009',
        bibliographicRef: 'Hefner 2009'
      }
    },
    odontogram: [],
    ...overrides
  };
}

function baseCollection(overrides: Partial<OsteologicalCollection> = {}): OsteologicalCollection {
  return {
    nic: 'NIC-2026-0001',
    currentPhase: 4,
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
      individuals: [],
      skeletalElements: []
    },
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
    phase6: { finalLocations: [], publicQrActive: false },
    ...overrides
  } as unknown as OsteologicalCollection;
}

function makeUser(role: UserProfile['role'], overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'usr-1',
    name: 'Dra. Curadora',
    role,
    institution: 'INC/DITEC/PF',
    email: 'curadora@inc.pf.gov.br',
    ...overrides
  };
}

describe('Phase4Curadoria', () => {
  it('renderiza com dados válidos (papel Curador), mostrando indivíduo cadastrado e as abas', () => {
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: []
      }
    } as any);

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('curador')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    expect(screen.getByText('IND-01')).toBeInTheDocument();
    expect(screen.getByText(/Indivíduos & Perfil Biológico/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventário & Completude Esquelética/i)).toBeInTheDocument();
    expect(screen.getByText(/Odontograma \(FDI/i)).toBeInTheDocument();
    expect(screen.getByText(/Foto Montagem Completa/i)).toBeInTheDocument();
  });

  it('não permite assinar/aprovar quando o papel não é curador — nem para administrador', () => {
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: [],
        completeAssemblyPhotoApproved: {
          photoUrl: 'https://example.com/foto.jpg',
          capturedAt: new Date().toISOString(),
          approvedBy: 'Dra. Curadora',
          approvedAt: new Date().toISOString(),
          sha256Hash: 'abc123',
          resolution: '4032x3024'
        }
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('administrador')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    const signButton = screen.getByRole('button', { name: /Assinar Fechamento da Fase 4/i });
    expect(signButton).toBeDisabled();
  });

  it('sem indivíduo cadastrado, o Curador ainda pode confirmar a Montagem (foto aprovada), mas a fase não trava sem o Inventário', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [],
        skeletalElements: [],
        completeAssemblyPhotoApproved: {
          photoUrl: 'https://example.com/foto.jpg',
          capturedAt: new Date().toISOString(),
          approvedBy: 'Dra. Curadora',
          approvedAt: new Date().toISOString(),
          sha256Hash: 'abc123',
          resolution: '4032x3024'
        }
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('curador')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    // Botão habilitado — a Montagem está pronta pra confirmar, mesmo sem indivíduo.
    const signButton = screen.getByRole('button', { name: /Assinar Fechamento da Fase 4/i });
    expect(signButton).toBeEnabled();
    await user.click(signButton);
    // Sem a opção de escolher — sem indivíduo, só a Montagem está disponível, mesmo pro Curador.
    expect(screen.queryByLabelText(/Qual responsabilidade deseja confirmar agora\?/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Confirmar Minha Assinatura/i }));

    expect(onUpdateCollection).toHaveBeenCalled();
    const updated = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0];
    expect(updated.phase4.technicianAssemblySign).toBeTruthy();
    expect(updated.phase4.curatorInventorySign).toBeUndefined();
    // Sem as duas confirmações, a fase não trava nem avança.
    expect(updated.currentPhase).toBe(4);
    expect(updated.signatures.find((s: any) => s.phaseNumber === 4)).toBeUndefined();
  });

  it('sem a foto de montagem aprovada, o Curador ainda pode confirmar o Inventário (com indivíduo), mas a fase não trava sem a Montagem', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: []
        // completeAssemblyPhotoApproved ausente de propósito
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('curador')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    const signButton = screen.getByRole('button', { name: /Assinar Fechamento da Fase 4/i });
    expect(signButton).toBeEnabled();
    await user.click(signButton);
    expect(screen.queryByLabelText(/Qual responsabilidade deseja confirmar agora\?/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Confirmar Minha Assinatura/i }));

    expect(onUpdateCollection).toHaveBeenCalled();
    const updated = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0];
    expect(updated.phase4.curatorInventorySign).toBeTruthy();
    expect(updated.phase4.technicianAssemblySign).toBeUndefined();
    expect(updated.currentPhase).toBe(4);
    expect(updated.signatures.find((s: any) => s.phaseNumber === 4)).toBeUndefined();
  });

  it('Técnico confirma a Montagem e Curador confirma o Inventário — só então a fase trava e avança', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const collectionReadyForBoth = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: [],
        completeAssemblyPhotoApproved: {
          photoUrl: 'https://example.com/foto.jpg',
          capturedAt: new Date().toISOString(),
          approvedBy: 'Fulano Técnico',
          approvedAt: new Date().toISOString(),
          sha256Hash: 'abc123',
          resolution: '4032x3024'
        }
      } as any
    });

    // Técnico confirma a Montagem primeiro.
    const { unmount } = render(
      <Phase4Curadoria
        collection={collectionReadyForBoth}
        currentUser={makeUser('tecnico', { name: 'Fulano Técnico' })}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /Assinar Fechamento da Fase 4/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Minha Assinatura/i }));
    const afterTecnico = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0];
    expect(afterTecnico.phase4.technicianAssemblySign).toBeTruthy();
    expect(afterTecnico.currentPhase).toBe(4);
    unmount();

    // Curador confirma o Inventário em seguida, sobre o estado já com a Montagem confirmada.
    render(
      <Phase4Curadoria
        collection={afterTecnico}
        currentUser={makeUser('curador')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /Assinar Fechamento da Fase 4/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar Minha Assinatura/i }));

    const finalUpdate = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0];
    expect(finalUpdate.phase4.curatorInventorySign).toBeTruthy();
    expect(finalUpdate.phase4.curationVersionStatus).toBe('aprovada');
    expect(finalUpdate.currentPhase).toBe(5);
    const phase4Signature = finalUpdate.signatures.find((s: any) => s.phaseNumber === 4);
    expect(phase4Signature?.status).toBe('locked');
  });

  it('ao criar um novo indivíduo (Curador), chama onUpdateCollection', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const collection = baseCollection();

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('curador')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    await user.click(screen.getByRole('button', { name: /\+ Novo/i }));

    expect(onUpdateCollection).toHaveBeenCalledTimes(1);
    const updated = onUpdateCollection.mock.calls[0][0];
    expect(updated.phase4.individuals).toHaveLength(1);
  });

  it('ao editar a justificativa científica do indivíduo (Curador), chama onUpdateCollection', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: []
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('curador')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    const justificationInput = screen.getByDisplayValue('Concordância anatômica e antimeria.');
    await user.type(justificationInput, ' Revisado.');

    expect(onUpdateCollection).toHaveBeenCalled();
  });

  it('estudante pode editar (campo habilitado) mas não vê o botão de assinatura habilitado', () => {
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: [],
        completeAssemblyPhotoApproved: {
          photoUrl: 'https://example.com/foto.jpg',
          capturedAt: new Date().toISOString(),
          approvedBy: 'Dra. Curadora',
          approvedAt: new Date().toISOString(),
          sha256Hash: 'abc123',
          resolution: '4032x3024'
        }
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('estudante')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    const justificationInput = screen.getByDisplayValue('Concordância anatômica e antimeria.');
    expect(justificationInput).not.toBeDisabled();

    const signButton = screen.getByRole('button', { name: /Assinar Fechamento da Fase 4/i });
    expect(signButton).toBeDisabled();
  });

  it('Técnico tem acesso à aba Montagem e pode aprovar a foto oficial (decisão de acesso, out/2026)', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [],
        skeletalElements: []
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('tecnico')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    await user.click(screen.getByRole('button', { name: /Foto Montagem Completa/i }));
    await user.click(screen.getByRole('button', { name: /Capturar & Aprovar Foto Agora/i }));

    expect(onUpdateCollection).toHaveBeenCalled();
    const updated = onUpdateCollection.mock.calls[0][0];
    expect(updated.phase4.completeAssemblyPhotoApproved).toBeTruthy();
  });

  it('Técnico não edita Indivíduos/Inventário/Odontograma — acesso novo é só a aba Montagem', () => {
    const collection = baseCollection({
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: 'x',
        individuals: [makeIndividual()],
        skeletalElements: []
      } as any
    });

    render(
      <Phase4Curadoria
        collection={collection}
        currentUser={makeUser('tecnico')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    const justificationInput = screen.getByDisplayValue('Concordância anatômica e antimeria.');
    expect(justificationInput).toBeDisabled();
  });
});
