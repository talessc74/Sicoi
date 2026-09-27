// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhaseProgressRibbon } from '../PhaseProgressRibbon';
import { INITIAL_COLLECTIONS } from '../../data/mockData';
import type { OsteologicalCollection, PhaseSignature } from '../../types/sgccco';

function collectionWith(signatures: PhaseSignature[]): OsteologicalCollection {
  return { ...INITIAL_COLLECTIONS[0], signatures };
}

function locked(phaseNumber: 1 | 2 | 3 | 4 | 5 | 6): PhaseSignature {
  return {
    phaseNumber,
    signedBy: 'user-1',
    signedByName: 'Perito X',
    signedByRole: 'tecnico',
    signedAt: '2026-09-27T10:00:00.000Z',
    sha256Hash: 'h1',
    status: 'locked'
  };
}

describe('PhaseProgressRibbon — bloqueio sequencial das fases (§14)', () => {
  it('sem nenhuma assinatura, só a Fase 1 e a Fase 7 aparecem acessíveis', async () => {
    const user = userEvent.setup();
    const onSelectPhase = vi.fn();
    render(
      <PhaseProgressRibbon
        collection={collectionWith([])}
        activePhase={1}
        onSelectPhase={onSelectPhase}
        currentUserRole="tecnico"
        onReopenPhase={vi.fn()}
      />
    );

    expect(screen.getAllByText('Bloqueada')).toHaveLength(5); // fases 2 a 6

    // Fase 2 está bloqueada: clicar não chama onSelectPhase
    await user.click(screen.getByText('Fase 2').closest('div')!);
    expect(onSelectPhase).not.toHaveBeenCalled();

    // Fase 1 está acessível
    await user.click(screen.getByText('Fase 1').closest('div')!);
    expect(onSelectPhase).toHaveBeenCalledWith(1);
  });

  it('assinar a Fase 1 libera a Fase 2, mas não a Fase 3', async () => {
    const user = userEvent.setup();
    const onSelectPhase = vi.fn();
    render(
      <PhaseProgressRibbon
        collection={collectionWith([locked(1)])}
        activePhase={2}
        onSelectPhase={onSelectPhase}
        currentUserRole="tecnico"
        onReopenPhase={vi.fn()}
      />
    );

    expect(screen.getByText('Assinada')).toBeInTheDocument();

    await user.click(screen.getByText('Fase 2').closest('div')!);
    expect(onSelectPhase).toHaveBeenCalledWith(2);

    onSelectPhase.mockClear();
    await user.click(screen.getByText('Fase 3').closest('div')!);
    expect(onSelectPhase).not.toHaveBeenCalled();
  });

  it('só mostra o botão "Reabrir" numa fase assinada quando o papel é Curador ou Administrador', () => {
    const { rerender } = render(
      <PhaseProgressRibbon
        collection={collectionWith([locked(1)])}
        activePhase={1}
        onSelectPhase={vi.fn()}
        currentUserRole="tecnico"
        onReopenPhase={vi.fn()}
      />
    );
    expect(screen.queryByText('Reabrir')).not.toBeInTheDocument();

    rerender(
      <PhaseProgressRibbon
        collection={collectionWith([locked(1)])}
        activePhase={1}
        onSelectPhase={vi.fn()}
        currentUserRole="curador"
        onReopenPhase={vi.fn()}
      />
    );
    expect(screen.getByText('Reabrir')).toBeInTheDocument();
  });

  it('reabertura sem justificativa mantém o botão de confirmar desabilitado; com justificativa, chama onReopenPhase', async () => {
    const user = userEvent.setup();
    const onReopenPhase = vi.fn();
    render(
      <PhaseProgressRibbon
        collection={collectionWith([locked(1)])}
        activePhase={1}
        onSelectPhase={vi.fn()}
        currentUserRole="curador"
        onReopenPhase={onReopenPhase}
      />
    );

    await user.click(screen.getByText('Reabrir'));
    const confirmButton = screen.getByRole('button', { name: /confirmar reabertura/i });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/Necessidade de retificação/i), 'Corrigir descrição do lacre');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onReopenPhase).toHaveBeenCalledWith(1, 'Corrigir descrição do lacre');
  });
});
