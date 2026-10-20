import { describe, it, expect, beforeEach } from 'vitest';

// Polyfill minimal de localStorage e window para execução em ambiente Node puro
if (typeof window === 'undefined') {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
  (globalThis as any).window = {
    localStorage: mockStorage
  };
  (globalThis as any).localStorage = mockStorage;
}

import {
  parseNavState,
  pathForNavState,
  fullUrlForNavState,
  STORAGE_KEYS,
  safeLocalStorageGet,
  safeLocalStorageSet
} from '../../App';

describe('Navegação e Persistência de Estado (ADR 104)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('pathForNavState', () => {
    it('gera caminhos canônicos para cada aba e fase', () => {
      expect(pathForNavState('inicio', 1)).toBe('/');
      expect(pathForNavState('fases', 0)).toBe('/fases/0');
      expect(pathForNavState('fases', 4)).toBe('/fases/4');
      expect(pathForNavState('documentos', 1)).toBe('/documentos');
      expect(pathForNavState('auditoria', 1)).toBe('/auditoria');
      expect(pathForNavState('configuracoes', 1)).toBe('/configuracoes');
    });
  });

  describe('fullUrlForNavState', () => {
    it('inclui parâmetro ?nic= em abas operacionais', () => {
      expect(fullUrlForNavState('fases', 4, 'COI-032')).toBe('/fases/4?nic=COI-032');
      expect(fullUrlForNavState('auditoria', 1, 'COI-015')).toBe('/auditoria?nic=COI-015');
      expect(fullUrlForNavState('grafo', 1, 'COI-032')).toBe('/grafo?nic=COI-032');
      expect(fullUrlForNavState('estantes', 1, 'COI-032')).toBe('/estantes?nic=COI-032');
      expect(fullUrlForNavState('pesquisa', 1, 'COI-032')).toBe('/pesquisa?nic=COI-032');
    });

    it('não inclui parâmetro ?nic= em abas institucionais ou quando nic for nulo', () => {
      expect(fullUrlForNavState('inicio', 1, 'COI-032')).toBe('/');
      expect(fullUrlForNavState('documentos', 1, 'COI-032')).toBe('/documentos');
      expect(fullUrlForNavState('configuracoes', 1, 'COI-032')).toBe('/configuracoes');
      expect(fullUrlForNavState('ajuda', 1, 'COI-032')).toBe('/ajuda');
      expect(fullUrlForNavState('creditos', 1, 'COI-032')).toBe('/creditos');
      expect(fullUrlForNavState('fases', 4, null)).toBe('/fases/4');
    });
  });

  describe('parseNavState', () => {
    it('extrai corretamente aba, fase e NIC de URL completa', () => {
      const state = parseNavState('/fases/4', '?nic=COI-032');
      expect(state.activeTab).toBe('fases');
      expect(state.activePhase).toBe(4);
      expect(state.nic).toBe('COI-032');
    });

    it('extrai fase 0 corretamente', () => {
      const state = parseNavState('/fases/0', '?nic=COI-015');
      expect(state.activeTab).toBe('fases');
      expect(state.activePhase).toBe(0);
      expect(state.nic).toBe('COI-015');
    });

    it('extrai aba sem fase (ex.: /documentos ou /auditoria)', () => {
      const docs = parseNavState('/documentos', '');
      expect(docs.activeTab).toBe('documentos');
      expect(docs.activePhase).toBe(1);

      const audit = parseNavState('/auditoria', '?nic=COI-032');
      expect(audit.activeTab).toBe('auditoria');
      expect(audit.activePhase).toBe(1);
      expect(audit.nic).toBe('COI-032');
    });

    it('acesso à raiz (/) sempre abre diretamente no Início (Dashboard)', () => {
      safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TAB, 'fases');
      safeLocalStorageSet(STORAGE_KEYS.ACTIVE_PHASE, '4');
      safeLocalStorageSet(STORAGE_KEYS.SELECTED_NIC, 'COI-032');

      const state = parseNavState('/', '');
      expect(state.activeTab).toBe('inicio');
      expect(state.activePhase).toBe(1);
      expect(state.nic).toBe('COI-032');
    });

    it('respeita "inicio" se o usuário havia navegado explicitamente para Início', () => {
      safeLocalStorageSet(STORAGE_KEYS.ACTIVE_TAB, 'inicio');
      safeLocalStorageSet(STORAGE_KEYS.SELECTED_NIC, 'COI-032');

      const state = parseNavState('/', '');
      expect(state.activeTab).toBe('inicio');
      expect(state.activePhase).toBe(1);
      expect(state.nic).toBe('COI-032');
    });

    it('prioriza parâmetro da URL sobre localStorage', () => {
      safeLocalStorageSet(STORAGE_KEYS.SELECTED_NIC, 'COI-ANTERIOR');

      const state = parseNavState('/fases/2', '?nic=COI-NOVO');
      expect(state.nic).toBe('COI-NOVO');
    });

    it('trata fase inválida na URL usando fallback seguro', () => {
      safeLocalStorageSet(STORAGE_KEYS.ACTIVE_PHASE, '3');
      const state = parseNavState('/fases/99', '');
      expect(state.activePhase).toBe(3);
    });
  });

  describe('safeLocalStorageGet e Set', () => {
    it('persiste e recupera valores sem lançar erros', () => {
      safeLocalStorageSet('teste_key', 'valor123');
      expect(safeLocalStorageGet('teste_key')).toBe('valor123');
      expect(safeLocalStorageGet('chave_inexistente')).toBeNull();
    });
  });
});
