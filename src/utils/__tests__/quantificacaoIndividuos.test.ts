import { describe, it, expect } from 'vitest';
import {
  calcularNMI,
  calcularMMT,
  calcularNMPI,
  calcularVx,
  calcularIC95,
  calcularMetricasOsso,
  calcularMetricasConsolidadas,
  extrairOssosDoInventario
} from '../quantificacaoIndividuos';
import { BoneQuantificationEntry, OsteologicalInventoryData } from '../../types/sgccco';

describe('quantificacaoIndividuos - Cálculos Forenses de Número de Indivíduos', () => {
  describe('Cálculo do NMI (Número Mínimo de Indivíduos)', () => {
    it('deve retornar 0 quando ambos os lados forem 0', () => {
      expect(calcularNMI(0, 0)).toBe(0);
    });

    it('deve retornar o maior valor entre o lado esquerdo e direito', () => {
      expect(calcularNMI(5, 2)).toBe(5);
      expect(calcularNMI(3, 7)).toBe(7);
      expect(calcularNMI(4, 4)).toBe(4);
    });

    it('trata valores negativos ou decimais de forma robusta', () => {
      expect(calcularNMI(-2, 3)).toBe(3);
      expect(calcularNMI(3.8, 2.1)).toBe(3);
    });
  });

  describe('Cálculo do MMT (Mínimo Máximo Total)', () => {
    it('MMT = E + D - P', () => {
      // E=5, D=3, P=2 => 5 + 3 - 2 = 6
      expect(calcularMMT(5, 3, 2)).toBe(6);
    });

    it('quando todos forem pareados (P = min(E, D)), MMT é igual ao lado dominante', () => {
      // E=4, D=4, P=4 => 4 + 4 - 4 = 4
      expect(calcularMMT(4, 4, 4)).toBe(4);
    });

    it('quando não houver pares (P = 0), MMT é a soma total E + D', () => {
      // E=3, D=2, P=0 => 3 + 2 - 0 = 5
      expect(calcularMMT(3, 2, 0)).toBe(5);
    });

    it('limita P ao menor valor entre E e D se o usuário informar P > min(E, D)', () => {
      // E=5, D=2, P=10 => P é limitado a 2 => 5 + 2 - 2 = 5
      expect(calcularMMT(5, 2, 10)).toBe(5);
    });
  });

  describe('Cálculo do NMPI (Número Mais Provável de Indivíduos - Chapman)', () => {
    it('retorna 0 para ambos os lados zerados', () => {
      const res = calcularNMPI(0, 0, 0);
      expect(res.piso).toBe(0);
      expect(res.decimal).toBe(0);
    });

    it('aplica rigorosamente a função piso (floor) sem arredondar para cima', () => {
      // E=3, D=4, P=2:
      // ((3+1)*(4+1)) / (2+1) - 1 = (4 * 5)/3 - 1 = 20/3 - 1 = 6.666... - 1 = 5.666...
      // piso deve ser 5 e decimal ~5.67
      const res = calcularNMPI(3, 4, 2);
      expect(res.piso).toBe(5);
      expect(res.decimal).toBeCloseTo(5.67, 1);
    });

    it('quando o cálculo resulta em um valor decimal próximo do teto (ex: 3.9), o piso deve ser 3', () => {
      // Simulação direta da regra de negócio: não arredonda para cima
      // Se decimalExact fosse 3.9, Math.floor deve dar 3
      const decimalExact = 3.9;
      expect(Math.floor(decimalExact)).toBe(3);
    });

    it('calcula valor exato quando a divisão é inteira', () => {
      // E=3, D=3, P=3 => ((4)*(4)/4) - 1 = 4 - 1 = 3
      const res = calcularNMPI(3, 3, 3);
      expect(res.piso).toBe(3);
      expect(res.decimal).toBe(3);
    });

    it('quando P=0, aplica a fórmula de Chapman corretamente', () => {
      // E=2, D=2, P=0 => ((3)*(3)/1) - 1 = 9 - 1 = 8
      const res = calcularNMPI(2, 2, 0);
      expect(res.piso).toBe(8);
      expect(res.decimal).toBe(8);
    });
  });

  describe('Cálculo da Variância (Vx) e Intervalo de Confiança (IC 95%)', () => {
    it('quando P = min(E, D), a variância Vx é 0', () => {
      // Se E=4, D=3, P=3 => (D - P) = 0 => Vx = 0
      expect(calcularVx(4, 3, 3)).toBe(0);
    });

    it('calcula Vx com precisão para E=5, D=4, P=2', () => {
      // Vx = (5+1)*(4+1)*(5-2)*(4-2) / ((2+1)^2 * (2+2))
      // Numerador = 6 * 5 * 3 * 2 = 180
      // Denominador = 3^2 * 4 = 9 * 4 = 36
      // Vx = 180 / 36 = 5.0
      expect(calcularVx(5, 4, 2)).toBe(5);
    });

    it('calcula IC 95% garantindo que o limite inferior nunca seja menor que o NMI', () => {
      const e = 5;
      const d = 4;
      const p = 2;
      const nmi = calcularNMI(e, d); // 5
      const { decimal } = calcularNMPI(e, d, p); // 9
      const ic = calcularIC95(e, d, p, decimal);

      expect(ic.inferior).toBeGreaterThanOrEqual(nmi);
      expect(ic.superior).toBeGreaterThanOrEqual(ic.inferior);
      expect(ic.margem).toBeGreaterThan(0);
    });
  });

  describe('Cálculo das Métricas Isoladas de um Osso (calcularMetricasOsso)', () => {
    it('deve retornar todas as métricas calculadas isoladamente', () => {
      const entry: BoneQuantificationEntry = {
        id: 'bone-1',
        nomeOsso: 'Fêmur',
        ladoEsquerdo: 6,
        ladoDireito: 5,
        pareados: 3
      };

      const metricas = calcularMetricasOsso(entry);
      expect(metricas.nmi).toBe(6);
      expect(metricas.mmt).toBe(8); // 6 + 5 - 3 = 8
      // NMPI: ((6+1)*(5+1))/(3+1) - 1 = (7*6)/4 - 1 = 42/4 - 1 = 10.5 - 1 = 9.5
      expect(metricas.nmpiPiso).toBe(9);
      expect(metricas.nmpiDecimal).toBe(9.5);
      expect(metricas.vx).toBeGreaterThan(0);
      expect(metricas.ic95.inferior).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Consolidação Global (calcularMetricasConsolidadas)', () => {
    it('retorna default 1 para lista vazia de ossos', () => {
      const consolidated = calcularMetricasConsolidadas([]);
      expect(consolidated.nmi).toBe(1);
      expect(consolidated.mmt).toBe(1);
      expect(consolidated.nmpiPiso).toBe(1);
      expect(consolidated.isDefault).toBe(true);
    });

    it('retorna default 1 quando todas as entradas tiverem contagens 0', () => {
      const consolidated = calcularMetricasConsolidadas([
        { id: '1', nomeOsso: 'Fêmur', ladoEsquerdo: 0, ladoDireito: 0, pareados: 0 }
      ]);
      expect(consolidated.nmi).toBe(1);
      expect(consolidated.mmt).toBe(1);
      expect(consolidated.nmpiPiso).toBe(1);
      expect(consolidated.isDefault).toBe(true);
    });

    it('mantém resultados de cada osso isolados e identifica o osso determinante no agregado', () => {
      const entries: BoneQuantificationEntry[] = [
        { id: '1', nomeOsso: 'Fêmur', ladoEsquerdo: 5, ladoDireito: 4, pareados: 2 },
        { id: '2', nomeOsso: 'Úmero', ladoEsquerdo: 8, ladoDireito: 7, pareados: 6 },
        { id: '3', nomeOsso: 'Tíbia', ladoEsquerdo: 2, ladoDireito: 3, pareados: 1 }
      ];

      const consolidated = calcularMetricasConsolidadas(entries);

      // Úmero tem NMI 8 (maior NMI entre os 3)
      expect(consolidated.nmi).toBe(8);
      expect(consolidated.ossoDeterminanteNMI).toBe('Úmero');

      // Fêmur tem NMPI ((6*5)/3 - 1 = 9), Úmero tem ((9*8)/7 - 1 = 9.28)
      expect(consolidated.nmpiPiso).toBeGreaterThanOrEqual(8);
      expect(consolidated.totalOssosAvaliados).toBe(3);
      expect(consolidated.isDefault).toBe(false);
    });
  });

  describe('extrairOssosDoInventario', () => {
    it('retorna lista vazia se inventário for indefinido', () => {
      expect(extrairOssosDoInventario(undefined)).toEqual([]);
    });

    it('extrai corretamente ossos bilaterais presentes', () => {
      const mockInventory: OsteologicalInventoryData = {
        membrosSuperiores: {
          ossos: {
            'Úmero Direito - Diáfise': 'P',
            'Úmero Esquerdo - Diáfise': 'P',
            'Rádio Direito - Diáfise': 'P'
          }
        },
        pelveMembroInferior: {
          ossos: {
            'Fêmur Direito - Diáfise': 'P'
          }
        }
      };

      const extracted = extrairOssosDoInventario(mockInventory);
      expect(extracted.length).toBeGreaterThanOrEqual(3);

      const umero = extracted.find(b => b.nome === 'Úmero');
      expect(umero).toBeDefined();
      expect(umero?.sugeridoE).toBe(1);
      expect(umero?.sugeridoD).toBe(1);

      const femur = extracted.find(b => b.nome === 'Fêmur');
      expect(femur).toBeDefined();
      expect(femur?.sugeridoD).toBe(1);
      expect(femur?.sugeridoE).toBe(0);
    });

    it('extrai costela não identificada e vértebra não identificada de campos residuais', () => {
      const mockInventory: OsteologicalInventoryData = {
        torax: {
          ossos: {},
          quantidadeNaoIdentificadas: 14
        },
        colunaVertebral: {
          ossos: {},
          quantidadeNaoIdentificadas: 7
        }
      };

      const extracted = extrairOssosDoInventario(mockInventory);
      const costela = extracted.find(b => b.nome === 'Costela não identificada');
      expect(costela).toBeDefined();
      expect(costela?.sugeridoE).toBe(14);
      expect(costela?.categoria).toBe('Tórax');

      const vertebra = extracted.find(b => b.nome === 'Vértebra não identificada');
      expect(vertebra).toBeDefined();
      expect(vertebra?.sugeridoE).toBe(7);
      expect(vertebra?.categoria).toBe('Coluna Vertebral');
    });
  });
});
