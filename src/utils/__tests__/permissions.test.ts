import { describe, expect, it } from 'vitest';
import { canPerformRole, hasAdminAccess } from '../permissions';
import type { UserRole } from '../../types/sgccco';

describe('permissões do Curador', () => {
  const roles: UserRole[] = ['tecnico', 'curador', 'administrador', 'pesquisador', 'estudante'];

  it('permite ao Curador executar ações de todos os papéis', () => {
    for (const role of roles) expect(canPerformRole('curador', role)).toBe(true);
  });

  it('mantém os demais papéis limitados às próprias ações', () => {
    for (const current of roles.filter(role => role !== 'curador')) {
      for (const required of roles) {
        expect(canPerformRole(current, required)).toBe(current === required);
      }
    }
  });
});

describe('acesso de Administrador', () => {
  it('vale para o papel Administrador', () => {
    expect(hasAdminAccess({ role: 'administrador' })).toBe(true);
  });

  it('vale para outro papel com o acesso de Administrador somado', () => {
    expect(hasAdminAccess({ role: 'curador', adminAccess: true })).toBe(true);
  });

  it('não vale para os demais papéis sem a marca, nem sem pessoa', () => {
    for (const role of ['tecnico', 'curador', 'pesquisador', 'estudante'] as UserRole[]) {
      expect(hasAdminAccess({ role })).toBe(false);
      expect(hasAdminAccess({ role, adminAccess: false })).toBe(false);
    }
    expect(hasAdminAccess(null)).toBe(false);
  });
});
