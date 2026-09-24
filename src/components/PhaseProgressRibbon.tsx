import React from 'react';
import { OsteologicalCollection, PhaseNumber, UserRole } from '../types/sgccco';
import { getLatestPhaseSignature } from '../utils/signatures';
import { Lock, Unlock, CheckCircle2, AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';

interface PhaseProgressRibbonProps {
  collection: OsteologicalCollection;
  activePhase: PhaseNumber;
  onSelectPhase: (phase: PhaseNumber) => void;
  currentUserRole: UserRole;
  onReopenPhase: (phase: PhaseNumber, justification: string) => void;
  onNavigateToAudit?: () => void;
}

export const PhaseProgressRibbon: React.FC<PhaseProgressRibbonProps> = ({
  collection,
  activePhase,
  onSelectPhase,
  currentUserRole,
  onReopenPhase,
  onNavigateToAudit
}) => {
  const [reopenModalPhase, setReopenModalPhase] = React.useState<PhaseNumber | null>(null);
  const [justification, setJustification] = React.useState('');

  const phasesInfo: { number: PhaseNumber; title: string; subtitle: string; signerRole: string }[] = [
    { number: 1, title: 'Fase 1', subtitle: 'Recebimento & A.1', signerRole: 'Técnico' },
    { number: 2, title: 'Fase 2', subtitle: 'Limpeza & Secagem A.2', signerRole: 'Técnico' },
    { number: 3, title: 'Fase 3', subtitle: 'Acondic. Provisório', signerRole: 'Técnico' },
    { number: 4, title: 'Fase 4', subtitle: 'Curadoria & Perfil', signerRole: 'Curador' },
    { number: 5, title: 'Fase 5', subtitle: 'Patologias & Exames', signerRole: 'Curador / Técnico' },
    { number: 6, title: 'Fase 6', subtitle: 'Galpão Definitivo', signerRole: 'Dupla Custódia' },
    { number: 7, title: 'Fase 7', subtitle: 'Pesquisa & Grafo', signerRole: 'Admin / Livre' }
  ];

  const isPhaseSigned = (p: PhaseNumber): boolean => {
    return collection.signatures.some(s => s.phaseNumber === p && s.status === 'locked');
  };

  const getPhaseSignature = (p: PhaseNumber) => {
    return getLatestPhaseSignature(collection.signatures, p);
  };

  const isPhaseAccessible = (p: PhaseNumber): boolean => {
    if (p === 1) return true;
    if (p === 7) return true; // Consulta sempre aberta
    // Bloqueio sequencial: fase P exige fase P-1 assinada
    return isPhaseSigned((p - 1) as PhaseNumber);
  };

  const canReopen = currentUserRole === 'curador' || currentUserRole === 'administrador';

  const handleConfirmReopen = () => {
    if (reopenModalPhase && justification.trim()) {
      onReopenPhase(reopenModalPhase, justification.trim());
      setReopenModalPhase(null);
      setJustification('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
          {phasesInfo.map((p) => {
            const signed = isPhaseSigned(p.number);
            const accessible = isPhaseAccessible(p.number);
            const isActive = activePhase === p.number;
            const sig = getPhaseSignature(p.number);

            return (
              <div
                key={p.number}
                className={`relative flex-1 min-w-[130px] sm:min-w-[150px] p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-sky-600 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-600/30'
                    : signed
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 hover:border-slate-300'
                    : accessible
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    : 'border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 opacity-60'
                }`}
                onClick={() => {
                  if (accessible || p.number === 7) {
                    onSelectPhase(p.number);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                    {p.title}
                  </span>
                  {signed ? (
                    <span className="flex items-center text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5" title={`Assinado por ${sig?.signedByName}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Assinada
                    </span>
                  ) : accessible ? (
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                      Em aberto
                    </span>
                  ) : (
                    <span className="flex items-center text-[10px] font-mono text-slate-400 gap-0.5">
                      <Lock className="w-3 h-3" />
                      Bloqueada
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                  {p.subtitle}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{p.signerRole}</span>
                  {signed && canReopen && p.number < 7 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReopenModalPhase(p.number);
                      }}
                      className="text-[10px] text-slate-500 hover:text-rose-600 hover:underline flex items-center gap-0.5"
                      title="Reabertura justificada da fase (§7)"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {onNavigateToAudit && (
            <button
              onClick={onNavigateToAudit}
              className="min-w-[110px] p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex flex-col justify-center items-center gap-0.5 transition-all group shrink-0 shadow-2xs"
              title="Abrir linha do tempo de auditoria com histórico forense do NIC"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold group-hover:text-emerald-700 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auditoria</span>
              </div>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
                Trilha INC/DITEC/PF
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Reabertura com Justificativa (§7) */}
      {reopenModalPhase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-semibold text-base">Reabertura Justificada — Fase {reopenModalPhase}</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Conforme a regra §7 do SGCCCO, uma fase assinada é imutável. Sua reabertura requer privilégio de <strong>Curador</strong> ou <strong>Administrador</strong>, registra o usuário solicitante e gera nova versão na trilha de auditoria. A versão anterior é preservada no histórico.
            </p>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Justificativa Técnica Obrigatória:
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex: Necessidade de retificação na descrição de lacre da entrega após confronto com auto cartorário..."
              rows={3}
              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 mb-4"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => { setReopenModalPhase(null); setJustification(''); }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReopen}
                disabled={!justification.trim()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                Confirmar Reabertura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
