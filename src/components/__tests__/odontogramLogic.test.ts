import { describe, it, expect } from 'vitest';
import {
  PAIR_MAP,
  PRESENCE_CONDITIONS_META,
  CLINICAL_CONDITIONS_META,
  deriveLegacyCondition,
  normalizeToothRecord,
  calculateBatchPresenceUpdate,
  calculateBatchClinicalToggle
} from '../OdontogramViewer';
import { ToothRecord } from '../../types/sgccco';

describe('Inventário Odontológico — Regras de Negócio e Lógica', () => {
  describe('Pares Anatômicos da Dentição Mista (PAIR_MAP)', () => {
    it('mapeia corretamente os pares superiores direitos (15..11 <-> 55..51)', () => {
      expect(PAIR_MAP[15]).toBe(55);
      expect(PAIR_MAP[14]).toBe(54);
      expect(PAIR_MAP[13]).toBe(53);
      expect(PAIR_MAP[12]).toBe(52);
      expect(PAIR_MAP[11]).toBe(51);

      expect(PAIR_MAP[55]).toBe(15);
      expect(PAIR_MAP[54]).toBe(14);
      expect(PAIR_MAP[53]).toBe(13);
      expect(PAIR_MAP[52]).toBe(12);
      expect(PAIR_MAP[51]).toBe(11);
    });

    it('mapeia corretamente os pares superiores esquerdos (21..25 <-> 61..65)', () => {
      expect(PAIR_MAP[21]).toBe(61);
      expect(PAIR_MAP[22]).toBe(62);
      expect(PAIR_MAP[23]).toBe(63);
      expect(PAIR_MAP[24]).toBe(64);
      expect(PAIR_MAP[25]).toBe(65);

      expect(PAIR_MAP[61]).toBe(21);
      expect(PAIR_MAP[62]).toBe(22);
      expect(PAIR_MAP[63]).toBe(23);
      expect(PAIR_MAP[64]).toBe(24);
      expect(PAIR_MAP[65]).toBe(25);
    });

    it('mapeia corretamente os pares inferiores esquerdos (31..35 <-> 71..75)', () => {
      expect(PAIR_MAP[31]).toBe(71);
      expect(PAIR_MAP[32]).toBe(72);
      expect(PAIR_MAP[33]).toBe(73);
      expect(PAIR_MAP[34]).toBe(74);
      expect(PAIR_MAP[35]).toBe(75);

      expect(PAIR_MAP[71]).toBe(31);
      expect(PAIR_MAP[72]).toBe(32);
      expect(PAIR_MAP[73]).toBe(33);
      expect(PAIR_MAP[74]).toBe(34);
      expect(PAIR_MAP[75]).toBe(35);
    });

    it('mapeia corretamente os pares inferiores direitos (41..45 <-> 81..85)', () => {
      expect(PAIR_MAP[41]).toBe(81);
      expect(PAIR_MAP[42]).toBe(82);
      expect(PAIR_MAP[43]).toBe(83);
      expect(PAIR_MAP[44]).toBe(84);
      expect(PAIR_MAP[45]).toBe(85);

      expect(PAIR_MAP[81]).toBe(41);
      expect(PAIR_MAP[82]).toBe(42);
      expect(PAIR_MAP[83]).toBe(43);
      expect(PAIR_MAP[84]).toBe(44);
      expect(PAIR_MAP[85]).toBe(45);
    });
  });

  describe('Metadados das Condições Clínicas e Presença', () => {
    it('possui as 4 opções obrigatórias de Presença do Estágio 1', () => {
      expect(Object.keys(PRESENCE_CONDITIONS_META)).toHaveLength(4);
      expect(PRESENCE_CONDITIONS_META).toHaveProperty('articulado');
      expect(PRESENCE_CONDITIONS_META).toHaveProperty('desarticulado');
      expect(PRESENCE_CONDITIONS_META).toHaveProperty('ausente_ante_mortem');
      expect(PRESENCE_CONDITIONS_META).toHaveProperty('ausente_post_mortem');

      expect(PRESENCE_CONDITIONS_META.articulado.abbr).toBe('ART');
      expect(PRESENCE_CONDITIONS_META.desarticulado.abbr).toBe('DES');
      expect(PRESENCE_CONDITIONS_META.ausente_ante_mortem.abbr).toBe('AAM');
      expect(PRESENCE_CONDITIONS_META.ausente_post_mortem.abbr).toBe('APM');
    });

    it('possui exatamente as 17 opções clínicas de múltipla escolha do Estágio 2', () => {
      const keys = Object.keys(CLINICAL_CONDITIONS_META);
      expect(keys).toHaveLength(17);
      expect(keys).toContain('parcialmente_irrompido');
      expect(keys).toContain('nao_irrompido');
      expect(keys).toContain('higido');
      expect(keys).toContain('cariado');
      expect(keys).toContain('mancha');
      expect(keys).toContain('resto_radicular');
      expect(keys).toContain('fratura');
      expect(keys).toContain('com_material_restaurador');
      expect(keys).toContain('com_material_protetico');
      expect(keys).toContain('implante');
      expect(keys).toContain('aparelho_ortodontico');
      expect(keys).toContain('tartaro');
      expect(keys).toContain('erosao');
      expect(keys).toContain('abrasao');
      expect(keys).toContain('abfracao');
      expect(keys).toContain('giroversao');
      expect(keys).toContain('apinhamento');
    });
  });

  describe('Derivação de Condição Legada (deriveLegacyCondition)', () => {
    it('deriva ausente_ante_mortem e ausente_post_mortem', () => {
      expect(deriveLegacyCondition('ausente_ante_mortem', [])).toBe('ausente_ante_mortem');
      expect(deriveLegacyCondition('ausente_post_mortem', [])).toBe('ausente_post_mortem');
    });

    it('deriva carie quando cariado está presente', () => {
      expect(deriveLegacyCondition('articulado', ['cariado'])).toBe('carie');
    });

    it('deriva restauracao quando material restaurador ou implante está presente', () => {
      expect(deriveLegacyCondition('articulado', ['com_material_restaurador'])).toBe('restauracao');
      expect(deriveLegacyCondition('articulado', ['implante'])).toBe('restauracao');
    });

    it('deriva raiz_residual para resto radicular', () => {
      expect(deriveLegacyCondition('articulado', ['resto_radicular'])).toBe('raiz_residual');
    });

    it('deriva higido para elemento sadio', () => {
      expect(deriveLegacyCondition('articulado', ['higido'])).toBe('higido');
    });
  });

  describe('Normalização de Registros Dentários (normalizeToothRecord)', () => {
    it('normaliza dente indefinido como articulado hígido', () => {
      const norm = normalizeToothRecord(undefined, 11);
      expect(norm.presence).toBe('articulado');
      expect(norm.clinicalConditions).toEqual(['higido']);
      expect(norm.notes).toBe('');
    });

    it('converte registro legado ausente_ante_mortem', () => {
      const legacy: ToothRecord = {
        toothNumberFdi: 36,
        quadrant: 3,
        condition: 'ausente_ante_mortem'
      };
      const norm = normalizeToothRecord(legacy, 36);
      expect(norm.presence).toBe('ausente_ante_mortem');
      expect(norm.clinicalConditions).toEqual([]);
    });

    it('converte registro legado carie para articulado + cariado', () => {
      const legacy: ToothRecord = {
        toothNumberFdi: 16,
        quadrant: 1,
        condition: 'carie',
        notes: 'Cárie oclusal'
      };
      const norm = normalizeToothRecord(legacy, 16);
      expect(norm.presence).toBe('articulado');
      expect(norm.clinicalConditions).toEqual(['cariado']);
      expect(norm.notes).toBe('Cárie oclusal');
    });

    it('preserva dados modernos quando presence e clinicalConditions já estão preenchidos', () => {
      const modern: ToothRecord = {
        toothNumberFdi: 21,
        quadrant: 2,
        presence: 'desarticulado',
        clinicalConditions: ['fratura', 'com_material_restaurador'],
        condition: 'restauracao'
      };
      const norm = normalizeToothRecord(modern, 21);
      expect(norm.presence).toBe('desarticulado');
      expect(norm.clinicalConditions).toEqual(['fratura', 'com_material_restaurador']);
    });
  });

  describe('Operações em Lote e Seleção Múltipla de Dentes (calculateBatchPresenceUpdate & calculateBatchClinicalToggle)', () => {
    const teethMap: Record<number, ToothRecord> = {
      11: {
        toothNumberFdi: 11,
        quadrant: 1,
        presence: 'articulado',
        clinicalConditions: ['higido'],
        condition: 'higido',
        notes: 'Nota 11'
      },
      12: {
        toothNumberFdi: 12,
        quadrant: 1,
        presence: 'articulado',
        clinicalConditions: ['cariado'],
        condition: 'carie',
        notes: 'Nota 12'
      },
      13: {
        toothNumberFdi: 13,
        quadrant: 1,
        presence: 'ausente_ante_mortem',
        clinicalConditions: [],
        condition: 'ausente_ante_mortem',
        notes: 'Nota 13'
      }
    };

    const getTooth = (num: number) => teethMap[num];

    it('aplica ausente_post_mortem em lote limpando condições clínicas', () => {
      const updates = calculateBatchPresenceUpdate([11, 12], getTooth, 'ausente_post_mortem');
      expect(updates).toHaveLength(2);
      expect(updates[0].toothNumber).toBe(11);
      expect(updates[0].update.presence).toBe('ausente_post_mortem');
      expect(updates[0].update.clinicalConditions).toEqual([]);
      expect(updates[0].update.condition).toBe('ausente_post_mortem');
      expect(updates[0].notes).toBe('Nota 11');

      expect(updates[1].toothNumber).toBe(12);
      expect(updates[1].update.presence).toBe('ausente_post_mortem');
      expect(updates[1].update.clinicalConditions).toEqual([]);
      expect(updates[1].update.condition).toBe('ausente_post_mortem');
    });

    it('reativa dentes ausentes para articulado restaurando higido', () => {
      const updates = calculateBatchPresenceUpdate([13], getTooth, 'articulado');
      expect(updates).toHaveLength(1);
      expect(updates[0].update.presence).toBe('articulado');
      expect(updates[0].update.clinicalConditions).toEqual(['higido']);
      expect(updates[0].update.condition).toBe('higido');
    });

    it('adiciona característica clínica em lote preservando características individuais prévias', () => {
      // 11 é higido, 12 é cariado. Adicionar 'tartaro' deve colocar [tartaro] no 11 e [cariado, tartaro] no 12!
      const updates = calculateBatchClinicalToggle([11, 12], getTooth, 'tartaro');
      expect(updates).toHaveLength(2);

      expect(updates[0].toothNumber).toBe(11);
      expect(updates[0].update.clinicalConditions).toEqual(['tartaro']);
      expect(updates[0].update.presence).toBe('articulado');

      expect(updates[1].toothNumber).toBe(12);
      expect(updates[1].update.clinicalConditions).toEqual(['cariado', 'tartaro']);
      expect(updates[1].update.presence).toBe('articulado');
    });

    it('remove característica clínica de todos quando todos os dentes selecionados já a possuem', () => {
      const allTartaroMap: Record<number, ToothRecord> = {
        11: {
          toothNumberFdi: 11,
          quadrant: 1,
          presence: 'articulado',
          clinicalConditions: ['tartaro'],
          condition: 'higido'
        },
        12: {
          toothNumberFdi: 12,
          quadrant: 1,
          presence: 'articulado',
          clinicalConditions: ['cariado', 'tartaro'],
          condition: 'carie'
        }
      };

      const updates = calculateBatchClinicalToggle([11, 12], n => allTartaroMap[n], 'tartaro');
      expect(updates[0].update.clinicalConditions).toEqual(['higido']); // Ficou vazio, restaurou higido
      expect(updates[1].update.clinicalConditions).toEqual(['cariado']); // Manteve cariado
    });

    it('redefine todos os dentes para higido quando cond é higido', () => {
      const updates = calculateBatchClinicalToggle([11, 12], getTooth, 'higido');
      expect(updates[0].update.clinicalConditions).toEqual(['higido']);
      expect(updates[1].update.clinicalConditions).toEqual(['higido']);
    });

    it('converte dente ausente em articulado quando recebe característica clínica', () => {
      const updates = calculateBatchClinicalToggle([13], getTooth, 'fratura');
      expect(updates[0].update.presence).toBe('articulado');
      expect(updates[0].update.clinicalConditions).toEqual(['fratura']);
    });

    it('propaga anotação customizada quando fornecida em lote', () => {
      const updates = calculateBatchPresenceUpdate([11, 12], getTooth, 'desarticulado', 'Dentes encontrados no fundo da urna');
      expect(updates[0].notes).toBe('Dentes encontrados no fundo da urna');
      expect(updates[1].notes).toBe('Dentes encontrados no fundo da urna');
    });
  });
});
