// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetPasswordScreen } from '../SetPasswordScreen';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SetPasswordScreen', () => {
  it('começa com o botão desabilitado até a senha (≥8) e a confirmação coincidirem', async () => {
    const user = userEvent.setup();
    render(<SetPasswordScreen token="abc123" />);

    const button = screen.getByRole('button', { name: /^definir senha$/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText(/^Nova senha/i), 'curta');
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText(/^Nova senha/i));
    await user.type(screen.getByLabelText(/^Nova senha/i), 'senha-nova-123');
    await user.type(screen.getByLabelText(/Confirmar nova senha/i), 'senha-nova-123');
    expect(button).toBeEnabled();
  });

  it('mostra aviso quando as senhas não coincidem', async () => {
    const user = userEvent.setup();
    render(<SetPasswordScreen token="abc123" />);

    await user.type(screen.getByLabelText(/^Nova senha/i), 'senha-nova-123');
    await user.type(screen.getByLabelText(/Confirmar nova senha/i), 'outra-coisa-123');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^definir senha$/i })).toBeDisabled();
  });

  it('ao confirmar com sucesso, mostra a tela de confirmação em vez do formulário', async () => {
    const user = userEvent.setup();
    const person = { id: 'p1', name: 'Perito X', role: 'tecnico', institution: 'INC', registrationNumber: '12345' };
    mockFetchOnce(200, { person });

    render(<SetPasswordScreen token="abc123" />);
    await user.type(screen.getByLabelText(/^Nova senha/i), 'senha-nova-123');
    await user.type(screen.getByLabelText(/Confirmar nova senha/i), 'senha-nova-123');
    await user.click(screen.getByRole('button', { name: /^definir senha$/i }));

    expect(await screen.findByText('Senha definida com sucesso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ir para o login/i })).toBeInTheDocument();
  });

  it('mostra a mensagem de erro quando o token é inválido/expirado, sem travar o formulário', async () => {
    const user = userEvent.setup();
    mockFetchOnce(400, { error: 'Link inválido, expirado ou já utilizado.' });

    render(<SetPasswordScreen token="abc123" />);
    await user.type(screen.getByLabelText(/^Nova senha/i), 'senha-nova-123');
    await user.type(screen.getByLabelText(/Confirmar nova senha/i), 'senha-nova-123');
    await user.click(screen.getByRole('button', { name: /^definir senha$/i }));

    expect(await screen.findByText('Link inválido, expirado ou já utilizado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^definir senha$/i })).toBeEnabled();
  });
});
