// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditsView } from '../CreditsView';
import { CREDITS_PEOPLE } from '../../data/creditsData';

describe('CreditsView', () => {
  it('renderiza o cabeçalho e título de créditos corretamente', () => {
    render(<CreditsView onBack={vi.fn()} />);

    expect(screen.getByText('CRÉDITOS')).toBeInTheDocument();
    expect(screen.getByText('Quem fez o SIGCOI')).toBeInTheDocument();
    expect(
      screen.getByText(/Design e desenvolvimento do SIGCOI, com a participação de quem pensou, revisou e testou/i)
    ).toBeInTheDocument();
  });

  it('renderiza todos os membros da equipe de créditos', () => {
    render(<CreditsView onBack={vi.fn()} />);

    for (const person of CREDITS_PEOPLE) {
      expect(screen.getByText(person.name)).toBeInTheDocument();
      expect(screen.getByText(person.initials)).toBeInTheDocument();
    }

    expect(screen.getAllByText('Função a confirmar').length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText('Instituição · UF').length).toBeGreaterThanOrEqual(4);
  });

  it('renderiza o quadro de convite "MAIS ALGUÉM?"', () => {
    render(<CreditsView onBack={vi.fn()} />);

    expect(screen.getByText('MAIS ALGUÉM?')).toBeInTheDocument();
    expect(
      screen.getByText(/Quem mais entra nos créditos\? Nome, função, instituição e, se quiser, foto e links\./i)
    ).toBeInTheDocument();
  });

  it('chama onBack ao clicar no botão de voltar', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<CreditsView onBack={onBack} />);

    const backButton = screen.getByRole('button', { name: /Voltar/i });
    await user.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
