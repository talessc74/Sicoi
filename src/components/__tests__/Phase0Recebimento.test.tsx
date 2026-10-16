// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase0Recebimento } from '../Phase0Recebimento';
import { createEmptyPhase0Data, createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import { OsteologicalCollection, UserProfile, UserRole } from '../../types/sgccco';
import { calculateSha256, generateSignaturePayload } from '../../services/auditService';

function baseCollection(overrides: Partial<OsteologicalCollection> = {}): OsteologicalCollection {
  return {
    nic: 'NIC-2026-0900',
    currentPhase: 0,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: {},
    phase0: createEmptyPhase0Data(),
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
    phase6: { finalLocations: [], publicQrActive: false },
    ...overrides
  } as OsteologicalCollection;
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

function ControlledWrapper({
  initialCollection,
  currentUser,
  onUpdateCollection
}: {
  initialCollection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
}) {
  const [collection, setCollection] = useState(initialCollection);
  return (
    <Phase0Recebimento
      collection={collection}
      currentUser={currentUser}
      laboratoryMode={false}
      onUpdateCollection={(updated) => {
        setCollection(updated);
        onUpdateCollection(updated);
      }}
    />
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// Os TextInput do formulário não associam <label> e <input> via "for"/"id",
// então getByLabelText não funciona aqui (mesma convenção de
// Phase1Recebimento.test.tsx) — localiza o <input> irmão do <label> pelo texto.
function getInputByLabelText(labelText: RegExp): HTMLInputElement {
  const label = screen.getByText(labelText);
  const input = label.parentElement?.querySelector('input');
  if (!input) throw new Error(`Nenhum <input> encontrado junto ao label "${labelText}"`);
  return input as HTMLInputElement;
}

describe('Phase0Recebimento', () => {
  it('técnico preenche o nome manualmente e assina a Fase 0, travando e liberando a Fase 1', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    render(
      <ControlledWrapper
        initialCollection={baseCollection()}
        currentUser={makeUser('tecnico')}
        onUpdateCollection={onUpdateCollection}
      />
    );

    const nomeInput = getInputByLabelText(/^Nome completo$/i);
    await user.type(nomeInput, 'Maria da Gloria Marins');
    expect(onUpdateCollection.mock.calls.at(-1)?.[0].phase0.nome).toBe('Maria da Gloria Marins');

    await user.click(screen.getByRole('button', { name: /Assinar Fechamento da Fase 0/i }));
    await user.click(screen.getByRole('checkbox', { name: /revisei os dados acima/i }));
    await user.click(screen.getByRole('button', { name: /Confirmar e Gerar Hash SHA-256/i }));

    const finalUpdate = onUpdateCollection.mock.calls.at(-1)?.[0];
    expect(finalUpdate.currentPhase).toBe(1);
    const sig = finalUpdate.signatures.find((s: any) => s.phaseNumber === 0);
    expect(sig.status).toBe('locked');
    expect(sig.signedByName).toBe('Fulano de Tal');

    // Mesma checagem que o servidor faz de verdade (db/historyGuard.ts
    // verifyNewSignature): o hash tem que bater com o conteúdo de phase0
    // EXATAMENTE como foi salvo — nunca com uma versão de antes ou de depois
    // de embutir algo a mais nela (bug real encontrado em produção, COI-146).
    const payload = generateSignaturePayload({
      nic: finalUpdate.nic,
      phaseNumber: 0,
      signedBy: sig.signedBy,
      role: sig.signedByRole,
      timestamp: sig.signedAt,
      dataSnapshotJson: JSON.stringify(finalUpdate.phase0)
    });
    expect(await calculateSha256(payload)).toBe(sig.sha256Hash);
  });

  it('pesquisador e estudante não veem a Fase 0 (dados da DO restritos a Técnico, Curador e Administrador)', async () => {
    for (const role of ['pesquisador', 'estudante'] as const) {
      const { unmount } = render(
        <ControlledWrapper
          initialCollection={baseCollection()}
          currentUser={makeUser(role)}
          onUpdateCollection={vi.fn()}
        />
      );
      expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Nome completo$/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Assinar Fechamento da Fase 0/i })).toBeNull();
      unmount();
    }
  });

  it('conjunto que chega do servidor sem os dados (redacted) mostra só o aviso de acesso restrito', () => {
    const collection = baseCollection();
    collection.phase0 = { filhos: [], redacted: true };
    render(
      <ControlledWrapper initialCollection={collection} currentUser={makeUser('tecnico')} onUpdateCollection={vi.fn()} />
    );
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
  });

  it('ao adicionar e remover um filho, atualiza a lista estruturada', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    render(
      <ControlledWrapper
        initialCollection={baseCollection()}
        currentUser={makeUser('tecnico')}
        onUpdateCollection={onUpdateCollection}
      />
    );

    await user.click(screen.getByRole('button', { name: /Adicionar filho/i }));
    let update = onUpdateCollection.mock.calls.at(-1)?.[0];
    expect(update.phase0.filhos).toHaveLength(1);

    const nomeFilhoInput = screen.getByPlaceholderText('Nome');
    await user.type(nomeFilhoInput, 'Roseli');
    update = onUpdateCollection.mock.calls.at(-1)?.[0];
    expect(update.phase0.filhos[0].nome).toBe('Roseli');

    await user.click(screen.getByRole('button', { name: /Remover filho/i }));
    update = onUpdateCollection.mock.calls.at(-1)?.[0];
    expect(update.phase0.filhos).toHaveLength(0);
  });

  it('ao importar foto da D.O., extrai e preenche os campos reais sem inventar os que faltam no documento', async () => {
    const user = userEvent.setup();
    const onUpdateCollection = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        fields: {
          nome: 'MARIA DA GLORIA MARINS',
          sexo: 'F',
          cpf: '224.425.028-87',
          naturalCidade: 'Ponta Grossa',
          naturalUf: 'PR'
        }
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(
      <ControlledWrapper
        initialCollection={baseCollection()}
        currentUser={makeUser('tecnico')}
        onUpdateCollection={onUpdateCollection}
      />
    );

    await user.click(screen.getByRole('button', { name: /Importar Foto da D\.O\./i }));
    await user.click(screen.getByRole('button', { name: /Selecionar Foto/i }));
    await user.click(screen.getByRole('button', { name: /Abrir Câmera/i }));

    const fileInput = container.querySelector('input[type="file"][capture]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['bytes-da-do'], 'do.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/phase0/extract-death-certificate',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      const update = onUpdateCollection.mock.calls.at(-1)?.[0];
      expect(update.phase0.nome).toBe('MARIA DA GLORIA MARINS');
      expect(update.phase0.cpf).toBe('224.425.028-87');
      expect(update.phase0.naturalUf).toBe('PR');
    });

    // Volta pro modo manual automaticamente pra revisão, mostrando o aviso.
    await waitFor(() => {
      expect(screen.getByText(/campo\(s\) preenchido\(s\) a partir da foto/i)).toBeInTheDocument();
    });
  });
});
