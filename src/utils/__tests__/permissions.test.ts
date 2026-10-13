import { describe, expect, it } from 'vitest';
import { canPerformRole, canSignAsTechnician, hasAdminAccess } from '../permissions';
import type { UserRole } from '../../types/sgccco';

describe('permissões do Curador', () => {
  const roles: UserRole[] = ['tecnico', 'curador', 'administrador', 'pesquisador', 'estudante'];

  it('permite ao Curador executar ações de todos os papéis', () => {
    for (const role of roles) expect(canPerformRole('curador', role)).toBe(true);
  });

  it('mantém os demais papéis limitados às próprias ações, exceto a exceção Pesquisador → Técnico', () => {
    for (const current of roles.filter(role => role !== 'curador')) {
      for (const required of roles) {
        const expected = current === required || (current === 'pesquisador' && required === 'tecnico');
        expect(canPerformRole(current, required)).toBe(expected);
      }
    }
  });

  it('permite ao Pesquisador agir como Técnico (decisão de acesso, out/2026)', () => {
    expect(canPerformRole('pesquisador', 'tecnico')).toBe(true);
  });

  it('não deixa o Técnico agir como Pesquisador (a exceção é de mão única)', () => {
    expect(canPerformRole('tecnico', 'pesquisador')).toBe(false);
  });
});

describe('canSignAsTechnician — quem pode SER a assinatura "técnico" (diferente de canPerformRole)', () => {
  it('vale para Técnico e Curador', () => {
    expect(canSignAsTechnician('tecnico')).toBe(true);
    expect(canSignAsTechnician('curador')).toBe(true);
  });

  it('nunca vale para o Pesquisador — mesmo tendo acesso de técnico via canPerformRole, não pode ser a assinatura obrigatória', () => {
    expect(canSignAsTechnician('pesquisador')).toBe(false);
    expect(canPerformRole('pesquisador', 'tecnico')).toBe(true); // acesso sim, assinatura não
  });

  it('não vale para administrador nem estudante', () => {
    expect(canSignAsTechnician('administrador')).toBe(false);
    expect(canSignAsTechnician('estudante')).toBe(false);
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
