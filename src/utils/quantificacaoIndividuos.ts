import {
  OsteologicalInventoryData,
  OsteologicalPresenceCode,
  BoneQuantificationEntry,
  NumeroIndividuosData
} from '../types/sgccco';

/**
 * Interface com os resultados matemáticos e bioantropológicos de um osso individual.
 */
export interface MetricasOsso {
  nmi: number;
  mmt: number;
  nmpiPiso: number;
  nmpiDecimal: number;
  vx: number;
  desvioPadrao: number;
  ic95: {
    inferior: number;
    superior: number;
    margem: number;
  };
}

/**
 * Interface com os resultados consolidados do conjunto osteológico.
 */
export interface MetricasConsolidadas {
  nmi: number;
  mmt: number;
  nmpiPiso: number;
  nmpiDecimal: number;
  vx: number;
  desvioPadrao: number;
  ic95: {
    inferior: number;
    superior: number;
    margem: number;
  };
  ossoDeterminanteNMI?: string;
  ossoDeterminanteMMT?: string;
  ossoDeterminanteNMPI?: string;
  totalOssosAvaliados: number;
  isDefault: boolean;
}

/**
 * Sugestão de osso identificado no inventário osteológico.
 */
export interface SugestaoOssoInventario {
  nome: string;
  categoria: string;
  sugeridoE: number;
  sugeridoD: number;
  origem: string;
}

/**
 * Cálculo do Número Mínimo de Indivíduos (NMI):
 * NMI = max(NME(E), NME(D))
 */
export function calcularNMI(ladoEsquerdo: number, ladoDireito: number): number {
  const e = Math.max(0, Math.floor(ladoEsquerdo || 0));
  const d = Math.max(0, Math.floor(ladoDireito || 0));
  return Math.max(e, d);
}

/**
 * Cálculo do Mínimo Máximo Total (MMT):
 * MMT = NME(E) + NME(D) - P
 * Onde P (número de pares combinados) não pode exceder min(E, D).
 */
export function calcularMMT(ladoEsquerdo: number, ladoDireito: number, pareados: number): number {
  const e = Math.max(0, Math.floor(ladoEsquerdo || 0));
  const d = Math.max(0, Math.floor(ladoDireito || 0));
  const maxP = Math.min(e, d);
  const p = Math.max(0, Math.min(Math.floor(pareados || 0), maxP));
  return e + d - p;
}

/**
 * Cálculo do Número Mais Provável de Indivíduos (NMPI) - Estimador de Chapman (1951) / Adams & Konigsberg (2004):
 * NMPI = floor[ ((E + 1) * (D + 1)) / (P + 1) - 1 ]
 *
 * Retorna o valor inteiro com a função piso (floor) e o valor decimal exato
 * para exibição complementar entre parênteses (ex: 3 (3.9)).
 */
export function calcularNMPI(
  ladoEsquerdo: number,
  ladoDireito: number,
  pareados: number
): { piso: number; decimal: number } {
  const e = Math.max(0, Math.floor(ladoEsquerdo || 0));
  const d = Math.max(0, Math.floor(ladoDireito || 0));
  
  if (e === 0 && d === 0) {
    return { piso: 0, decimal: 0 };
  }

  const maxP = Math.min(e, d);
  const p = Math.max(0, Math.min(Math.floor(pareados || 0), maxP));

  const decimalExact = ((e + 1) * (d + 1)) / (p + 1) - 1;
  const piso = Math.floor(decimalExact);
  // Arredonda decimal para até 2 casas decimais para exibição legível
  const decimal = Math.round(decimalExact * 100) / 100;

  return { piso, decimal };
}

/**
 * Cálculo da Variância de Adams & Konigsberg (2004) / Seber (1970):
 * Vx = [ (E + 1) * (D + 1) * (E - P) * (D - P) ] / [ (P + 1)^2 * (P + 2) ]
 */
export function calcularVx(ladoEsquerdo: number, ladoDireito: number, pareados: number): number {
  const e = Math.max(0, Math.floor(ladoEsquerdo || 0));
  const d = Math.max(0, Math.floor(ladoDireito || 0));

  if (e === 0 && d === 0) {
    return 0;
  }

  const maxP = Math.min(e, d);
  const p = Math.max(0, Math.min(Math.floor(pareados || 0), maxP));

  // Se P == min(E, D), então (E - P) == 0 ou (D - P) == 0, logo Vx = 0
  const numerador = (e + 1) * (d + 1) * (e - p) * (d - p);
  const denominador = Math.pow(p + 1, 2) * (p + 2);

  if (denominador === 0) return 0;
  const vx = numerador / denominador;
  return Math.max(0, Math.round(vx * 1000) / 1000);
}

/**
 * Intervalo de Confiança de 95% (IC 95%):
 * IC 95% = NMPI ± 1.96 * sqrt(Vx)
 *
 * Limites:
 * - Inferior: max(NMI, floor(NMPI - 1.96 * sqrt(Vx)))
 * - Superior: ceil(NMPI + 1.96 * sqrt(Vx))
 */
export function calcularIC95(
  ladoEsquerdo: number,
  ladoDireito: number,
  pareados: number,
  nmpiDecimal: number
): { inferior: number; superior: number; margem: number } {
  const vx = calcularVx(ladoEsquerdo, ladoDireito, pareados);
  const nmi = calcularNMI(ladoEsquerdo, ladoDireito);

  if (vx <= 0 || nmpiDecimal <= 0) {
    const valor = Math.floor(nmpiDecimal) || nmi || 1;
    return { inferior: valor, superior: valor, margem: 0 };
  }

  const desvioPadrao = Math.sqrt(vx);
  const margem = 1.96 * desvioPadrao;

  const infCalculado = Math.floor(nmpiDecimal - margem);
  const inferior = Math.max(nmi, infCalculado, 1);
  const supCalculado = Math.ceil(nmpiDecimal + margem);
  const superior = Math.max(inferior, supCalculado);

  return {
    inferior,
    superior,
    margem: Math.round(margem * 100) / 100
  };
}

/**
 * Calcula todas as métricas individuais para uma entrada de osso.
 */
export function calcularMetricasOsso(entry: BoneQuantificationEntry): MetricasOsso {
  const nmi = calcularNMI(entry.ladoEsquerdo, entry.ladoDireito);
  const mmt = calcularMMT(entry.ladoEsquerdo, entry.ladoDireito, entry.pareados);
  const { piso: nmpiPiso, decimal: nmpiDecimal } = calcularNMPI(
    entry.ladoEsquerdo,
    entry.ladoDireito,
    entry.pareados
  );
  const vx = calcularVx(entry.ladoEsquerdo, entry.ladoDireito, entry.pareados);
  const desvioPadrao = Math.round(Math.sqrt(vx) * 100) / 100;
  const ic95 = calcularIC95(entry.ladoEsquerdo, entry.ladoDireito, entry.pareados, nmpiDecimal);

  return {
    nmi,
    mmt,
    nmpiPiso,
    nmpiDecimal,
    vx,
    desvioPadrao,
    ic95
  };
}

/**
 * Consolida as métricas globais a partir de múltiplas entradas de ossos.
 * Caso nenhuma entrada exista ou todos os ossos estejam zerados,
 * o valor default retornado é 1 (conforme especificação formal).
 */
export function calcularMetricasConsolidadas(entries: BoneQuantificationEntry[]): MetricasConsolidadas {
  const validEntries = entries.filter(e => e.ladoEsquerdo > 0 || e.ladoDireito > 0);

  if (validEntries.length === 0) {
    return {
      nmi: 1,
      mmt: 1,
      nmpiPiso: 1,
      nmpiDecimal: 1.0,
      vx: 0,
      desvioPadrao: 0,
      ic95: { inferior: 1, superior: 1, margem: 0 },
      totalOssosAvaliados: 0,
      isDefault: true
    };
  }

  let maxNMI = 0;
  let ossoNMI = '';

  let maxMMT = 0;
  let ossoMMT = '';

  let maxNMPIDecimal = -1;
  let melhorMetricaNMPI: MetricasOsso | null = null;
  let ossoNMPI = '';

  for (const entry of validEntries) {
    const metricas = calcularMetricasOsso(entry);

    if (metricas.nmi > maxNMI) {
      maxNMI = metricas.nmi;
      ossoNMI = entry.nomeOsso;
    }

    if (metricas.mmt > maxMMT) {
      maxMMT = metricas.mmt;
      ossoMMT = entry.nomeOsso;
    }

    if (metricas.nmpiDecimal > maxNMPIDecimal) {
      maxNMPIDecimal = metricas.nmpiDecimal;
      melhorMetricaNMPI = metricas;
      ossoNMPI = entry.nomeOsso;
    }
  }

  const nmpiFinal = melhorMetricaNMPI || {
    nmpiPiso: Math.max(1, maxNMI),
    nmpiDecimal: Math.max(1, maxNMI),
    vx: 0,
    desvioPadrao: 0,
    ic95: { inferior: Math.max(1, maxNMI), superior: Math.max(1, maxNMI), margem: 0 }
  };

  return {
    nmi: Math.max(1, maxNMI),
    mmt: Math.max(1, maxMMT),
    nmpiPiso: Math.max(1, nmpiFinal.nmpiPiso),
    nmpiDecimal: Math.max(1, nmpiFinal.nmpiDecimal),
    vx: nmpiFinal.vx,
    desvioPadrao: nmpiFinal.desvioPadrao,
    ic95: nmpiFinal.ic95,
    ossoDeterminanteNMI: ossoNMI,
    ossoDeterminanteMMT: ossoMMT,
    ossoDeterminanteNMPI: ossoNMPI,
    totalOssosAvaliados: validEntries.length,
    isDefault: false
  };
}

/**
 * Catálogo controlado dos principais ossos bilaterais para quantificação forense.
 */
export const OSSOS_BILATERAIS_PADRAO = [
  { nome: 'Fêmur', categoria: 'Membros Inferiores' },
  { nome: 'Tíbia', categoria: 'Membros Inferiores' },
  { nome: 'Fíbula', categoria: 'Membros Inferiores' },
  { nome: 'Úmero', categoria: 'Membros Superiores' },
  { nome: 'Rádio', categoria: 'Membros Superiores' },
  { nome: 'Ulna', categoria: 'Membros Superiores' },
  { nome: 'Clavícula', categoria: 'Cíngulo Superior' },
  { nome: 'Escápula', categoria: 'Cíngulo Superior' },
  { nome: 'Patela', categoria: 'Membros Inferiores' },
  { nome: 'Ílio (Osso Ilíaco)', categoria: 'Pelve' },
  { nome: 'Ísquio', categoria: 'Pelve' },
  { nome: 'Púbis', categoria: 'Pelve' },
  { nome: 'Calcâneo', categoria: 'Pés' },
  { nome: 'Tálus', categoria: 'Pés' },
  { nome: 'Escafóide', categoria: 'Mãos' },
  { nome: 'Semilunar', categoria: 'Mãos' },
  { nome: 'Costela não identificada', categoria: 'Tórax' },
  { nome: 'Vértebra não identificada', categoria: 'Coluna Vertebral' },
  { nome: 'Costela C1', categoria: 'Tórax' },
  { nome: 'Costela C2', categoria: 'Tórax' },
  { nome: 'Costela C3', categoria: 'Tórax' },
  { nome: 'Costela C4', categoria: 'Tórax' },
  { nome: 'Costela C5', categoria: 'Tórax' },
  { nome: 'Costela C6', categoria: 'Tórax' },
  { nome: 'Costela C7', categoria: 'Tórax' },
  { nome: 'Costela C8', categoria: 'Tórax' },
  { nome: 'Costela C9', categoria: 'Tórax' },
  { nome: 'Costela C10', categoria: 'Tórax' },
  { nome: 'Costela C11', categoria: 'Tórax' },
  { nome: 'Costela C12', categoria: 'Tórax' },
  { nome: 'Temporal', categoria: 'Crânio' },
  { nome: 'Parietal', categoria: 'Crânio' },
  { nome: 'Zigomático', categoria: 'Face' },
  { nome: 'Maxila', categoria: 'Face' }
] as const;

/**
 * Varre o inventário osteológico da Fase 4 e extrai ossos presentes ('P', 'F', 'I'),
 * agrupando bilateralmente quando aplicável.
 */
export function extrairOssosDoInventario(inventory?: OsteologicalInventoryData): SugestaoOssoInventario[] {
  if (!inventory) return [];

  const presentesMap = new Map<string, { nome: string; categoria: string; e: number; d: number }>();

  const registrar = (baseName: string, categoria: string, lado: 'E' | 'D') => {
    const cur = presentesMap.get(baseName) || { nome: baseName, categoria, e: 0, d: 0 };
    if (lado === 'E') cur.e = Math.max(cur.e, 1);
    if (lado === 'D') cur.d = Math.max(cur.d, 1);
    presentesMap.set(baseName, cur);
  };

  const processarSecao = (
    secao: { ossos?: Record<string, OsteologicalPresenceCode> } | undefined,
    categoria: string
  ) => {
    if (!secao || !secao.ossos || typeof secao.ossos !== 'object') return;
    for (const [boneName, code] of Object.entries(secao.ossos)) {
      if (code && code !== 'A') {
        const isDir = /\b(direito|direita)\b/i.test(boneName) || /\(D\)/i.test(boneName);
        const isEsq = /\b(esquerdo|esquerda)\b/i.test(boneName) || /\(E\)/i.test(boneName);
        
        let baseName = boneName
          .replace(/\s*-\s*(Epífise Proximal|Epífise Distal|Diáfise)/gi, '')
          .replace(/\s+(Direito|Direita|Esquerdo|Esquerda)/gi, '')
          .trim();

        if (isDir) {
          registrar(baseName, categoria, 'D');
        } else if (isEsq) {
          registrar(baseName, categoria, 'E');
        } else {
          // Osso bilateral sem lado especificado no nome (ex: registrado individualmente)
          registrar(baseName, categoria, 'D');
        }
      }
    }
  };

  processarSecao(inventory.membrosSuperiores, 'Membros Superiores');
  processarSecao(inventory.pelveMembroInferior, 'Pelve e Membros Inferiores');
  processarSecao(inventory.ossosMao, 'Ossos das Mãos');
  processarSecao(inventory.ossosPe, 'Ossos dos Pés');
  processarSecao(inventory.torax, 'Tórax (Costelas)');
  processarSecao(inventory.colunaVertebral, 'Coluna Vertebral');
  processarSecao(inventory.cabecaPescoco, 'Cabeça e Pescoço');

  const resultado: SugestaoOssoInventario[] = [];

  // Extrai costelas não identificadas registradas numericamente no inventário (§15/POP-01)
  const qtdCostelasNaoIdentificadas = inventory.torax?.quantidadeNaoIdentificadas;
  if (typeof qtdCostelasNaoIdentificadas === 'number' && qtdCostelasNaoIdentificadas > 0) {
    resultado.push({
      nome: 'Costela não identificada',
      categoria: 'Tórax',
      sugeridoE: qtdCostelasNaoIdentificadas,
      sugeridoD: 0,
      origem: 'Inventário Osteológico'
    });
  }

  // Extrai vértebras não identificadas registradas numericamente no inventário (§15/POP-01)
  const qtdVertebrasNaoIdentificadas = inventory.colunaVertebral?.quantidadeNaoIdentificadas;
  if (typeof qtdVertebrasNaoIdentificadas === 'number' && qtdVertebrasNaoIdentificadas > 0) {
    resultado.push({
      nome: 'Vértebra não identificada',
      categoria: 'Coluna Vertebral',
      sugeridoE: qtdVertebrasNaoIdentificadas,
      sugeridoD: 0,
      origem: 'Inventário Osteológico'
    });
  }

  for (const item of presentesMap.values()) {
    resultado.push({
      nome: item.nome,
      categoria: item.categoria,
      sugeridoE: item.e,
      sugeridoD: item.d,
      origem: 'Inventário Osteológico'
    });
  }

  return resultado;
}
