// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordModal } from '../ChangePasswordModal';

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

async function fillForm(user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm: string) {
  await user.type(screen.getByLabelText(/senha atual/i), current);
  await user.type(screen.getByLabelText(/^Nova senha/i), next);
  await user.type(screen.getByLabelText(/confirmar nova senha/i), confirm);
}

describe('ChangePasswordModal', () => {
  it('começa com o botão desabilitado até os campos serem válidos', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={vi.fn()} />);

    const button = screen.getByRole('button', { name: /^trocar senha$/i });
    expect(button).toBeDisabled();

    await fillForm(user, 'senha-atual-123', 'senha-nova-456', 'senha-nova-456');
    expect(button).toBeEnabled();
  });

  it('mostra aviso e mantém desabilitado quando a confirmação não coincide', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal onClose={vi.fn()} />);

    await fillForm(user, 'senha-atual-123', 'senha-nova-456', 'outra-coisa');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^trocar senha$/i })).toBeDisabled();
  });

  it('ao confirmar com sucesso, mostra a confirmação em vez do formulário', async () => {
    const user = userEvent.setup();
    mockFetchOnce(204, null);

    render(<ChangePasswordModal onClose={vi.fn()} />);
    await fillForm(user, 'senha-atual-123', 'senha-nova-456', 'senha-nova-456');
    await user.click(screen.getByRole('button', { name: /^trocar senha$/i }));

    expect(await screen.findByText('Senha trocada com sucesso.')).toBeInTheDocument();
  });

  it('mostra erro quando a senha atual está incorreta, sem travar o formulário', async () => {
    const user = userEvent.setup();
    mockFetchOnce(400, { error: 'Senha atual incorreta.' });

    render(<ChangePasswordModal onClose={vi.fn()} />);
    await fillForm(user, 'senha-errada', 'senha-nova-456', 'senha-nova-456');
    await user.click(screen.getByRole('button', { name: /^trocar senha$/i }));

    expect(await screen.findByText('Senha atual incorreta.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^trocar senha$/i })).toBeEnabled();
  });

  it('chama onClose ao clicar em Cancelar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ChangePasswordModal onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
