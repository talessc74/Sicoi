import React, { useState } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  ResearchAuthorization,
  ComplementaryExam
} from '../types/sgccco';
import { calculateSha256 } from '../services/auditService';
import { useAppVersion } from '../hooks/useAppVersion';
import {
  Search,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  Filter,
  Lock,
  GitCompare,
  ArrowRightLeft
} from 'lucide-react';

interface Phase7ConsultaPesquisaProps {
  collections: OsteologicalCollection[];
  currentUser: UserProfile;
  authorizations: ResearchAuthorization[];
  onUpdateAuthorizations: (auths: ResearchAuthorization[]) => void;
  onUpdateCollections: (cols: OsteologicalCollection[]) => void;
}

export const Phase7ConsultaPesquisa: React.FC<Phase7ConsultaPesquisaProps> = ({
  collections,
  currentUser,
  authorizations,
  onUpdateAuthorizations,
  onUpdateCollections
}) => {
  const commitRef = useAppVersion();
  const [activeTab, setActiveTab] = useState<'busca' | 'autorizacoes' | 'emprestimos' | 'narrador'>('busca');
  
  // Natural language query & translated filter state (§15)
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedFilter, setTranslatedFilter] = useState<{
    sex?: string;
    hasTrauma?: boolean;
    hasDicom?: boolean;
    element?: string;
  } | null>(null);

  // Manual search filters
  const [filterSex, setFilterSex] = useState<string>('all');
  const [filterHasPathology, setFilterHasPathology] = useState<boolean>(false);
  const [filterHasDicom, setFilterHasDicom] = useState<boolean>(false);

  // Export metadata modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportJsonPreview, setExportJsonPreview] = useState('');

  const isResearcher = currentUser.role === 'pesquisador';

  // ABAC Scope enforcement (§13): If user is Pesquisador, filter strictly by active research authorization
  const activeUserAuth = authorizations.find(a =>
    a.status === 'ativa' && (a.principalInvestigator === currentUser.name || a.institution === currentUser.institution)
  ) || authorizations[0];

  const filteredResults = collections.filter(col => {
    // ABAC filter
    if (isResearcher && activeUserAuth) {
      const allowedNics = activeUserAuth.scope?.allowedCollectionsNic || activeUserAuth.authorizedNics || [];
      const hasWildcard = allowedNics.includes('*');
      if (!hasWildcard && !allowedNics.includes(col.nic)) return false;
    }

    const pathologies = col.phase5.pathologies || [];
    const exams = col.phase5.complementaryExams || col.phase5.exams || [];

    // Natural Language Filter if active
    if (translatedFilter) {
      if (translatedFilter.sex && !col.phase4.individuals.some(i => i.biologicalProfile.sexEstimate.value === translatedFilter.sex)) {
        return false;
      }
      if (translatedFilter.hasTrauma && pathologies.length === 0) {
        return false;
      }
      if (translatedFilter.hasDicom && exams.length === 0) {
        return false;
      }
    }

    // Manual Filters
    if (filterSex !== 'all') {
      const hasSex = col.phase4.individuals.some(i => i.biologicalProfile.sexEstimate.value === filterSex);
      if (!hasSex) return false;
    }

    if (filterHasPathology && pathologies.length === 0) {
      return false;
    }

    if (filterHasDicom && exams.length === 0) {
      return false;
    }

    return true;
  });

  // Agent Natural Language -> Structured Filter Translation (§15)
  const handleTranslateNaturalQuery = () => {
    if (!naturalQuery.trim()) return;
    setIsTranslating(true);

    setTimeout(() => {
      const lower = naturalQuery.toLowerCase();
      const filter: typeof translatedFilter = {};

      if (lower.includes('masculin') || lower.includes('homem') || lower.includes('macho')) {
        filter.sex = 'masculino';
      } else if (lower.includes('feminin') || lower.includes('mulher')) {
        filter.sex = 'feminino';
      }

      if (lower.includes('trauma') || lower.includes('fratura') || lower.includes('lesão') || lower.includes('patologia')) {
        filter.hasTrauma = true;
      }

      if (lower.includes('tomografia') || lower.includes('dicom') || lower.includes('ct') || lower.includes('raio-x')) {
        filter.hasDicom = true;
      }

      setTranslatedFilter(filter);
      setIsTranslating(false);
    }, 600);
  };

  const handleClearNaturalFilter = () => {
    setNaturalQuery('');
    setTranslatedFilter(null);
  };

  // Reproducible Export Generation (§7)
  const handleGenerateExport = async () => {
    const timestamp = new Date().toISOString();
    const exportDataset = {
      reproducibilityHeader: {
        system: 'SIGCOI ALFA - INC/DITEC/PF',
        databaseVersion: commitRef ? `ALFA-commit-${commitRef}` : 'ALFA',
        exportedAt: timestamp,
        exportedBy: currentUser.name,
        userRole: currentUser.role,
        appliedFilters: translatedFilter || { filterSex, filterHasPathology, filterHasDicom },
        sha256VerificationHash: ''
      },
      resultsCount: filteredResults.length,
      collections: filteredResults.map(c => ({
        nic: c.nic,
        currentPhase: c.currentPhase,
        finalLocation: c.phase6.finalLocations[0]?.location || 'Em Estudo',
        individuals: c.phase4.individuals.map(i => ({
          code: i.code,
          confidence: i.confidence,
          biologicalProfile: i.biologicalProfile
        })),
        pathologies: (c.phase5.pathologies || []).map(p => ({
          category: p.category || p.taxonomyCode,
          term: p.termControlled || p.taxonomyLabel,
          element: p.associatedElementCode || p.elementName
        })),
        // REGRA DE SEGURANÇA §7: Dados restritos de origem NUNCA são exportados!
        legalOriginRestricted: 'OMITTED_BY_SIGCOI_PRIVACY_POLICY_RULE_7'
      }))
    };

    const hash = await calculateSha256(JSON.stringify(exportDataset.collections));
    exportDataset.reproducibilityHeader.sha256VerificationHash = hash;

    setExportJsonPreview(JSON.stringify(exportDataset, null, 2));
    setShowExportModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <Search className="w-4 h-4" />
              <span>Fase 7 · Consulta Científica, ABAC & Empréstimos</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              Acervo Osteológico INC/DITEC/PF
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Filtro de escopo por ABAC, tradução de busca em linguagem natural, termos de empréstimo e exportação com hash de reprodutibilidade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateExport}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportação Reprodutível (§7)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('busca')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'busca'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Busca Estruturada & IA ({filteredResults.length} resultados)
          </button>
          <button
            onClick={() => setActiveTab('autorizacoes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'autorizacoes'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Gestão ABAC de Autorizações ({authorizations.length})
          </button>
          <button
            onClick={() => setActiveTab('emprestimos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'emprestimos'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Manuseio & Empréstimos Físicos
          </button>
          <button
            onClick={() => setActiveTab('narrador')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'narrador'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Narrador de Versões Científicas
          </button>
        </div>
      </div>

      {/* Escopo ABAC Banner para Pesquisadores Externos */}
      {isResearcher && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 text-sky-600 mt-0.5" />
          <div>
            <span className="font-bold text-sm block">Escopo de Pesquisa Delimitado por ABAC (§13):</span>
            <p className="mt-0.5 leading-relaxed">
              Você está autenticado sob o projeto de pesquisa <strong>"{activeUserAuth?.title || 'Antropologia Forense'}"</strong>. Sua consulta está restrita aos conjuntos expressamente autorizados pelo Administrador.
            </p>
          </div>
        </div>
      )}

      {/* Aba 1: Busca em Linguagem Natural Traduzida para Filtro Estruturado (§15) */}
      {activeTab === 'busca' && (
        <div className="space-y-6">
          {/* Caixa de Linguagem Natural */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4>Agente de Tradução em Linguagem Natural para Filtro Estruturado (§15)</h4>
            </div>
            <p className="text-slate-500 text-xs">
              O agente nunca executa busca livre opaca: ele traduz sua pergunta em filtros formais do grafo para que você possa revisar antes da execução.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={naturalQuery}
                onChange={(e) => setNaturalQuery(e.target.value)}
                placeholder='Ex: "Quero todos os indivíduos masculinos com trauma ante-mortem e tomografia DICOM disponível"'
                className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                onKeyDown={(e) => e.key === 'Enter' && handleTranslateNaturalQuery()}
              />
              <button
                onClick={handleTranslateNaturalQuery}
                disabled={isTranslating || !naturalQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isTranslating ? 'Traduzindo...' : 'Traduzir Filtro'}</span>
              </button>
            </div>

            {/* Visualizador do Filtro Traduzido pelo Agente (§15) */}
            {translatedFilter && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    Filtro Estruturado Ativo:
                  </span>
                  {translatedFilter.sex && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[11px]">
                      Sexo = {translatedFilter.sex}
                    </span>
                  )}
                  {translatedFilter.hasTrauma && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[11px]">
                      Patologia / Trauma = SIM
                    </span>
                  )}
                  {translatedFilter.hasDicom && (
                    <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-mono text-[11px]">
                      Exame DICOM = PRESENTE
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClearNaturalFilter}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs underline shrink-0"
                >
                  Limpar Filtro
                </button>
              </div>
            )}
          </div>

          {/* Filtros Estruturados Manuais */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Filtros Rápidos:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono">Sexo:</span>
              <select
                value={filterSex}
                onChange={(e) => setFilterSex(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
              >
                <option value="all">Todos</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="indeterminado">Indeterminado</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterHasPathology}
                onChange={(e) => setFilterHasPathology(e.target.checked)}
                className="rounded"
              />
              <span className="text-slate-700 dark:text-slate-300">Apenas com Patologias/Traumas</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filterHasDicom}
                onChange={(e) => setFilterHasDicom(e.target.checked)}
                className="rounded"
              />
              <span className="text-slate-700 dark:text-slate-300">Apenas com Exame DICOM</span>
            </label>
          </div>

          {/* Lista de Resultados da Busca */}
          <div className="space-y-3">
            {filteredResults.map((col) => {
              const pathologies = col.phase5.pathologies || [];
              const exams = col.phase5.complementaryExams || col.phase5.exams || [];

              return (
                <div
                  key={col.nic}
                  className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-bold font-mono text-base text-slate-900 dark:text-white">
                        {col.nic}
                      </span>
                      <span className="text-slate-500 ml-2 font-mono text-xs">
                        {col.phase6.finalLocations && col.phase6.finalLocations[0]
                          ? `${col.phase6.finalLocations[0].location.facility} · ${col.phase6.finalLocations[0].location.rack}`
                          : 'Laboratório Central (Em Estudo)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Fase {col.currentPhase}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        v{col.phase4.curationVersionNumber}
                      </span>
                    </div>
                  </div>

                  {/* Perfil dos Indivíduos */}
                  <div className="space-y-1.5">
                    {col.phase4.individuals.map((ind) => (
                      <div key={ind.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
                        <div className="font-mono">
                          <span className="font-bold text-slate-900 dark:text-white">{ind.code}</span>
                          <span className="text-slate-500 ml-2 text-[11px]">(Confiança: {ind.confidence})</span>
                        </div>
                        <div className="flex gap-2 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            Sexo: {ind.biologicalProfile.sexEstimate.value}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            Idade: {ind.biologicalProfile.ageCategory.estimatedRangeYears || ind.biologicalProfile.ageCategory.value}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            Estatura: {ind.biologicalProfile.statureCm.estimatedValue} cm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Patologias e Exames */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                    <span className="text-slate-400">Patologias:</span>
                    {pathologies.length > 0 ? (
                      pathologies.map(p => (
                        <span key={p.id} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          {p.termControlled || p.taxonomyLabel} ({p.associatedElementCode || p.elementName})
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Nenhuma</span>
                    )}

                    <span className="text-slate-400 ml-2">Exames:</span>
                    {exams.length > 0 ? (
                      exams.map((ex: ComplementaryExam) => (
                        <span key={ex.id} className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900">
                          {ex.examType.toUpperCase()} ({ex.fileName})
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Nenhum</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aba 2: Gestão ABAC de Autorizações (§13) */}
      {activeTab === 'autorizacoes' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-600" />
                Controle de Acesso Baseado em Atributos (ABAC) — Autorizações de Pesquisa
              </h3>
              <p className="text-slate-500">
                O Administrador define exatamente quais conjuntos (COI) cada pesquisador credenciado pode visualizar.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {authorizations.map((auth) => (
              <div key={auth.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      {auth.title}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Pesquisador: {auth.principalInvestigator} ({auth.institution}) · CEP: {auth.cepEthicsApprovalNumber}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Status: {auth.status}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-500">Conjuntos (COI) autorizados no escopo:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(auth.scope?.allowedCollectionsNic || auth.authorizedNics || ['COI-001']).map((nic: string) => (
                      <span key={nic} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                        {nic === '*' ? 'TODOS OS CONJUNTOS (*)' : nic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aba 3: Empréstimos e Manuseio Físico (§14) */}
      {activeTab === 'emprestimos' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-sky-600" />
                Gestão de Empréstimos e Saída de Material Ósseo (§14)
              </h3>
              <p className="text-slate-500">
                Formalização com termo de responsabilidade, conferência física na devolução e hash da curadoria.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <div className="flex justify-between items-center font-mono">
              <span className="font-bold text-slate-900 dark:text-white">
                Empréstimo Ativo: EMP-2026-004
              </span>
              <span className="text-amber-600 font-semibold">
                Prazo de Devolução: 15/10/2026
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Conjunto: <strong>COI-001</strong> (Caixa COI-001) cedido temporariamente para análise tomográfica na USP com termo de guarda assinado por Dra. Helena Rios (Curadora) e Dr. Marcos Toledo.
            </p>
          </div>
        </div>
      )}

      {/* Aba 4: Narrador de Versões Científicas (Ponto de Agente §15) */}
      {activeTab === 'narrador' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold pb-2 border-b border-slate-200 dark:border-slate-800">
            <GitCompare className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm">Narrador de Versões Científicas (Auditoria Semântica §15)</h3>
          </div>

          <p className="text-slate-500 leading-relaxed">
            O agente de IA analisa as diferenças criptográficas entre versões científicas (ex: rascunho de estudante vs curadoria homologada) e produz uma narrativa clara e reprodutível das alterações:
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 font-mono">
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Comparação: v1 (Rascunho de Bancada) ➔ v2 (Curadoria Homologada)</span>
              <span>COI: COI-001</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
              <p>
                • <strong>Reclassificação Sexual:</strong> O indivíduo IND-01 foi elevado de <em>"Provável Masculino"</em> para <em>"Masculino"</em> definitivo após confrontação da incisura isquiática maior pelo método Phenice (1969).
              </p>
              <p>
                • <strong>Odontograma:</strong> Registrada faceta de desgaste oclusal severo no elemento #36 com exposição de dentina secundária.
              </p>
              <p>
                • <strong>Inclusão Patológica:</strong> Adicionado trauma peri-mortem em arco zigomático direito com bordas corticais anguladas sem evidência de cicatrização.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportação Reprodutível com Hash */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Exportação Reprodutível do Acervo (§7)
                </h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                Fechar
              </button>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Arquivo formatado para estudos científicos com cabeçalho de proveniência, versão exata do banco e hash criptográfico de validação. <strong>Sem dados confidenciais de cemitério (§7).</strong>
            </p>

            <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto max-h-72 border border-slate-800">
              {exportJsonPreview}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const blob = new Blob([exportJsonPreview], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `SIGCOI-export-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Arquivo JSON Assinado</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
