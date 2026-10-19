import React, { useState } from 'react';
import {
  OsteologicalInventoryData,
  OsteologicalPresenceCode,
  AlteracaoOsseaTipo,
  OsteologicalAlteracaoRegiao
} from '../types/sgccco';
import { Info, Sparkles, Plus, Trash2, AlertCircle } from 'lucide-react';
import { AnatomicExplodedSkullViewer } from './AnatomicExplodedSkullViewer';

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
  { id: 'coluna_vertebral', label: '2. Coluna Vertebral', active: false, count: 0 },
  { id: 'torax', label: '3. Tórax & Esterno', active: false, count: 0 },
  { id: 'cintura_ms_dir', label: '4. Membro Superior Direito', active: false, count: 0 },
  { id: 'cintura_ms_esq', label: '5. Membro Superior Esquerdo', active: false, count: 0 },
  { id: 'pelve_bacia', label: '6. Pelve & Bacia', active: false, count: 0 },
  { id: 'mi_dir', label: '7. Membro Inferior Direito', active: false, count: 0 },
  { id: 'mi_esq', label: '8. Membro Inferior Esquerdo', active: false, count: 0 }
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
    if (currentCode === code) {
      delete newOssos[bone];
    } else {
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
            Seção 1 de 8 configurada
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
                    {countAssigned}/{sec.count} catalogados
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

          {/* Layout Split-Screen: Lista Pericial à Esquerda (7 cols) + Placa Anatômica Gravada à Direita (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Lista dos 23 Ossos + Cartilagens e Ossículos */}
            <div className="lg:col-span-7 space-y-6">
              {/* Lista dos 23 Ossos com Seleção Única e Alterações Ósseas */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Elementos Ósseos da Cabeça e Pescoço ({totalOssos})
                  </h5>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Clique no botão com <AlertCircle className="w-3.5 h-3.5 inline text-slate-500 align-text-bottom" /> para abrir as alterações ósseas do osso
                  </span>
                </div>

                <div className="space-y-2">
                  {CABECA_PESCOCO_OSSOS.map((bone, index) => {
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

                        {/* Botão de Alterações Ósseas (ilumina em vermelho quando selecionado/expandido ou quando possui alterações) */}
                        <button
                          type="button"
                          onClick={() => toggleExpandBone(bone)}
                          title={`Alterações ósseas — ${bone}`}
                          aria-label={`Alterações ósseas — ${bone}`}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                            isExpanded || activeAlteracoes.length > 0
                              ? isExpanded
                                ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-400/50 shadow-xs'
                                : 'bg-red-600 text-white border-red-700 shadow-xs hover:bg-red-700 active:scale-95'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 active:scale-95'
                          } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
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

          {/* Estruturas Complementares: Cartilagens e Ossículos */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Cartilagens da laringe ossificadas / Ossículos da audição
            </h5>

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
        </div>

        {/* Lado Direito: Placa Anatômica Gravada Interativa (Sticky durante rolagem) */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
          <AnatomicExplodedSkullViewer
            ossos={cabecaData.ossos}
            selectedBone={selectedBone}
            onSelectBone={(bone) => {
              setSelectedBone(bone);
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
        /* Placeholder para as Seções 2 a 8 */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {SECTIONS_CONFIG.find(s => s.id === currentSectionId)?.label}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Esta seção será liberada assim que forem fornecidos os dados verbatim dos ossos da região e a regra repetitiva de quantidade/identificação (costelas, vértebras, falanges e sesamoides).
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
            Status: Aguardando parâmetros periciais
          </div>
        </div>
      )}
    </div>
  );
};
