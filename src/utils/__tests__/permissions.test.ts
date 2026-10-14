import { describe, expect, it } from 'vitest';
import { canPerformRole, canSignAsTechnician, hasAdminAccess, canViewLegalOrigin, canCurate, canExportScientificData } from '../permissions';
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
  it('vale para Técnico e Curador, pelo padrão do papel', () => {
    expect(canSignAsTechnician({ role: 'tecnico' })).toBe(true);
    expect(canSignAsTechnician({ role: 'curador' })).toBe(true);
  });

  it('nunca vale para o Pesquisador por padrão — mesmo tendo acesso de técnico via canPerformRole, não pode ser a assinatura obrigatória', () => {
    expect(canSignAsTechnician({ role: 'pesquisador' })).toBe(false);
    expect(canPerformRole('pesquisador', 'tecnico')).toBe(true); // acesso sim, assinatura não
  });

  it('não vale para administrador nem estudante por padrão', () => {
    expect(canSignAsTechnician({ role: 'administrador' })).toBe(false);
    expect(canSignAsTechnician({ role: 'estudante' })).toBe(false);
  });

  it('o ajuste por pessoa (§13) amplia ou reduz o padrão do papel', () => {
    expect(canSignAsTechnician({ role: 'administrador', phaseSigningAccess: true })).toBe(true);
    expect(canSignAsTechnician({ role: 'tecnico', phaseSigningAccess: false })).toBe(false);
  });
});

describe('canViewLegalOrigin — Origem Legal/Cemitério (§7)', () => {
  it('vale por padrão para Curador e Administrador, não para os demais', () => {
    expect(canViewLegalOrigin({ role: 'curador' })).toBe(true);
    expect(canViewLegalOrigin({ role: 'administrador' })).toBe(true);
    expect(canViewLegalOrigin({ role: 'tecnico' })).toBe(false);
    expect(canViewLegalOrigin({ role: 'pesquisador' })).toBe(false);
    expect(canViewLegalOrigin({ role: 'estudante' })).toBe(false);
  });

  it('o ajuste por pessoa (§13) amplia ou reduz o padrão do papel', () => {
    expect(canViewLegalOrigin({ role: 'tecnico', legalOriginAccess: true })).toBe(true);
    expect(canViewLegalOrigin({ role: 'curador', legalOriginAccess: false })).toBe(false);
  });
});

describe('canCurate — Montagem e Inventário/Curadoria (Fase 4)', () => {
  it('vale por padrão para Curador e Estudante, não para os demais', () => {
    expect(canCurate({ role: 'curador' })).toBe(true);
    expect(canCurate({ role: 'estudante' })).toBe(true);
    expect(canCurate({ role: 'tecnico' })).toBe(false);
    expect(canCurate({ role: 'pesquisador' })).toBe(false);
    expect(canCurate({ role: 'administrador' })).toBe(false);
  });

  it('o ajuste por pessoa (§13) amplia ou reduz o padrão do papel', () => {
    expect(canCurate({ role: 'tecnico', curationAccess: true })).toBe(true);
    expect(canCurate({ role: 'estudante', curationAccess: false })).toBe(false);
  });
});

describe('canExportScientificData — Exportação Científica (Fase 7)', () => {
  it('vale por padrão para Curador, Administrador e Pesquisador, não para Técnico/Estudante', () => {
    expect(canExportScientificData({ role: 'curador' })).toBe(true);
    expect(canExportScientificData({ role: 'administrador' })).toBe(true);
    expect(canExportScientificData({ role: 'pesquisador' })).toBe(true);
    expect(canExportScientificData({ role: 'tecnico' })).toBe(false);
    expect(canExportScientificData({ role: 'estudante' })).toBe(false);
  });

  it('o ajuste por pessoa (§13) amplia ou reduz o padrão do papel', () => {
    expect(canExportScientificData({ role: 'tecnico', exportAccess: true })).toBe(true);
    expect(canExportScientificData({ role: 'pesquisador', exportAccess: false })).toBe(false);
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
