// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase6Galpao } from '../Phase6Galpao';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import type { OsteologicalCollection, PhaseSignature, UserProfile } from '../../types/sgccco';

function lockedSignature(phaseNumber: PhaseSignature['phaseNumber']): PhaseSignature {
  return {
    phaseNumber,
    signedBy: 'usr-1',
    signedByName: 'Técnico de Teste',
    signedByRole: 'tecnico',
    signedAt: '2026-01-01T10:00:00.000Z',
    sha256Hash: 'hash-fase-' + phaseNumber,
    status: 'locked'
  };
}

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 6,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' },
    phase1: {
      ...createEmptyPhase1Data(),
      preliminaryBoxes: [
        { id: 'box-1', boxCode: 'CX-001', presumedIndividualLabel: 'IND-01', currentLocation: 'Sala A', qrCode: 'qr-1' }
      ]
    },
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
        pathologiesReviewed: true,
        examsAttached: true,
        finalPhotosRegistered: true,
        boneMarkingCompleted: true,
        inertPackagingCompleted: true
      }
    },
    phase6: { finalLocations: [], publicQrActive: false }
  } as unknown as OsteologicalCollection;
}

function fullySignedCollection(nic: string): OsteologicalCollection {
  const col = baseCollection(nic);
  col.signatures = [1, 2, 3, 4, 5].map((n) => lockedSignature(n as PhaseSignature['phaseNumber']));
  return col;
}

const currentUser: UserProfile = {
  id: 'usr-1',
  name: 'Técnico de Teste',
  role: 'tecnico',
  institution: 'INC/DITEC/PF',
  email: 'tecnico@inc.pf.gov.br'
};

describe('Phase6Galpao', () => {
  it('bloqueia o fluxo normal quando as fases anteriores/checklist não estão completas', () => {
    const collection = baseCollection('NIC-P6-0001'); // sem signatures, checklist incompleto não se aplica (sem assinaturas já basta)

    render(
      <Phase6Galpao
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    expect(screen.getByText(/Bloqueio Sequencial Mandatório/i)).toBeInTheDocument();
    const dispatchButton = screen.getByRole('button', { name: /Despachar em Trânsito para Galpão/i });
    expect(dispatchButton).toBeDisabled();
  });

  it('bloqueia mesmo com as 5 fases assinadas se o checklist da Fase 5 não estiver 100%', () => {
    const collection = fullySignedCollection('NIC-P6-0002');
    collection.phase5.phase5Checklist = {
      pathologiesReviewed: true,
      examsAttached: false,
      finalPhotosRegistered: true,
      boneMarkingCompleted: true,
      inertPackagingCompleted: true
    };

    render(
      <Phase6Galpao
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    expect(screen.getByText(/Bloqueio Sequencial Mandatório/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Despachar em Trânsito para Galpão/i })).toBeDisabled();
  });

  it('libera o fluxo normal da Fase 6 com as 5 fases assinadas e checklist 100%', () => {
    const collection = fullySignedCollection('NIC-P6-0003');

    render(
      <Phase6Galpao
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={vi.fn()}
        laboratoryMode={false}
      />
    );

    expect(screen.queryByText(/Bloqueio Sequencial Mandatório/i)).not.toBeInTheDocument();
    const dispatchButton = screen.getByRole('button', { name: /Despachar em Trânsito para Galpão/i });
    expect(dispatchButton).toBeEnabled();
    expect(screen.getByText(/Aguardando emissão de despacho pelo técnico transportador\./i)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando conferência e assinatura de aceite no Galpão\./i)).toBeInTheDocument();
  });

  it('ao despachar em trânsito, chama onUpdateCollection com deliveryReceiptCarrier preenchido', async () => {
    const user = userEvent.setup();
    const collection = fullySignedCollection('NIC-P6-0004');
    const onUpdateCollection = vi.fn();

    render(
      <Phase6Galpao
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    await user.click(screen.getByRole('button', { name: /Despachar em Trânsito para Galpão/i }));

    await waitFor(() => expect(onUpdateCollection).toHaveBeenCalledTimes(1));
    const updated = onUpdateCollection.mock.calls[0][0] as OsteologicalCollection;
    expect(updated.phase6.deliveryReceiptCarrier).toBeDefined();
    expect(updated.phase6.deliveryReceiptCarrier?.carrierName).toBe('Técnico de Teste');
    expect(updated.phase6.transferDispatchedByTechnician).toBe('Técnico de Teste');

    // Após o despacho, a tela passa a oferecer o botão de conferência/assinatura do aceite.
    expect(
      await screen.findByRole('button', { name: /Conferir Caixas & Assinar Aceite no Galpão/i })
    ).toBeInTheDocument();
  });

  it('ao assinar o aceite no galpão, chama onUpdateCollection com acceptanceReceiptWarehouse e ativa o QR público', async () => {
    const user = userEvent.setup();
    const collection = fullySignedCollection('NIC-P6-0005');
    // Já em trânsito (despacho já realizado), faltando o aceite.
    collection.phase6.deliveryReceiptCarrier = {
      carrierName: 'Técnico de Teste',
      dispatchedAt: '2026-01-02T10:00:00.000Z',
      sha256Hash: 'hash-despacho'
    };
    const onUpdateCollection = vi.fn();

    render(
      <Phase6Galpao
        collection={collection}
        currentUser={currentUser}
        onUpdateCollection={onUpdateCollection}
        laboratoryMode={false}
      />
    );

    await user.click(screen.getByRole('button', { name: /Conferir Caixas & Assinar Aceite no Galpão/i }));
    await user.click(screen.getByRole('button', { name: /Assinar Aceite & Ativar QR Code/i }));

    await waitFor(() => expect(onUpdateCollection).toHaveBeenCalledTimes(1));
    const updated = onUpdateCollection.mock.calls[0][0] as OsteologicalCollection;
    expect(updated.phase6.acceptanceReceiptWarehouse).toBeDefined();
    expect(updated.phase6.acceptanceReceiptWarehouse?.receiverName).toBe('Técnico de Teste');
    expect(updated.phase6.publicQrActive).toBe(true);
    expect(updated.phase6.finalLocations.length).toBeGreaterThan(0);

    const phase6Signature = updated.signatures.find(
      (s) => s.phaseNumber === 6 && s.status === 'locked'
    );
    expect(phase6Signature).toBeDefined();
  });
});
