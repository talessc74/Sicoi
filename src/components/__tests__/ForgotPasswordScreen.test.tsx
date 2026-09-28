// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

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

describe('ForgotPasswordScreen', () => {
  it('começa com o botão desabilitado até a matrícula ser preenchida', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordScreen onBack={vi.fn()} />);

    const button = screen.getByRole('button', { name: /avisar o administrador/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/CRBio/i), '12345');
    expect(button).toBeEnabled();
  });

  it('ao confirmar, mostra a mensagem devolvida pela API em vez do formulário', async () => {
    const user = userEvent.setup();
    const message = 'Se essa matrícula estiver cadastrada, o Administrador foi avisado e vai gerar um novo link de acesso.';
    mockFetchOnce(200, { message });

    render(<ForgotPasswordScreen onBack={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/CRBio/i), '12345');
    await user.click(screen.getByRole('button', { name: /avisar o administrador/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar ao login/i })).toBeInTheDocument();
  });

  it('nunca revela se a matrícula existe ou não — mesma mensagem para qualquer matrícula', async () => {
    const user = userEvent.setup();
    const message = 'Se essa matrícula estiver cadastrada, o Administrador foi avisado e vai gerar um novo link de acesso.';
    mockFetchOnce(200, { message });

    render(<ForgotPasswordScreen onBack={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/CRBio/i), 'matricula-que-nao-existe');
    await user.click(screen.getByRole('button', { name: /avisar o administrador/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('mostra erro de rede sem travar o formulário', async () => {
    const user = userEvent.setup();
    mockFetchOnce(500, { error: 'Erro ao registrar o pedido. Tente novamente.' });

    render(<ForgotPasswordScreen onBack={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/CRBio/i), '12345');
    await user.click(screen.getByRole('button', { name: /avisar o administrador/i }));

    expect(await screen.findByText('Erro ao registrar o pedido. Tente novamente.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avisar o administrador/i })).toBeEnabled();
  });

  it('chama onBack ao clicar em "Voltar ao login" antes de submeter', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ForgotPasswordScreen onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /voltar ao login/i }));

    await waitFor(() => expect(onBack).toHaveBeenCalled());
  });
});
