import React, { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { formatCoiNumber } from '../utils/coiNumber';

interface NewCollectionModalProps {
  existingNics: string[];
  onCancel: () => void;
  onConfirm: (nic: string) => Promise<void>;
}

// O número do conjunto é escolhido por quem cadastra (antes era gerado em
// sequência pelo sistema). Formato COI-XXX (ver utils/coiNumber.ts): só o
// número é digitado — o mesmo da caixa na planilha de controle da coleção.
export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({ existingNics, onCancel, onConfirm }) => {
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const coi = formatCoiNumber(number);
  const duplicate = coi !== null && existingNics.some((n) => n.toUpperCase() === coi);
  const canConfirm = coi !== null && !duplicate && !saving;

  const problems: string[] = [];
  if (number.trim() && coi === null) problems.push('digite só o número, com algarismos (ex.: 1, 42 ou 204)');
  if (duplicate) problems.push(`o ${coi} já existe no acervo`);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      await onConfirm(coi as string);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Novo Conjunto (COI)</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Informe o número do conjunto — o mesmo da caixa. O número não pode ser alterado depois de criado.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Cancelar">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <label className="block">
          <span className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Número do conjunto *</span>
          <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
            <span className="pl-2.5 pr-1 font-mono text-slate-500 dark:text-slate-400 select-none">COI-</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoFocus
              inputMode="numeric"
              placeholder="Ex.: 1"
              className="w-full py-2.5 pr-2.5 bg-transparent text-slate-900 dark:text-white font-mono outline-none"
            />
          </div>
        </label>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
          <span className="text-slate-400 text-[10px] uppercase block">Conjunto que será criado</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">{coi ?? 'COI-…'}</span>
        </div>

        {problems.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span>Não é possível criar: {problems.join('; ')}.</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Criando...' : 'Criar Conjunto'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
