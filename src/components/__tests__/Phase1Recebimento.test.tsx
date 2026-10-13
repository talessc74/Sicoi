// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase1Recebimento } from '../Phase1Recebimento';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import { OsteologicalCollection, UserProfile, UserRole } from '../../types/sgccco';

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 1,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1: createEmptyPhase1Data(),
    phase2: createEmptyPhase2Data(),
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
}

function makeUser(role: UserRole, overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    name: 'Fulano de Tal',
    role,
    institution: 'INC/DITEC/PF',
    email: 'fulano@inc.pf.gov.br',
    ...overrides
  };
}

// jsdom não implementa scrollIntoView; o condutor conversacional (modo padrão do
// componente) chama isso a cada mensagem, então precisa de um stub antes de renderizar.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Como Phase1Recebimento é controlado pela prop `collection`, digitar vários
// caracteres só reflete corretamente quando o `onUpdateCollection` reaplica o
// resultado como nova prop — exatamente como o App.tsx real faz. Este wrapper
// mantém esse estado localmente e ainda encaminha cada chamada para o spy.
function ControlledWrapper({
  initialCollection,
  currentUser,
  onUpdateCollection,
  laboratoryMode = false
}: {
  initialCollection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode?: boolean;
}) {
  const [collection, setCollection] = useState(initialCollection);
  return (
    <Phase1Recebimento
      collection={collection}
      currentUser={currentUser}
      laboratoryMode={laboratoryMode}
      onUpdateCollection={(updated) => {
        setCollection(updated);
        onUpdateCollection(updated);
      }}
    />
  );
}

async function goToFormMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /formulário a\.1 manual/i }));
}

// Os TextInput do formulário não associam <label> e <input> via "for"/"id", então
// getByLabelText não funciona aqui. Localiza o <input> irmão do <label> pelo texto.
function getInputByLabelText(labelText: RegExp): HTMLInputElement {
  const label = screen.getByText(labelText);
  const input = label.parentElement?.querySelector('input');
  if (!input) throw new Error(`Nenhum <input> encontrado junto ao label "${labelText}"`);
  return input as HTMLInputElement;
}

describe('Phase1Recebimento', () => {
  it('renderiza o formulário com os campos principais da Fase 1', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0001');
    const currentUser = makeUser('tecnico');

    render(
      <Phase1Recebimento
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    expect(screen.getByText('NIC-TEST-0001')).toBeInTheDocument();

    await goToFormMode(user);

    expect(
      screen.getByText('Formulário A.1 — Análise Preliminar e Limpeza dos Remanescentes Ósseos')
    ).toBeInTheDocument();
    expect(getInputByLabelText(/Equipe envolvida na limpeza/i)).toBeInTheDocument();
    expect(getInputByLabelText(/^Data \*/i)).toBeInTheDocument();
    expect(getInputByLabelText(/Hora \(ex: 11h20min\)/i)).toBeInTheDocument();
  });

  it('bloqueia a assinatura quando o papel ativo não é Técnico, Pesquisador nem Curador', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0002');
    const currentUser = makeUser('estudante');

    render(
      <Phase1Recebimento
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    await goToFormMode(user);

    const signButton = screen.getByRole('button', { name: /revisar & assinar fase 1/i });
    expect(signButton).toBeDisabled();

    expect(
      screen.getByText((text) => text.includes('"estudante"') && text.includes('Técnico ou Curador pode assinar'))
    ).toBeInTheDocument();
  });

  it('não bloqueia a assinatura do Pesquisador por papel (decisão de acesso, out/2026: mesmos acessos do Técnico)', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0002B');
    const currentUser = makeUser('pesquisador');

    render(
      <Phase1Recebimento
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    await goToFormMode(user);

    expect(
      screen.queryByText((text) => text.includes('"pesquisador"') && text.includes('Técnico ou Curador pode assinar'))
    ).not.toBeInTheDocument();
  });

  it('chama onUpdateCollection com os dados atualizados ao preencher um campo do formulário', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0003');
    const currentUser = makeUser('tecnico');
    const onUpdateCollection = vi.fn();

    render(
      <ControlledWrapper
        initialCollection={collection}
        currentUser={currentUser}
        onUpdateCollection={onUpdateCollection}
      />
    );

    await goToFormMode(user);

    const equipeInput = getInputByLabelText(/Equipe envolvida na limpeza/i);
    await user.type(equipeInput, 'Equipe Alfa');

    expect(onUpdateCollection).toHaveBeenCalled();
    const lastCallArg = onUpdateCollection.mock.calls[onUpdateCollection.mock.calls.length - 1][0] as OsteologicalCollection;
    expect(lastCallArg.phase1.equipeEnvolvidaLimpeza.value).toBe('Equipe Alfa');
    // O restante da coleção permanece intacto na atualização.
    expect(lastCallArg.nic).toBe('NIC-TEST-0003');
  });

  it('mostra os dados de origem legal para o Curador', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0004');
    collection.legalOrigin = {
      originInstitution: 'Instituto X',
      cemeteryName: 'Cemitério da Paz',
      cemeteryPlot: 'Jazigo 42',
      deathDeclarationNumber: 'DO-123'
    };
    const currentUser = makeUser('curador');

    render(
      <Phase1Recebimento
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    await goToFormMode(user);

    expect(screen.getByText('Cemitério da Paz')).toBeInTheDocument();
    expect(screen.getByText('Jazigo 42')).toBeInTheDocument();
    expect(screen.getByText('DO-123')).toBeInTheDocument();
  });

  it('não mostra os dados de origem legal para o Técnico', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0005');
    collection.legalOrigin = {
      originInstitution: 'Instituto X',
      cemeteryName: 'Cemitério da Paz',
      cemeteryPlot: 'Jazigo 42',
      deathDeclarationNumber: 'DO-123'
    };
    const currentUser = makeUser('tecnico');

    render(
      <Phase1Recebimento
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    await goToFormMode(user);

    expect(screen.queryByText('Cemitério da Paz')).not.toBeInTheDocument();
    expect(screen.queryByText('Jazigo 42')).not.toBeInTheDocument();
    expect(screen.queryByText('DO-123')).not.toBeInTheDocument();
    expect(screen.getByText('Conteúdo Criptografado & Segregado')).toBeInTheDocument();
  });
});
