import { describe, it, expect } from 'vitest';
import { ROLE_THEME, getRoleTheme } from '../roleTheme';
import type { UserRole } from '../../types/sgccco';

const ALL_ROLES: UserRole[] = ['tecnico', 'curador', 'administrador', 'pesquisador', 'estudante'];

describe('roleTheme', () => {
  it('define um tema para cada um dos 5 papéis', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_THEME[role]).toBeDefined();
      expect(getRoleTheme(role)).toBe(ROLE_THEME[role]);
    }
  });

  it('nenhum papel reaproveita a faixa (bar) de outro — identidade não pode se confundir', () => {
    const bars = ALL_ROLES.map((role) => ROLE_THEME[role].bar);
    expect(new Set(bars).size).toBe(bars.length);
  });

  it('nenhum papel reaproveita o ícone de outro', () => {
    const icons = ALL_ROLES.map((role) => ROLE_THEME[role].icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('cada tema tem os campos de selo (bg, borda, texto) preenchidos', () => {
    for (const role of ALL_ROLES) {
      const theme = ROLE_THEME[role];
      expect(theme.badgeBg).toBeTruthy();
      expect(theme.badgeBorder).toBeTruthy();
      expect(theme.badgeText).toBeTruthy();
      expect(theme.label).toBeTruthy();
    }
  });
});
