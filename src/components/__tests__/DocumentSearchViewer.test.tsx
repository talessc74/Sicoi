// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DocumentSearchViewer } from '../DocumentSearchViewer';
import type { UserProfile } from '../../types/sgccco';

const person = (role: UserProfile['role'], extra: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u1',
  name: 'Pessoa',
  role,
  institution: 'INC',
  email: 'p@inc.pf.gov.br',
  ...extra
});

describe('Manuais do Usuário na aba Documentos', () => {
  it('manual do Administrador só aparece para quem tem acesso de Administrador', () => {
    const { unmount } = render(<DocumentSearchViewer currentUser={person('tecnico')} />);
    expect(screen.getByText(/Manual SIGCOI — Guia completo/)).toBeInTheDocument();
    expect(screen.queryByText(/Administrador · Gestão de Contas/)).toBeNull();
    unmount();

    for (const viewer of [person('administrador'), person('curador', { adminAccess: true })]) {
      const r = render(<DocumentSearchViewer currentUser={viewer} />);
      expect(screen.getByText(/Administrador · Gestão de Contas/)).toBeInTheDocument();
      r.unmount();
    }
  });

  it('o manual separado das Fases 4 a 7 não aparece mais', () => {
    render(<DocumentSearchViewer currentUser={person('curador')} />);
    expect(screen.queryByText(/Fases 4 a 7/)).toBeNull();
  });

  it('mostra os 6 documentos oficiais reais (Portaria, POPs e Formulários) anexados pela curadoria', () => {
    render(<DocumentSearchViewer currentUser={person('estudante')} />);
    const heading = screen.getByText(/Documentos Oficiais da COI-INC/);
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText(/serão anexados aqui pela curadoria/)).toBeNull();

    // Escopado ao card de documentos oficiais — "Portaria DITEC/PF nº 1415/2024"
    // também aparece na referência regulatória das seções normativas abaixo.
    const card = heading.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText(/Portaria DITEC\/PF nº 1415\/2024/)).toBeInTheDocument();
    expect(within(card).getByText(/POP-01 —/)).toBeInTheDocument();
    expect(within(card).getByText(/POP-02 —/)).toBeInTheDocument();
    expect(within(card).getByText(/POP-03 —/)).toBeInTheDocument();
    expect(within(card).getByText(/Formulário A\.1 —/)).toBeInTheDocument();
    expect(within(card).getByText(/Formulário A\.2 —/)).toBeInTheDocument();

    // POPs vieram em DOCX (arquivo original, sem conversão) — baixa, não abre inline.
    expect(within(card).getAllByText('Baixar DOCX')).toHaveLength(3);
    expect(within(card).getAllByText('Abrir PDF')).toHaveLength(3);
  });
});
