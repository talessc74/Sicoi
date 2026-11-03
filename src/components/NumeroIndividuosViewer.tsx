import React, { useState, useMemo } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  BoneQuantificationEntry,
  NumeroIndividuosData
} from '../types/sgccco';
import {
  calcularMetricasOsso,
  calcularMetricasConsolidadas,
  extrairOssosDoInventario,
  OSSOS_BILATERAIS_PADRAO,
  SugestaoOssoInventario
} from '../utils/quantificacaoIndividuos';
import {
  Calculator,
  Users,
  Scale,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Info,
  Sparkles,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  BookOpen,
  Check
} from 'lucide-react';

interface NumeroIndividuosViewerProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  readOnly?: boolean;
}

export const NumeroIndividuosViewer: React.FC<NumeroIndividuosViewerProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  readOnly = false
}) => {
  // Dados de quantificação persistidos na Fase 4
  const numeroIndividuosData: NumeroIndividuosData = useMemo(() => {
    return collection.phase4?.numeroIndividuos || { entries: [] };
  }, [collection.phase4?.numeroIndividuos]);

  const entries = numeroIndividuosData.entries || [];

  // Estado da aba/gaveta inferior
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'inventario' | 'catalogo'>('inventario');
  const [searchCatalog, setSearchCatalog] = useState('');
  const [customBoneName, setCustomBoneName] = useState('');
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  // Ossos extraídos do inventário osteológico
  const ossosInventario = useMemo(() => {
    return extrairOssosDoInventario(collection.phase4?.osteologicalInventory);
  }, [collection.phase4?.osteologicalInventory]);

  // Cálculos consolidados para as 3 caixas superiores
  const consolidadas = useMemo(() => {
    return calcularMetricasConsolidadas(entries);
  }, [entries]);

  // Atualização no estado global da coleção
  const handleSaveEntries = (newEntries: BoneQuantificationEntry[], observacoesGerais?: string) => {
    if (readOnly) return;
    const updated: OsteologicalCollection = {
      ...collection,
      phase4: {
        ...collection.phase4,
        numeroIndividuos: {
          entries: newEntries,
          observacoesGerais:
            observacoesGerais !== undefined
              ? observacoesGerais
              : numeroIndividuosData.observacoesGerais
        }
      }
    };
    onUpdateCollection(updated);
  };

  // Adicionar um osso novo
  const handleAddBone = (nome: string, initialE: number = 0, initialD: number = 0) => {
    if (readOnly) return;
    const cleanName = nome.trim();
    if (!cleanName) return;

    // Se já existir esse osso com esse nome exato, apenas foca ou adiciona com diferenciador
    const existingIndex = entries.findIndex(
      e => (e.nomeOsso || '').toLowerCase() === cleanName.toLowerCase()
    );

    let finalName = cleanName;
    if (existingIndex !== -1) {
      finalName = `${cleanName} (${entries.length + 1})`;
    }

    const newEntry: BoneQuantificationEntry = {
      id: `bone-quant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nomeOsso: finalName,
      ladoEsquerdo: Math.max(0, initialE),
      ladoDireito: Math.max(0, initialD),
      pareados: Math.min(Math.max(0, initialE), Math.max(0, initialD))
    };

    handleSaveEntries([...entries, newEntry]);
  };

  // Remover um osso da lista
  const handleRemoveBone = (id: string) => {
    if (readOnly) return;
    handleSaveEntries(entries.filter(e => e.id !== id));
  };

  // Atualizar contagens de um osso (E, D, P)
  const handleUpdateCounts = (
    id: string,
    field: 'ladoEsquerdo' | 'ladoDireito' | 'pareados',
    value: number
  ) => {
    if (readOnly) return;
    const newEntries = entries.map(entry => {
      if (entry.id !== id) return entry;

      let novoE = entry.ladoEsquerdo;
      let novoD = entry.ladoDireito;
      let novoP = entry.pareados;

      if (field === 'ladoEsquerdo') {
        novoE = Math.max(0, Math.floor(value || 0));
        // Validação: P não pode exceder min(E, D)
        const maxP = Math.min(novoE, novoD);
        if (novoP > maxP) novoP = maxP;
      } else if (field === 'ladoDireito') {
        novoD = Math.max(0, Math.floor(value || 0));
        // Validação: P não pode exceder min(E, D)
        const maxP = Math.min(novoE, novoD);
        if (novoP > maxP) novoP = maxP;
      } else if (field === 'pareados') {
        const maxP = Math.min(novoE, novoD);
        novoP = Math.max(0, Math.min(Math.floor(value || 0), maxP));
      }

      return {
        ...entry,
        ladoEsquerdo: novoE,
        ladoDireito: novoD,
        pareados: novoP
      };
    });

    handleSaveEntries(newEntries);
  };

  // Limpar todas as entradas
  const handleResetAll = () => {
    if (readOnly) return;
    if (entries.length === 0) return;
    if (window.confirm('Deseja realmente limpar todos os ossos quantificados nesta aba?')) {
      handleSaveEntries([]);
    }
  };

  // Filtragem do catálogo geral de ossos
  const filteredCatalog = useMemo(() => {
    if (!searchCatalog.trim()) return OSSOS_BILATERAIS_PADRAO;
    const term = searchCatalog.toLowerCase();
    return OSSOS_BILATERAIS_PADRAO.filter(
      b => b.nome.toLowerCase().includes(term) || b.categoria.toLowerCase().includes(term)
    );
  }, [searchCatalog]);

  return (
    <div className="space-y-6 pb-28">
      {/* Cabeçalho com Introdução Científica e Ações */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <Calculator className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white font-mono">
                Estimativa e Quantificação do Número de Indivíduos
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Determinação bioantropológica baseada em contagens antiméricas e pareamento anatômico
              (NMI, MMT e Estimador de Chapman/Adams & Konigsberg com IC 95%).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span>{showFormulaDetails ? 'Ocultar Fórmulas' : 'Ver Fórmulas'}</span>
            </button>

            {!readOnly && entries.length > 0 && (
              <button
                onClick={handleResetAll}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1 hover:bg-rose-100 transition-colors"
                title="Limpar todos os ossos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Painel Expansível de Explicação das Fórmulas */}
        {showFormulaDetails && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              Fundamentação Matemática e Bioantropológica
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">
                  1. NMI (Número Mínimo)
                </span>
                <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono block mb-1 text-slate-800 dark:text-slate-200">
                  NMI = max(E, D)
                </code>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Maior número de elementos anatômicos únicos (NME) encontrados do lado esquerdo ou
                  direito para o osso avaliado (White, 1953; Lyman, 1994).
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                  2. MMT (Mínimo Máximo Total)
                </span>
                <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono block mb-1 text-slate-800 dark:text-slate-200">
                  MMT = E + D - P
                </code>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Soma de todos os elementos esquerdos e direitos, subtraindo a quantidade de pares
                  pareados comprovados (P).
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-violet-600 dark:text-violet-400 block mb-1">
                  3. NMPI e IC 95%
                </span>
                <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono block mb-1 text-slate-800 dark:text-slate-200">
                  NMPI = ⌊((E+1)(D+1))/(P+1) - 1⌋
                </code>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Estimador de Chapman (Lincoln Index) com função piso ⌊ ⌋ (nunca arredonda para
                  cima). Variância: Vx = [(E+1)(D+1)(E-P)(D-P)] / [(P+1)²(P+2)]. IC 95% = NMPI ±
                  1.96·√Vx.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AS 3 CAIXAS PRINCIPAIS COM OS RESULTADOS NUMÉRICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Caixa 1: NMI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-sky-500/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 font-mono block">
                Número Mínimo de Indivíduos
              </span>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                NMI
              </h4>
            </div>
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Users className="w-5 h-5" />
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                {consolidadas.nmi}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {consolidadas.nmi === 1 ? 'indivíduo' : 'indivíduos'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] flex items-center justify-between text-slate-500">
            <span>Fórmula: max(E, D)</span>
            {consolidadas.ossoDeterminanteNMI ? (
              <span className="font-medium text-sky-600 dark:text-sky-400 truncate max-w-[140px]">
                Ref: {consolidadas.ossoDeterminanteNMI}
              </span>
            ) : (
              <span className="text-slate-400">Padrão: 1</span>
            )}
          </div>
        </div>

        {/* Caixa 2: MMT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono block">
                Mínimo Máximo Total
              </span>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                MMT
              </h4>
            </div>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Scale className="w-5 h-5" />
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                {consolidadas.mmt}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {consolidadas.mmt === 1 ? 'indivíduo' : 'indivíduos'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] flex items-center justify-between text-slate-500">
            <span>Fórmula: E + D - P</span>
            {consolidadas.ossoDeterminanteMMT ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[140px]">
                Ref: {consolidadas.ossoDeterminanteMMT}
              </span>
            ) : (
              <span className="text-slate-400">Padrão: 1</span>
            )}
          </div>
        </div>

        {/* Caixa 3: NMPI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-violet-500/30 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 font-mono block">
                Número Mais Provável de Indivíduos
              </span>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                NMPI (Chapman)
              </h4>
            </div>
            <span className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white">
                {consolidadas.nmpiPiso}
              </span>
              <span className="text-base font-semibold font-mono text-violet-600 dark:text-violet-400">
                ({consolidadas.nmpiDecimal})
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>
                Vx: <strong className="font-mono">{consolidadas.vx}</strong>
              </span>
              <span>·</span>
              <span>
                IC 95%:{' '}
                <strong className="font-mono text-slate-700 dark:text-slate-200">
                  [{consolidadas.ic95.inferior}, {consolidadas.ic95.superior}]
                </strong>
                {consolidadas.ic95.margem > 0 && ` (±${consolidadas.ic95.margem})`}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] flex items-center justify-between text-slate-500">
            <span>Fórmula: ⌊Piso⌋ (Decimal)</span>
            {consolidadas.ossoDeterminanteNMPI ? (
              <span className="font-medium text-violet-600 dark:text-violet-400 truncate max-w-[140px]">
                Ref: {consolidadas.ossoDeterminanteNMPI}
              </span>
            ) : (
              <span className="text-slate-400">Padrão: 1</span>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: LISTAGEM DE OSSOS QUANTIFICADOS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <span>Elementos Quantificados</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                {entries.length} {entries.length === 1 ? 'osso adicionado' : 'ossos adicionados'}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cada elemento preserva seus próprios cálculos (E, D, P, NMI, MMT, NMPI, Vx e IC 95%) de forma independente.
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Osso do Inventário</span>
            </button>
          )}
        </div>

        {/* Lista de Ossos Vazios (Empty State) */}
        {entries.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
              <Scale className="w-6 h-6" />
            </div>
            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Nenhum elemento adicionado para quantificação
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Por default, a estimativa do conjunto resulta em <strong>1 indivíduo</strong>. Clique
              no botão abaixo ou abra a aba inferior para importar os ossos presentes no inventário
              osteológico e preencher as quantidades (E, D, P).
            </p>
            {!readOnly && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Seleção de Ossos do Inventário</span>
              </button>
            )}
          </div>
        ) : (
          /* Cards Individuais para cada osso adicionado */
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const metricas = calcularMetricasOsso(entry);
              const maxPossivelP = Math.min(entry.ladoEsquerdo || 0, entry.ladoDireito || 0);

              return (
                <div
                  key={entry.id}
                  className="bg-slate-50/70 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                        {index + 1}
                      </span>
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                        {entry.nomeOsso || 'Elemento'}
                      </h5>
                    </div>

                    {!readOnly && (
                      <button
                        onClick={() => handleRemoveBone(entry.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Remover este osso da quantificação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Controles de Entrada: E, D, P */}
                    <div className="lg:col-span-6 grid grid-cols-3 gap-2">
                      {/* Lado Esquerdo (E) */}
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Esquerdo (E)
                        </label>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            disabled={readOnly || entry.ladoEsquerdo <= 0}
                            onClick={() =>
                              handleUpdateCounts(entry.id, 'ladoEsquerdo', entry.ladoEsquerdo - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            disabled={readOnly}
                            value={entry.ladoEsquerdo}
                            onChange={e =>
                              handleUpdateCounts(
                                entry.id,
                                'ladoEsquerdo',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent border-none focus:outline-hidden"
                          />
                          <button
                            disabled={readOnly}
                            onClick={() =>
                              handleUpdateCounts(entry.id, 'ladoEsquerdo', entry.ladoEsquerdo + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Lado Direito (D) */}
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Direito (D)
                        </label>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            disabled={readOnly || entry.ladoDireito <= 0}
                            onClick={() =>
                              handleUpdateCounts(entry.id, 'ladoDireito', entry.ladoDireito - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            disabled={readOnly}
                            value={entry.ladoDireito}
                            onChange={e =>
                              handleUpdateCounts(
                                entry.id,
                                'ladoDireito',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent border-none focus:outline-hidden"
                          />
                          <button
                            disabled={readOnly}
                            onClick={() =>
                              handleUpdateCounts(entry.id, 'ladoDireito', entry.ladoDireito + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Pareados (P) */}
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Pareados (P)
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">
                            máx {maxPossivelP}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            disabled={readOnly || entry.pareados <= 0}
                            onClick={() =>
                              handleUpdateCounts(entry.id, 'pareados', entry.pareados - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={maxPossivelP}
                            disabled={readOnly}
                            value={entry.pareados}
                            onChange={e =>
                              handleUpdateCounts(entry.id, 'pareados', parseInt(e.target.value) || 0)
                            }
                            className="w-12 text-center font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent border-none focus:outline-hidden"
                          />
                          <button
                            disabled={readOnly || entry.pareados >= maxPossivelP}
                            onClick={() =>
                              handleUpdateCounts(entry.id, 'pareados', entry.pareados + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Resultados Próprios Isolados deste Osso */}
                    <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                      <div className="border-r border-slate-100 dark:border-slate-800 pr-1">
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-bold block">
                          NMI
                        </span>
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {metricas.nmi}
                        </span>
                      </div>

                      <div className="border-r border-slate-100 dark:border-slate-800 pr-1">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">
                          MMT
                        </span>
                        <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                          {metricas.mmt}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-bold block">
                          NMPI
                        </span>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                            {metricas.nmpiPiso}
                          </span>
                          <span className="text-xs font-mono text-violet-500">
                            ({metricas.nmpiDecimal})
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          Vx: {metricas.vx} · IC: [{metricas.ic95.inferior}, {metricas.ic95.superior}]
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ABA / GAVETA INFERIOR FIXA DE SELEÇÃO DE OSSOS DO INVENTÁRIO */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${
          drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-46px)]'
        }`}
      >
        {/* Barra de título clicável da aba inferior */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="w-full h-[46px] px-6 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-bold tracking-wide">
              Ossos do Inventário Osteológico ({ossosInventario.length} identificados no conjunto)
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-normal">
              · Clique para {drawerOpen ? 'recolher' : 'expandir e selecionar'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-[11px] font-mono uppercase bg-slate-800 dark:bg-slate-900 px-2 py-0.5 rounded">
              {drawerOpen ? 'Recolher Painel' : 'Abrir Painel'}
            </span>
            {drawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Conteúdo Interno da Aba Inferior */}
        <div className="max-h-[360px] overflow-y-auto p-5 space-y-4">
          {/* Sub-abas dentro da gaveta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveDrawerTab('inventario')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeDrawerTab === 'inventario'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Ossos do Inventário ({ossosInventario.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('catalogo')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeDrawerTab === 'catalogo'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Catálogo Anatômico Completo ({OSSOS_BILATERAIS_PADRAO.length})
              </button>
            </div>

            {/* Inserção de Osso Livre/Personalizado */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome de outro osso..."
                value={customBoneName}
                onChange={e => setCustomBoneName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customBoneName.trim()) {
                    handleAddBone(customBoneName.trim());
                    setCustomBoneName('');
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500"
              />
              <button
                disabled={!customBoneName.trim()}
                onClick={() => {
                  if (customBoneName.trim()) {
                    handleAddBone(customBoneName.trim());
                    setCustomBoneName('');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Sub-Aba 1: Ossos Detectados no Inventário */}
          {activeDrawerTab === 'inventario' && (
            <div>
              {ossosInventario.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum osso marcado como Presente (P), Fragmentado (F) ou Incompleto (I) na aba
                  "Inventário Osteológico" ainda. Você pode alternar para a aba "Catálogo Anatômico"
                  ou digitar o nome de um osso para começar a quantificação.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {ossosInventario.map(osso => {
                    const jaAdicionado = entries.some(
                      e => (e.nomeOsso || '').toLowerCase() === osso.nome.toLowerCase()
                    );

                    return (
                      <button
                        key={`${osso.nome}-${osso.categoria}`}
                        onClick={() => handleAddBone(osso.nome, osso.sugeridoE, osso.sugeridoD)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between text-xs cursor-pointer ${
                          jaAdicionado
                            ? 'border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              {osso.categoria}
                            </span>
                            {jaAdicionado && (
                              <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            )}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white block font-mono">
                            {osso.nome}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>E: {osso.sugeridoE}</span>
                          <span>D: {osso.sugeridoD}</span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold">+ Usar</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-Aba 2: Catálogo Completo de Ossos Bilaterais */}
          {activeDrawerTab === 'catalogo' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filtrar catálogo (ex: Fêmur, Tíbia, Costela)..."
                  value={searchCatalog}
                  onChange={e => setSearchCatalog(e.target.value)}
                  className="w-full sm:w-72 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {filteredCatalog.map(item => {
                  const jaAdicionado = entries.some(
                    e => (e.nomeOsso || '').toLowerCase() === item.nome.toLowerCase()
                  );

                  return (
                    <button
                      key={item.nome}
                      onClick={() => handleAddBone(item.nome, 1, 1)}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between text-xs cursor-pointer ${
                        jaAdicionado
                          ? 'border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block mb-1">
                          {item.categoria}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white block font-mono">
                          {item.nome}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-sky-600 dark:text-sky-400 font-mono font-bold">
                        <span>+ Adicionar</span>
                        {jaAdicionado && <span>(ativo)</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
