// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase3Acondicionamento } from '../Phase3Acondicionamento';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import {
  OsteologicalCollection,
  Phase4Data,
  Phase5Data,
  Phase6Data,
  PreliminaryBox,
  UserProfile
} from '../../types/sgccco';

function emptyPhase4(): Phase4Data {
  return {
    curationVersionNumber: 1,
    curationVersionStatus: 'rascunho',
    curatorAuthor: '',
    individuals: [],
    skeletalElements: []
  } as unknown as Phase4Data;
}

function emptyPhase5(): Phase5Data {
  return {
    pathologies: [],
    complementaryExams: [],
    physicalBoneMarking: { techniqueUsed: '', completed: false, elementsMarkedCount: 0 },
    finalPackagingInertMaterial: { materialUsed: '', boxesCompletedCount: 0 },
    phase5Checklist: {
      pathologiesReviewed: false,
      examsAttached: false,
      finalPhotosRegistered: false,
      boneMarkingCompleted: false,
      inertPackagingCompleted: false
    }
  } as unknown as Phase5Data;
}

function emptyPhase6(): Phase6Data {
  return { finalLocations: [], publicQrActive: false } as unknown as Phase6Data;
}

function makeBox(id: string, boxCode: string): PreliminaryBox {
  return {
    id,
    boxCode,
    presumedIndividualLabel: 'IND-01',
    currentLocation: 'Bancada de Secagem',
    qrCode: `qr-${id}`
  };
}

function baseCollection(nic: string, boxes: PreliminaryBox[]): OsteologicalCollection {
  const phase1 = createEmptyPhase1Data();
  phase1.preliminaryBoxes = boxes;

  return {
    nic,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    currentPhase: 3,
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1,
    phase2: createEmptyPhase2Data(),
    phase3: { boxLocations: [] },
    phase4: emptyPhase4(),
    phase5: emptyPhase5(),
    phase6: emptyPhase6()
  };
}

function makeUser(role: UserProfile['role'], name = 'Fulano Técnico'): UserProfile {
  return {
    id: 'usr-1',
    name,
    role,
    institution: 'INC/DITEC/PF',
    email: 'fulano@inc.pf.gov.br'
  };
}

describe('Phase3Acondicionamento', () => {
  it('renderiza com dados válidos (papel Técnico): lista de caixas e campos de localização', () => {
    const collection = baseCollection('NIC-0001', [makeBox('box-1', 'CX-001')]);
    const user = makeUser('tecnico');

    render(
      <Phase3Acondicionamento
        collection={collection}
        allCollections={[collection]}
        currentUser={user}
        onUpdateCollection={vi.fn()}
      />
    );

    // Lista de caixas do conjunto (aparece no select de caixas e no cartão da lista)
    expect(screen.getAllByText('CX-001').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Aguardando alocação na estante')).toBeInTheDocument();

    // Campos de localização do formulário de leitura dupla
    expect(screen.getByText('Local *')).toBeInTheDocument();
    expect(screen.getByText('Sala *')).toBeInTheDocument();
    expect(screen.getByText('Estante *')).toBeInTheDocument();
    expect(screen.getByText('Prateleira *')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /assinar acondicionamento provisório/i })
    ).toBeInTheDocument();
  });

  it('desabilita a assinatura quando nem todas as caixas têm local alocado (Técnico)', () => {
    const collection = baseCollection('NIC-0002', [
      makeBox('box-1', 'CX-001'),
      makeBox('box-2', 'CX-002')
    ]);
    // Apenas a primeira caixa foi alocada.
    collection.phase3.boxLocations = [
      {
        boxId: 'box-1',
        location: { facility: 'Laboratório Central', room: 'Sala B-10', rack: 'Estante 04', shelf: 'Prateleira 02', boxSlot: 'Vão 01' },
        placedAt: new Date().toISOString(),
        technicianName: 'Fulano Técnico',
        shelfQrScanned: true
      }
    ];
    const user = makeUser('tecnico');

    render(
      <Phase3Acondicionamento
        collection={collection}
        allCollections={[collection]}
        currentUser={user}
        onUpdateCollection={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /assinar acondicionamento provisório/i })
    ).toBeDisabled();
  });

  it('desabilita a assinatura para papel sem permissão (estudante), mesmo com tudo alocado', () => {
    const collection = baseCollection('NIC-0003', [makeBox('box-1', 'CX-001')]);
    collection.phase3.boxLocations = [
      {
        boxId: 'box-1',
        location: { facility: 'Laboratório Central', room: 'Sala B-10', rack: 'Estante 04', shelf: 'Prateleira 02', boxSlot: 'Vão 01' },
        placedAt: new Date().toISOString(),
        technicianName: 'Fulano Técnico',
        shelfQrScanned: true
      }
    ];
    const user = makeUser('estudante');

    render(
      <Phase3Acondicionamento
        collection={collection}
        allCollections={[collection]}
        currentUser={user}
        onUpdateCollection={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /assinar acondicionamento provisório/i })
    ).toBeDisabled();
  });

  it('habilita a assinatura para o Pesquisador com tudo alocado (decisão de acesso, out/2026)', () => {
    const collection = baseCollection('NIC-0003B', [makeBox('box-1', 'CX-001')]);
    collection.phase3.boxLocations = [
      {
        boxId: 'box-1',
        location: { facility: 'Laboratório Central', room: 'Sala B-10', rack: 'Estante 04', shelf: 'Prateleira 02', boxSlot: 'Vão 01' },
        placedAt: new Date().toISOString(),
        technicianName: 'Fulano Técnico',
        shelfQrScanned: true
      }
    ];
    const user = makeUser('pesquisador');

    render(
      <Phase3Acondicionamento
        collection={collection}
        allCollections={[collection]}
        currentUser={user}
        onUpdateCollection={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /assinar acondicionamento provisório/i })
    ).toBeEnabled();
  });

  it('confirma a leitura dupla de QR e chama onUpdateCollection com o local alocado', async () => {
    const userEv = userEvent.setup();
    const collection = baseCollection('NIC-0004', [makeBox('box-1', 'CX-001')]);
    const onUpdateCollection = vi.fn();
    const user = makeUser('tecnico');

    render(
      <Phase3Acondicionamento
        collection={collection}
        allCollections={[collection]}
        currentUser={user}
        onUpdateCollection={onUpdateCollection}
      />
    );

    await userEv.click(
      screen.getByRole('button', { name: /confirmar leitura e guardar/i })
    );

    await waitFor(() => expect(onUpdateCollection).toHaveBeenCalledTimes(1));

    const updated = onUpdateCollection.mock.calls[0][0] as OsteologicalCollection;
    expect(updated.phase3.boxLocations).toHaveLength(1);
    expect(updated.phase3.boxLocations[0]).toMatchObject({
      boxId: 'box-1',
      location: {
        facility: 'Laboratório Central',
        room: 'Sala B-10',
        rack: 'Estante 04',
        shelf: 'Prateleira 02',
        boxSlot: 'Vão 01'
      },
      technicianName: 'Fulano Técnico',
      shelfQrScanned: true
    });
    expect(updated.custodyChain).toHaveLength(1);
    expect(updated.custodyChain[0].purpose).toBe('acondicionamento_provisorio');
  });

  it('lista a fila de curadoria e chama onSelectCollectionToCurate com o NIC correto ao clicar em "Curar"', async () => {
    const userEv = userEvent.setup();
    const collection = baseCollection('NIC-0005', [makeBox('box-1', 'CX-001')]);

    const waitingCollection = baseCollection('NIC-WAITING', [makeBox('box-9', 'CX-009')]);
    waitingCollection.signatures = [
      {
        phaseNumber: 3,
        signedBy: 'usr-1',
        signedByName: 'Fulano Técnico',
        signedByRole: 'tecnico',
        signedAt: new Date().toISOString(),
        sha256Hash: 'hash-abc',
        status: 'locked'
      }
    ];

    const onSelectCollectionToCurate = vi.fn();
    const user = makeUser('tecnico');

    render(
      <Phase3Acondicionamento
        collection={collection}
        allCollections={[collection, waitingCollection]}
        currentUser={user}
        onUpdateCollection={vi.fn()}
        onSelectCollectionToCurate={onSelectCollectionToCurate}
      />
    );

    expect(screen.getByText('NIC-WAITING')).toBeInTheDocument();

    await userEv.click(screen.getByRole('button', { name: /curar/i }));

    expect(onSelectCollectionToCurate).toHaveBeenCalledWith('NIC-WAITING');
  });
});
