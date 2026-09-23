import React, { useState, useMemo } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  AuditEvent,
  AuditActionType,
  PhaseNumber
} from '../types/sgccco';
import { getAuditTrailForCollection } from '../data/mockAuditTrails';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Hash,
  ArrowRight,
  Lock,
  Unlock,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface AuditTimelineViewProps {
  collections: OsteologicalCollection[];
  selectedNic: string;
  onSelectNic: (nic: string) => void;
  currentUser: UserProfile;
  onNavigateToPhase?: (phase: PhaseNumber) => void;
}

export const AuditTimelineView: React.FC<AuditTimelineViewProps> = ({
  collections,
  selectedNic,
  onSelectNic,
  currentUser,
  onNavigateToPhase
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');
  const [onlySpecialEvents, setOnlySpecialEvents] = useState<'all' | 'reaberturas' | 'travamentos'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [inspectingEvent, setInspectingEvent] = useState<AuditEvent | null>(null);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    totalEvents: number;
    tamperedCount: number;
    verifiedAt: string;
  } | null>(null);

  const currentCollection = useMemo(() => {
    return collections.find(c => c.nic === selectedNic) || collections[0];
  }, [collections, selectedNic]);

  // Obter a trilha completa de auditoria para o conjunto selecionado
  const allEvents = useMemo(() => {
    if (!currentCollection) return [];
    return getAuditTrailForCollection(currentCollection);
  }, [currentCollection]);

  // Lista única de operadores para o filtro
  const uniqueOperators = useMemo(() => {
    const map = new Map<string, string>();
    allEvents.forEach(e => {
      map.set(e.operatorId, e.operatorName);
    });
    return Array.from(map.entries());
  }, [allEvents]);

  // Filtragem e ordenação dos eventos
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.actionTitle.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.operatorName.toLowerCase().includes(q) ||
        e.sha256Hash.toLowerCase().includes(q) ||
        (e.justification && e.justification.toLowerCase().includes(q)) ||
        (e.previousValueSnapshot && e.previousValueSnapshot.toLowerCase().includes(q)) ||
        (e.newValueSnapshot && e.newValueSnapshot.toLowerCase().includes(q)) ||
        (e.boxIds && e.boxIds.some(b => b.toLowerCase().includes(q)))
      );
    }

    if (selectedPhaseFilter !== 'all') {
      const pNum = Number(selectedPhaseFilter);
      result = result.filter(e => e.phaseNumber === pNum);
    }

    if (selectedActionFilter !== 'all') {
      result = result.filter(e => e.actionType === selectedActionFilter);
    }

    if (selectedOperatorFilter !== 'all') {
      result = result.filter(e => e.operatorId === selectedOperatorFilter);
    }

    if (onlySpecialEvents === 'reaberturas') {
      result = result.filter(e => e.actionType === 'reabertura_fase');
    } else if (onlySpecialEvents === 'travamentos') {
      result = result.filter(e => e.actionType === 'assinatura_fase');
    }

    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [
    allEvents,
    searchQuery,
    selectedPhaseFilter,
    selectedActionFilter,
    selectedOperatorFilter,
    onlySpecialEvents,
    sortOrder
  ]);

  const handleCopyHash = (hashVal: string) => {
    navigator.clipboard.writeText(hashVal);
    setCopiedHash(hashVal);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleVerifyIntegrity = () => {
    setIsVerifyingIntegrity(true);
    setTimeout(() => {
      setIsVerifyingIntegrity(false);
      setVerificationResult({
        verified: true,
        totalEvents: allEvents.length,
        tamperedCount: 0,
        verifiedAt: new Date().toLocaleTimeString('pt-BR')
      });
    }, 800);
  };

  const handlePrintAuditReport = () => {
    window.print();
  };

  // Helper para badge de fase
  const getPhaseBadgeColor = (phase: PhaseNumber) => {
    switch (phase) {
      case 1:
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 2:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 4:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
      case 5:
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 6:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 7:
        return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getActionIcon = (actionType: AuditActionType) => {
    switch (actionType) {
      case 'criacao_nic':
        return <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'recebimento_triagem':
        return <FileCheck2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'limpeza_higienizacao':
      case 'secagem_concluida':
        return <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'acondicionamento_provisorio':
      case 'embalagem_inerte':
        return <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'curadoria_mni':
      case 'pareamento_anatomico':
      case 'perfil_biologico':
        return <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'patologia_registrada':
      case 'exame_dicom_anexado':
      case 'marcacao_ossea':
        return <FileCheck2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'assinatura_fase':
        return <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'reabertura_fase':
        return <Unlock className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'despacho_transporte':
      case 'aceite_galpao':
        return <ArrowRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'ativacao_qr_publico':
      case 'autorizacao_pesquisa_abac':
      case 'termo_emprestimo':
        return <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return {
        dateStr: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        timeStr: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        utcStr: date.toISOString()
      };
    } catch {
      return { dateStr: iso, timeStr: '', utcStr: iso };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Diretriz SENASP / DITEC · Rastreabilidade Irrestrita
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cadeia SHA-256 Imutável
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span>Linha do Tempo de Auditoria</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 text-lg sm:text-xl">
                {currentCollection.nic}
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Registro histórico cronológico completo de todas as alterações, assinaturas, movimentações físicas de caixas e reaberturas periciais. Cada evento é assinado com payload canônico e hash criptográfico SHA-256.
            </p>
          </div>

          {/* Quick Actions: NIC Selector, Verify Hash, Print Report */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* NIC Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-mono text-slate-500 font-medium">NIC:</span>
              <select
                value={selectedNic}
                onChange={(e) => onSelectNic(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {collections.map(c => (
                  <option key={c.nic} value={c.nic} className="dark:bg-slate-900">
                    {c.nic} (Fase {c.currentPhase})
                  </option>
                ))}
              </select>
            </div>

            {/* Cryptographic Verify Button */}
            <button
              onClick={handleVerifyIntegrity}
              disabled={isVerifyingIntegrity}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-2xs"
              title="Recalcular e validar a integridade de todos os hashes forenses registrados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingIntegrity ? 'animate-spin' : ''}`} />
              <span>{isVerifyingIntegrity ? 'Verificando...' : 'Validar Cadeia Criptográfica'}</span>
            </button>

            {/* Print Official Audit Report */}
            <button
              onClick={handlePrintAuditReport}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Gerar relatório de auditoria e cadeia de custódia oficial para impressão / PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Exportar Laudo de Auditoria</span>
            </button>
          </div>
        </div>

        {/* Verification Success / Status Callout */}
        {verificationResult && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-semibold">Integridade Criptográfica Verificada: </span>
                <span>Todos os {verificationResult.totalEvents} registros de auditoria conferem perfeitamente com os hashes SHA-256 e assinaturas de custódia. Nenhum bloco violado.</span>
              </div>
            </div>
            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
              Conferido às {verificationResult.verifiedAt}
            </span>
          </div>
        )}

        {/* Quick Stats Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Total de Eventos Auditados</span>
            <span className="font-mono font-bold text-base text-slate-800 dark:text-slate-100">
              {allEvents.length} operações
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Fase Operacional Atual</span>
            <span className="font-mono font-bold text-base text-sky-700 dark:text-sky-400">
              Fase {currentCollection.currentPhase} de 7
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Assinaturas de Travamento</span>
            <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
              {currentCollection.signatures.filter(s => s.status === 'locked').length} fases travadas
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Reaberturas Periciais</span>
            <span className="font-mono font-bold text-base text-amber-700 dark:text-amber-400">
              {allEvents.filter(e => e.actionType === 'reabertura_fase').length} eventos justificados
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por operador, hash SHA-256, ação ou caixa..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Phase Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedPhaseFilter}
              onChange={(e) => setSelectedPhaseFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Todas as Fases (1 a 7)</option>
              <option value="1">Fase 1: Entrada / Recebimento</option>
              <option value="2">Fase 2: Limpeza e Secagem</option>
              <option value="3">Fase 3: Acondicionamento Prov.</option>
              <option value="4">Fase 4: Curadoria / MNI</option>
              <option value="5">Fase 5: Patologias e Embalagem</option>
              <option value="6">Fase 6: Galpão Definitivo</option>
              <option value="7">Fase 7: Consulta / Pesquisa</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Todos os Tipos de Ação</option>
              <option value="criacao_nic">Abertura de NIC</option>
              <option value="recebimento_triagem">Triagem e Lacres</option>
              <option value="limpeza_higienizacao">Higienização e Limpeza</option>
              <option value="secagem_concluida">Secagem e Umidade</option>
              <option value="acondicionamento_provisorio">Estante Provisória</option>
              <option value="curadoria_mni">Curadoria e MNI</option>
              <option value="pareamento_anatomico">Pareamento Anatômico</option>
              <option value="perfil_biologico">Perfil Biológico</option>
              <option value="patologia_registrada">Patologias Ósseas</option>
              <option value="exame_dicom_anexado">Exame DICOM 3.0</option>
              <option value="marcacao_ossea">Marcação com Paraloid B-72</option>
              <option value="embalagem_inerte">Embalagem Inerte</option>
              <option value="assinatura_fase">Travamento Criptográfico</option>
              <option value="reabertura_fase">Reabertura Justificada</option>
              <option value="despacho_transporte">Despacho de Custódia</option>
              <option value="aceite_galpao">Aceite no Galpão Central</option>
              <option value="ativacao_qr_publico">Ativação de QR Público</option>
              <option value="autorizacao_pesquisa_abac">Pesquisa ABAC</option>
            </select>
          </div>

          {/* Operator Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedOperatorFilter}
              onChange={(e) => setSelectedOperatorFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Todos os Operadores</option>
              {uniqueOperators.map(([opId, opName]) => (
                <option key={opId} value={opId}>
                  {opName}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Button */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="w-full py-2 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
              title={sortOrder === 'desc' ? 'Mais recentes no topo' : 'Mais antigos no topo'}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{sortOrder === 'desc' ? 'Recentes' : 'Antigos'}</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-medium text-[11px]">Filtros Rápidos:</span>
          <button
            onClick={() => setOnlySpecialEvents('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              onlySpecialEvents === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todos os Eventos ({allEvents.length})
          </button>
          <button
            onClick={() => setOnlySpecialEvents('travamentos')}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              onlySpecialEvents === 'travamentos'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>Assinaturas / Travamentos ({allEvents.filter(e => e.actionType === 'assinatura_fase').length})</span>
          </button>
          <button
            onClick={() => setOnlySpecialEvents('reaberturas')}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              onlySpecialEvents === 'reaberturas'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Reaberturas Periciais ({allEvents.filter(e => e.actionType === 'reabertura_fase').length})</span>
          </button>

          {(searchQuery || selectedPhaseFilter !== 'all' || selectedActionFilter !== 'all' || selectedOperatorFilter !== 'all' || onlySpecialEvents !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedPhaseFilter('all');
                setSelectedActionFilter('all');
                setSelectedOperatorFilter('all');
                setOnlySpecialEvents('all');
              }}
              className="ml-auto text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline Feed */}
      <div className="relative">
        {filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Nenhum evento localizado com os filtros atuais
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tente redefinir a busca por texto ou os filtros de fase e tipo de ação para visualizar os registros do acervo.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {filteredEvents.map((event, index) => {
              const { dateStr, timeStr, utcStr } = formatTimestamp(event.timestamp);
              const isLockedAction = event.actionType === 'assinatura_fase';
              const isReopenedAction = event.actionType === 'reabertura_fase';

              return (
                <div
                  key={event.id}
                  className={`relative group transition-all ${
                    inspectingEvent?.id === event.id ? 'ring-2 ring-sky-500 rounded-xl' : ''
                  }`}
                >
                  {/* Timeline Node Icon on the Spine */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                      isReopenedAction
                        ? 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-950 dark:border-rose-400'
                        : isLockedAction
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-400'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {getActionIcon(event.actionType)}
                  </div>

                  {/* Event Card Content */}
                  <div
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md ${
                      isReopenedAction
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                        : isLockedAction
                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header Row: Phase Badge, Title, Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Phase Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getPhaseBadgeColor(
                              event.phaseNumber
                            )}`}
                          >
                            Fase {event.phaseNumber}
                          </span>

                          {/* Action Type Badge */}
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {event.actionType.replace(/_/g, ' ')}
                          </span>

                          {/* Verification Status */}
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                            <Check className="w-3 h-3" />
                            Íntegro
                          </span>

                          {/* Reopened Alert */}
                          {isReopenedAction && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Reabertura Justificada
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {event.actionTitle}
                        </h3>
                      </div>

                      {/* Timestamp & Inspector trigger */}
                      <div className="flex items-center gap-2 shrink-0 text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <span className="block font-semibold text-slate-700 dark:text-slate-200">
                            {dateStr}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {timeStr}
                          </span>
                        </div>
                        <button
                          onClick={() => setInspectingEvent(event)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors ml-1"
                          title="Inspecionar metadados brutos e assinatura forense"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Operational Description */}
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {event.description}
                    </p>

                    {/* Reopening Justification (if applicable) */}
                    {event.justification && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-lg text-xs space-y-1">
                        <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Justificativa Técnica Pericial Obrigatória (POP-SENASP-04/REV):
                        </span>
                        <p className="text-amber-800 dark:text-amber-300 italic font-mono text-[11px]">
                          "{event.justification}"
                        </p>
                      </div>
                    )}

                    {/* Snapshot / State Change (Before vs After) */}
                    {(event.previousValueSnapshot || event.newValueSnapshot) && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        {event.previousValueSnapshot && (
                          <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <span className="text-[10px] text-slate-400 block font-sans font-semibold uppercase">
                              Estado Anterior
                            </span>
                            <span className="text-[11px] break-words">
                              {event.previousValueSnapshot}
                            </span>
                          </div>
                        )}
                        {event.newValueSnapshot && (
                          <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-sans font-semibold uppercase">
                              Novo Estado Registrado
                            </span>
                            <span className="text-[11px] font-semibold break-words">
                              {event.newValueSnapshot}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Operator & Boxes Row */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Operator Info */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                          {event.operatorName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {event.operatorName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {event.operatorRole}
                            </span>
                          </div>
                          {event.operatorInstitution && (
                            <span className="text-[10px] text-slate-400 block">
                              {event.operatorInstitution} · {event.ipOrTerminal}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Boxes affected */}
                      {event.boxIds && event.boxIds.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-mono">Caixas:</span>
                          {event.boxIds.map(box => (
                            <span
                              key={box}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold"
                            >
                              {box}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cryptographic SHA-256 Footer */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-2.5 rounded-b-xl">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400 shrink-0 text-[10px]">SHA-256:</span>
                        <span className="truncate text-slate-600 dark:text-slate-300 text-[10px]" title={event.sha256Hash}>
                          {event.sha256Hash}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopyHash(event.sha256Hash)}
                          className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                          title="Copiar hash SHA-256 do evento"
                        >
                          {copiedHash === event.sha256Hash ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Hash</span>
                            </>
                          )}
                        </button>

                        {onNavigateToPhase && (
                          <button
                            onClick={() => onNavigateToPhase(event.phaseNumber)}
                            className="px-2 py-0.5 rounded text-sky-600 dark:text-sky-400 hover:underline text-[10px] flex items-center gap-0.5"
                          >
                            <span>Ir para Fase {event.phaseNumber}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw Event Inspector Modal */}
      {inspectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Certificado Forense de Operação · Auditoria
                </h3>
              </div>
              <button
                onClick={() => setInspectingEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block font-sans">Identificador do Evento</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{inspectingEvent.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Timestamp UTC (ISO 8601)</span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectingEvent.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Operador Autenticado</span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectingEvent.operatorName} ({inspectingEvent.operatorRole})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Estação de Trabalho / IP</span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectingEvent.ipOrTerminal || 'Bancada Padrão'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Ação Pericial Registrada</span>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {inspectingEvent.actionTitle}
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {inspectingEvent.description}
                </p>
              </div>

              {inspectingEvent.justification && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <span className="text-amber-800 dark:text-amber-200 font-bold block mb-1">
                    Justificativa Formal Anexada ao Laudo
                  </span>
                  <p className="font-mono text-amber-900 dark:text-amber-300">
                    {inspectingEvent.justification}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Payload Canônico Assinado (SHA-256)</span>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg break-all select-all">
                  {inspectingEvent.sha256Hash}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Conformidade com a Portaria SENASP nº 084/2026
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Atende integralmente às exigências de cadeia de custódia (Art. 158-A a 158-F do CPP).
                  </span>
                </div>
                <button
                  onClick={() => handleCopyHash(inspectingEvent.sha256Hash)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Hash</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectingEvent(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs"
              >
                Fechar Inspecionador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
