// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorNotice } from '../ErrorNotice';

describe('ErrorNotice', () => {
  it('mostra a frase amigável por padrão, sem a mensagem técnica visível', () => {
    render(<ErrorNotice code="HIST_HASH_INVALIDO" message="Assinatura inválida para o conjunto COI-146, Fase 0: hash não confere com o conteúdo da fase enviado." />);

    expect(screen.getByText(/Não foi possível confirmar esta assinatura/i)).toBeInTheDocument();
    expect(screen.queryByText(/hash não confere/i)).not.toBeInTheDocument();
  });

  it('revela e esconde a mensagem técnica ao clicar em "Detalhes técnicos"', async () => {
    const user = userEvent.setup();
    render(<ErrorNotice code="HIST_HASH_INVALIDO" message="hash não confere com o conteúdo da fase enviado." />);

    await user.click(screen.getByText(/Detalhes técnicos/i));
    expect(screen.getByText(/hash não confere/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Ocultar/i));
    expect(screen.queryByText(/hash não confere/i)).not.toBeInTheDocument();
  });

  it('cai na frase genérica quando o código é desconhecido ou ausente', () => {
    render(<ErrorNotice message="ReferenceError: x is not defined" />);
    expect(screen.getByText(/problema inesperado/i)).toBeInTheDocument();
  });

  it('variant="banner" chama onDismiss ao clicar em "Dispensar"', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorNotice variant="banner" code="CONJUNTO_NAO_ENCONTRADO" message="tech" onDismiss={onDismiss} />);

    await user.click(screen.getByText('Dispensar'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
