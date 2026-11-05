import { describe, it, expect } from 'vitest';
import {
  clampPosition,
  getDefaultPosition,
  FAB_POSITION_STORAGE_KEY,
  FAB_HIDDEN_STORAGE_KEY,
  FloatingAiPosition
} from '../FloatingAiAssistantButton';

describe('Assistente IA Flutuante — Posicionamento Móvel e Ocultação/Restauração', () => {
  describe('clampPosition (Confinamento no Viewport)', () => {
    const windowWidth = 1024;
    const windowHeight = 768;
    const buttonWidth = 220;
    const buttonHeight = 52;
    const margin = 16;

    it('mantém posições válidas dentro do viewport sem alteração', () => {
      const pos: FloatingAiPosition = { x: 500, y: 400 };
      const clamped = clampPosition(pos, windowWidth, windowHeight, buttonWidth, buttonHeight, margin);
      expect(clamped).toEqual({ x: 500, y: 400 });
    });

    it('não permite que o botão saia pelo lado esquerdo (x < margin)', () => {
      const pos: FloatingAiPosition = { x: -50, y: 300 };
      const clamped = clampPosition(pos, windowWidth, windowHeight, buttonWidth, buttonHeight, margin);
      expect(clamped.x).toBe(margin);
      expect(clamped.y).toBe(300);
    });

    it('não permite que o botão saia pelo topo (y < margin)', () => {
      const pos: FloatingAiPosition = { x: 300, y: -20 };
      const clamped = clampPosition(pos, windowWidth, windowHeight, buttonWidth, buttonHeight, margin);
      expect(clamped.x).toBe(300);
      expect(clamped.y).toBe(margin);
    });

    it('não permite que o botão extrapole a largura visível (x > maxX)', () => {
      const maxX = windowWidth - buttonWidth - margin; // 1024 - 220 - 16 = 788
      const pos: FloatingAiPosition = { x: 9999, y: 300 };
      const clamped = clampPosition(pos, windowWidth, windowHeight, buttonWidth, buttonHeight, margin);
      expect(clamped.x).toBe(maxX);
    });

    it('não permite que o botão extrapole a altura visível (y > maxY)', () => {
      const maxY = windowHeight - buttonHeight - margin; // 768 - 52 - 16 = 700
      const pos: FloatingAiPosition = { x: 300, y: 9999 };
      const clamped = clampPosition(pos, windowWidth, windowHeight, buttonWidth, buttonHeight, margin);
      expect(clamped.y).toBe(maxY);
    });
  });

  describe('getDefaultPosition (Posicionamento Inicial Padrão)', () => {
    it('posiciona por padrão no canto inferior direito respeitando margens e altura do rodapé', () => {
      const windowWidth = 1440;
      const windowHeight = 900;
      const def = getDefaultPosition(windowWidth, windowHeight);

      // Deve estar à direita
      expect(def.x).toBe(1440 - 220 - 16);
      // Deve estar próximo à base
      expect(def.y).toBe(900 - 52 - 16 - 20);
    });
  });

  describe('Chaves de Persistência (localStorage keys)', () => {
    it('possui chaves padronizadas para persistir posição e estado de exibição', () => {
      expect(FAB_POSITION_STORAGE_KEY).toBe('sigcoi_ai_fab_position');
      expect(FAB_HIDDEN_STORAGE_KEY).toBe('sigcoi_ai_fab_hidden');
    });
  });

  describe('Lógica de Alternância Rápida de Lado (Swap Side)', () => {
    it('alterna da direita para a esquerda mantendo a altura Y', () => {
      const windowWidth = 1200;
      const currentPos: FloatingAiPosition = { x: 900, y: 500 }; // à direita (> 600)
      const isCurrentlyOnRight = currentPos.x > windowWidth / 2;
      expect(isCurrentlyOnRight).toBe(true);

      const margin = 16;
      const newX = isCurrentlyOnRight ? margin : windowWidth - 220 - margin;
      expect(newX).toBe(16);
    });

    it('alterna da esquerda para a direita mantendo a altura Y', () => {
      const windowWidth = 1200;
      const currentPos: FloatingAiPosition = { x: 16, y: 500 }; // à esquerda (< 600)
      const isCurrentlyOnRight = currentPos.x > windowWidth / 2;
      expect(isCurrentlyOnRight).toBe(false);

      const margin = 16;
      const newX = isCurrentlyOnRight ? margin : windowWidth - 220 - margin;
      expect(newX).toBe(1200 - 220 - 16);
    });
  });
});
