import { describe, expect, it } from 'vitest';
import { canPerformRole } from '../permissions';
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
