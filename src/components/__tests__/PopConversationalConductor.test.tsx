// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PopConversationalConductor } from '../PopConversationalConductor';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import { OsteologicalCollection, UserProfile } from '../../types/sgccco';

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

function makeUser(): UserProfile {
  return {
    id: 'user-1',
    name: 'Fulano de Tal',
    role: 'tecnico',
    institution: 'INC/DITEC/PF',
    email: 'fulano@inc.pf.gov.br'
  };
}

// jsdom não implementa scrollIntoView, chamado a cada nova mensagem do chat.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('PopConversationalConductor — captura real de fotos (sem placeholder de terceiros)', () => {
  it('botão de atalho de foto (barra inferior) faz upload real do arquivo escolhido, sem URL fixa', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0020');
    const onUpdateCollection = vi.fn();

    const savedCollection: OsteologicalCollection = {
      ...collection,
      phase1: {
        ...collection.phase1,
        photos: [
          {
            id: 'photo-real-1',
            category: 'pop1_passo1',
            author: 'Fulano de Tal',
            timestamp: new Date().toISOString(),
            url: '/api/collections/NIC-TEST-0020/photos/photo-real-1/file',
            sha256Hash: 'hash-real-do-arquivo-enviado'
          }
        ]
      }
    } as unknown as OsteologicalCollection;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ collection: savedCollection, photo: savedCollection.phase1.photos![0] })
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(
      <PopConversationalConductor
        collection={collection}
        currentUser={makeUser()}
        phaseNumber={1}
        onUpdateCollection={onUpdateCollection}
      />
    );

    await user.click(screen.getByTitle('Capturar foto de registro'));

    // Pergunta explicitamente câmera ou galeria, nunca abre a câmera direto.
    expect(screen.getByText('Registrar foto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir câmera/i }));
    expect(screen.queryByText('Registrar foto')).not.toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"][capture]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['bytes-da-foto'], 'foto.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/collections/${collection.nic}/photos`,
      expect.objectContaining({ method: 'POST' })
    );
    const sentBody = fetchMock.mock.calls[0][1].body as FormData;
    expect(sentBody.get('phase')).toBe('phase1');
    expect(sentBody.get('photo')).toBe(file);

    expect(await screen.findByText(/Fotografia anexada com sucesso/i)).toBeInTheDocument();
    const lastUpdate = onUpdateCollection.mock.calls.at(-1)?.[0] as OsteologicalCollection;
    expect(lastUpdate.phase1.photos.some((p) => p.sha256Hash === 'hash-real-do-arquivo-enviado')).toBe(true);

    vi.unstubAllGlobals();
  });

  it('botão "Fotografar" de um item do checklist (Passo 2) faz upload real e marca o campo correspondente como "sim"', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0021');
    const onUpdateCollection = vi.fn();

    const savedCollection: OsteologicalCollection = {
      ...collection,
      phase1: {
        ...collection.phase1,
        photos: [
          {
            id: 'photo-real-2',
            category: 'foto1_saco_fechado',
            author: 'Fulano de Tal',
            timestamp: new Date().toISOString(),
            url: '/api/collections/NIC-TEST-0021/photos/photo-real-2/file',
            sha256Hash: 'hash-real-foto1'
          }
        ]
      }
    } as unknown as OsteologicalCollection;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ collection: savedCollection, photo: savedCollection.phase1.photos![0] })
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(
      <PopConversationalConductor
        collection={collection}
        currentUser={makeUser()}
        phaseNumber={1}
        onUpdateCollection={onUpdateCollection}
      />
    );

    // Avança do Passo 1 (identificação) para o Passo 2 (checklist fotográfico),
    // respondendo equipe/data/hora pelo campo de texto.
    const textInput = screen.getByPlaceholderText(/responda ao condutor/i);
    await user.type(textInput, 'Equipe: Técnico João. Hoje, 09h15min.');
    await user.click(screen.getByTitle(/enviar resposta ao condutor/i));

    const fotografarButtons = await screen.findAllByRole('button', { name: /^fotografar$/i });
    expect(fotografarButtons.length).toBeGreaterThan(0);
    await user.click(fotografarButtons[0]); // Foto 1 — Saco fechado com lacre e escala

    await user.click(screen.getByRole('button', { name: /anexar foto/i }));

    const fileInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const file = new File(['bytes-da-foto-1'], 'foto1.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/collections/${collection.nic}/photos`,
      expect.objectContaining({ method: 'POST' })
    );
    const sentBody = fetchMock.mock.calls[0][1].body as FormData;
    expect(sentBody.get('category')).toBe('foto1_saco_fechado');

    const lastUpdate = onUpdateCollection.mock.calls.at(-1)?.[0] as OsteologicalCollection;
    expect(lastUpdate.phase1.foto1SacoFechado.value).toBe('sim');

    vi.unstubAllGlobals();
  });

  it('narrar "foto do saco fechado feita" não marca o campo sem uma foto real — exige o botão de captura', async () => {
    const user = userEvent.setup();
    const collection = baseCollection('NIC-TEST-0022');
    const onUpdateCollection = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <PopConversationalConductor
        collection={collection}
        currentUser={makeUser()}
        phaseNumber={1}
        onUpdateCollection={onUpdateCollection}
      />
    );

    const textInput = screen.getByPlaceholderText(/responda ao condutor/i);
    await user.type(textInput, 'Equipe: Técnico João. Hoje, 09h15min.');
    await user.click(screen.getByTitle(/enviar resposta ao condutor/i));

    await screen.findByText(/Checklist fotográfico/i);

    const textInput2 = screen.getByPlaceholderText(/responda ao condutor/i);
    await user.type(textInput2, 'Foto do saco fechado feita.');
    await user.click(screen.getByTitle(/enviar resposta ao condutor/i));

    expect(fetchMock).not.toHaveBeenCalled();
    const anyUpdateSetFoto1 = onUpdateCollection.mock.calls.some(
      (call) => (call[0] as OsteologicalCollection).phase1.foto1SacoFechado?.value === 'sim'
    );
    expect(anyUpdateSetFoto1).toBe(false);

    vi.unstubAllGlobals();
  });
});
