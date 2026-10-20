import { describe, it, expect } from 'vitest';
import {
  isBilateralSection,
  partitionBonesBySide,
  BILATERAL_SECTION_IDS,
  MEMBROS_SUPERIORES_OSSOS,
  PELVE_MEMBRO_INFERIOR_OSSOS,
  OSSOS_MAO,
  OSSOS_PE,
  CABECA_PESCOCO_OSSOS
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
});
