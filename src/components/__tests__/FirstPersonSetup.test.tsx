// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstPersonSetup } from '../FirstPersonSetup';

describe('FirstPersonSetup', () => {
  it('começa com o botão desabilitado até os campos obrigatórios serem preenchidos', async () => {
    const user = userEvent.setup();
    render(<FirstPersonSetup onCreatePerson={vi.fn()} />);

    const button = screen.getByRole('button', { name: /cadastrar e entrar/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), 'Perito X');
    expect(button).toBeDisabled(); // instituição e matrícula ainda vazias

    await user.type(screen.getByPlaceholderText(/Laboratório de Antropologia Forense/i), 'INC/DITEC/PF');
    await user.type(screen.getByPlaceholderText(/CRBio/i), '12345');

    expect(button).toBeEnabled();
  });

  it('não envia com espaços em branco nos campos obrigatórios', async () => {
    const user = userEvent.setup();
    render(<FirstPersonSetup onCreatePerson={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), '   ');
    await user.type(screen.getByPlaceholderText(/Laboratório de Antropologia Forense/i), '   ');
    await user.type(screen.getByPlaceholderText(/CRBio/i), '   ');

    expect(screen.getByRole('button', { name: /cadastrar e entrar/i })).toBeDisabled();
  });

  it('ao confirmar, chama onCreatePerson com os campos preenchidos (aparados) e o papel padrão Técnico', async () => {
    const user = userEvent.setup();
    const onCreatePerson = vi.fn().mockResolvedValue(undefined);
    render(<FirstPersonSetup onCreatePerson={onCreatePerson} />);

    await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), '  Perito X  ');
    await user.type(screen.getByPlaceholderText(/Laboratório de Antropologia Forense/i), '  INC/DITEC/PF  ');
    await user.type(screen.getByPlaceholderText(/CRBio/i), '  12345  ');
    await user.click(screen.getByRole('button', { name: /cadastrar e entrar/i }));

    await waitFor(() => {
      expect(onCreatePerson).toHaveBeenCalledWith({
        name: 'Perito X',
        role: 'tecnico',
        institution: 'INC/DITEC/PF',
        registrationNumber: '12345'
      });
    });
  });

  it('mostra a mensagem de erro quando o cadastro falha, sem travar o formulário', async () => {
    const user = userEvent.setup();
    const onCreatePerson = vi.fn().mockRejectedValue(new Error('Erro ao cadastrar pessoa (HTTP 500)'));
    render(<FirstPersonSetup onCreatePerson={onCreatePerson} />);

    await user.type(screen.getByPlaceholderText(/Carlos Alberto Menezes/i), 'Perito X');
    await user.type(screen.getByPlaceholderText(/Laboratório de Antropologia Forense/i), 'INC/DITEC/PF');
    await user.type(screen.getByPlaceholderText(/CRBio/i), '12345');
    await user.click(screen.getByRole('button', { name: /cadastrar e entrar/i }));

    expect(await screen.findByText('Erro ao cadastrar pessoa (HTTP 500)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar e entrar/i })).toBeEnabled();
  });
});
