// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase2Limpeza } from '../Phase2Limpeza';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import type { OsteologicalCollection, UserProfile, UserRole } from '../../types/sgccco';

// O modo conversacional (modo inicial do componente) usa um ref de scroll que o jsdom
// não implementa — não é algo específico do nosso teste, a conductor chama isso logo no
// efeito de montagem.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

function makeCollection(overrides?: Partial<OsteologicalCollection>): OsteologicalCollection {
  const phase1 = createEmptyPhase1Data();
  phase1.preliminaryBoxes = [
    { id: 'box-1', boxCode: 'CX-001', presumedIndividualLabel: 'IND-01', currentLocation: 'Sala A', qrCode: 'qr-1' }
  ];

  const phase2 = createEmptyPhase2Data();

  const base: OsteologicalCollection = {
    nic: 'NIC-TESTE-0001',
    currentPhase: 2,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1,
    phase2,
    phase3: { boxLocations: [] },
    phase4: { curationVersionNumber: 1, curationVersionStatus: 'rascunho', curatorAuthor: 'x', individuals: [], skeletalElements: [] },
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
    phase6: { finalLocations: [], publicQrActive: false }
  } as unknown as OsteologicalCollection;

  return { ...base, ...overrides };
}

function makeUser(role: UserRole = 'tecnico'): UserProfile {
  return { id: 'user-1', name: 'Pessoa de Teste', role, institution: 'INC/DITEC/PF', email: 'pessoa@inc.pf.gov.br' };
}

// Formulário manual filho (os campos obrigatórios e os botões de status de caixa) só
// aparece no modo "formulario" — o modo inicial é o conversacional.
async function switchToFormMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /formulário manual/i }));
}

// TextInput/DateInput/SelectInput neste componente usam um <label> sem "for" e sem
// aninhar o controle — só irmãos dentro do mesmo <div> — então getByLabelText não os
// associa. Busca o texto do rótulo e pega o input/select irmão logo a seguir.
function getControlByLabelText(labelPattern: RegExp): HTMLInputElement | HTMLSelectElement {
  const label = screen.getByText(labelPattern, { selector: 'label' });
  const control = label.nextElementSibling;
  if (!control) throw new Error(`Nenhum controle encontrado após o rótulo "${labelPattern}"`);
  return control as HTMLInputElement | HTMLSelectElement;
}

// Preenche todos os campos obrigatórios do Formulário A.2 e marca a única caixa como seca.
async function fillAllRequiredFieldsAndDryBox(user: ReturnType<typeof userEvent.setup>) {
  await user.type(getControlByLabelText(/equipe envolvida na limpeza/i), 'Equipe Alfa');
  await user.type(getControlByLabelText(/^data \*/i), '2026-01-10');
  await user.type(getControlByLabelText(/hora \(ex: 11h20min\)/i), '11h20min');
  await user.click(screen.getByRole('button', { name: /^esponja$/i }));
  await user.click(screen.getByRole('radio', { name: /não/i }));
  const dryingSelect = getControlByLabelText(/forma de secagem/i);
  await user.selectOptions(dryingSelect, 'estufa');
  await user.click(screen.getByRole('button', { name: /marcar como seca/i }));
}

describe('Phase2Limpeza', () => {
  it('renderiza os campos principais do Formulário A.2 com uma collection e usuário válidos', async () => {
    const user = userEvent.setup();
    const collection = makeCollection();
    render(
      <Phase2Limpeza collection={collection} currentUser={makeUser('tecnico')} onUpdateCollection={vi.fn()} laboratoryMode={false} />
    );

    expect(screen.getByText('NIC-TESTE-0001')).toBeInTheDocument();

    await switchToFormMode(user);

    expect(getControlByLabelText(/equipe envolvida na limpeza/i)).toBeInTheDocument();
    expect(getControlByLabelText(/forma de secagem/i)).toBeInTheDocument();
    expect(screen.getByText('CX-001')).toBeInTheDocument();
  });

  it('não permite assinar quando ainda falta alguma caixa secar, mesmo com papel de Técnico', async () => {
    const user = userEvent.setup();
    const collection = makeCollection();
    render(
      <Phase2Limpeza collection={collection} currentUser={makeUser('tecnico')} onUpdateCollection={vi.fn()} laboratoryMode={false} />
    );

    await switchToFormMode(user);
    // Preenche os campos obrigatórios mas deixa a caixa em "pendente" (nunca marcada como seca).
    await user.type(getControlByLabelText(/equipe envolvida na limpeza/i), 'Equipe Alfa');
    await user.type(getControlByLabelText(/^data \*/i), '2026-01-10');
    await user.type(getControlByLabelText(/hora \(ex: 11h20min\)/i), '11h20min');
    await user.click(screen.getByRole('button', { name: /^esponja$/i }));
    await user.click(screen.getByRole('radio', { name: /não/i }));
    await user.selectOptions(getControlByLabelText(/forma de secagem/i), 'estufa');

    const signButton = screen.getByRole('button', { name: /^assinar fase 2$/i });
    expect(signButton).toBeDisabled();
    expect(screen.getByText(/todas as caixas precisam estar com status "seca"/i)).toBeInTheDocument();
  });

  it('bloqueia a assinatura para um papel sem permissão (pesquisador), mesmo com tudo preenchido e seco', async () => {
    const user = userEvent.setup();
    const collection = makeCollection();
    render(
      <Phase2Limpeza collection={collection} currentUser={makeUser('pesquisador')} onUpdateCollection={vi.fn()} laboratoryMode={false} />
    );

    await switchToFormMode(user);
    await fillAllRequiredFieldsAndDryBox(user);

    const signButton = screen.getByRole('button', { name: /^assinar fase 2$/i });
    expect(signButton).toBeDisabled();
    expect(screen.getByText(/pesquisador.*Técnico ou Curador pode assinar a Fase 2/i)).toBeInTheDocument();
  });

  it('chama onUpdateCollection com o estado atualizado quando um campo do formulário é editado', async () => {
    const user = userEvent.setup();
    const collection = makeCollection();
    const onUpdateCollection = vi.fn();
    render(
      <Phase2Limpeza collection={collection} currentUser={makeUser('tecnico')} onUpdateCollection={onUpdateCollection} laboratoryMode={false} />
    );

    await switchToFormMode(user);
    await user.type(getControlByLabelText(/equipe envolvida na limpeza/i), 'E');

    expect(onUpdateCollection).toHaveBeenCalled();
    const lastCall = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0];
    expect(lastCall.phase2.equipeEnvolvidaLimpeza.value).toBe('E');
  });

  it('chama onUpdateCollection quando a caixa é marcada como seca', async () => {
    const user = userEvent.setup();
    const collection = makeCollection();
    const onUpdateCollection = vi.fn();
    render(
      <Phase2Limpeza collection={collection} currentUser={makeUser('tecnico')} onUpdateCollection={onUpdateCollection} laboratoryMode={false} />
    );

    await switchToFormMode(user);
    await user.click(screen.getByRole('button', { name: /marcar como seca/i }));

    expect(onUpdateCollection).toHaveBeenCalled();
    const lastCall = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0];
    expect(lastCall.phase2.boxDryingStatus).toEqual(
      expect.arrayContaining([expect.objectContaining({ boxId: 'box-1', cleaningStatus: 'seca' })])
    );
    expect(lastCall.phase2.dryingConfirmationAllBoxes).toBe(true);
  });
});
