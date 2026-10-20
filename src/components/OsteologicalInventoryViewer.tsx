import React, { useState } from 'react';
import {
  OsteologicalInventoryData,
  OsteologicalPresenceCode,
  AlteracaoOsseaTipo,
  OsteologicalAlteracaoRegiao,
  OsteologicalSimpleBoneSection,
  OsteologicalSectionCabecaPescoco,
  OsteologicalPooledCounts
} from '../types/sgccco';
import { Info, Sparkles, Plus, Trash2, AlertCircle, ChevronDown } from 'lucide-react';

// Osso ausente ('A') e alteração óssea ('!') são mutuamente exclusivos — não
// faz sentido catalogar uma alteração num osso que não foi encontrado (pedido
// do Tales, out/2026, aplicado retroativamente à Cabeça e Pescoço também).
function clearAlteracoesIfAusente(
  alteracoes: OsteologicalAlteracaoRegiao[] | undefined,
  bone: string,
  newCode: OsteologicalPresenceCode | undefined
): OsteologicalAlteracaoRegiao[] | undefined {
  if (newCode !== 'A' || !alteracoes) return alteracoes;
  return alteracoes.filter(a => a.osso !== bone);
}

// Pedido dos pesquisadores (out/2026): cada vértebra e cada costela é um
// elemento catalogável próprio — nunca mais um contador de quantidade
// separado da identificação. Vértebras primeiro (cervicais → torácicas →
// lombares), Sacro e Cóccix por último.
const COLUNA_VERTEBRAL_OSSOS = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7',
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
  'L1', 'L2', 'L3', 'L4', 'L5',
  'Sacro',
  'Cóccix'
] as const;

const TORAX_OSSOS = [
  'Esterno - Manúbrio',
  'Esterno - Corpo',
  'Esterno - Processo xifóide',
  '1ª Costela Direita', '2ª Costela Direita', '3ª Costela Direita', '4ª Costela Direita',
  '5ª Costela Direita', '6ª Costela Direita', '7ª Costela Direita', '8ª Costela Direita',
  '9ª Costela Direita', '10ª Costela Direita', '11ª Costela Direita', '12ª Costela Direita',
  '1ª Costela Esquerda', '2ª Costela Esquerda', '3ª Costela Esquerda', '4ª Costela Esquerda',
  '5ª Costela Esquerda', '6ª Costela Esquerda', '7ª Costela Esquerda', '8ª Costela Esquerda',
  '9ª Costela Esquerda', '10ª Costela Esquerda', '11ª Costela Esquerda', '12ª Costela Esquerda'
] as const;

// Só os ossos do braço/cintura escapular — carpo e metacarpo saem pra
// "Ossos da Mão" (seção própria, pedido dos pesquisadores). Direito e
// Esquerdo numa seção só, mesma lógica de Ossos da Mão/Pé e de Pelve +
// Membros Inferiores (pedido do Tales, out/2026).
export const MEMBROS_SUPERIORES_OSSOS = [
  'Clavícula Direita',
  'Escápula Direita',
  'Úmero Direito - Epífise Proximal',
  'Úmero Direito - Diáfise',
  'Úmero Direito - Epífise Distal',
  'Ulna Direita - Epífise Proximal',
  'Ulna Direita - Diáfise',
  'Ulna Direita - Epífise Distal',
  'Rádio Direito - Epífise Proximal',
  'Rádio Direito - Diáfise',
  'Rádio Direito - Epífise Distal',
  'Clavícula Esquerda',
  'Escápula Esquerda',
  'Úmero Esquerdo - Epífise Proximal',
  'Úmero Esquerdo - Diáfise',
  'Úmero Esquerdo - Epífise Distal',
  'Ulna Esquerda - Epífise Proximal',
  'Ulna Esquerda - Diáfise',
  'Ulna Esquerda - Epífise Distal',
  'Rádio Esquerdo - Epífise Proximal',
  'Rádio Esquerdo - Diáfise',
  'Rádio Esquerdo - Epífise Distal'
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
// pesquisadores) — tarso e metatarso saem pra "Ossos do Pé". Lado ainda
// identificado por osso, não mais por seção.
export const PELVE_MEMBRO_INFERIOR_OSSOS = [
  'Ílio Direito',
  'Ísquio Direito',
  'Púbis Direito',
  'Fêmur Direito - Epífise Proximal',
  'Fêmur Direito - Diáfise',
  'Fêmur Direito - Epífise Distal',
  'Patela Direita',
  'Tíbia Direita - Epífise Proximal',
  'Tíbia Direita - Diáfise',
  'Tíbia Direita - Epífise Distal',
  'Fíbula Direita - Epífise Proximal',
  'Fíbula Direita - Diáfise',
  'Fíbula Direita - Epífise Distal',
  'Ílio Esquerdo',
  'Ísquio Esquerdo',
  'Púbis Esquerdo',
  'Fêmur Esquerdo - Epífise Proximal',
  'Fêmur Esquerdo - Diáfise',
  'Fêmur Esquerdo - Epífise Distal',
  'Patela Esquerda',
  'Tíbia Esquerda - Epífise Proximal',
  'Tíbia Esquerda - Diáfise',
  'Tíbia Esquerda - Epífise Distal',
  'Fíbula Esquerda - Epífise Proximal',
  'Fíbula Esquerda - Diáfise',
  'Fíbula Esquerda - Epífise Distal'
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

export const SECTIONS_CONFIG = [
  { id: 'cabeca_pescoco', label: '1. Cabeça e Pescoço', active: true, count: CABECA_PESCOCO_TOTAL_CATALOGAVEL },
  { id: 'coluna_vertebral', label: '2. Coluna Vertebral', active: true, count: COLUNA_VERTEBRAL_OSSOS.length },
  { id: 'torax', label: '3. Tórax & Esterno', active: true, count: TORAX_OSSOS.length },
  { id: 'membros_superiores', label: '4. Membros Superiores', active: true, count: MEMBROS_SUPERIORES_OSSOS.length },
  { id: 'ossos_mao', label: '5. Ossos da Mão', active: true, count: OSSOS_MAO.length },
  { id: 'pelve_mi', label: '6. Membros Inferiores', active: true, count: PELVE_MEMBRO_INFERIOR_OSSOS.length },
  { id: 'ossos_pe', label: '7. Ossos do Pé', active: true, count: OSSOS_PE.length }
] as const;

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

  // Controle de expansão da drawer de alterações, por seção — evita colisão
  // entre ossos de nomes iguais em seções diferentes.
  const [expandedBonesBySection, setExpandedBonesBySection] = useState<Record<string, Record<string, boolean>>>({});
  const toggleExpandBoneGeneric = (sectionKey: string, bone: string) => {
    setExpandedBonesBySection(prev => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [bone]: !(prev[sectionKey]?.[bone]) }
    }));
  };

  const generateAltId = () => `alt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // --- Helpers genéricos: as seções são todas um OsteologicalSimpleBoneSection
  // (ossos + alterações), com a mesma lógica de presença/alteração — inclusive
  // Cabeça e Pescoço, que voltou a ser lista corrida como as demais (pedido dos
  // pesquisadores, out/2026: sem prancha visual, sem sub-aba por grupo de osso). ---
  const getSimpleSection = (key: string): OsteologicalSimpleBoneSection => {
    const raw = (inventory as any)[key] as OsteologicalSimpleBoneSection | undefined;
    return raw || { ossos: {}, alteracoes: [] };
  };

  const updateSimpleSection = (key: string, patch: Partial<OsteologicalSimpleBoneSection>) => {
    const current = getSimpleSection(key);
    onUpdateInventory({ ...inventory, [key]: { ...current, ...patch } });
  };

  const handleSetPresenceGeneric = (sectionKey: string, bone: string, code: OsteologicalPresenceCode) => {
    if (readOnly) return;
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
    const newOssos = { ...section.ossos };
    for (const bone of bones) newOssos[bone] = code;
    const newAlteracoes = code === 'A' ? (section.alteracoes || []).filter(a => !bones.includes(a.osso || '')) : section.alteracoes;
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
  const cabecaExtra: OsteologicalSectionCabecaPescoco = inventory.cabecaPescoco || { ossos: {} };

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
    const sectionKey = SECTION_KEY_BY_ID[sectionId];
    if (!sectionKey) return 0;
    const baseCount = Object.keys(getSimpleSection(sectionKey).ossos).length;
    return sectionId === 'cabeca_pescoco' ? baseCount + countCabecaComplementares(cabecaExtra) : baseCount;
  };

  const configuredSectionsCount = SECTIONS_CONFIG.filter(sec => getSectionAssignedCount(sec.id) > 0).length;

  const updatePooled = (key: 'maoPooled' | 'pePooled', patch: Partial<OsteologicalPooledCounts>) => {
    if (readOnly) return;
    const current = (inventory[key] as OsteologicalPooledCounts) || {};
    onUpdateInventory({ ...inventory, [key]: { ...current, ...patch } });
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

        {/* Grade de Navegação das Seções */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
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

      {/* Conteúdo da Seção Ativa — mesmo corpo genérico pras seções: lista
          corrida de ossos com P/F/I/A + alteração embutida, mais os blocos
          extras que só algumas seções têm (cartilagens/ossículos em Cabeça e
          Pescoço; pooled de falanges/sesamoides em Ossos da Mão/Pé). */}
      {(() => {
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
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleBulkMarkGeneric(sectionKey, bones, 'P')}
                      className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-colors text-[11px] font-medium"
                    >
                      Marcar Todos P
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSectionGeneric(sectionKey)}
                      className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 hover:bg-rose-100 transition-colors text-[11px] font-medium"
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

            {isBilateral && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                    Visualização por Lado Anatômico:
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    (Direito: {direitoBones.length} ossos · Esquerdo: {esquerdoBones.length} ossos)
                  </span>
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSideFilter('ambos')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      sideFilter === 'ambos'
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Duas Colunas (D + E)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideFilter('direito')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      sideFilter === 'direito'
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Lado Direito ({direitoBones.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideFilter('esquerdo')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      sideFilter === 'esquerdo'
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Lado Esquerdo ({esquerdoBones.length})
                  </button>
                </div>
              </div>
            )}

            {isBilateral ? (
              <div className={sideFilter === 'ambos' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 items-start' : 'space-y-4'}>
                {(sideFilter === 'ambos' || sideFilter === 'direito') && (
                  <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-200/70 dark:border-sky-900/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                        <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-sky-950 dark:text-sky-200">
                          Lado Direito ({direitoBones.length} ossos)
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {direitoBones.filter(b => sectionData.ossos[b]).length}/{direitoBones.length} catalogados
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleBulkMarkGeneric(sectionKey, direitoBones, 'P')}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 transition-colors"
                            title="Marcar todos os ossos do Lado Direito como P"
                          >
                            Todos P (D)
                          </button>
                        )}
                      </div>
                    </div>

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
                  </div>
                )}

                {(sideFilter === 'ambos' || sideFilter === 'esquerdo') && (
                  <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70 dark:border-indigo-900/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h5 className="font-bold text-xs uppercase font-mono tracking-wider text-indigo-950 dark:text-indigo-200">
                          Lado Esquerdo ({esquerdoBones.length} ossos)
                        </h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500">
                          {esquerdoBones.filter(b => sectionData.ossos[b]).length}/{esquerdoBones.length} catalogados
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleBulkMarkGeneric(sectionKey, esquerdoBones, 'P')}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 transition-colors"
                            title="Marcar todos os ossos do Lado Esquerdo como P"
                          >
                            Todos P (E)
                          </button>
                        )}
                      </div>
                    </div>

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
                  </div>
                )}
              </div>
            ) : (
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
                </div>
              </div>
            )}

            {currentSectionId === 'ossos_mao' && (
              <PooledCountsCard
                region="da Mão"
                value={inventory.maoPooled || {}}
                onChange={patch => updatePooled('maoPooled', patch)}
                readOnly={readOnly}
              />
            )}

            {currentSectionId === 'ossos_pe' && (
              <PooledCountsCard
                region="do Pé"
                value={inventory.pePooled || {}}
                onChange={patch => updatePooled('pePooled', patch)}
                readOnly={readOnly}
              />
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
  onUpdateAlteracaoItem
}) => {
  return (
    <div className="space-y-2">
      {bones.map((bone, index) => {
        const currentCode = section.ossos[bone];
        const isExpanded = !!expandedBones[bone];
        const boneAlteracoes = (section.alteracoes || []).filter(a => a.osso === bone);
        const hasSemAlteracao = boneAlteracoes.some(a => a.tipo === 'sem_alteracao');
        const activeAlteracoes = boneAlteracoes.filter(a => a.tipo !== 'sem_alteracao');

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
                if (currentCode !== 'A') onToggleExpand(bone);
              }}
              title={
                currentCode === 'A'
                  ? `Osso ausente — não há alteração a registrar em ${bone}`
                  : `Clique para expandir/recolher opções e alterações de ${bone}`
              }
              className="flex flex-wrap items-center justify-between p-2.5 sm:p-3 gap-2 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-t-xl transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-[11px] font-mono text-slate-400 w-5 text-right flex-shrink-0">{index + 1}.</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={bone}>
                  {bone}
                </span>

                {hasSemAlteracao && (
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
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all border ${
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
                  disabled={readOnly || currentCode === 'A'}
                  onClick={e => {
                    e.stopPropagation();
                    onToggleExpand(bone);
                  }}
                  title={currentCode === 'A' ? `Osso ausente — não há alteração a registrar em ${bone}` : `Alterações ósseas — ${bone}`}
                  aria-label={`Alterações ósseas — ${bone}`}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                    isExpanded || activeAlteracoes.length > 0
                      ? isExpanded
                        ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-400/50 shadow-xs'
                        : 'bg-red-600 text-white border-red-700 shadow-xs hover:bg-red-700 active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 active:scale-95'
                  } ${readOnly || currentCode === 'A' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
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
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border transition-all ${
                            isChecked
                              ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                              <input
                                type="checkbox"
                                disabled={readOnly}
                                checked={isChecked}
                                onChange={() => onToggleAlteracao(bone, opt.id)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>{opt.label}</span>
                            </label>
                            {isChecked && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                                Osso sem alterações
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
