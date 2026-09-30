import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types/sgccco';
import { UserPlus, Loader2 } from 'lucide-react';

interface FirstPersonSetupProps {
  onCreatePerson: (person: { name: string; role: UserRole; institution: string; registrationNumber: string }) => Promise<void>;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'curador', label: 'Curador' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'pesquisador', label: 'Pesquisador' },
  { value: 'estudante', label: 'Estudante' }
];

/**
 * Tela bloqueante exibida quando não há nenhuma pessoa cadastrada no banco —
 * o sistema não tem login/senha ainda, mas toda fase precisa de um responsável
 * identificado (assinatura, cadeia de custódia), então não há como operar sem
 * pelo menos uma pessoa registrada.
 */
export const FirstPersonSetup: React.FC<FirstPersonSetupProps> = ({ onCreatePerson }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('tecnico');
  const [institution, setInstitution] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim() && institution.trim() && registrationNumber.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreatePerson({ name: name.trim(), role, institution: institution.trim(), registrationNumber: registrationNumber.trim() });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível cadastrar a pessoa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Cadastre a primeira pessoa</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhuma pessoa registrada ainda. Toda fase precisa de um responsável identificado.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Carlos Alberto Menezes"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Instituição</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Ex.: Laboratório de Antropologia Forense / IML-DITEC"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Matrícula / registro profissional</label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Ex.: CRBio 48.912-04"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Cadastrar e entrar
        </button>
      </form>
    </div>
  );
};
