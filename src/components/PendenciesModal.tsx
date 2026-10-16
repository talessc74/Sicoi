import React from 'react';
import { X, ArrowRight, ListChecks } from 'lucide-react';
import type { PhaseNumber } from '../types/sgccco';
import { PhasePendencies, countPendencies } from '../utils/collectionPendencies';

interface PendenciesModalProps {
  nic: string;
  pendencies: PhasePendencies[];
  onClose: () => void;
  onGoToPhase: (phase: PhaseNumber) => void;
}

// Lista completa do que falta num conjunto, fase por fase (aberta pela etiqueta
// "Pendências" do painel inicial). Cada fase tem um atalho para abrir a tela dela.
export const PendenciesModal: React.FC<PendenciesModalProps> = ({ nic, pendencies, onClose, onGoToPhase }) => {
  const total = countPendencies(pendencies);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pendencies-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl text-xs"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 id="pendencies-title" className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-amber-600" />
              Pendências de {nic}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {total === 1 ? '1 item' : `${total} itens`} em aberto nas fases ainda não assinadas.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Fechar">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {pendencies.map((group) => (
            <section key={group.phase} className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-900">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Fase {group.phase} · {group.title}
                </span>
                <button
                  type="button"
                  onClick={() => onGoToPhase(group.phase)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold inline-flex items-center gap-1"
                >
                  Ir para a Fase {group.phase}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <ul className="px-3.5 py-2.5 space-y-1 list-disc list-inside text-slate-700 dark:text-slate-300">
                {group.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
