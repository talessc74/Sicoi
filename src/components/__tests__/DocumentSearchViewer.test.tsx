// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('mostra a área de documentos oficiais no topo, aguardando os PDFs da curadoria', () => {
    render(<DocumentSearchViewer currentUser={person('estudante')} />);
    expect(screen.getByText(/Documentos Oficiais da COI-INC/)).toBeInTheDocument();
    expect(screen.getByText(/serão anexados aqui pela curadoria/)).toBeInTheDocument();
  });
});
