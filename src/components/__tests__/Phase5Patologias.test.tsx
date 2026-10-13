// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase5Patologias } from '../Phase5Patologias';
import type { OsteologicalCollection, UserProfile } from '../../types/sgccco';

function baseCollection(overrides: Partial<OsteologicalCollection['phase5']> = {}): OsteologicalCollection {
  return {
    nic: 'NIC-PHASE5-0001',
    currentPhase: 5,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1: {
      preliminaryBoxes: []
    },
    phase2: {},
    phase3: { boxLocations: [] },
    phase4: {
      curationVersionNumber: 1,
      curationVersionStatus: 'rascunho',
      curatorAuthor: 'x',
      individuals: [{ id: 'ind-1' }],
      skeletalElements: [
        {
          id: 'elem-1',
          anatomicalCode: 'FEM-D',
          namePt: 'Fêmur Direito',
          region: 'membros_inferiores',
          side: 'direito',
          presence: 'completo',
          preservationQuality: 'boa',
          associationMethod: 'morfologico',
          associationConfidence: 'alta',
          associationJustification: 'x',
          observations: ''
        }
      ]
    },
    phase5: {
      pathologies: [],
      complementaryExams: [],
      physicalBoneMarking: { techniqueUsed: 'Tinta nanquim', completed: false, elementsMarkedCount: 0 },
      finalPackagingInertMaterial: { materialUsed: 'Ethafoam', boxesCompletedCount: 0 },
      phase5Checklist: {
        pathologiesReviewed: false,
        examsAttached: false,
        finalPhotosRegistered: false,
        boneMarkingCompleted: false,
        inertPackagingCompleted: false
      },
      ...overrides
    },
    phase6: { finalLocations: [], publicQrActive: false }
  } as unknown as OsteologicalCollection;
}

function userWithRole(role: UserProfile['role']): UserProfile {
  return { id: 'user-1', name: 'Pessoa de Teste', role, institution: 'INC/DITEC/PF', email: 'teste@inc.pf.gov.br' };
}

const fullChecklist = {
  pathologiesReviewed: true,
  examsAttached: true,
  finalPhotosRegistered: true,
  boneMarkingCompleted: true,
  inertPackagingCompleted: true
};

describe('Phase5Patologias', () => {
  it('renderiza os elementos principais com dados válidos', () => {
    const collection = baseCollection({
      pathologies: [
        {
          id: 'pat-1',
          category: 'trauma_antemortem',
          termControlled: 'Fratura consolidada com calo ósseo',
          associatedElementCode: 'FEM-D',
          notes: 'Calo ósseo visível na diáfise.'
        } as any
      ]
    });

    render(
      <Phase5Patologias
        collection={collection}
        currentUser={userWithRole('curador')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    expect(screen.getByText('NIC-PHASE5-0001')).toBeInTheDocument();
    expect(screen.getByText(/Alterações Ósseas & Traumas \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Exames & DICOM \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Marcação Física & Embalagem/)).toBeInTheDocument();
    expect(screen.getByText(/Checklist Determinístico \(0\/5\)/)).toBeInTheDocument();
    expect(screen.getByText('Fratura consolidada com calo ósseo')).toBeInTheDocument();
  });

  it('não libera nenhuma das duas assinaturas enquanto o checklist não está 100% completo', async () => {
    const collection = baseCollection(); // checklist todo falso
    const user = userEvent.setup();

    render(
      <Phase5Patologias
        collection={collection}
        currentUser={userWithRole('curador')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    // Curador: canSignScientific e canSignPhysical seriam ambos verdadeiros se não fosse
    // pelo checklist incompleto — o botão de assinatura deve estar desabilitado.
    const signButton = screen.getByRole('button', { name: /Assinar Fechamento da Fase 5/i });
    expect(signButton).toBeDisabled();

    // Completar 4 dos 5 itens ainda não libera a assinatura (precisa ser 100%).
    await user.click(screen.getByText(/Checklist Determinístico/));
    await user.click(screen.getByText(/1\. Revisão e homologação curatorial de patologias e traumas/));
    await user.click(screen.getByText(/2\. Vinculação de exames complementares/));
    await user.click(screen.getByText(/3\. Registro de fotografias finais/));
    await user.click(screen.getByText(/4\. Marcação óssea física/));

    expect(screen.getByRole('button', { name: /Assinar Fechamento da Fase 5/i })).toBeDisabled();
  });

  it('assinatura científica só é disponível para curador e a física só para técnico/curador; uma assinatura já registrada não volta a ficar disponível', async () => {
    const user = userEvent.setup();

    // Papel não-curador e não-técnico-habilitado explicitamente, mas 'tecnico' já conta
    // como habilitado a assinar a parte física. Checklist 100% completo.
    const collectionTecnico = baseCollection({ phase5Checklist: fullChecklist });
    const { unmount } = render(
      <Phase5Patologias
        collection={collectionTecnico}
        currentUser={userWithRole('tecnico')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    // Técnico (não curador): assinatura científica não deve estar disponível, só a física.
    const signButtonTecnico = screen.getByRole('button', { name: /Assinar Fechamento da Fase 5/i });
    expect(signButtonTecnico).toBeEnabled();
    await user.click(signButtonTecnico);
    // Sem a opção de escolher entre científica/física — só a física está disponível para o técnico.
    expect(screen.queryByLabelText(/Qual responsabilidade deseja confirmar agora\?/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Confirmação atual: física e embalagem\./i)).toBeInTheDocument();
    unmount();

    // Mesmo técnico, mas a assinatura física já foi registrada no fixture — não deve
    // sobrar nenhuma ação disponível (ele não pode assinar a científica).
    const collectionTecnicoJaAssinado = baseCollection({
      phase5Checklist: fullChecklist,
      technicianPhysicalSign: { signedByName: 'Outro Técnico', signedAt: new Date().toISOString(), sha256Hash: 'hash-x' }
    });
    render(
      <Phase5Patologias
        collection={collectionTecnicoJaAssinado}
        currentUser={userWithRole('tecnico')}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );
    expect(screen.getByRole('button', { name: /Assinar Fechamento da Fase 5/i })).toBeDisabled();
  });

  it('chama onUpdateCollection ao marcar um item do checklist', async () => {
    const collection = baseCollection();
    const onUpdateCollection = vi.fn();
    const user = userEvent.setup();

    render(
      <Phase5Patologias
        collection={collection}
        currentUser={userWithRole('curador')}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    await user.click(screen.getByText(/Checklist Determinístico/));
    await user.click(screen.getByText(/1\. Revisão e homologação curatorial de patologias e traumas/));

    expect(onUpdateCollection).toHaveBeenCalledTimes(1);
    const updated = onUpdateCollection.mock.calls[0][0] as OsteologicalCollection;
    expect(updated.phase5.phase5Checklist?.pathologiesReviewed).toBe(true);
  });
});
