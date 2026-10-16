import React, { useState } from 'react';
import {
  OsteologicalInventoryData,
  OsteologicalPresenceCode,
  AlteracaoOsseaTipo,
  OsteologicalAlteracaoRegiao
} from '../types/sgccco';
import { Check, Info, ShieldAlert, Sparkles } from 'lucide-react';

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

const ALTERACOES_OPTIONS: { id: AlteracaoOsseaTipo; label: string }[] = [
  { id: 'lesao_ante_mortem', label: 'Lesão ante-mortem' },
  { id: 'lesao_peri_mortem', label: 'Lesão peri-mortem' },
  { id: 'alteracao_post_mortem', label: 'Alteração post-mortem (tafonômica)' },
  { id: 'patologia', label: 'Patologia' },
  { id: 'variacao_anatomica', label: 'Variação anatômica' },
  { id: 'alteracao', label: 'Outra alteração' }
];

export const OsteologicalInventoryViewer: React.FC<OsteologicalInventoryViewerProps> = ({
  inventory = {},
  onUpdateInventory,
  readOnly = false
}) => {
  const [currentSectionId, setCurrentSectionId] = useState<string>('cabeca_pescoco');

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

  const handleToggleAlteracao = (tipo: AlteracaoOsseaTipo) => {
    if (readOnly) return;
    const list = cabecaData.alteracoes || [];
    const exists = list.some(a => a.tipo === tipo);
    let updated: OsteologicalAlteracaoRegiao[];
    if (exists) {
      updated = list.filter(a => a.tipo !== tipo);
    } else {
      updated = [...list, { tipo, osso: CABECA_PESCOCO_OSSOS[0], observacoes: '' }];
    }
    onUpdateInventory({
      ...inventory,
      cabecaPescoco: { ...cabecaData, alteracoes: updated }
    });
  };

  const handleUpdateAlteracaoOsso = (tipo: AlteracaoOsseaTipo, osso: string, obs?: string) => {
    if (readOnly) return;
    const list = cabecaData.alteracoes || [];
    const updated = list.map(a =>
      a.tipo === tipo ? { ...a, osso, observacoes: obs !== undefined ? obs : a.observacoes } : a
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

          {/* Legenda dos Códigos P / F / I / A */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              Códigos Padronizados de Presença Óssea (Escolha Única)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
            </div>
          </div>

          {/* Lista dos 23 Ossos com Seleção Única */}
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono mb-3">
              Elementos Ósseos da Cabeça e Pescoço ({totalOssos})
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CABECA_PESCOCO_OSSOS.map((bone, index) => {
                const currentCode = cabecaData.ossos[bone];
                return (
                  <div
                    key={bone}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      currentCode
                        ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="text-[11px] font-mono text-slate-400 w-5 text-right flex-shrink-0">
                        {index + 1}.
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={bone}>
                        {bone}
                      </span>
                    </div>

                    {/* Grupo de Botões P / F / I / A */}
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estruturas Complementares: Cartilagens e Ossículos */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Estruturas Cartilaginosas e Ossículos Auditivos (Múltipla Escolha)
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

          {/* Alterações Ósseas Identificadas Nesta Região */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Alterações Ósseas Identificadas Nesta Região
              </h5>
              <p className="text-xs text-slate-500 mt-0.5">
                Marque as categorias de alterações observadas nesta região e vincule o osso correspondente.
              </p>
            </div>

            <div className="space-y-2.5">
              {ALTERACOES_OPTIONS.map(opt => {
                const existing = (cabecaData.alteracoes || []).find(a => a.tipo === opt.id);
                const isChecked = Boolean(existing);

                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isChecked
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={isChecked}
                          onChange={() => handleToggleAlteracao(opt.id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{opt.label}</span>
                      </label>
                      {isChecked && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                          Identificada
                        </span>
                      )}
                    </div>

                    {/* Caixa de seleção vinculada do osso e observação */}
                    {isChecked && (
                      <div className="mt-3 pt-2.5 border-t border-amber-200 dark:border-amber-900/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Osso afetado:
                          </label>
                          <select
                            disabled={readOnly}
                            value={existing?.osso || CABECA_PESCOCO_OSSOS[0]}
                            onChange={e => handleUpdateAlteracaoOsso(opt.id, e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                          >
                            <option value="Múltiplos / Região Geral">Múltiplos / Região Geral</option>
                            {CABECA_PESCOCO_OSSOS.map(b => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Descrição / Detalhamento da alteração:
                          </label>
                          <input
                            type="text"
                            disabled={readOnly}
                            value={existing?.observacoes || ''}
                            onChange={e => handleUpdateAlteracaoOsso(opt.id, existing?.osso || CABECA_PESCOCO_OSSOS[0], e.target.value)}
                            placeholder="Ex: Fratura linear sem cicatrização; osteófito na margem..."
                            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                          >
                          </input>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
