import React, { useState } from 'react';
import {
  OsteologicalInventoryData,
  OsteologicalPresenceCode,
  AlteracaoOsseaTipo,
  OsteologicalAlteracaoRegiao,
  OsteologicalSimpleBoneSection,
  OsteologicalCountIdentifySelection,
  OsteologicalPooledCounts
} from '../types/sgccco';
import { Info, Sparkles, Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  AnatomicMultiPlateSkullViewer,
  SkullSubgroupId,
  SKULL_SUBGROUPS_CONFIG
} from './AnatomicMultiPlateSkullViewer';

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

const COLUNA_OSSOS_SIMPLES = ['Sacro', 'Cóccix'] as const;

const TORAX_OSSOS = ['Esterno - Manúbrio', 'Esterno - Corpo', 'Esterno - Processo xifóide'] as const;

const PELVE_BACIA_OSSOS = [
  'Ílio Direito',
  'Ísquio Direito',
  'Púbis Direito',
  'Ílio Esquerdo',
  'Ísquio Esquerdo',
  'Púbis Esquerdo'
] as const;

const MEMBRO_SUPERIOR_DIREITO_OSSOS = [
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
  '5º Metacarpal Direito'
] as const;

const MEMBRO_SUPERIOR_ESQUERDO_OSSOS = [
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
  'Rádio Esquerdo - Epífise Distal',
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

const MEMBRO_INFERIOR_DIREITO_OSSOS = [
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
  '5º Metatarsal Direito'
] as const;

const MEMBRO_INFERIOR_ESQUERDO_OSSOS = [
  'Fêmur Esquerdo - Epífise Proximal',
  'Fêmur Esquerdo - Diáfise',
  'Fêmur Esquerdo - Epífise Distal',
  'Patela Esquerda',
  'Tíbia Esquerda - Epífise Proximal',
  'Tíbia Esquerda - Diáfise',
  'Tíbia Esquerda - Epífise Distal',
  'Fíbula Esquerda - Epífise Proximal',
  'Fíbula Esquerda - Diáfise',
  'Fíbula Esquerda - Epífise Distal',
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

// Rótulos de identificação individual — "Nenhuma identificada" e
// "Supranumerária" entram à parte (ver CountIdentifyField).
const CERVICAIS_ORDINAIS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];
const TORACICAS_ORDINAIS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const LOMBARES_ORDINAIS = ['L1', 'L2', 'L3', 'L4', 'L5'];
const COSTELAS_ORDINAIS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª'];

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

export const SECTIONS_CONFIG = [
  { id: 'cabeca_pescoco', label: '1. Cabeça e Pescoço', active: true, count: CABECA_PESCOCO_OSSOS.length },
  { id: 'coluna_vertebral', label: '2. Coluna Vertebral', active: true, count: COLUNA_OSSOS_SIMPLES.length },
  { id: 'torax', label: '3. Tórax & Esterno', active: true, count: TORAX_OSSOS.length },
  { id: 'cintura_ms_dir', label: '4. Membro Superior Direito', active: true, count: MEMBRO_SUPERIOR_DIREITO_OSSOS.length },
  { id: 'cintura_ms_esq', label: '5. Membro Superior Esquerdo', active: true, count: MEMBRO_SUPERIOR_ESQUERDO_OSSOS.length },
  { id: 'pelve_bacia', label: '6. Pelve & Bacia', active: true, count: PELVE_BACIA_OSSOS.length },
  { id: 'mi_dir', label: '7. Membro Inferior Direito', active: true, count: MEMBRO_INFERIOR_DIREITO_OSSOS.length },
  { id: 'mi_esq', label: '8. Membro Inferior Esquerdo', active: true, count: MEMBRO_INFERIOR_ESQUERDO_OSSOS.length }
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
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [activeSkullSubgroup, setActiveSkullSubgroup] = useState<SkullSubgroupId>('calota');

  const findSubgroupForBone = (boneId: string): SkullSubgroupId => {
    for (const [subId, config] of Object.entries(SKULL_SUBGROUPS_CONFIG)) {
      if (config.bones.includes(boneId)) {
        return subId as SkullSubgroupId;
      }
    }
    return 'calota';
  };

  const cabecaData = inventory.cabecaPescoco || {
    ossos: {},
    cartilagensLaringe: [],
    ossiculosDireitos: [],
    ossiculosEsquerdos: [],
    alteracoes: []
  };

  const handleSetBonePresence = (bone: string, code: OsteologicalPresenceCode) => {
    if (readOnly) return;
    const currentCode = cabecaData.ossos[bone];
    const newOssos = { ...cabecaData.ossos };
    let newCode: OsteologicalPresenceCode | undefined;
    if (currentCode === code) {
      delete newOssos[bone];
      newCode = undefined;
    } else {
      newOssos[bone] = code;
      newCode = code;
    }
    const newAlteracoes = clearAlteracoesIfAusente(cabecaData.alteracoes, bone, newCode);
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: {
        ...cabecaData,
        ossos: newOssos,
        alteracoes: newAlteracoes
      }
    });
  };

  const handleBulkMark = (code: OsteologicalPresenceCode) => {
    if (readOnly) return;
    const newOssos: Record<string, OsteologicalPresenceCode> = {};
    for (const bone of CABECA_PESCOCO_OSSOS) {
      newOssos[bone] = code;
    }
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: {
        ...cabecaData,
        ossos: newOssos
      }
    });
  };

  const handleBulkMarkSubgroup = (code: OsteologicalPresenceCode) => {
    if (readOnly) return;
    const newOssos: Record<string, OsteologicalPresenceCode> = { ...cabecaData.ossos };
    for (const bone of SKULL_SUBGROUPS_CONFIG[activeSkullSubgroup].bones) {
      newOssos[bone] = code;
    }
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: {
        ...cabecaData,
        ossos: newOssos
      }
    });
  };

  const handleClearSection = () => {
    if (readOnly) return;
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: {
        ...cabecaData,
        ossos: {}
      }
    });
  };

  // Toggle helpers para checkboxes
  const handleToggleCartilagem = (val: string) => {
    if (readOnly) return;
    const list = cabecaData.cartilagensLaringe || [];
    let updated: string[];
    if (val === 'ausentes') {
      updated = list.includes('ausentes') ? [] : ['ausentes'];
    } else {
      const withoutAusentes = list.filter(item => item !== 'ausentes');
      updated = withoutAusentes.includes(val)
        ? withoutAusentes.filter(item => item !== val)
        : [...withoutAusentes, val];
    }
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, cartilagensLaringe: updated }
    });
  };

  const handleToggleOssiculo = (side: 'direitos' | 'esquerdos', val: string) => {
    if (readOnly) return;
    const key = side === 'direitos' ? 'ossiculosDireitos' : 'ossiculosEsquerdos';
    const list = cabecaData[key] || [];
    let updated: string[];
    if (val === 'ausentes') {
      updated = list.includes('ausentes') ? [] : ['ausentes'];
    } else {
      const withoutAusentes = list.filter(item => item !== 'ausentes');
      updated = withoutAusentes.includes(val)
        ? withoutAusentes.filter(item => item !== val)
        : [...withoutAusentes, val];
    }
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, [key]: updated }
    });
  };

  const [expandedBones, setExpandedBones] = useState<Record<string, boolean>>({});
  const toggleExpandBone = (bone: string) => {
    setExpandedBones(prev => ({ ...prev, [bone]: !prev[bone] }));
  };

  // Mesmo controle de expansão da drawer de alterações, só que por seção
  // (Seções 2-8) — evita colisão entre ossos de nomes iguais em seções diferentes.
  const [expandedBonesBySection, setExpandedBonesBySection] = useState<Record<string, Record<string, boolean>>>({});
  const toggleExpandBoneGeneric = (sectionKey: string, bone: string) => {
    setExpandedBonesBySection(prev => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] || {}), [bone]: !(prev[sectionKey]?.[bone]) }
    }));
  };

  const generateAltId = () => `alt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleToggleBoneAlteracao = (bone: string, tipo: AlteracaoOsseaTipo) => {
    if (readOnly) return;
    const list = cabecaData.alteracoes || [];
    const boneAlts = list.filter(a => a.osso === bone);
    const otherBonesAlts = list.filter(a => a.osso !== bone);

    if (tipo === 'sem_alteracao') {
      const isAlreadyChecked = boneAlts.some(a => a.tipo === 'sem_alteracao');
      const updatedBoneAlts: OsteologicalAlteracaoRegiao[] = isAlreadyChecked
        ? []
        : [{ id: generateAltId(), tipo: 'sem_alteracao', osso: bone, observacoes: '' }];
      onUpdateInventory({
        ...inventory,
        cabecaPescoco: { ...cabecaData, alteracoes: [...otherBonesAlts, ...updatedBoneAlts] }
      });
      return;
    }

    const withoutSemAlt = boneAlts.filter(a => a.tipo !== 'sem_alteracao');
    const exists = withoutSemAlt.some(a => a.tipo === tipo);
    let updatedBoneAlts: OsteologicalAlteracaoRegiao[];
    if (exists) {
      updatedBoneAlts = withoutSemAlt.filter(a => a.tipo !== tipo);
    } else {
      updatedBoneAlts = [
        ...withoutSemAlt,
        { id: generateAltId(), tipo, osso: bone, observacoes: '' }
      ];
    }
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, alteracoes: [...otherBonesAlts, ...updatedBoneAlts] }
    });
  };

  const handleAddBoneAlteracaoItem = (bone: string, tipo: AlteracaoOsseaTipo) => {
    if (readOnly) return;
    const list = cabecaData.alteracoes || [];
    const withoutSemAlt = list.filter(a => !(a.osso === bone && a.tipo === 'sem_alteracao'));
    const updated: OsteologicalAlteracaoRegiao[] = [
      ...withoutSemAlt,
      { id: generateAltId(), tipo, osso: bone, observacoes: '' }
    ];
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, alteracoes: updated }
    });
  };

  const handleRemoveBoneAlteracaoItem = (idToRemove: string) => {
    if (readOnly) return;
    const list = cabecaData.alteracoes || [];
    const updated = list.filter((a, idx) => (a.id || `alt-${a.tipo}-${idx}`) !== idToRemove);
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, alteracoes: updated }
    });
  };

  const handleUpdateBoneAlteracaoItem = (idToUpdate: string, obs: string) => {
    if (readOnly) return;
    const list = cabecaData.alteracoes || [];
    const updated = list.map((a, idx) =>
      (a.id || `alt-${a.tipo}-${idx}`) === idToUpdate
        ? { ...a, observacoes: obs }
        : a
    );
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, alteracoes: updated }
    });
  };

  // Contagens para badge de progresso
  const totalOssos = CABECA_PESCOCO_OSSOS.length;
  const countAssigned = Object.keys(cabecaData.ossos).length;
  const countP = Object.values(cabecaData.ossos).filter(c => c === 'P').length;
  const countF = Object.values(cabecaData.ossos).filter(c => c === 'F').length;
  const countI = Object.values(cabecaData.ossos).filter(c => c === 'I').length;
  const countA = Object.values(cabecaData.ossos).filter(c => c === 'A').length;
  const countAlteracoes = CABECA_PESCOCO_OSSOS.filter(bone =>
    (cabecaData.alteracoes || []).some(a => a.osso === bone && a.tipo !== 'sem_alteracao')
  ).length;

  // --- Helpers genéricos para as seções 2-8 (mesmo padrão ossos+alterações
  // da Cabeça e Pescoço, só que parametrizado pela chave da seção em vez de
  // hardcoded em cabecaPescoco). ---
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

  const getSectionAssignedCount = (sectionId: string): number => {
    switch (sectionId) {
      case 'cabeca_pescoco':
        return countAssigned;
      case 'coluna_vertebral':
        return Object.keys(getSimpleSection('colunaVertebral').ossos).length;
      case 'torax':
        return Object.keys(getSimpleSection('torax').ossos).length;
      case 'cintura_ms_dir':
        return Object.keys(getSimpleSection('membroSuperiorDireito').ossos).length;
      case 'cintura_ms_esq':
        return Object.keys(getSimpleSection('membroSuperiorEsquerdo').ossos).length;
      case 'pelve_bacia':
        return Object.keys(getSimpleSection('pelveBacia').ossos).length;
      case 'mi_dir':
        return Object.keys(getSimpleSection('membroInferiorDireito').ossos).length;
      case 'mi_esq':
        return Object.keys(getSimpleSection('membroInferiorEsquerdo').ossos).length;
      default:
        return 0;
    }
  };

  const configuredSectionsCount = SECTIONS_CONFIG.filter(sec => getSectionAssignedCount(sec.id) > 0).length;

  const updatePooled = (key: 'maoPooled' | 'pePooled', patch: Partial<OsteologicalPooledCounts>) => {
    if (readOnly) return;
    const current = (inventory[key] as OsteologicalPooledCounts) || {};
    onUpdateInventory({ ...inventory, [key]: { ...current, ...patch } });
  };

  const updateCountIdentify = (
    sectionKey: string,
    field: string,
    patch: Partial<OsteologicalCountIdentifySelection>
  ) => {
    if (readOnly) return;
    const current = (inventory as any)[sectionKey] || {};
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
              Inventário Osteológico por Regiões Anatômicas (8 Seções)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro forense estruturado com códigos P/F/I/A de presença e catalogação regional de alterações.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {configuredSectionsCount} de {SECTIONS_CONFIG.length} seções com dados
          </span>
        </div>

        {/* Grade de Navegação das 8 Seções */}
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

      {/* Conteúdo da Seção Ativa */}
      {currentSectionId === 'cabeca_pescoco' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-6">
          {/* Cabeçalho da Seção 1 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                Cabeça e Pescoço
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {totalOssos} ossos catalogados
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione o código de presença único (P, F, I ou A) para cada elemento ósseo craniofacial.
              </p>
            </div>

            {/* Ações em lote e Estatísticas */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono mr-2">
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.P.badgeClass}`}>
                  P: {countP}
                </span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.F.badgeClass}`}>
                  F: {countF}
                </span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.I.badgeClass}`}>
                  I: {countI}
                </span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${PRESENCE_DEFINITIONS.A.badgeClass}`}>
                  A: {countA}
                </span>
                <span className="px-2 py-0.5 rounded border text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700">
                  !: {countAlteracoes}
                </span>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => handleBulkMark('P')}
                    className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition-colors text-[11px] font-medium"
                  >
                    Marcar Todos P
                  </button>
                  <button
                    onClick={() => handleBulkMark('A')}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors text-[11px] font-medium"
                  >
                    Marcar Todos A
                  </button>
                  <button
                    onClick={handleClearSection}
                    className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 hover:bg-rose-100 transition-colors text-[11px] font-medium"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Legenda dos Códigos P / F / I / A e Alterações Ósseas */}
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
              {/* Item da legenda para Alterações Ósseas */}
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700">
                <span className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-current text-red-700 dark:text-red-400">
                  !
                </span>
                <span className="text-[11px] leading-tight font-medium">Alterações ósseas</span>
              </div>
            </div>
          </div>

          {/* Sub-Abas de Navegação das 4 Pranchas Especializadas de Cabeça e Pescoço */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Pranchas Anatômicas por Grupo de Ossos (Exercício 5)
              </span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">
                Selecione o grupo para focar e ampliar a visualização médica
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(Object.keys(SKULL_SUBGROUPS_CONFIG) as SkullSubgroupId[]).map(subId => {
                const cfg = SKULL_SUBGROUPS_CONFIG[subId];
                const isCurrent = activeSkullSubgroup === subId;
                const filledCount = cfg.bones.filter(b => !!cabecaData.ossos[b]).length;
                const totalCount = cfg.bones.length;
                const isComplete = filledCount === totalCount;

                return (
                  <button
                    key={subId}
                    type="button"
                    onClick={() => setActiveSkullSubgroup(subId)}
                    className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-400 dark:ring-sky-600 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {cfg.title}
                      </span>
                      {isComplete && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
                      {cfg.subtitle}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold">{cfg.plateNumber.split('(')[0].trim()}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {filledCount}/{totalCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Split-Screen: Lista Pericial à Esquerda (7 cols) + Placa Anatômica Especializada à Direita (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Lista dos Ossos do Grupo Selecionado */}
            <div className="lg:col-span-7 space-y-6">
              {/* Lista dos Ossos com Seleção Única e Alterações Ósseas */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                      {SKULL_SUBGROUPS_CONFIG[activeSkullSubgroup].title} ({SKULL_SUBGROUPS_CONFIG[activeSkullSubgroup].bones.length} {SKULL_SUBGROUPS_CONFIG[activeSkullSubgroup].bones.length === 1 ? 'osso' : 'ossos'})
                    </h5>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleBulkMarkSubgroup('P')}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-all font-semibold"
                    >
                      Marcar grupo P
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                      · <AlertCircle className="w-3 h-3 inline text-slate-500 align-text-bottom" /> para alterações
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {SKULL_SUBGROUPS_CONFIG[activeSkullSubgroup].bones.map((bone, index) => {
                    const currentCode = cabecaData.ossos[bone];
                    const isExpanded = !!expandedBones[bone];
                    const isSelected = selectedBone === bone;
                    const boneAlteracoes = (cabecaData.alteracoes || []).filter(a => a.osso === bone);
                    const hasSemAlteracao = boneAlteracoes.some(a => a.tipo === 'sem_alteracao');
                    const activeAlteracoes = boneAlteracoes.filter(a => a.tipo !== 'sem_alteracao');

                    return (
                      <div
                        key={bone}
                        id={`bone-row-${bone.replace(/\s+/g, '-')}`}
                        onClick={() => setSelectedBone(bone)}
                        className={`rounded-xl border transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-2 ring-sky-400 dark:ring-sky-600 shadow-md'
                            : isExpanded
                              ? 'border-red-400 dark:border-red-800 bg-white dark:bg-slate-900 shadow-xs ring-1 ring-red-200 dark:ring-red-950'
                              : currentCode
                                ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs'
                                : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30'
                        }`}
                      >
                        {/* Linha Principal do Osso */}
                        <div className="flex flex-wrap items-center justify-between p-2.5 sm:p-3 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-[11px] font-mono text-slate-400 w-5 text-right flex-shrink-0">
                          {index + 1}.
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={bone}>
                          {bone}
                        </span>

                        {/* Badges de Alterações Ósseas Registradas */}
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

                      {/* Grupo de Ações: P / F / I / A + Botão de Alterações Ósseas */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {(['P', 'F', 'I', 'A'] as OsteologicalPresenceCode[]).map(code => {
                          const isSelected = currentCode === code;
                          const config = PRESENCE_DEFINITIONS[code];
                          return (
                            <button
                              key={code}
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleSetBonePresence(bone, code)}
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

                        {/* Botão de Alterações Ósseas (ilumina em vermelho quando selecionado/expandido ou quando possui alterações) —
                            desabilitado com o osso Ausente: alteração e ausência são mutuamente exclusivas. */}
                        <button
                          type="button"
                          disabled={readOnly || currentCode === 'A'}
                          onClick={() => toggleExpandBone(bone)}
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
                      </div>
                    </div>

                    {/* Drawer Expansível de Alterações Ósseas — Específico do Osso */}
                    {isExpanded && (
                      <div className="border-t border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 p-4 rounded-b-xl space-y-3">
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
                            onClick={() => toggleExpandBone(bone)}
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
                                        onChange={() => handleToggleBoneAlteracao(bone, opt.id)}
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
                                      onChange={() => handleToggleBoneAlteracao(bone, opt.id)}
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

                                {/* Lista de itens registrados para a categoria neste osso */}
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
                                                onClick={() => handleRemoveBoneAlteracaoItem(entryId)}
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
                                              onChange={e => handleUpdateBoneAlteracaoItem(entryId, e.target.value)}
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
                                          onClick={() => handleAddBoneAlteracaoItem(bone, opt.id)}
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
          </div>

          {/* Estruturas Complementares: Cartilagens e Ossículos (Exibidos junto com Arcadas e Mandíbula na Prancha 4) */}
          {activeSkullSubgroup === 'mandibula_cervical' && (
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
                {/* Cartilagens da laringe ossificadas */}
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
                      const checked = (cabecaData.cartilagensLaringe || []).includes(opt.id);
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

                {/* Ossículos da audição direitos */}
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
                      const checked = (cabecaData.ossiculosDireitos || []).includes(opt.id);
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

                {/* Ossículos da audição esquerdos */}
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
                      const checked = (cabecaData.ossiculosEsquerdos || []).includes(opt.id);
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
        </div>

        {/* Lado Direito: Placa Anatômica Especializada Interativa (Sticky durante rolagem) */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
          <AnatomicMultiPlateSkullViewer
            activeSubgroup={activeSkullSubgroup}
            onSelectSubgroup={setActiveSkullSubgroup}
            ossos={cabecaData.ossos}
            selectedBone={selectedBone}
            onSelectBone={(bone) => {
              setSelectedBone(bone);
              const targetSubgroup = findSubgroupForBone(bone);
              if (targetSubgroup !== activeSkullSubgroup) {
                setActiveSkullSubgroup(targetSubgroup);
              }
              const el = document.getElementById(`bone-row-${bone.replace(/\s+/g, '-')}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            alteracoes={cabecaData.alteracoes}
            cartilagensLaringe={cabecaData.cartilagensLaringe}
            ossiculosDireitos={cabecaData.ossiculosDireitos}
            ossiculosEsquerdos={cabecaData.ossiculosEsquerdos}
            onToggleCartilagem={handleToggleCartilagem}
            onToggleOssiculo={handleToggleOssiculo}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
      ) : (
        /* Seções 2 a 8 — mesmo padrão P/F/I/A + alteração óssea da Cabeça e
           Pescoço, genérico, mais os blocos de contagem/identificação
           repetitivos (vértebras, costelas) e os pooled de mão/pé onde a
           seção exige. */
        (() => {
          const sectionDataMap: Record<string, { key: string; bones: readonly string[] }> = {
            coluna_vertebral: { key: 'colunaVertebral', bones: COLUNA_OSSOS_SIMPLES },
            torax: { key: 'torax', bones: TORAX_OSSOS },
            cintura_ms_dir: { key: 'membroSuperiorDireito', bones: MEMBRO_SUPERIOR_DIREITO_OSSOS },
            cintura_ms_esq: { key: 'membroSuperiorEsquerdo', bones: MEMBRO_SUPERIOR_ESQUERDO_OSSOS },
            pelve_bacia: { key: 'pelveBacia', bones: PELVE_BACIA_OSSOS },
            mi_dir: { key: 'membroInferiorDireito', bones: MEMBRO_INFERIOR_DIREITO_OSSOS },
            mi_esq: { key: 'membroInferiorEsquerdo', bones: MEMBRO_INFERIOR_ESQUERDO_OSSOS }
          };
          const current = sectionDataMap[currentSectionId];
          if (!current) return null;
          const { key: sectionKey, bones } = current;
          const sectionData = getSimpleSection(sectionKey);
          const sectionLabel = SECTIONS_CONFIG.find(s => s.id === currentSectionId)?.label || '';

          return (
            <div className="space-y-6">
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

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    {sectionLabel} ({bones.length} {bones.length === 1 ? 'osso' : 'ossos'})
                  </h5>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleBulkMarkGeneric(sectionKey, bones, 'P')}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-all font-semibold"
                    >
                      Marcar seção P
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleClearSectionGeneric(sectionKey)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition-all font-semibold"
                    >
                      Limpar seção
                    </button>
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

              {currentSectionId === 'coluna_vertebral' && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Vértebras — Quantidade e Identificação
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <CountIdentifyField
                      label="Cervicais"
                      max={7}
                      ordinais={[...CERVICAIS_ORDINAIS]}
                      value={inventory.colunaVertebral?.cervicais || {}}
                      onChange={patch => updateCountIdentify('colunaVertebral', 'cervicais', patch)}
                      readOnly={readOnly}
                    />
                    <CountIdentifyField
                      label="Torácicas"
                      max={12}
                      ordinais={[...TORACICAS_ORDINAIS]}
                      value={inventory.colunaVertebral?.toracicas || {}}
                      onChange={patch => updateCountIdentify('colunaVertebral', 'toracicas', patch)}
                      readOnly={readOnly}
                    />
                    <CountIdentifyField
                      label="Lombares"
                      max={5}
                      ordinais={[...LOMBARES_ORDINAIS]}
                      value={inventory.colunaVertebral?.lombares || {}}
                      onChange={patch => updateCountIdentify('colunaVertebral', 'lombares', patch)}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              )}

              {currentSectionId === 'torax' && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Costelas — Quantidade e Identificação
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CountIdentifyField
                      label="Costelas Direitas"
                      max={12}
                      ordinais={[...COSTELAS_ORDINAIS]}
                      value={inventory.torax?.costelasDireitas || {}}
                      onChange={patch => updateCountIdentify('torax', 'costelasDireitas', patch)}
                      readOnly={readOnly}
                    />
                    <CountIdentifyField
                      label="Costelas Esquerdas"
                      max={12}
                      ordinais={[...COSTELAS_ORDINAIS]}
                      value={inventory.torax?.costelasEsquerdas || {}}
                      onChange={patch => updateCountIdentify('torax', 'costelasEsquerdas', patch)}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              )}

              {(currentSectionId === 'cintura_ms_dir' || currentSectionId === 'cintura_ms_esq') && (
                <PooledCountsCard
                  label="Mão"
                  value={inventory.maoPooled || {}}
                  onChange={patch => updatePooled('maoPooled', patch)}
                  readOnly={readOnly}
                />
              )}

              {(currentSectionId === 'mi_dir' || currentSectionId === 'mi_esq') && (
                <PooledCountsCard
                  label="Pé"
                  value={inventory.pePooled || {}}
                  onChange={patch => updatePooled('pePooled', patch)}
                  readOnly={readOnly}
                />
              )}
            </div>
          );
        })()
      )}
    </div>
  );
};

// --- Componentes reutilizáveis para as Seções 2 a 8 ---
// Mesmo padrão visual e de interação da Cabeça e Pescoço (osso com código
// P/F/I/A único + alteração óssea embutida por elemento), só que genérico —
// sem a prancha anatômica visual, que existe só para o crânio.

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
            <div className="flex flex-wrap items-center justify-between p-2.5 sm:p-3 gap-2">
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
                      onClick={() => onSetPresence(bone, code)}
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
                  onClick={() => onToggleExpand(bone)}
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
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 p-4 rounded-b-xl space-y-3">
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

// Contagem limitada por rolagem (0..max, "+max") + identificação individual
// multi-seleção ("Nenhuma identificada" é exclusiva com as demais, mesmo
// padrão de "Ausentes" já usado em cartilagens/ossículos).
interface CountIdentifyFieldProps {
  label: string;
  max: number;
  ordinais: string[];
  value: OsteologicalCountIdentifySelection;
  onChange: (patch: Partial<OsteologicalCountIdentifySelection>) => void;
  readOnly: boolean;
}

const CountIdentifyField: React.FC<CountIdentifyFieldProps> = ({ label, max, ordinais, value, onChange, readOnly }) => {
  const identificadas = value.identificadas || [];
  const nenhumaMarcada = identificadas.includes('nenhuma_identificada');

  const toggleIdentificada = (id: string) => {
    if (readOnly) return;
    if (id === 'nenhuma_identificada') {
      onChange({ identificadas: nenhumaMarcada ? [] : ['nenhuma_identificada'] });
      return;
    }
    const withoutNenhuma = identificadas.filter(i => i !== 'nenhuma_identificada');
    const updated = withoutNenhuma.includes(id) ? withoutNenhuma.filter(i => i !== id) : [...withoutNenhuma, id];
    onChange({ identificadas: updated });
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
        <select
          disabled={readOnly}
          value={value.quantidade ?? ''}
          onChange={e => onChange({ quantidade: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
        >
          <option value="">Quantidade —</option>
          {Array.from({ length: max + 1 }, (_, n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value={max + 1}>{`+${max}`}</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={nenhumaMarcada}
            onChange={() => toggleIdentificada('nenhuma_identificada')}
            className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
          />
          <span>Nenhuma identificada</span>
        </label>
        {ordinais.map(ord => (
          <label
            key={ord}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer font-mono"
          >
            <input
              type="checkbox"
              disabled={readOnly}
              checked={identificadas.includes(ord)}
              onChange={() => toggleIdentificada(ord)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span>{ord}</span>
          </label>
        ))}
        <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 cursor-pointer text-amber-800 dark:text-amber-300">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={identificadas.includes('supranumeraria')}
            onChange={() => toggleIdentificada('supranumeraria')}
            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <span>Supranumerária</span>
        </label>
      </div>
    </div>
  );
};

// Falanges (rolagem 0..max/+max) e sesamoides (intervalo aberto, sem teto) da
// mão ou do pé — contados uma vez só, não por lado (policy-109 / pedido do
// Tales out/2026). Aparece nas duas abas do mesmo membro (D e E), escrevendo
// no mesmo campo compartilhado.
interface PooledCountsCardProps {
  label: string;
  value: OsteologicalPooledCounts;
  onChange: (patch: Partial<OsteologicalPooledCounts>) => void;
  readOnly: boolean;
}

const PooledCountsCard: React.FC<PooledCountsCardProps> = ({ label, value, onChange, readOnly }) => {
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
        Falanges e Sesamoides da {label} (ambos os lados, contagem única)
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
            onChange={e => onChange({ sesamoides: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
            placeholder="Nº"
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
};
