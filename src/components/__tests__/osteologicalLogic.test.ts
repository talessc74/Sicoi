import { describe, it, expect } from 'vitest';
import {
  isBilateralSection,
  partitionBonesBySide,
  BILATERAL_SECTION_IDS,
  MEMBROS_SUPERIORES_OSSOS,
  PELVE_MEMBRO_INFERIOR_OSSOS,
  OSSOS_MAO,
  OSSOS_PE,
  CABECA_PESCOCO_OSSOS,
  COLUNA_VERTEBRAL_OSSOS,
  CERVICAIS_ORDINAIS,
  TORACICAS_ORDINAIS,
  LOMBARES_ORDINAIS,
  TORAX_OSSOS,
  COSTELAS_ORDINAIS,
  applyBulkPresence
} from '../OsteologicalInventoryViewer';

describe('Inventário Osteológico — Lógica Bilateral (Lado Direito / Lado Esquerdo)', () => {
  it('identifica corretamente as 4 seções bilaterais que possuem divisão direita/esquerda', () => {
    expect(isBilateralSection('membros_superiores')).toBe(true);
    expect(isBilateralSection('pelve_mi')).toBe(true);
    expect(isBilateralSection('ossos_mao')).toBe(true);
    expect(isBilateralSection('ossos_pe')).toBe(true);

    expect(isBilateralSection('cabeca_pescoco')).toBe(false);
    expect(isBilateralSection('coluna_vertebral')).toBe(false);
    expect(isBilateralSection('torax')).toBe(false);
  });

  it('separa Membros Superiores em exatamente 11 ossos direitos e 11 esquerdos', () => {
    const { direito, esquerdo } = partitionBonesBySide(MEMBROS_SUPERIORES_OSSOS);
    expect(MEMBROS_SUPERIORES_OSSOS).toHaveLength(22);
    expect(direito).toHaveLength(11);
    expect(esquerdo).toHaveLength(11);

    expect(direito.every(b => b.includes('Direit'))).toBe(true);
    expect(esquerdo.every(b => b.includes('Esquerd'))).toBe(true);
    expect(direito.length + esquerdo.length).toBe(MEMBROS_SUPERIORES_OSSOS.length);
  });

  it('separa Membros Inferiores em exatamente 13 ossos direitos e 13 esquerdos', () => {
    const { direito, esquerdo } = partitionBonesBySide(PELVE_MEMBRO_INFERIOR_OSSOS);
    expect(PELVE_MEMBRO_INFERIOR_OSSOS).toHaveLength(26);
    expect(direito).toHaveLength(13);
    expect(esquerdo).toHaveLength(13);

    expect(direito.every(b => b.includes('Direit'))).toBe(true);
    expect(esquerdo.every(b => b.includes('Esquerd'))).toBe(true);
    expect(direito.length + esquerdo.length).toBe(PELVE_MEMBRO_INFERIOR_OSSOS.length);
  });

  it('separa Ossos da Mão em exatamente 13 ossos direitos e 13 esquerdos', () => {
    const { direito, esquerdo } = partitionBonesBySide(OSSOS_MAO);
    expect(OSSOS_MAO).toHaveLength(26);
    expect(direito).toHaveLength(13);
    expect(esquerdo).toHaveLength(13);

    expect(direito.every(b => b.includes('Direit'))).toBe(true);
    expect(esquerdo.every(b => b.includes('Esquerd'))).toBe(true);
    expect(direito.length + esquerdo.length).toBe(OSSOS_MAO.length);
  });

  it('separa Ossos do Pé em exatamente 12 ossos direitos e 12 esquerdos', () => {
    const { direito, esquerdo } = partitionBonesBySide(OSSOS_PE);
    expect(OSSOS_PE).toHaveLength(24);
    expect(direito).toHaveLength(12);
    expect(esquerdo).toHaveLength(12);

    expect(direito.every(b => b.includes('Direit'))).toBe(true);
    expect(esquerdo.every(b => b.includes('Esquerd'))).toBe(true);
    expect(direito.length + esquerdo.length).toBe(OSSOS_PE.length);
  });

  describe('Estrutura de Coluna Vertebral e Tórax (Contagem e Identificação Ordinal)', () => {
    it('configura ossos simples de Coluna Vertebral como Sacro e Cóccix', () => {
      expect(COLUNA_VERTEBRAL_OSSOS).toEqual(['Sacro', 'Cóccix']);
    });

    it('configura ordinais de vértebras cervicais, torácicas e lombares', () => {
      expect(CERVICAIS_ORDINAIS).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
      expect(TORACICAS_ORDINAIS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']);
      expect(LOMBARES_ORDINAIS).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    });

    it('configura ossos simples de Tórax como as 3 partes do Esterno', () => {
      expect(TORAX_OSSOS).toEqual([
        'Esterno - Manúbrio',
        'Esterno - Corpo',
        'Esterno - Processo xifóide'
      ]);
    });

    it('configura ordinais de costelas de 1ª a 12ª', () => {
      expect(COSTELAS_ORDINAIS).toEqual([
        '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª'
      ]);
    });
  });

  describe('Ações de Marcação em Lote (Marcar Todos P, F, I, A)', () => {
    const testBones = ['Clavícula Esquerda', 'Escápula Esquerda'];

    it('marca todos os ossos da lista como P', () => {
      const res = applyBulkPresence({}, [], testBones, 'P');
      expect(res.ossos).toEqual({
        'Clavícula Esquerda': 'P',
        'Escápula Esquerda': 'P'
      });
    });

    it('marca todos os ossos da lista como F', () => {
      const res = applyBulkPresence({}, [], testBones, 'F');
      expect(res.ossos).toEqual({
        'Clavícula Esquerda': 'F',
        'Escápula Esquerda': 'F'
      });
    });

    it('marca todos os ossos da lista como I', () => {
      const res = applyBulkPresence({}, [], testBones, 'I');
      expect(res.ossos).toEqual({
        'Clavícula Esquerda': 'I',
        'Escápula Esquerda': 'I'
      });
    });

    it('marca todos os ossos da lista como A e remove alterações ósseas desses ossos', () => {
      const initialAlts = [
        { id: 'alt-1', tipo: 'patologia' as const, osso: 'Clavícula Esquerda', observacoes: '' },
        { id: 'alt-2', tipo: 'lesao_peri_mortem' as const, osso: 'Úmero Esquerdo', observacoes: '' }
      ];
      const res = applyBulkPresence({ 'Clavícula Esquerda': 'P' }, initialAlts, testBones, 'A');
      expect(res.ossos).toEqual({
        'Clavícula Esquerda': 'A',
        'Escápula Esquerda': 'A'
      });
      // Alteração da Clavícula Esquerda deve ser removida; alteração do Úmero (não incluído) é mantida
      expect(res.alteracoes).toEqual([
        { id: 'alt-2', tipo: 'lesao_peri_mortem', osso: 'Úmero Esquerdo', observacoes: '' }
      ]);
    });
  });
});
