import React, { useState } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';

interface NewCollectionModalProps {
  existingNics: string[];
  onCancel: () => void;
  onConfirm: (nic: string, number: string) => Promise<void>;
}

// O NIC é escolhido pela pessoa que cadastra (antes era gerado em sequência pelo
// sistema). Formato NIC-AAAA-NÚMERO; só o ano e o número são digitados.
export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({ existingNics, onCancel, onConfirm }) => {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanNumber = number.trim().toUpperCase();
  const nic = `NIC-${year.trim()}-${cleanNumber}`;
  const yearValid = /^\d{4}$/.test(year.trim());
  const numberValid = /^[A-Z0-9]+$/.test(cleanNumber);
  const duplicate = existingNics.some((n) => n.toUpperCase() === nic);
  const canConfirm = yearValid && numberValid && !duplicate && !saving;

  const problems: string[] = [];
  if (!yearValid) problems.push('o ano deve ter 4 dígitos');
  if (cleanNumber && !numberValid) problems.push('o número pode ter só letras e algarismos, sem espaços');
  if (duplicate) problems.push(`o ${nic} já existe no acervo`);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    try {
      await onConfirm(nic, cleanNumber);
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
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Novo Conjunto (NIC)</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Informe o número do conjunto. O NIC não pode ser alterado depois de criado.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Cancelar">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Ano *</span>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              maxLength={4}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </label>
          <label className="block col-span-2">
            <span className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Número *</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoFocus
              placeholder="Ex.: 0841"
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </label>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
          <span className="text-slate-400 text-[10px] uppercase block">NIC que será criado</span>
          <span className="text-base font-bold text-slate-900 dark:text-white">{cleanNumber ? nic : `NIC-${year.trim()}-…`}</span>
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
