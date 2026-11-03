import React, { useState } from 'react';
import {
  OsteologicalInventoryData,
  OsteologicalPresenceCode,
  AlteracaoOsseaTipo,
  OsteologicalAlteracaoRegiao,
  OsteologicalSimpleBoneSection,
  OsteologicalSectionCabecaPescoco,
  OsteologicalPooledCounts,
  OsteologicalCountIdentifySelection
} from '../types/sgccco';
import { Info, Sparkles, Plus, Trash2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

// A opção 'ausente' ('A') aceita alterações ósseas (solicitação do Tales, nov/2026:
// ossos ausentes podem ter alterações associadas como amputação cirúrgica, trauma perimortem,
// perda tafonômica ou agenesia).
export function clearAlteracoesIfAusente(
  alteracoes: OsteologicalAlteracaoRegiao[] | undefined,
  _bone: string,
  _newCode: OsteologicalPresenceCode | undefined
): OsteologicalAlteracaoRegiao[] | undefined {
  return alteracoes;
}

export function applyBulkPresence(
  currentOssos: Record<string, OsteologicalPresenceCode>,
  currentAlteracoes: OsteologicalAlteracaoRegiao[] | undefined,
  bones: readonly string[],
  code: OsteologicalPresenceCode
): { ossos: Record<string, OsteologicalPresenceCode>; alteracoes: OsteologicalAlteracaoRegiao[] | undefined } {
  const newOssos = { ...currentOssos };
  for (const bone of bones) newOssos[bone] = code;
  return { ossos: newOssos, alteracoes: currentAlteracoes };
}

export function computeBoneAlterationStatus(
  currentCode: OsteologicalPresenceCode | undefined,
  boneAlteracoes: OsteologicalAlteracaoRegiao[] | undefined
): {
  hasSemAlteracao: boolean;
  activeAlteracoes: OsteologicalAlteracaoRegiao[];
  isSemAlteracaoAuto: boolean;
  showSemAlteracao: boolean;
} {
  const list = boneAlteracoes || [];
  const hasSemAlteracao = list.some(a => a.tipo === 'sem_alteracao');
  const activeAlteracoes = list.filter(a => a.tipo !== 'sem_alteracao');
  // Se o osso possui código de presença (P, F ou I) e nenhuma alteração foi marcada,
  // ele é AUTOMATICAMENTE considerado "Sem alteração" (pedido dos técnicos, out/2026).
  const isSemAlteracaoAuto = !!(currentCode && currentCode !== 'A' && activeAlteracoes.length === 0);
  const showSemAlteracao = hasSemAlteracao || isSemAlteracaoAuto;
  return { hasSemAlteracao, activeAlteracoes, isSemAlteracaoAuto, showSemAlteracao };
}

// Coluna Vertebral:
// Vértebras aparecem antes de Sacro e Cóccix na listagem (pedido dos técnicos, out/2026).
export const VERTEBRAS_CERVICAIS = [
  'Vértebra Cervical C1 (Atlas)',
  'Vértebra Cervical C2 (Áxis)',
  'Vértebra Cervical C3',
  'Vértebra Cervical C4',
  'Vértebra Cervical C5',
  'Vértebra Cervical C6',
  'Vértebra Cervical C7'
] as const;

export const VERTEBRAS_TORACICAS = [
  'Vértebra Torácica T1',
  'Vértebra Torácica T2',
  'Vértebra Torácica T3',
  'Vértebra Torácica T4',
  'Vértebra Torácica T5',
  'Vértebra Torácica T6',
  'Vértebra Torácica T7',
  'Vértebra Torácica T8',
  'Vértebra Torácica T9',
  'Vértebra Torácica T10',
  'Vértebra Torácica T11',
  'Vértebra Torácica T12'
] as const;

export const VERTEBRAS_LOMBARES = [
  'Vértebra Lombar L1',
  'Vértebra Lombar L2',
  'Vértebra Lombar L3',
  'Vértebra Lombar L4',
  'Vértebra Lombar L5'
] as const;

export const SACRO_COCCIX_OSSOS = ['Sacro', 'Cóccix'] as const;

export const COLUNA_VERTEBRAL_OSSOS = [
  ...VERTEBRAS_CERVICAIS,
  ...VERTEBRAS_TORACICAS,
  ...VERTEBRAS_LOMBARES,
  ...SACRO_COCCIX_OSSOS
] as const;

export const CERVICAIS_ORDINAIS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'] as const;
export const TORACICAS_ORDINAIS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'] as const;
export const LOMBARES_ORDINAIS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;

// Tórax:
// Esterno (Manúbrio, Corpo, Processo xifóide) e Costelas em listagem (C1 a C12) por lateralidade (pedido dos técnicos, out/2026).
export const ESTERNO_OSSOS = [
  'Esterno - Manúbrio',
  'Esterno - Corpo',
  'Esterno - Processo xifóide'
] as const;

export const COSTELAS_ESQUERDAS = [
  'Costela C1 Esquerda',
  'Costela C2 Esquerda',
  'Costela C3 Esquerda',
  'Costela C4 Esquerda',
  'Costela C5 Esquerda',
  'Costela C6 Esquerda',
  'Costela C7 Esquerda',
  'Costela C8 Esquerda',
  'Costela C9 Esquerda',
  'Costela C10 Esquerda',
  'Costela C11 Esquerda',
  'Costela C12 Esquerda'
] as const;

export const COSTELAS_DIREITAS = [
  'Costela C1 Direita',
  'Costela C2 Direita',
  'Costela C3 Direita',
  'Costela C4 Direita',
  'Costela C5 Direita',
  'Costela C6 Direita',
  'Costela C7 Direita',
  'Costela C8 Direita',
  'Costela C9 Direita',
  'Costela C10 Direita',
  'Costela C11 Direita',
  'Costela C12 Direita'
] as const;

export const TORAX_OSSOS = [
  ...ESTERNO_OSSOS,
  ...COSTELAS_ESQUERDAS,
  ...COSTELAS_DIREITAS
] as const;

export const COSTELAS_ORDINAIS = [
  '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª'
] as const;

// Só os ossos do braço/cintura escapular — carpo e metacarpo saem pra
// "Ossos das Mãos" (seção própria, pedido dos pesquisadores). Direito e
// Esquerdo numa seção só, divididos em subtipos/grupos anatômicos:
// Cíngulo do membro superior, Úmero, Rádio e Ulna (pedido dos técnicos, out/2026).
export const MEMBROS_SUPERIORES_OSSOS = [
  'Clavícula Direita',
  'Escápula Direita',
  'Úmero Direito - Epífise Proximal',
  'Úmero Direito - Diáfise',
  'Úmero Direito - Epífise Distal',
  'Rádio Direito - Epífise Proximal',
  'Rádio Direito - Diáfise',
  'Rádio Direito - Epífise Distal',
  'Ulna Direita - Epífise Proximal',
  'Ulna Direita - Diáfise',
  'Ulna Direita - Epífise Distal',
  'Clavícula Esquerda',
  'Escápula Esquerda',
  'Úmero Esquerdo - Epífise Proximal',
  'Úmero Esquerdo - Diáfise',
  'Úmero Esquerdo - Epífise Distal',
  'Rádio Esquerdo - Epífise Proximal',
  'Rádio Esquerdo - Diáfise',
  'Rádio Esquerdo - Epífise Distal',
  'Ulna Esquerda - Epífise Proximal',
  'Ulna Esquerda - Diáfise',
  'Ulna Esquerda - Epífise Distal'
] as const;

// Carpo + metacarpo das duas mãos, numa seção própria (pedido dos
// pesquisadores) — cada osso ainda identificado por lado dentro da lista.
export const OSSOS_MAO = [
  'Escafóide Direito',
  'Semilunar Direito',
  'Piramidal Direito',
  'Pisiforme Direito',
  'Trapézio Direito',
  'Trapezóide Direito',
  'Capitato Direito',
  'Hamato Direito',
  '1º Metacarpal Direito',
  '2º Metacarpal Direito',
  '3º Metacarpal Direito',
  '4º Metacarpal Direito',
  '5º Metacarpal Direito',
  'Escafóide Esquerdo',
  'Semilunar Esquerdo',
  'Piramidal Esquerdo',
  'Pisiforme Esquerdo',
  'Trapézio Esquerdo',
  'Trapezóide Esquerdo',
  'Capitato Esquerdo',
  'Hamato Esquerdo',
  '1º Metacarpal Esquerdo',
  '2º Metacarpal Esquerdo',
  '3º Metacarpal Esquerdo',
  '4º Metacarpal Esquerdo',
  '5º Metacarpal Esquerdo'
] as const;

// Pelve/Bacia e Membro Inferior unidos numa seção só (pedido dos
// pesquisadores) — tarso e metatarso saem pra "Ossos dos Pés". Divididos
// em subtipos anatômicos: Cíngulo do membro inferior, Fêmur, Tíbia, Fíbula
// e Patela ao final como ponto único (pedido dos técnicos, out/2026).
export const PELVE_MEMBRO_INFERIOR_OSSOS = [
  'Ílio Direito',
  'Ísquio Direito',
  'Púbis Direito',
  'Fêmur Direito - Epífise Proximal',
  'Fêmur Direito - Diáfise',
  'Fêmur Direito - Epífise Distal',
  'Tíbia Direita - Epífise Proximal',
  'Tíbia Direita - Diáfise',
  'Tíbia Direita - Epífise Distal',
  'Fíbula Direita - Epífise Proximal',
  'Fíbula Direita - Diáfise',
  'Fíbula Direita - Epífise Distal',
  'Patela Direita',
  'Ílio Esquerdo',
  'Ísquio Esquerdo',
  'Púbis Esquerdo',
  'Fêmur Esquerdo - Epífise Proximal',
  'Fêmur Esquerdo - Diáfise',
  'Fêmur Esquerdo - Epífise Distal',
  'Tíbia Esquerda - Epífise Proximal',
  'Tíbia Esquerda - Diáfise',
  'Tíbia Esquerda - Epífise Distal',
  'Fíbula Esquerda - Epífise Proximal',
  'Fíbula Esquerda - Diáfise',
  'Fíbula Esquerda - Epífise Distal',
  'Patela Esquerda'
] as const;

// Tarso + metatarso dos dois pés, seção própria — mesma lógica de Ossos da Mão.
export const OSSOS_PE = [
  'Calcâneo Direito',
  'Tálus Direito',
  'Navicular Direito',
  'Cuboide Direito',
  'Cuneiforme Medial Direito',
  'Cuneiforme Intermédio Direito',
  'Cuneiforme Lateral Direito',
  '1º Metatarsal Direito',
  '2º Metatarsal Direito',
  '3º Metatarsal Direito',
  '4º Metatarsal Direito',
  '5º Metatarsal Direito',
  'Calcâneo Esquerdo',
  'Tálus Esquerdo',
  'Navicular Esquerdo',
  'Cuboide Esquerdo',
  'Cuneiforme Medial Esquerdo',
  'Cuneiforme Intermédio Esquerdo',
  'Cuneiforme Lateral Esquerdo',
  '1º Metatarsal Esquerdo',
  '2º Metatarsal Esquerdo',
  '3º Metatarsal Esquerdo',
  '4º Metatarsal Esquerdo',
  '5º Metatarsal Esquerdo'
] as const;

export const BILATERAL_SECTION_IDS = [
  'membros_superiores',
  'pelve_mi',
  'ossos_mao',
  'ossos_pe'
] as const;

export type BilateralSectionId = typeof BILATERAL_SECTION_IDS[number];

export function isBilateralSection(sectionId: string): boolean {
  return (BILATERAL_SECTION_IDS as readonly string[]).includes(sectionId);
}

export function partitionBonesBySide(bones: readonly string[]): {
  direito: string[];
  esquerdo: string[];
} {
  return {
    direito: bones.filter(b => /direit/i.test(b)),
    esquerdo: bones.filter(b => /esquerd/i.test(b))
  };
}

export interface BilateralSubgroup {
  id: string;
  label: string;
  dotColor: string;
  bones: readonly string[];
}

export function formatSubgroupBoneLabel(bone: string): string {
  // 1. Epífises e Diáfises (Úmero, Rádio, Ulna, Fêmur, Tíbia, Fíbula)
  if (bone.includes(' - Epífise Proximal')) return 'Epífise proximal';
  if (bone.includes(' - Diáfise')) return 'Diáfise';
  if (bone.includes(' - Epífise Distal')) return 'Epífise distal';

  // 2. Ossos individuais de membros/mãos/pés: remover sufixos de lateralidade
  return bone
    .replace(/\s+Direito$/i, '')
    .replace(/\s+Direita$/i, '')
    .replace(/\s+Esquerdo$/i, '')
    .replace(/\s+Esquerda$/i, '');
}

export function getBilateralSubgroups(
  sectionId: string,
  side: 'direito' | 'esquerdo'
): BilateralSubgroup[] {
  const isRight = side === 'direito';
  const ladoStr = isRight ? 'Direito' : 'Esquerdo';
  const ladoFemStr = isRight ? 'Direita' : 'Esquerda';

  if (sectionId === 'membros_superiores') {
    return [
      {
        id: 'cingulo_ms',
        label: 'Cíngulo do membro superior',
        dotColor: 'bg-sky-500',
        bones: [`Clavícula ${ladoFemStr}`, `Escápula ${ladoFemStr}`]
      },
      {
        id: 'umero',
        label: 'Úmero',
        dotColor: 'bg-sky-600',
        bones: [
          `Úmero ${ladoStr} - Epífise Proximal`,
          `Úmero ${ladoStr} - Diáfise`,
          `Úmero ${ladoStr} - Epífise Distal`
        ]
      },
      {
        id: 'radio',
        label: 'Rádio',
        dotColor: 'bg-indigo-500',
        bones: [
          `Rádio ${ladoStr} - Epífise Proximal`,
          `Rádio ${ladoStr} - Diáfise`,
          `Rádio ${ladoStr} - Epífise Distal`
        ]
      },
      {
        id: 'ulna',
        label: 'Ulna',
        dotColor: 'bg-indigo-600',
        bones: [
          `Ulna ${ladoFemStr} - Epífise Proximal`,
          `Ulna ${ladoFemStr} - Diáfise`,
          `Ulna ${ladoFemStr} - Epífise Distal`
        ]
      }
    ];
  }

  if (sectionId === 'pelve_mi') {
    return [
      {
        id: 'cingulo_mi',
        label: 'Cíngulo do membro inferior',
        dotColor: 'bg-amber-500',
        bones: [`Ílio ${ladoStr}`, `Ísquio ${ladoStr}`, `Púbis ${ladoStr}`]
      },
      {
        id: 'femur',
        label: 'Fêmur',
        dotColor: 'bg-amber-600',
        bones: [
          `Fêmur ${ladoStr} - Epífise Proximal`,
          `Fêmur ${ladoStr} - Diáfise`,
          `Fêmur ${ladoStr} - Epífise Distal`
        ]
      },
      {
        id: 'tibia',
        label: 'Tíbia',
        dotColor: 'bg-emerald-500',
        bones: [
          `Tíbia ${ladoFemStr} - Epífise Proximal`,
          `Tíbia ${ladoFemStr} - Diáfise`,
          `Tíbia ${ladoFemStr} - Epífise Distal`
        ]
      },
      {
        id: 'fibula',
        label: 'Fíbula',
        dotColor: 'bg-emerald-600',
        bones: [
          `Fíbula ${ladoFemStr} - Epífise Proximal`,
          `Fíbula ${ladoFemStr} - Diáfise`,
          `Fíbula ${ladoFemStr} - Epífise Distal`
        ]
      },
      {
        id: 'patela',
        label: 'Patela',
        dotColor: 'bg-purple-500',
        bones: [`Patela ${ladoFemStr}`]
      }
    ];
  }

  if (sectionId === 'ossos_mao') {
    return [
      {
        id: 'carpo',
        label: 'Carpo',
        dotColor: 'bg-sky-500',
        bones: [
          `Escafóide ${ladoStr}`,
          `Semilunar ${ladoStr}`,
          `Piramidal ${ladoStr}`,
          `Pisiforme ${ladoStr}`,
          `Trapézio ${ladoStr}`,
          `Trapezóide ${ladoStr}`,
          `Capitato ${ladoStr}`,
          `Hamato ${ladoStr}`
        ]
      },
      {
        id: 'metacarpo',
        label: 'Metacarpo',
        dotColor: 'bg-sky-600',
        bones: [
          `1º Metacarpal ${ladoStr}`,
          `2º Metacarpal ${ladoStr}`,
          `3º Metacarpal ${ladoStr}`,
          `4º Metacarpal ${ladoStr}`,
          `5º Metacarpal ${ladoStr}`
        ]
      }
    ];
  }

  if (sectionId === 'ossos_pe') {
    return [
      {
        id: 'tarso',
        label: 'Tarso',
        dotColor: 'bg-amber-500',
        bones: [
          `Calcâneo ${ladoStr}`,
          `Tálus ${ladoStr}`,
          `Navicular ${ladoStr}`,
          `Cuboide ${ladoStr}`,
          `Cuneiforme Medial ${ladoStr}`,
          `Cuneiforme Intermédio ${ladoStr}`,
          `Cuneiforme Lateral ${ladoStr}`
        ]
      },
      {
        id: 'metatarso',
        label: 'Metatarso',
        dotColor: 'bg-amber-600',
        bones: [
          `1º Metatarsal ${ladoStr}`,
          `2º Metatarsal ${ladoStr}`,
          `3º Metatarsal ${ladoStr}`,
          `4º Metatarsal ${ladoStr}`,
          `5º Metatarsal ${ladoStr}`
        ]
      }
    ];
  }

  return [];
}

interface OsteologicalInventoryViewerProps {
  inventory?: OsteologicalInventoryData;
  onUpdateInventory: (updated: OsteologicalInventoryData) => void;
  readOnly?: boolean;
}

export const CABECA_PESCOCO_OSSOS = [
  'Frontal',
  'Parietal direito',
  'Parietal esquerdo',
  'Temporal direito',
  'Temporal esquerdo',
  'Occipital',
  'Zigomático direito',
  'Zigomático esquerdo',
  'Maxila direita',
  'Maxila esquerda',
  'Nasal direito',
  'Nasal esquerdo',
  'Lacrimal direito',
  'Lacrimal esquerdo',
  'Etmóide',
  'Concha nasal inferior direita',
  'Concha nasal inferior esquerda',
  'Palatino direito',
  'Palatino esquerdo',
  'Vômer',
  'Esfenóide',
  'Mandíbula',
  'Hióide'
] as const;

// Estruturas complementares de Cabeça e Pescoço — contam como catalogadas
// junto com os 23 ossos (pedido dos pesquisadores: "estribo" também precisa
// entrar na contagem). "ausentes" é uma marcação de grupo (como "Nenhuma
// identificada" noutras seções): conta como os itens do grupo todos
// determinados ausentes, não como mais um item catalogado à parte.
const CARTILAGENS_LARINGE_OPTIONS = ['tireoidea', 'cricoide'];
const OSSICULOS_OPTIONS = ['martelo', 'bigorna', 'estribo'];

function countCabecaComplementares(data: {
  cartilagensLaringe?: string[];
  ossiculosDireitos?: string[];
  ossiculosEsquerdos?: string[];
}): number {
  const countGroup = (selected: string[] | undefined, groupSize: number): number => {
    const list = selected || [];
    if (list.includes('ausentes')) return groupSize;
    return list.filter(item => item !== 'ausentes').length;
  };
  return (
    countGroup(data.cartilagensLaringe, CARTILAGENS_LARINGE_OPTIONS.length) +
    countGroup(data.ossiculosDireitos, OSSICULOS_OPTIONS.length) +
    countGroup(data.ossiculosEsquerdos, OSSICULOS_OPTIONS.length)
  );
}

const CABECA_PESCOCO_TOTAL_CATALOGAVEL =
  CABECA_PESCOCO_OSSOS.length + CARTILAGENS_LARINGE_OPTIONS.length + OSSICULOS_OPTIONS.length * 2;

const COLUNA_TOTAL_CATALOGAVEL = COLUNA_VERTEBRAL_OSSOS.length;
const TORAX_TOTAL_CATALOGAVEL = TORAX_OSSOS.length;

export const SECTIONS_CONFIG = [
  { id: 'cabeca_pescoco', label: '1. Cabeça e Pescoço', active: true, count: CABECA_PESCOCO_TOTAL_CATALOGAVEL },
  { id: 'coluna_vertebral', label: '2. Coluna Vertebral', active: true, count: COLUNA_TOTAL_CATALOGAVEL },
  { id: 'torax', label: '3. Tórax', active: true, count: TORAX_TOTAL_CATALOGAVEL },
  { id: 'membros_superiores', label: '4. Membros Superiores', active: true, count: MEMBROS_SUPERIORES_OSSOS.length },
  { id: 'ossos_mao', label: '5. Ossos das Mãos', active: true, count: OSSOS_MAO.length },
  { id: 'pelve_mi', label: '6. Membros Inferiores', active: true, count: PELVE_MEMBRO_INFERIOR_OSSOS.length },
  { id: 'ossos_pe', label: '7. Ossos dos Pés', active: true, count: OSSOS_PE.length },
  { id: 'demais_informacoes', label: '8. Demais Informações', active: true, count: 1 }
] as const;

export function getNextSection(currentSectionId: string): (typeof SECTIONS_CONFIG)[number] | null {
  const currentSectionIndex = SECTIONS_CONFIG.findIndex(s => s.id === currentSectionId);
  return currentSectionIndex >= 0 && currentSectionIndex < SECTIONS_CONFIG.length - 1
    ? SECTIONS_CONFIG[currentSectionIndex + 1]
    : null;
}

const PRESENCE_DEFINITIONS: Record<
  OsteologicalPresenceCode,
  { label: string; desc: string; badgeClass: string; activeBtnClass: string }
> = {
  P: {
    label: 'P',
    desc: 'Presente sem fratura',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
  },
  F: {
    label: 'F',
    desc: 'Presente com fratura',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    activeBtnClass: 'bg-amber-600 text-white border-amber-700 shadow-xs'
  },
  I: {
    label: 'I',
    desc: 'Incompleto',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    activeBtnClass: 'bg-purple-600 text-white border-purple-700 shadow-xs'
  },
  A: {
    label: 'A',
    desc: 'Ausente',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    activeBtnClass: 'bg-slate-700 text-white border-slate-800 shadow-xs dark:bg-slate-600'
  }
};

interface AlteracaoOptionConfig {
  id: AlteracaoOsseaTipo;
  label: React.ReactNode;
  plainText: string;
  isNone?: boolean;
}

const ALTERACOES_OPTIONS: AlteracaoOptionConfig[] = [
  {
    id: 'lesao_ante_mortem',
    label: (
      <span>
        Lesão <span className="italic">ante mortem</span>
      </span>
    ),
    plainText: 'Lesão ante mortem'
  },
  {
    id: 'lesao_peri_mortem',
    label: (
      <span>
        Lesão <span className="italic">peri mortem</span>
      </span>
    ),
    plainText: 'Lesão peri mortem'
  },
  {
    id: 'alteracao_post_mortem',
    label: (
      <span>
        Alteração <span className="italic">post mortem</span> (tafonômica)
      </span>
    ),
    plainText: 'Alteração post mortem (tafonômica)'
  },
  {
    id: 'patologia',
    label: <span>Patologia</span>,
    plainText: 'Patologia'
  },
  {
    id: 'variacao_anatomica',
    label: <span>Variação anatômica</span>,
    plainText: 'Variação anatômica'
  },
  {
    id: 'sem_alteracao',
    label: <span>Sem alteração</span>,
    plainText: 'Sem alteração',
    isNone: true
  }
];

export const OsteologicalInventoryViewer: React.FC<OsteologicalInventoryViewerProps> = ({
  inventory = {},
  onUpdateInventory,
  readOnly = false
}) => {
  const [currentSectionId, setCurrentSectionId] = useState<string>('cabeca_pescoco');
  const [sideFilter, setSideFilter] = useState<'ambos' | 'direito' | 'esquerdo'>('ambos');

  // Controle de expansão da drawer de alterações:
  // Fecha automaticamente qualquer outra caixa aberta ao clicar em outro osso (pedido dos técnicos, out/2026).
  const [expandedBonesBySection, setExpandedBonesBySection] = useState<Record<string, Record<string, boolean>>>({});
  const toggleExpandBoneGeneric = (sectionKey: string, bone: string) => {
    setExpandedBonesBySection(prev => {
      const isCurrentlyOpen = !!prev[sectionKey]?.[bone];
      return {
        ...prev,
        [sectionKey]: isCurrentlyOpen ? {} : { [bone]: true }
      };
    });
  };

  const generateAltId = () => `alt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // --- Helpers genéricos: as seções são todas um OsteologicalSimpleBoneSection
  // (ossos + alterações), com a mesma lógica de presença/alteração — inclusive
  // Cabeça e Pescoço, que voltou a ser lista corrida como as demais (pedido dos
  // pesquisadores, out/2026: sem prancha visual, sem sub-aba por grupo de osso). ---
  const getSimpleSection = (key: string): OsteologicalSimpleBoneSection => {
    const raw = (inventory as any)?.[key] as OsteologicalSimpleBoneSection | undefined;
    if (!raw) return { ossos: {}, alteracoes: [] };
    return {
      ...raw,
      ossos: raw.ossos && typeof raw.ossos === 'object' ? raw.ossos : {},
      alteracoes: Array.isArray(raw.alteracoes) ? raw.alteracoes : []
    };
  };

  const updateSimpleSection = (key: string, patch: Partial<OsteologicalSimpleBoneSection>) => {
    const current = getSimpleSection(key);
    onUpdateInventory({ ...inventory, [key]: { ...current, ...patch } });
  };

  const handleSetPresenceGeneric = (sectionKey: string, bone: string, code: OsteologicalPresenceCode) => {
    if (readOnly) return;
    // Fecha qualquer gaveta aberta de outro osso ao clicar em uma opção
    setExpandedBonesBySection(prev => {
      if (prev[sectionKey] && !prev[sectionKey][bone]) {
        return { ...prev, [sectionKey]: {} };
      }
      return prev;
    });
    const section = getSimpleSection(sectionKey);
    const currentCode = section.ossos[bone];
    const newOssos = { ...section.ossos };
    let newCode: OsteologicalPresenceCode | undefined;
    if (currentCode === code) {
      delete newOssos[bone];
      newCode = undefined;
    } else {
      newOssos[bone] = code;
      newCode = code;
    }
    const newAlteracoes = clearAlteracoesIfAusente(section.alteracoes, bone, newCode);
    updateSimpleSection(sectionKey, { ossos: newOssos, alteracoes: newAlteracoes });
  };

  const handleBulkMarkGeneric = (sectionKey: string, bones: readonly string[], code: OsteologicalPresenceCode) => {
    if (readOnly) return;
    const section = getSimpleSection(sectionKey);
    const { ossos: newOssos, alteracoes: newAlteracoes } = applyBulkPresence(
      section.ossos,
      section.alteracoes,
      bones,
      code
    );
    updateSimpleSection(sectionKey, { ossos: newOssos, alteracoes: newAlteracoes });
  };

  const handleClearSectionGeneric = (sectionKey: string) => {
    if (readOnly) return;
    updateSimpleSection(sectionKey, { ossos: {} });
  };

  const handleToggleAlteracaoGeneric = (sectionKey: string, bone: string, tipo: AlteracaoOsseaTipo) => {
    if (readOnly) return;
    const section = getSimpleSection(sectionKey);
    const list = section.alteracoes || [];
    const boneAlts = list.filter(a => a.osso === bone);
    const otherBonesAlts = list.filter(a => a.osso !== bone);

    if (tipo === 'sem_alteracao') {
      const isAlreadyChecked = boneAlts.some(a => a.tipo === 'sem_alteracao');
      const updatedBoneAlts: OsteologicalAlteracaoRegiao[] = isAlreadyChecked
        ? []
        : [{ id: generateAltId(), tipo: 'sem_alteracao', osso: bone, observacoes: '' }];
      updateSimpleSection(sectionKey, { alteracoes: [...otherBonesAlts, ...updatedBoneAlts] });
      return;
    }

    const withoutSemAlt = boneAlts.filter(a => a.tipo !== 'sem_alteracao');
    const exists = withoutSemAlt.some(a => a.tipo === tipo);
    const updatedBoneAlts = exists
      ? withoutSemAlt.filter(a => a.tipo !== tipo)
      : [...withoutSemAlt, { id: generateAltId(), tipo, osso: bone, observacoes: '' }];
    updateSimpleSection(sectionKey, { alteracoes: [...otherBonesAlts, ...updatedBoneAlts] });
  };

  const handleAddAlteracaoItemGeneric = (sectionKey: string, bone: string, tipo: AlteracaoOsseaTipo) => {
    if (readOnly) return;
    const section = getSimpleSection(sectionKey);
    const list = section.alteracoes || [];
    const withoutSemAlt = list.filter(a => !(a.osso === bone && a.tipo === 'sem_alteracao'));
    updateSimpleSection(sectionKey, {
      alteracoes: [...withoutSemAlt, { id: generateAltId(), tipo, osso: bone, observacoes: '' }]
    });
  };

  const handleRemoveAlteracaoItemGeneric = (sectionKey: string, idToRemove: string) => {
    if (readOnly) return;
    const section = getSimpleSection(sectionKey);
    const list = section.alteracoes || [];
    updateSimpleSection(sectionKey, {
      alteracoes: list.filter((a, idx) => (a.id || `alt-${a.tipo}-${idx}`) !== idToRemove)
    });
  };

  const handleUpdateAlteracaoItemGeneric = (sectionKey: string, idToUpdate: string, obs: string) => {
    if (readOnly) return;
    const section = getSimpleSection(sectionKey);
    const list = section.alteracoes || [];
    updateSimpleSection(sectionKey, {
      alteracoes: list.map((a, idx) => ((a.id || `alt-${a.tipo}-${idx}`) === idToUpdate ? { ...a, observacoes: obs } : a))
    });
  };

  // Estruturas complementares de Cabeça e Pescoço (cartilagens/ossículos) —
  // vivem junto com ossos/alterações no mesmo objeto `cabecaPescoco`, mas só
  // essa seção tem isso, por cima do padrão genérico.
  const cabecaExtra: OsteologicalSectionCabecaPescoco = {
    ossos: {},
    alteracoes: [],
    ...(inventory.cabecaPescoco || {})
  };

  const toggleAusentesAware = (list: string[] | undefined, val: string): string[] => {
    const current = list || [];
    if (val === 'ausentes') {
      return current.includes('ausentes') ? [] : ['ausentes'];
    }
    const withoutAusentes = current.filter(item => item !== 'ausentes');
    return withoutAusentes.includes(val) ? withoutAusentes.filter(item => item !== val) : [...withoutAusentes, val];
  };

  const handleToggleCartilagem = (val: string) => {
    if (readOnly) return;
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaExtra, cartilagensLaringe: toggleAusentesAware(cabecaExtra.cartilagensLaringe, val) }
    });
  };

  const handleToggleOssiculo = (side: 'direitos' | 'esquerdos', val: string) => {
    if (readOnly) return;
    const key = side === 'direitos' ? 'ossiculosDireitos' : 'ossiculosEsquerdos';
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaExtra, [key]: toggleAusentesAware(cabecaExtra[key], val) }
    });
  };

  const SECTION_KEY_BY_ID: Record<string, string> = {
    cabeca_pescoco: 'cabecaPescoco',
    coluna_vertebral: 'colunaVertebral',
    torax: 'torax',
    membros_superiores: 'membrosSuperiores',
    ossos_mao: 'ossosMao',
    pelve_mi: 'pelveMembroInferior',
    ossos_pe: 'ossosPe'
  };

  const SECTION_BONES_BY_ID: Record<string, readonly string[]> = {
    cabeca_pescoco: CABECA_PESCOCO_OSSOS,
    coluna_vertebral: COLUNA_VERTEBRAL_OSSOS,
    torax: TORAX_OSSOS,
    membros_superiores: MEMBROS_SUPERIORES_OSSOS,
    ossos_mao: OSSOS_MAO,
    pelve_mi: PELVE_MEMBRO_INFERIOR_OSSOS,
    ossos_pe: OSSOS_PE
  };

  const getSectionAssignedCount = (sectionId: string): number => {
    if (sectionId === 'demais_informacoes') {
      return inventory.demaisInformacoes?.trim() ? 1 : 0;
    }
    const sectionKey = SECTION_KEY_BY_ID[sectionId];
    if (!sectionKey) return 0;
    const baseCount = Object.keys(getSimpleSection(sectionKey).ossos).length;
    if (sectionId === 'cabeca_pescoco') {
      return baseCount + countCabecaComplementares(cabecaExtra);
    }
    return baseCount;
  };

  const configuredSectionsCount = SECTIONS_CONFIG.filter(sec => getSectionAssignedCount(sec.id) > 0).length;

  const updateSectionResiduals = (
    sectionKey: 'colunaVertebral' | 'torax',
    patch: { quantidadeNaoIdentificadas?: number; quantidadeFragmentos?: number }
  ) => {
    if (readOnly) return;
    const current = getSimpleSection(sectionKey);
    onUpdateInventory({
      ...inventory,
      [sectionKey]: { ...current, ...patch }
    });
  };

  const updateSectionObservacoes = (sectionKey: string, obs: string) => {
    if (readOnly) return;
    const current = getSimpleSection(sectionKey);
    onUpdateInventory({
      ...inventory,
      [sectionKey]: { ...current, observacoes: obs }
    });
  };

  const nextSection = getNextSection(currentSectionId);

  const updatePooled = (key: 'maoPooled' | 'pePooled', patch: Partial<OsteologicalPooledCounts>) => {
    if (readOnly) return;
    const current = (inventory[key] as OsteologicalPooledCounts) || {};
    onUpdateInventory({ ...inventory, [key]: { ...current, ...patch } });
  };

  const updateCountIdentify = (
    sectionKey: 'colunaVertebral' | 'torax',
    field: string,
    patch: Partial<OsteologicalCountIdentifySelection>
  ) => {
    if (readOnly) return;
    const current = (inventory as any)[sectionKey] || { ossos: {} };
    const currentField: OsteologicalCountIdentifySelection = current[field] || {};
    onUpdateInventory({
      ...inventory,
      [sectionKey]: { ...current, [field]: { ...currentField, ...patch } }
    });
  };

  return (
    <div className="space-y-5">
      {/* Barra de Seções Anatômicas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Inventário Osteológico por Regiões Anatômicas ({SECTIONS_CONFIG.length} Seções)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro forense estruturado com códigos P/F/I/A de presença e catalogação regional de alterações.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {configuredSectionsCount} de {SECTIONS_CONFIG.length} seções com dados
          </span>
        </div>

        {/* Indicador de Passo e Carrossel Mobile (< sm) */}
        <div className="sm:hidden mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {SECTIONS_CONFIG.find(s => s.id === currentSectionId)?.label}
            </span>
            <span className="font-mono text-slate-500 text-[11px]">
              Passo {SECTIONS_CONFIG.findIndex(s => s.id === currentSectionId) + 1} de {SECTIONS_CONFIG.length}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {SECTIONS_CONFIG.map((sec, idx) => {
              const currentIdx = SECTIONS_CONFIG.findIndex(s => s.id === currentSectionId);
              const hasData = getSectionAssignedCount(sec.id) > 0;
              const isCurrent = currentIdx === idx;
              return (
                <div
                  key={sec.id}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-sky-500 ring-1 ring-sky-300 dark:ring-sky-700'
                      : hasData
                        ? 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-[11px] font-mono no-scrollbar">
            {SECTIONS_CONFIG.map(sec => {
              const isSelected = currentSectionId === sec.id;
              const shortLabel = sec.label.replace(/^\d+\.\s*/, '');
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setCurrentSectionId(sec.id)}
                  className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all font-semibold touch-manipulation ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sec.label.split('.')[0]}. {shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade de Navegação das Seções para Tablet e Desktop (>= sm) */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-2 mt-3 text-xs">
          {SECTIONS_CONFIG.map(sec => {
            const isSelected = currentSectionId === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setCurrentSectionId(sec.id)}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{sec.label}</span>
                  {sec.active ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Seção ativa" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">Em breve</span>
                  )}
                </div>
                {sec.active && (
                  <span className="text-[10px] text-slate-500 font-normal mt-1 font-mono">
                    {getSectionAssignedCount(sec.id)}/{sec.count} catalogados
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Seção Ativa */}
      {currentSectionId === 'demais_informacoes' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              Demais Informações
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              (ex: tecidos mumificados, nº de dentes desarticulados [em XX] e demais informações relevantes não registradas em questões anteriores deste formulário)
            </p>
          </div>

          <textarea
            disabled={readOnly}
            rows={8}
            value={inventory.demaisInformacoes || ''}
            onChange={e => {
              if (readOnly) return;
              onUpdateInventory({ ...inventory, demaisInformacoes: e.target.value });
            }}
            placeholder="Registre aqui informações complementares sobre tecidos mumificados, dentes desarticulados, vestígios ou particularidades do conjunto..."
            className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500"
          />
        </div>
      ) : (() => {
        const sectionKey = SECTION_KEY_BY_ID[currentSectionId];
        const bones = SECTION_BONES_BY_ID[currentSectionId];
        if (!sectionKey || !bones) return null;
        const sectionData = getSimpleSection(sectionKey);
        const sectionLabel = (SECTIONS_CONFIG.find(s => s.id === currentSectionId)?.label || '').replace(/^\d+\.\s*/, '');

        const isBilateral = isBilateralSection(currentSectionId);
        const { direito: direitoBones, esquerdo: esquerdoBones } = partitionBonesBySide(bones);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  {sectionLabel}
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {bones.length} {bones.length === 1 ? 'osso' : 'ossos'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione o código de presença único (P, F, I ou A) para cada elemento ósseo. Clique no
                  osso ou no <AlertCircle className="w-3 h-3 inline text-slate-500 align-text-bottom" /> para
                  abrir opções de alterações.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono mr-2">
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.P.badgeClass}`}>
                    P: {Object.values(sectionData.ossos).filter(c => c === 'P').length}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.F.badgeClass}`}>
                    F: {Object.values(sectionData.ossos).filter(c => c === 'F').length}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.I.badgeClass}`}>
                    I: {Object.values(sectionData.ossos).filter(c => c === 'I').length}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.A.badgeClass}`}>
                    A: {Object.values(sectionData.ossos).filter(c => c === 'A').length}
                  </span>
                  <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700">
                    !: {bones.filter(bone => (sectionData.alteracoes || []).some(a => a.osso === bone && a.tipo !== 'sem_alteracao')).length}
                  </span>
                </div>

                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleBulkMarkGeneric(sectionKey, bones, 'P')}
                      className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-colors text-[11px] font-medium"
                      title="Marcar todos os ossos desta seção como P (Presente sem fratura)"
                    >
                      Marcar Todos P
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMarkGeneric(sectionKey, bones, 'F')}
                      className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 transition-colors text-[11px] font-medium"
                      title="Marcar todos os ossos desta seção como F (Presente com fratura)"
                    >
                      Marcar Todos F
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMarkGeneric(sectionKey, bones, 'I')}
                      className="px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 hover:bg-purple-100 transition-colors text-[11px] font-medium"
                      title="Marcar todos os ossos desta seção como I (Incompleto)"
                    >
                      Marcar Todos I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMarkGeneric(sectionKey, bones, 'A')}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors text-[11px] font-medium"
                      title="Marcar todos os ossos desta seção como A (Ausente)"
                    >
                      Marcar Todos A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSectionGeneric(sectionKey)}
                      className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 hover:bg-rose-100 transition-colors text-[11px] font-medium"
                      title="Limpar todas as marcações de presença desta seção"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                Códigos Padronizados de Presença Óssea (Escolha Única)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {(Object.keys(PRESENCE_DEFINITIONS) as OsteologicalPresenceCode[]).map(code => {
                  const item = PRESENCE_DEFINITIONS[code];
                  return (
                    <div key={code} className={`flex items-center gap-2 p-2 rounded-lg border ${item.badgeClass}`}>
                      <span className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-current">
                        {code}
                      </span>
                      <span className="text-[11px] leading-tight font-medium">{item.desc}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700">
                  <span className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-current text-red-700 dark:text-red-400">
                    !
                  </span>
                  <span className="text-[11px] leading-tight font-medium">Alterações ósseas</span>
                </div>
              </div>
            </div>

            {/* Renderização dos elementos por tipo de seção */}
            {currentSectionId === 'coluna_vertebral' ? (
              <div className="space-y-6">
                {/* 1. Vértebras Cervicais */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      Vértebras Cervicais (C1 a C7)
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {VERTEBRAS_CERVICAIS.filter(b => sectionData.ossos[b]).length}/{VERTEBRAS_CERVICAIS.length}
                      </span>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                          {(['P', 'F', 'I', 'A'] as const).map(code => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => handleBulkMarkGeneric(sectionKey, VERTEBRAS_CERVICAIS, code)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                code === 'P'
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                  : code === 'F'
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                    : code === 'I'
                                      ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                              } bg-white dark:bg-slate-900`}
                              title={`Marcar todas as Vértebras Cervicais como ${code}`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <SimpleBoneRows
                    bones={VERTEBRAS_CERVICAIS}
                    section={sectionData}
                    readOnly={readOnly}
                    expandedBones={expandedBonesBySection[sectionKey] || {}}
                    onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                    onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                    onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                    onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                    onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                    onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                  />
                </div>

                {/* 2. Vértebras Torácicas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-600" />
                      Vértebras Torácicas (T1 a T12)
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {VERTEBRAS_TORACICAS.filter(b => sectionData.ossos[b]).length}/{VERTEBRAS_TORACICAS.length}
                      </span>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                          {(['P', 'F', 'I', 'A'] as const).map(code => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => handleBulkMarkGeneric(sectionKey, VERTEBRAS_TORACICAS, code)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                code === 'P'
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                  : code === 'F'
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                    : code === 'I'
                                      ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                              } bg-white dark:bg-slate-900`}
                              title={`Marcar todas as Vértebras Torácicas como ${code}`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <SimpleBoneRows
                    bones={VERTEBRAS_TORACICAS}
                    section={sectionData}
                    readOnly={readOnly}
                    expandedBones={expandedBonesBySection[sectionKey] || {}}
                    onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                    onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                    onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                    onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                    onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                    onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                  />
                </div>

                {/* 3. Vértebras Lombares */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      Vértebras Lombares (L1 a L5)
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {VERTEBRAS_LOMBARES.filter(b => sectionData.ossos[b]).length}/{VERTEBRAS_LOMBARES.length}
                      </span>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                          {(['P', 'F', 'I', 'A'] as const).map(code => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => handleBulkMarkGeneric(sectionKey, VERTEBRAS_LOMBARES, code)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                code === 'P'
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                  : code === 'F'
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                    : code === 'I'
                                      ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                              } bg-white dark:bg-slate-900`}
                              title={`Marcar todas as Vértebras Lombares como ${code}`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <SimpleBoneRows
                    bones={VERTEBRAS_LOMBARES}
                    section={sectionData}
                    readOnly={readOnly}
                    expandedBones={expandedBonesBySection[sectionKey] || {}}
                    onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                    onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                    onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                    onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                    onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                    onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                  />
                </div>

                {/* 4. Sacro e Cóccix */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      Sacro e Cóccix
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {SACRO_COCCIX_OSSOS.filter(b => sectionData.ossos[b]).length}/{SACRO_COCCIX_OSSOS.length}
                      </span>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                          {(['P', 'F', 'I', 'A'] as const).map(code => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => handleBulkMarkGeneric(sectionKey, SACRO_COCCIX_OSSOS, code)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                code === 'P'
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                  : code === 'F'
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                    : code === 'I'
                                      ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                              } bg-white dark:bg-slate-900`}
                              title={`Marcar Sacro e Cóccix como ${code}`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <SimpleBoneRows
                    bones={SACRO_COCCIX_OSSOS}
                    section={sectionData}
                    readOnly={readOnly}
                    expandedBones={expandedBonesBySection[sectionKey] || {}}
                    onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                    onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                    onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                    onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                    onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                    onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                  />
                </div>

                {/* Caixas de Rolagem Numérica de Coluna Vertebral (pedido dos técnicos, out/2026) */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Quantitativos Residuais da Coluna Vertebral
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumericScrollInput
                      label="Quantidade de vértebras não identificadas"
                      value={inventory.colunaVertebral?.quantidadeNaoIdentificadas}
                      onChange={val => updateSectionResiduals('colunaVertebral', { quantidadeNaoIdentificadas: val })}
                      max={50}
                      readOnly={readOnly}
                    />
                    <NumericScrollInput
                      label="Quantidade de fragmentos"
                      value={inventory.colunaVertebral?.quantidadeFragmentos}
                      onChange={val => updateSectionResiduals('colunaVertebral', { quantidadeFragmentos: val })}
                      max={100}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
            ) : currentSectionId === 'torax' ? (
              <div className="space-y-6">
                {/* 1. Esterno */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-600" />
                      Esterno
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500">
                        {ESTERNO_OSSOS.filter(b => sectionData.ossos[b]).length}/{ESTERNO_OSSOS.length}
                      </span>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                          {(['P', 'F', 'I', 'A'] as const).map(code => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => handleBulkMarkGeneric(sectionKey, ESTERNO_OSSOS, code)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                code === 'P'
                                  ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                  : code === 'F'
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                    : code === 'I'
                                      ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                      : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                              } bg-white dark:bg-slate-900`}
                              title={`Marcar todos os ossos do Esterno como ${code}`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <SimpleBoneRows
                    bones={ESTERNO_OSSOS}
                    section={sectionData}
                    readOnly={readOnly}
                    expandedBones={expandedBonesBySection[sectionKey] || {}}
                    onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                    onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                    onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                    onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                    onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                    onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                  />
                </div>

                {/* 2. Costelas por Lateralidade */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                    <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      Costelas (C1 a C12) por Lateralidade
                    </h5>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-2xs text-xs">
                      <button
                        type="button"
                        onClick={() => setSideFilter('ambos')}
                        className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all ${
                          sideFilter === 'ambos' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Duas Colunas
                      </button>
                      <button
                        type="button"
                        onClick={() => setSideFilter('esquerdo')}
                        className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all ${
                          sideFilter === 'esquerdo' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Lado Esquerdo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSideFilter('direito')}
                        className={`px-2.5 py-0.5 rounded text-xs font-medium transition-all ${
                          sideFilter === 'direito' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Lado Direito
                      </button>
                    </div>
                  </div>

                  <div className={sideFilter === 'ambos' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 items-start' : 'space-y-4'}>
                    {(sideFilter === 'ambos' || sideFilter === 'esquerdo') && (
                      <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70 dark:border-indigo-900/50">
                          <h6 className="font-bold text-xs uppercase font-mono tracking-wider text-indigo-950 dark:text-indigo-200">
                            Costelas Esquerdas (C1 a C12)
                          </h6>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-500">
                              {COSTELAS_ESQUERDAS.filter(b => sectionData.ossos[b]).length}/{COSTELAS_ESQUERDAS.length}
                            </span>
                            {!readOnly && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                                {(['P', 'F', 'I', 'A'] as const).map(code => (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => handleBulkMarkGeneric(sectionKey, COSTELAS_ESQUERDAS, code)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                      code === 'P'
                                        ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                        : code === 'F'
                                          ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                          : code === 'I'
                                            ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                            : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                                    } bg-white dark:bg-slate-900`}
                                    title={`Marcar todas as Costelas Esquerdas como ${code}`}
                                  >
                                    {code}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <SimpleBoneRows
                          bones={COSTELAS_ESQUERDAS}
                          section={sectionData}
                          readOnly={readOnly}
                          expandedBones={expandedBonesBySection[sectionKey] || {}}
                          onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                          onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                          onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                          onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                          onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                          onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                        />
                      </div>
                    )}

                    {(sideFilter === 'ambos' || sideFilter === 'direito') && (
                      <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/20 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-sky-200/70 dark:border-sky-900/50">
                          <h6 className="font-bold text-xs uppercase font-mono tracking-wider text-sky-950 dark:text-sky-200">
                            Costelas Direitas (C1 a C12)
                          </h6>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-500">
                              {COSTELAS_DIREITAS.filter(b => sectionData.ossos[b]).length}/{COSTELAS_DIREITAS.length}
                            </span>
                            {!readOnly && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                                {(['P', 'F', 'I', 'A'] as const).map(code => (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => handleBulkMarkGeneric(sectionKey, COSTELAS_DIREITAS, code)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                      code === 'P'
                                        ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                        : code === 'F'
                                          ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                          : code === 'I'
                                            ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                            : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                                    } bg-white dark:bg-slate-900`}
                                    title={`Marcar todas as Costelas Direitas como ${code}`}
                                  >
                                    {code}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <SimpleBoneRows
                          bones={COSTELAS_DIREITAS}
                          section={sectionData}
                          readOnly={readOnly}
                          expandedBones={expandedBonesBySection[sectionKey] || {}}
                          onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                          onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                          onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                          onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                          onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                          onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Caixas de Rolagem Numérica de Tórax (pedido dos técnicos, out/2026) */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Quantitativos Residuais do Tórax
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumericScrollInput
                      label="Quantidade de costelas não identificadas"
                      value={inventory.torax?.quantidadeNaoIdentificadas}
                      onChange={val => updateSectionResiduals('torax', { quantidadeNaoIdentificadas: val })}
                      max={50}
                      readOnly={readOnly}
                    />
                    <NumericScrollInput
                      label="Quantidade de fragmentos"
                      value={inventory.torax?.quantidadeFragmentos}
                      onChange={val => updateSectionResiduals('torax', { quantidadeFragmentos: val })}
                      max={100}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
            ) : isBilateral ? (
              <div className="space-y-4">
                {/* Segmented Control Bilateral Mobile / Tablet */}
                <div className="flex items-center justify-between gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setSideFilter('esquerdo')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                      sideFilter === 'esquerdo'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>Lado Esquerdo</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({esquerdoBones.filter(b => sectionData.ossos[b]).length}/{esquerdoBones.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSideFilter('direito')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                      sideFilter === 'direito'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>Lado Direito</span>
                    <span className="text-[10px] font-mono opacity-80">
                      ({direitoBones.filter(b => sectionData.ossos[b]).length}/{direitoBones.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSideFilter('ambos')}
                    className={`hidden sm:flex py-2 px-3 rounded-lg text-xs font-medium transition-all items-center justify-center gap-1 touch-manipulation ${
                      sideFilter === 'ambos'
                        ? 'bg-slate-700 text-white font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <span>Ambos os Lados</span>
                  </button>
                </div>

                <div className={sideFilter === 'ambos' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 items-start' : 'space-y-4'}>
                {(sideFilter === 'ambos' || sideFilter === 'esquerdo') && (
                  <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70 dark:border-indigo-900/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-indigo-950 dark:text-indigo-200">
                          Lado Esquerdo
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {esquerdoBones.filter(b => sectionData.ossos[b]).length}/{esquerdoBones.length}
                        </span>
                        {!readOnly && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                            {(['P', 'F', 'I', 'A'] as const).map(code => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleBulkMarkGeneric(sectionKey, esquerdoBones, code)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                  code === 'P'
                                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                    : code === 'F'
                                      ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                      : code === 'I'
                                        ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                                } bg-white dark:bg-slate-900`}
                                title={`Marcar todos os ossos do Lado Esquerdo como ${code}`}
                              >
                                {code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const subgroups = getBilateralSubgroups(currentSectionId, 'esquerdo');
                      if (subgroups.length === 0) {
                        return (
                          <SimpleBoneRows
                            bones={esquerdoBones}
                            section={sectionData}
                            readOnly={readOnly}
                            expandedBones={expandedBonesBySection[sectionKey] || {}}
                            onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                            onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                            onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                            onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                            onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                            onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                          />
                        );
                      }
                      return (
                        <div className="space-y-4">
                          {subgroups.map(sg => {
                            const sgAssignedCount = sg.bones.filter(b => sectionData.ossos[b]).length;
                            return (
                              <div key={sg.id} className="space-y-2 pt-2 first:pt-0">
                                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200/60 dark:border-indigo-900/50">
                                  <h6 className="font-bold text-xs uppercase font-mono tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${sg.dotColor}`} />
                                    {sg.label}
                                  </h6>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-slate-500">
                                      {sgAssignedCount}/{sg.bones.length}
                                    </span>
                                    {!readOnly && (
                                      <div className="flex items-center gap-1">
                                        {(['P', 'F', 'I', 'A'] as const).map(code => (
                                          <button
                                            key={code}
                                            type="button"
                                            onClick={() => handleBulkMarkGeneric(sectionKey, sg.bones, code)}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                            title={`Marcar todos os ossos de ${sg.label} como ${code}`}
                                          >
                                            {code}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <SimpleBoneRows
                                  bones={sg.bones}
                                  formatBoneLabel={formatSubgroupBoneLabel}
                                  section={sectionData}
                                  readOnly={readOnly}
                                  expandedBones={expandedBonesBySection[sectionKey] || {}}
                                  onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                                  onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                                  onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                                  onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                                  onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                                  onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {(sideFilter === 'ambos' || sideFilter === 'direito') && (
                  <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200/70 dark:border-sky-900/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                        <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-sky-950 dark:text-sky-200">
                          Lado Direito
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {direitoBones.filter(b => sectionData.ossos[b]).length}/{direitoBones.length}
                        </span>
                        {!readOnly && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                            {(['P', 'F', 'I', 'A'] as const).map(code => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleBulkMarkGeneric(sectionKey, direitoBones, code)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                  code === 'P'
                                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                                    : code === 'F'
                                      ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                                      : code === 'I'
                                        ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                        : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                                } bg-white dark:bg-slate-900`}
                                title={`Marcar todos os ossos do Lado Direito como ${code}`}
                              >
                                {code}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const subgroups = getBilateralSubgroups(currentSectionId, 'direito');
                      if (subgroups.length === 0) {
                        return (
                          <SimpleBoneRows
                            bones={direitoBones}
                            section={sectionData}
                            readOnly={readOnly}
                            expandedBones={expandedBonesBySection[sectionKey] || {}}
                            onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                            onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                            onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                            onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                            onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                            onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                          />
                        );
                      }
                      return (
                        <div className="space-y-4">
                          {subgroups.map(sg => {
                            const sgAssignedCount = sg.bones.filter(b => sectionData.ossos[b]).length;
                            return (
                              <div key={sg.id} className="space-y-2 pt-2 first:pt-0">
                                <div className="flex items-center justify-between pb-1.5 border-b border-sky-200/60 dark:border-sky-900/50">
                                  <h6 className="font-bold text-xs uppercase font-mono tracking-wider text-sky-950 dark:text-sky-200 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${sg.dotColor}`} />
                                    {sg.label}
                                  </h6>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-slate-500">
                                      {sgAssignedCount}/{sg.bones.length}
                                    </span>
                                    {!readOnly && (
                                      <div className="flex items-center gap-1">
                                        {(['P', 'F', 'I', 'A'] as const).map(code => (
                                          <button
                                            key={code}
                                            type="button"
                                            onClick={() => handleBulkMarkGeneric(sectionKey, sg.bones, code)}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                            title={`Marcar todos os ossos de ${sg.label} como ${code}`}
                                          >
                                            {code}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <SimpleBoneRows
                                  bones={sg.bones}
                                  formatBoneLabel={formatSubgroupBoneLabel}
                                  section={sectionData}
                                  readOnly={readOnly}
                                  expandedBones={expandedBonesBySection[sectionKey] || {}}
                                  onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                                  onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                                  onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                                  onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                                  onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                                  onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Ossos da Cabeça e Pescoço (Crânio, Face e Hioide)
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {bones.filter(b => sectionData.ossos[b]).length}/{bones.length}
                    </span>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-400">Todos:</span>
                        {(['P', 'F', 'I', 'A'] as const).map(code => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleBulkMarkGeneric(sectionKey, bones, code)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                              code === 'P'
                                ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300'
                              : code === 'F'
                                ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300'
                              : code === 'I'
                                ? 'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300'
                            } bg-white dark:bg-slate-900`}
                            title={`Marcar todos os ossos da Cabeça e Pescoço como ${code}`}
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <SimpleBoneRows
                  bones={bones}
                  section={sectionData}
                  readOnly={readOnly}
                  expandedBones={expandedBonesBySection[sectionKey] || {}}
                  onToggleExpand={bone => toggleExpandBoneGeneric(sectionKey, bone)}
                  onSetPresence={(bone, code) => handleSetPresenceGeneric(sectionKey, bone, code)}
                  onToggleAlteracao={(bone, tipo) => handleToggleAlteracaoGeneric(sectionKey, bone, tipo)}
                  onAddAlteracaoItem={(bone, tipo) => handleAddAlteracaoItemGeneric(sectionKey, bone, tipo)}
                  onRemoveAlteracaoItem={id => handleRemoveAlteracaoItemGeneric(sectionKey, id)}
                  onUpdateAlteracaoItem={(id, obs) => handleUpdateAlteracaoItemGeneric(sectionKey, id, obs)}
                />
              </div>
            )}

            {currentSectionId === 'cabeca_pescoco' && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Cartilagens da laringe ossificadas / Ossículos da audição
                  </h5>
                  <span className="text-[10px] font-mono text-slate-500">
                    Estruturas complementares da porção cervical e temporal
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Cartilagens da laringe ossificadas
                    </span>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { id: 'tireoidea', label: 'Tireóidea' },
                        { id: 'cricoide', label: 'Cricoide' },
                        { id: 'ausentes', label: 'Ausentes' }
                      ].map(opt => {
                        const checked = (cabecaExtra.cartilagensLaringe || []).includes(opt.id);
                        return (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={checked}
                              onChange={() => handleToggleCartilagem(opt.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Ossículos da audição esquerdos
                    </span>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { id: 'martelo', label: 'Martelo' },
                        { id: 'bigorna', label: 'Bigorna' },
                        { id: 'estribo', label: 'Estribo' },
                        { id: 'ausentes', label: 'Ausentes' }
                      ].map(opt => {
                        const checked = (cabecaExtra.ossiculosEsquerdos || []).includes(opt.id);
                        return (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={checked}
                              onChange={() => handleToggleOssiculo('esquerdos', opt.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      Ossículos da audição direitos
                    </span>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { id: 'martelo', label: 'Martelo' },
                        { id: 'bigorna', label: 'Bigorna' },
                        { id: 'estribo', label: 'Estribo' },
                        { id: 'ausentes', label: 'Ausentes' }
                      ].map(opt => {
                        const checked = (cabecaExtra.ossiculosDireitos || []).includes(opt.id);
                        return (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={checked}
                              onChange={() => handleToggleOssiculo('direitos', opt.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSectionId === 'ossos_mao' && (
              <PooledCountsCard
                region="das Mãos"
                value={inventory.maoPooled || {}}
                onChange={patch => updatePooled('maoPooled', patch)}
                readOnly={readOnly}
              />
            )}

            {currentSectionId === 'ossos_pe' && (
              <PooledCountsCard
                region="dos Pés"
                value={inventory.pePooled || {}}
                onChange={patch => updatePooled('pePooled', patch)}
                readOnly={readOnly}
              />
            )}

            {/* Observações da Seção Anatômica (pedido dos técnicos, out/2026) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono tracking-wider">
                Observações — {sectionLabel}
              </label>
              <textarea
                disabled={readOnly}
                rows={3}
                value={sectionData.observacoes || ''}
                onChange={e => updateSectionObservacoes(sectionKey, e.target.value)}
                placeholder={`Observações particulares, anomalias ou notas complementares sobre ${sectionLabel.toLowerCase()}...`}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Botão Próxima Seção — Sticky no rodapé no mobile para alcance ergonômico do polegar */}
            {nextSection && (
              <div className="sticky bottom-0 -mx-5 -mb-5 p-3.5 sm:static sm:mx-0 sm:mb-0 sm:p-0 bg-white/95 dark:bg-slate-900/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200 dark:border-slate-800 sm:border-t-0 flex justify-end z-20 transition-all">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSectionId(nextSection.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-sm sm:text-xs font-bold shadow-md sm:shadow-xs transition-all touch-manipulation"
                >
                  <span>Próxima seção: {nextSection.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

// --- Componentes reutilizáveis para as seções ---
// Lista corrida de ossos com código P/F/I/A único + alteração óssea
// embutida por elemento, compartilhada por todas as seções do inventário —
// inclusive Cabeça e Pescoço, que voltou a esse padrão (sem prancha
// anatômica visual).

interface SimpleBoneRowsProps {
  bones: readonly string[];
  section: OsteologicalSimpleBoneSection;
  readOnly: boolean;
  expandedBones: Record<string, boolean>;
  onToggleExpand: (bone: string) => void;
  onSetPresence: (bone: string, code: OsteologicalPresenceCode) => void;
  onToggleAlteracao: (bone: string, tipo: AlteracaoOsseaTipo) => void;
  onAddAlteracaoItem: (bone: string, tipo: AlteracaoOsseaTipo) => void;
  onRemoveAlteracaoItem: (id: string) => void;
  onUpdateAlteracaoItem: (id: string, obs: string) => void;
  formatBoneLabel?: (bone: string) => string;
}

const SimpleBoneRows: React.FC<SimpleBoneRowsProps> = ({
  bones,
  section,
  readOnly,
  expandedBones,
  onToggleExpand,
  onSetPresence,
  onToggleAlteracao,
  onAddAlteracaoItem,
  onRemoveAlteracaoItem,
  onUpdateAlteracaoItem,
  formatBoneLabel
}) => {
  return (
    <div className="space-y-2">
      {bones.map((bone, index) => {
        const currentCode = section.ossos[bone];
        const isExpanded = !!expandedBones[bone];
        const boneAlteracoes = (section.alteracoes || []).filter(a => a.osso === bone);
        const { hasSemAlteracao, activeAlteracoes, isSemAlteracaoAuto, showSemAlteracao } =
          computeBoneAlterationStatus(currentCode, boneAlteracoes);

        return (
          <div
            key={bone}
            className={`rounded-xl border transition-all ${
              isExpanded
                ? 'border-red-400 dark:border-red-800 bg-white dark:bg-slate-900 shadow-xs ring-1 ring-red-200 dark:ring-red-950'
                : currentCode
                  ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30'
            }`}
          >
            {/* Linha principal do osso: clicar no item (fora dos botões) abre/recolhe a gaveta de alterações */}
            <div
              onClick={() => {
                onToggleExpand(bone);
              }}
              title={`Clique para expandir/recolher opções e alterações de ${bone}`}
              className="flex flex-wrap items-center justify-between p-2.5 sm:p-3 gap-2 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-t-xl transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-[11px] font-mono text-slate-400 w-5 text-right flex-shrink-0">{index + 1}.</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={bone}>
                  {formatBoneLabel ? formatBoneLabel(bone) : bone}
                </span>

                {showSemAlteracao && activeAlteracoes.length === 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    Sem alteração
                  </span>
                )}
                {activeAlteracoes.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 font-bold border border-red-200 dark:border-red-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                    {activeAlteracoes.length} {activeAlteracoes.length === 1 ? 'alteração' : 'alterações'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {(['P', 'F', 'I', 'A'] as OsteologicalPresenceCode[]).map(code => {
                  const isSelected = currentCode === code;
                  const config = PRESENCE_DEFINITIONS[code];
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={readOnly}
                      onClick={e => {
                        e.stopPropagation();
                        onSetPresence(bone, code);
                      }}
                      title={`${bone} — ${config.desc}`}
                      className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg text-xs font-mono font-bold transition-all border touch-manipulation ${
                        isSelected
                          ? config.activeBtnClass
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}`}
                    >
                      {code}
                    </button>
                  );
                })}

                <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={e => {
                    e.stopPropagation();
                    onToggleExpand(bone);
                  }}
                  title={`Alterações ósseas — ${bone}`}
                  aria-label={`Alterações ósseas — ${bone}`}
                  className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all border touch-manipulation ${
                    isExpanded || activeAlteracoes.length > 0
                      ? isExpanded
                        ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-400/50 shadow-xs'
                        : 'bg-red-600 text-white border-red-700 shadow-xs hover:bg-red-700 active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 active:scale-95'
                  } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <AlertCircle className="w-4 h-4" />
                </button>

                <ChevronDown
                  className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                    isExpanded ? 'transform rotate-180 text-red-600 dark:text-red-400' : ''
                  }`}
                />
              </div>
            </div>

            {isExpanded && (
              <div
                onClick={e => e.stopPropagation()}
                className="border-t border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 p-4 rounded-b-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-red-200/80 dark:border-red-900/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <h6 className="text-xs font-bold text-red-900 dark:text-red-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      Alterações Ósseas — {bone}
                    </h6>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleExpand(bone)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-mono"
                  >
                    Fechar ✕
                  </button>
                </div>

                <div className="space-y-2.5">
                  {ALTERACOES_OPTIONS.map(opt => {
                    const matchingEntries = boneAlteracoes.filter(a => a.tipo === opt.id);
                    const isChecked = matchingEntries.length > 0;

                    if (opt.isNone) {
                      const isAuto = isSemAlteracaoAuto && activeAlteracoes.length === 0;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border transition-all ${
                            isAuto || isChecked
                              ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                              <input
                                type="checkbox"
                                disabled={readOnly}
                                checked={isAuto || isChecked}
                                onChange={() => onToggleAlteracao(bone, opt.id)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>{opt.label}</span>
                            </label>
                            {(isAuto || isChecked) && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                                {isAuto ? 'Sem alterações (automático)' : 'Osso sem alterações'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isChecked
                            ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={isChecked}
                              onChange={() => onToggleAlteracao(bone, opt.id)}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span>{opt.label}</span>
                          </label>
                          {isChecked && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-medium">
                              {matchingEntries.length} {matchingEntries.length === 1 ? 'item' : 'itens'}
                            </span>
                          )}
                        </div>

                        {isChecked && (
                          <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 dark:border-amber-900/60 space-y-2">
                            {matchingEntries.map((entry, idx) => {
                              const entryId = entry.id || `alt-${opt.id}-${idx}`;
                              return (
                                <div
                                  key={entryId}
                                  className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-900/50 shadow-2xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 uppercase">
                                      Item #{idx + 1}
                                    </span>
                                    {!readOnly && matchingEntries.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => onRemoveAlteracaoItem(entryId)}
                                        className="text-rose-600 hover:text-rose-700 text-xs flex items-center gap-1 font-medium transition-colors"
                                        title="Remover este item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remover
                                      </button>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                      Descrição / Detalhamento:
                                    </label>
                                    <input
                                      type="text"
                                      disabled={readOnly}
                                      value={entry.observacoes || ''}
                                      onChange={e => onUpdateAlteracaoItem(entryId, e.target.value)}
                                      placeholder="Ex: Fratura linear sem cicatrização; orifício de PAF..."
                                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                                    />
                                  </div>
                                </div>
                              );
                            })}

                            {!readOnly && (
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => onAddAlteracaoItem(bone, opt.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors text-xs font-semibold shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                                  Adicionar outro item nesta categoria
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Caixa de rolagem numérica com seletor (0 a max e +max) e botões de incremento/decremento rápido (-/+)
// (pedido dos técnicos para vértebras/costelas não identificadas e fragmentos, out/2026).
interface NumericScrollInputProps {
  label: string;
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  max?: number;
  readOnly?: boolean;
}

const NumericScrollInput: React.FC<NumericScrollInputProps> = ({
  label,
  value,
  onChange,
  max = 50,
  readOnly = false
}) => {
  const numValue = value ?? 0;

  const handleStep = (delta: number) => {
    if (readOnly) return;
    const next = Math.max(0, numValue + delta);
    onChange(next === 0 && value === undefined ? undefined : next);
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          disabled={readOnly}
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
          aria-label={label}
        >
          <option value="">Selecione (0 a {max})...</option>
          {Array.from({ length: max + 1 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
          <option value={max + 1}>+{max}</option>
        </select>

        <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
          <button
            type="button"
            disabled={readOnly || numValue <= 0}
            onClick={() => handleStep(-1)}
            className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-sm sm:text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 touch-manipulation active:scale-95 transition-all"
            title="Diminuir 1"
          >
            -
          </button>
          <span className="px-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 min-w-[28px] text-center">
            {value ?? 0}
          </span>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleStep(1)}
            className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-sm sm:text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 touch-manipulation active:scale-95 transition-all"
            title="Aumentar 1"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

// Falanges (rolagem 0..max/+max) e sesamoides (intervalo aberto, sem teto) da
// mão ou do pé — contados uma vez só, não por lado (policy-109 / pedido do
// Tales out/2026). Fica dentro da seção "Ossos da Mão"/"Ossos do Pé", que já
// reúne os dois lados.
interface PooledCountsCardProps {
  region: string;
  value: OsteologicalPooledCounts;
  onChange: (patch: Partial<OsteologicalPooledCounts>) => void;
  readOnly: boolean;
}

const PooledCountsCard: React.FC<PooledCountsCardProps> = ({ region, value, onChange, readOnly }) => {
  const boundedSelect = (
    fieldLabel: string,
    max: number,
    current: number | undefined,
    onSet: (n: number | undefined) => void
  ) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{fieldLabel}</label>
      <select
        disabled={readOnly}
        value={current ?? ''}
        onChange={e => onSet(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
      >
        <option value="">—</option>
        {Array.from({ length: max + 1 }, (_, n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value={max + 1}>{`+${max}`}</option>
      </select>
    </div>
  );

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
        Falanges e Sesamoides {region} (ambos os lados, contagem única)
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {boundedSelect('Falanges Proximais', 10, value.falangesProximais, n => onChange({ falangesProximais: n }))}
        {boundedSelect('Falanges Médias', 8, value.falangesMedias, n => onChange({ falangesMedias: n }))}
        {boundedSelect('Falanges Distais', 10, value.falangesDistais, n => onChange({ falangesDistais: n }))}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Sesamoides (intervalo aberto)
          </label>
          <input
            type="number"
            min={0}
            disabled={readOnly}
            value={value.sesamoides ?? ''}
            onChange={e => {
              const n = Number(e.target.value);
              onChange({ sesamoides: e.target.value === '' || !Number.isFinite(n) ? undefined : Math.max(0, n) });
            }}
            placeholder="Nº"
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
};

interface CountIdentifyFieldProps {
  label: string;
  max: number;
  ordinais: readonly string[];
  value: OsteologicalCountIdentifySelection;
  onChange: (patch: Partial<OsteologicalCountIdentifySelection>) => void;
  readOnly: boolean;
}

const CountIdentifyField: React.FC<CountIdentifyFieldProps> = ({
  label,
  max,
  ordinais,
  value,
  onChange,
  readOnly
}) => {
  const identificadas = value.identificadas || [];
  const nenhumaMarcada = identificadas.includes('nenhuma_identificada');
  const supranumerariaMarcada = identificadas.includes('supranumeraria');

  const toggleIdentificada = (id: string) => {
    if (readOnly) return;
    if (id === 'nenhuma_identificada') {
      onChange({ identificadas: nenhumaMarcada ? [] : ['nenhuma_identificada'] });
      return;
    }
    const withoutNenhuma = identificadas.filter((i: string) => i !== 'nenhuma_identificada');
    const updated = withoutNenhuma.includes(id)
      ? withoutNenhuma.filter((i: string) => i !== id)
      : [...withoutNenhuma, id];
    onChange({ identificadas: updated });
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
            {label}
          </span>
          <span className="block text-[10px] text-slate-500 font-mono">
            Rolagem (0 a {max} e +{max}) e elementos identificados
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
            Contagem:
          </label>
          <select
            disabled={readOnly}
            value={value.quantidade ?? ''}
            onChange={e => onChange({ quantidade: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold"
            aria-label={`Contagem de ${label}`}
          >
            <option value="">Selecione...</option>
            {Array.from({ length: max + 1 }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={max + 1}>{`+${max}`}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          Elementos identificados (Múltipla escolha):
        </label>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <label
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              nenhumaMarcada
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-900 dark:text-white font-semibold'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={nenhumaMarcada}
              onChange={() => toggleIdentificada('nenhuma_identificada')}
              className="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
            />
            <span>Nenhuma identificada</span>
          </label>

          {ordinais.map(ord => {
            const isChecked = identificadas.includes(ord);
            return (
              <label
                key={ord}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer font-mono transition-colors ${
                  isChecked
                    ? 'bg-sky-100 dark:bg-sky-950/80 border-sky-400 text-sky-900 dark:text-sky-200 font-bold'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={isChecked}
                  onChange={() => toggleIdentificada(ord)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>{ord}</span>
              </label>
            );
          })}

          <label
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              supranumerariaMarcada
                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200 font-bold'
                : 'border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 hover:bg-amber-50'
            }`}
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={supranumerariaMarcada}
              onChange={() => toggleIdentificada('supranumeraria')}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Supranumerária</span>
          </label>
        </div>
      </div>
    </div>
  );
};
