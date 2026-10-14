// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BootstrapAdminSetup } from '../BootstrapAdminSetup';
import { friendlyMessage } from '../../utils/errorMessages';

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
  await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), 'Primeira Admin');
  await user.type(screen.getByPlaceholderText(/INC\/DITEC\/PF/i), 'INC/DITEC/PF');
  await user.type(screen.getByPlaceholderText(/nome@instituicao/i), 'primeira.admin@inc.pf.gov.br');
  await user.type(screen.getByLabelText(/^Senha/i), 'senha-bootstrap-123');
  await user.type(screen.getByLabelText(/Confirmar senha/i), 'senha-bootstrap-123');
}

describe('BootstrapAdminSetup', () => {
  it('começa com o botão desabilitado até todos os campos válidos estarem preenchidos', async () => {
    const user = userEvent.setup();
    render(<BootstrapAdminSetup onLoggedIn={vi.fn()} />);

    const button = screen.getByRole('button', { name: /criar administrador e entrar/i });
    expect(button).toBeDisabled();

    await fillValidForm(user);
    expect(button).toBeEnabled();
  });

  it('recusa senha menor que 8 caracteres', async () => {
    const user = userEvent.setup();
    render(<BootstrapAdminSetup onLoggedIn={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), 'Admin');
    await user.type(screen.getByPlaceholderText(/INC\/DITEC\/PF/i), 'INC');
    await user.type(screen.getByPlaceholderText(/nome@instituicao/i), 'admin@inc.pf.gov.br');
    await user.type(screen.getByLabelText(/^Senha/i), 'curta');
    await user.type(screen.getByLabelText(/Confirmar senha/i), 'curta');

    expect(screen.getByRole('button', { name: /criar administrador e entrar/i })).toBeDisabled();
  });

  it('mostra aviso e mantém desabilitado quando as senhas não coincidem', async () => {
    const user = userEvent.setup();
    render(<BootstrapAdminSetup onLoggedIn={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), 'Admin');
    await user.type(screen.getByPlaceholderText(/INC\/DITEC\/PF/i), 'INC');
    await user.type(screen.getByPlaceholderText(/nome@instituicao/i), 'admin@inc.pf.gov.br');
    await user.type(screen.getByLabelText(/^Senha/i), 'senha-bootstrap-123');
    await user.type(screen.getByLabelText(/Confirmar senha/i), 'outra-coisa-123');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar administrador e entrar/i })).toBeDisabled();
  });

  it('ao confirmar, chama onLoggedIn com o administrador criado', async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const person = { id: 'p1', name: 'Primeira Admin', role: 'administrador', institution: 'INC/DITEC/PF', email: 'primeira.admin@inc.pf.gov.br' };
    mockFetchOnce(201, { person });

    render(<BootstrapAdminSetup onLoggedIn={onLoggedIn} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /criar administrador e entrar/i }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(person));
  });

  it('mostra a mensagem de erro quando o bootstrap é recusado (ex.: já existe gente cadastrada)', async () => {
    const user = userEvent.setup();
    mockFetchOnce(409, { error: 'Já existe gente cadastrada — o bootstrap só funciona com o sistema vazio.', code: 'AUTH_BOOTSTRAP_JA_FEITO' });

    render(<BootstrapAdminSetup onLoggedIn={vi.fn()} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /criar administrador e entrar/i }));

    expect(await screen.findByText(friendlyMessage('AUTH_BOOTSTRAP_JA_FEITO'))).toBeInTheDocument();
  });
});
