import { describe, expect, it } from 'vitest';
import { canPerformRole } from '../permissions';
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
