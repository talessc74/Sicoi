// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimAdminScreen } from '../ClaimAdminScreen';

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

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/e-mail já cadastrado/i), 'nicole@inc.pf.gov.br');
  await user.type(screen.getByPlaceholderText(/recebido de quem configurou/i), 'codigo-secreto-123');
  await user.type(screen.getByLabelText(/^Senha/i), 'senha-ativacao-123');
  await user.type(screen.getByLabelText(/Confirmar senha/i), 'senha-ativacao-123');
}

describe('ClaimAdminScreen', () => {
  it('começa com o botão desabilitado até todos os campos válidos estarem preenchidos', async () => {
    const user = userEvent.setup();
    render(<ClaimAdminScreen onLoggedIn={vi.fn()} onUseLoginInstead={vi.fn()} />);

    const button = screen.getByRole('button', { name: /ativar e entrar/i });
    expect(button).toBeDisabled();

    await fillValidForm(user);
    expect(button).toBeEnabled();
  });

  it('mostra aviso e mantém desabilitado quando as senhas não coincidem', async () => {
    const user = userEvent.setup();
    render(<ClaimAdminScreen onLoggedIn={vi.fn()} onUseLoginInstead={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/e-mail já cadastrado/i), 'nicole@inc.pf.gov.br');
    await user.type(screen.getByPlaceholderText(/recebido de quem configurou/i), 'codigo-secreto-123');
    await user.type(screen.getByLabelText(/^Senha/i), 'senha-ativacao-123');
    await user.type(screen.getByLabelText(/Confirmar senha/i), 'outra-coisa-123');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ativar e entrar/i })).toBeDisabled();
  });

  it('ao confirmar, chama onLoggedIn com o administrador ativado', async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const person = { id: 'p1', name: 'Nicole', role: 'administrador', institution: 'INC', email: 'nicole@inc.pf.gov.br' };
    mockFetchOnce(200, { person, csrfToken: 'abc' });

    render(<ClaimAdminScreen onLoggedIn={onLoggedIn} onUseLoginInstead={vi.fn()} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /ativar e entrar/i }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(person));
  });

  it('mostra a mensagem de erro quando o código de ativação é inválido', async () => {
    const user = userEvent.setup();
    mockFetchOnce(403, { error: 'Código de ativação inválido.' });

    render(<ClaimAdminScreen onLoggedIn={vi.fn()} onUseLoginInstead={vi.fn()} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /ativar e entrar/i }));

    expect(await screen.findByText('Código de ativação inválido.')).toBeInTheDocument();
  });

  it('mostra a mensagem de erro quando não há Administrador pendente com esse e-mail', async () => {
    const user = userEvent.setup();
    mockFetchOnce(400, { error: 'Não há Administrador pendente de ativação com esse e-mail.' });

    render(<ClaimAdminScreen onLoggedIn={vi.fn()} onUseLoginInstead={vi.fn()} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /ativar e entrar/i }));

    expect(await screen.findByText('Não há Administrador pendente de ativação com esse e-mail.')).toBeInTheDocument();
  });

  it('chama onUseLoginInstead ao clicar em "Já tem uma senha? Fazer login"', async () => {
    const user = userEvent.setup();
    const onUseLoginInstead = vi.fn();
    render(<ClaimAdminScreen onLoggedIn={vi.fn()} onUseLoginInstead={onUseLoginInstead} />);

    await user.click(screen.getByRole('button', { name: /já tem uma senha\? fazer login/i }));

    expect(onUseLoginInstead).toHaveBeenCalledOnce();
  });
});
