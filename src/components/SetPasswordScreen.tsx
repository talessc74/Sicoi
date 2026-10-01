import React, { useState } from 'react';
import { setupPasswordApi } from '../services/authService';
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface SetPasswordScreenProps {
  token: string;
}

/**
 * Tela pública alcançada pelo link que o Administrador gera e entrega por fora
 * do sistema (ver _local-adr-policy-202) — o token na URL é a própria prova de
 * quem pode definir a senha; não precisa (e não deve) exigir login algum aqui.
 * Alcançada via ?token=... na URL (ver App.tsx), sem depender de um roteador.
 */
export const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ token }) => {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValid = password.length >= 8 && password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await setupPasswordApi(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível definir a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    // Remove o token da URL antes de voltar ao login normal — o link só serve uma vez.
    window.location.href = window.location.pathname;
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">Senha definida com sucesso</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Já pode entrar no SIGCOI com seu e-mail e a senha que você acabou de criar.
          </p>
          <button
            onClick={goToLogin}
            className="w-full px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Definir senha de acesso</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Este link foi gerado pelo Administrador do sistema e só funciona uma vez.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <label htmlFor="setup-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nova senha (mínimo 8 caracteres)</label>
            <div className="relative">
              <input
                id="setup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="setup-password-confirm" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Confirmar nova senha</label>
            <div className="relative">
              <input
                id="setup-password-confirm"
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">As senhas não coincidem.</p>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Definir senha
        </button>
      </form>
    </div>
  );
};
