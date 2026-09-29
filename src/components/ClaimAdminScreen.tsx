import React, { useState } from 'react';
import { UserProfile } from '../types/sgccco';
import { claimAdminApi } from '../services/authService';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface ClaimAdminScreenProps {
  onLoggedIn: (person: UserProfile) => void;
}

/**
 * Migração do modelo antigo para o login real (_local-adr-policy-202): quando
 * o sistema já tem gente cadastrada de antes (Administrador incluso, mas sem
 * senha nenhuma), esta tela ativa uma conta de Administrador já existente —
 * nunca cria uma nova. Só aparece quando o Administrador de quem configura o
 * ambiente (Render) definiu ADMIN_BOOTSTRAP_SECRET e ainda existe algum
 * Administrador sem senha. Ver o manual "Administrador · Gestão de Contas".
 */
export const ClaimAdminScreen: React.FC<ClaimAdminScreenProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    email.trim() &&
    bootstrapSecret.trim() &&
    password.length >= 8 &&
    password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const person = await claimAdminApi(email.trim(), bootstrapSecret.trim(), password);
      onLoggedIn(person);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível ativar a conta.');
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
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Ativar acesso do Administrador</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sua conta já existe no sistema (de antes do login por senha existir). Digite seu e-mail, o código de
              ativação que você recebeu, e escolha sua senha.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="O e-mail já cadastrado para você"
              autoComplete="username"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Código de ativação</label>
            <input
              type="text"
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
              placeholder="Recebido de quem configurou o sistema"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label htmlFor="claim-admin-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Senha (mínimo 8 caracteres)</label>
            <input
              id="claim-admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label htmlFor="claim-admin-password-confirm" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Confirmar senha</label>
            <input
              id="claim-admin-password-confirm"
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

        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Ativar e entrar
        </button>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Não tem um código de ativação? Ele é entregue por fora do sistema por quem configurou o ambiente — fale com
          essa pessoa antes de continuar.
        </p>
      </form>
    </div>
  );
};
