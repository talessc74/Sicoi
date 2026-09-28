import React, { useState } from 'react';
import { UserProfile } from '../types/sgccco';
import { loginApi } from '../services/authService';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLoggedIn: (person: UserProfile) => void;
}

/**
 * Tela de login real (Fase 3 — login/logout, _local-adr-policy-202). Substitui o
 * antigo troca-de-perfil de um clique: só entra quem souber matrícula + senha de
 * uma pessoa já cadastrada, com a senha já definida por um link do Administrador.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoggedIn }) => {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = registrationNumber.trim() && password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const person = await loginApi(registrationNumber.trim(), password);
      onLoggedIn(person);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar.');
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
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">SIGCOI — Entrar</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite sua matrícula e senha para acessar o sistema.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Matrícula / registro profissional</label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Ex.: CRBio 48.912-04"
              autoComplete="username"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Entrar
        </button>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Ainda não tem senha, ou esqueceu? Fale com o Administrador do sistema — ele
          gera um link individual de definição de senha em Configurações.
        </p>
      </form>
    </div>
  );
};
