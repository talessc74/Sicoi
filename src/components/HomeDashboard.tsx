import React from 'react';
import { OsteologicalCollection, UserProfile } from '../types/sgccco';
import { getRoleTheme } from '../utils/roleTheme';
import {
  FolderOpen,
  Users,
  Box,
  Warehouse,
  ShieldCheck,
  ArrowRight,
  Plus,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface HomeDashboardProps {
  collections: OsteologicalCollection[];
  currentUser: UserProfile;
  onSelectNic: (nic: string) => void;
  onNavigateToPhase: (phase: number) => void;
  onNavigateToTab: (tab: string) => void;
  onCreateNewNic: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  collections,
  currentUser,
  onSelectNic,
  onNavigateToPhase,
  onNavigateToTab,
  onCreateNewNic
}) => {
  // Aggregate statistics
  const totalCollections = collections.length;
  const totalBoxes = collections.reduce((acc, c) => acc + c.phase1.preliminaryBoxes.length, 0);
  const totalIndividuals = collections.reduce((acc, c) => acc + c.phase4.individuals.length, 0);
  const collectionsInDefinitiveStorage = collections.filter(c => c.currentPhase >= 6 && c.phase6.finalLocations.length > 0).length;
  // "Catalogado" = passou pela assinatura da Fase 6 e chegou na Fase 7 — ou seja, as 6
  // fases com travamento sequencial (§6/§14) estão todas concluídas e assinadas. Antes
  // disso mostrava sempre "100% catalogados" fixo no texto, independente do estado real
  // dos conjuntos — dava a impressão de que tudo já tinha sido concluído.
  const fullyCatalogedCount = collections.filter(c => c.currentPhase >= 7).length;
  const catalogedPercent = totalCollections > 0 ? Math.round((fullyCatalogedCount / totalCollections) * 100) : 0;

  const phaseCounts = [1, 2, 3, 4, 5, 6, 7].map(ph => ({
    phase: ph,
    count: collections.filter(c => c.currentPhase === ph).length
  }));

  const phaseNames: Record<number, string> = {
    1: 'Recebimento & Triagem',
    2: 'Limpeza & Secagem',
    3: 'Acondicionamento Provisório',
    4: 'Curadoria Científica & NMI',
    5: 'Patologias & Marcação',
    6: 'Galpão Definitivo & QR',
    7: 'Consulta & Pesquisa'
  };

  const roleTheme = getRoleTheme(currentUser.role);
  const RoleIcon = roleTheme.icon;

  return (
    <div className="space-y-5">
      {/* Hero Welcome Banner — borda superior na cor do papel ativo (§ identidade visual) */}
      <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 border-t-4 relative overflow-hidden ${roleTheme.borderOnDark}`}>
        <div className="relative z-10 max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>INC/DITEC/PF · Coleção Osteológica Identificada (COI)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            Sistema de Gestão da Coleção Osteológica Identificada (SIGCOI)
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-sans whitespace-nowrap overflow-x-auto flex items-center gap-1.5">
            <span>Bem-vindo(a), <strong>{currentUser.name}</strong></span>
            <span className={`inline-flex items-center gap-1 font-semibold ${roleTheme.onDark}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              ({roleTheme.label.toUpperCase()})
            </span>
          </p>

          {/* Quick Action Buttons */}
          <div className="pt-1.5 flex flex-wrap items-center gap-3 text-xs">
            <button
              onClick={() => onNavigateToTab('fases')}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <span>Acessar Fluxo Operacional (Fases)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateToTab('documentos')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2 border border-white/20 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Consultar Manual Normativo & POP</span>
            </button>

            <button
              onClick={onCreateNewNic}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2 border border-white/20 transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Novo Conjunto (NIC)</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid Graphic in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-mono">Total de Conjuntos</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalCollections} <span className="text-xs font-normal text-slate-400">NICs</span>
            </div>
            <span
              className={`text-[11px] font-medium ${catalogedPercent === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
              title={`${fullyCatalogedCount} de ${totalCollections} conjuntos com as 6 fases seladas (assinadas) concluídas`}
            >
              {catalogedPercent}% catalogados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <FolderOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-mono">Indivíduos (NMI)</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalIndividuals} <span className="text-xs font-normal text-slate-400">segregados</span>
            </div>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">Pareamento biológico</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-mono">Caixas em Custódia</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalBoxes} <span className="text-xs font-normal text-slate-400">unidades</span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Com QR Code individual</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Box className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-mono">Galpão Definitivo</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {collectionsInDefinitiveStorage} / {totalCollections}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Aceite duplo assinado</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pipeline Status Breakdown (§1 a §14) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Distribuição de Conjuntos por Fase Sequencial (§14)
            </h3>
            <p className="text-xs text-slate-500">
              Avanço estritamente linear com bloqueio criptográfico por fase.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('fases')}
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
          >
            Abrir fluxo completo →
          </button>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="grid grid-cols-7 gap-2.5 min-w-[900px]">
            {phaseCounts.map(({ phase, count }) => {
              // A Fase 7 é consulta de conjuntos já concluídos, não uma fila pendente.
              const hasPending = count > 0 && phase < 7;
              return (
                <button
                  type="button"
                  key={phase}
                  onClick={() => {
                    onNavigateToPhase(phase);
                    onNavigateToTab('fases');
                  }}
                  aria-label={`Fase ${phase}: ${count} ${count === 1 ? 'NIC' : 'NICs'} · ${phaseNames[phase]}`}
                  className={`p-3 rounded-xl border text-left transition-colors space-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                    hasPending
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 hover:border-amber-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono font-bold uppercase ${hasPending ? 'text-amber-800 dark:text-amber-300' : 'text-slate-400'}`}>
                      Fase {phase}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${hasPending ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  </div>
                  <div className={`text-base font-bold font-mono ${hasPending ? 'text-slate-900 dark:text-amber-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {count} {count === 1 ? 'NIC' : 'NICs'}
                  </div>
                  <div className={`text-[10px] truncate ${hasPending ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} title={phaseNames[phase]}>
                    {phaseNames[phase]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Collections Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono">
              Acervo Cadastrado — Conjuntos Osteológicos em Custódia
            </h3>
            <p className="text-xs text-slate-500">
              Clique em um conjunto para visualizar seu dossiê operacional ou saltar diretamente para sua fase atual.
            </p>
          </div>
          <button
            onClick={onCreateNewNic}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar NIC</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">NIC Oficial</th>
                <th className="px-5 py-3 font-semibold">Fase Atual</th>
                <th className="px-5 py-3 font-semibold">Indivíduos (NMI)</th>
                <th className="px-5 py-3 font-semibold">Caixas</th>
                <th className="px-5 py-3 font-semibold">Localização Atual</th>
                <th className="px-5 py-3 font-semibold">Status de Assinatura</th>
                <th className="px-5 py-3 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {collections.map(col => {
                const currentSigned = col.signatures.some(s => s.phaseNumber === col.currentPhase && s.status === 'locked');
                const nmiNotDetermined = col.phase4.individuals.length === 0;
                const locationText = col.phase6.finalLocations[0]
                  ? `${col.phase6.finalLocations[0].location.facility} · ${col.phase6.finalLocations[0].location.rack}`
                  : col.phase3.boxLocations[0]
                  ? `Laboratório · ${col.phase3.boxLocations[0].location.rack}`
                  : 'Bancada Inicial';

                return (
                  <tr
                    key={col.nic}
                    onClick={() => {
                      onSelectNic(col.nic);
                      onNavigateToPhase(col.currentPhase);
                      onNavigateToTab('fases');
                    }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {col.nic}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                        Fase {col.currentPhase} · {phaseNames[col.currentPhase].split('&')[0]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {!nmiNotDetermined ? (
                        <>{col.phase4.individuals.length} {col.phase4.individuals.length === 1 ? 'indivíduo (NMI)' : 'indivíduos (NMI)'}</>
                      ) : (
                        // Sem curadoria concluída, o número de caixas não informa o NMI.
                        <span className="text-slate-400" title="Fase 4 (Curadoria) ainda não realizada — nenhum indivíduo confirmado">
                          Não determinado
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {col.phase1.preliminaryBoxes.length} {col.phase1.preliminaryBoxes.length === 1 ? 'caixa' : 'caixas'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {locationText}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-start gap-1.5">
                        {currentSigned ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Assinada & Travada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" /> Em edição técnica
                          </span>
                        )}
                        {nmiNotDetermined && (
                          <span className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            Pendente: NMI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNic(col.nic);
                            onNavigateToTab('auditoria');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 font-mono text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title="Ver Linha do Tempo de Auditoria deste NIC"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Auditoria</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNic(col.nic);
                            onNavigateToPhase(col.currentPhase);
                            onNavigateToTab('fases');
                          }}
                          className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 font-mono text-xs font-semibold text-white dark:text-slate-950 transition-colors"
                        >
                          Abrir →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
