// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../LoginScreen';

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

describe('LoginScreen', () => {
  it('começa com o botão desabilitado até e-mail e senha serem preenchidos', async () => {
    const user = userEvent.setup();
    render(<LoginScreen onLoggedIn={vi.fn()} />);

    const button = screen.getByRole('button', { name: /entrar/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/nome@instituicao/i), 'perito.x@inc.pf.gov.br');
    expect(button).toBeDisabled(); // senha ainda vazia

    await user.type(screen.getByPlaceholderText('••••••••'), 'senha-correta-123');
    expect(button).toBeEnabled();
  });

  it('login correto chama onLoggedIn com a pessoa devolvida pela API', async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const person = { id: 'p1', name: 'Perito X', role: 'tecnico', institution: 'INC', email: 'perito.x@inc.pf.gov.br' };
    mockFetchOnce(200, { person });

    render(<LoginScreen onLoggedIn={onLoggedIn} />);
    await user.type(screen.getByPlaceholderText(/nome@instituicao/i), 'perito.x@inc.pf.gov.br');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha-correta-123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(person));
  });

  it('mostra a mensagem de erro em caso de e-mail ou senha inválida, sem travar o formulário', async () => {
    const user = userEvent.setup();
    mockFetchOnce(401, { error: 'E-mail ou senha inválidos.' });

    render(<LoginScreen onLoggedIn={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/nome@instituicao/i), 'perito.x@inc.pf.gov.br');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled();
  });

  it('clicar em "Esqueci minha senha" mostra a tela de recuperação em vez do login', async () => {
    const user = userEvent.setup();
    render(<LoginScreen onLoggedIn={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    expect(screen.getByRole('heading', { name: /esqueci minha senha/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^entrar$/i })).not.toBeInTheDocument();
  });
});
