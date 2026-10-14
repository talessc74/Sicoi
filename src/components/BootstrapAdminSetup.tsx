import React, { useState } from 'react';
import { UserProfile } from '../types/sgccco';
import { bootstrapAdminApi } from '../services/authService';
import { ErrorNotice } from './ErrorNotice';
import { toAppError, AppError } from '../utils/errorMessages';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface BootstrapAdminSetupProps {
  onLoggedIn: (person: UserProfile) => void;
}

/**
 * Tela exibida uma única vez, quando o sistema está totalmente vazio (nenhuma
 * pessoa cadastrada ainda) — cria diretamente o primeiro Administrador, já com
 * senha, e loga com ele. Depois disso, POST /api/auth/bootstrap-admin sempre
 * recusa (409): toda pessoa nova passa a ser cadastrada por um Administrador já
 * logado, em Configurações, com senha definida pelo link de uso único.
 */
export const BootstrapAdminSetup: React.FC<BootstrapAdminSetupProps> = ({ onLoggedIn }) => {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const isValid =
    name.trim() &&
    institution.trim() &&
    email.trim() &&
    password.length >= 8 &&
    password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const person = await bootstrapAdminApi({
        name: name.trim(),
        institution: institution.trim(),
        email: email.trim(),
        password
      });
      onLoggedIn(person);
    } catch (err: any) {
      setError(toAppError(err, 'Não foi possível criar o primeiro Administrador.'));
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
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Configuração inicial — primeiro Administrador</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhuma pessoa cadastrada ainda. Crie a conta do primeiro Administrador
              para começar — as demais pessoas são cadastradas por ele, depois.
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
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Instituição</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Ex.: INC/DITEC/PF"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">E-mail institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@instituicao.gov.br"
              autoComplete="username"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label htmlFor="bootstrap-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Senha (mínimo 8 caracteres)</label>
            <input
              id="bootstrap-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label htmlFor="bootstrap-password-confirm" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Confirmar senha</label>
            <input
              id="bootstrap-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">As senhas não coincidem.</p>
            )}
          </div>
        </div>

        {error && <ErrorNotice code={error.code} message={error.message} />}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Criar Administrador e entrar
        </button>
      </form>
    </div>
  );
};
