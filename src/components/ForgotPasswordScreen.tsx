import React, { useState } from 'react';
import { forgotPasswordApi } from '../services/authService';
import { KeyRound, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

/**
 * "Esqueci a senha" (complemento à Fase 3 — _local-adr-policy-202). Sem
 * e-mail/SMS configurado no sistema, isto não redefine a senha por conta
 * própria: só avisa o Administrador (fila em Configurações), que resolve
 * gerando um novo link de acesso, do mesmo jeito de sempre. Por isso a
 * resposta nunca diz se o e-mail existe — mesmo cuidado do login.
 */
export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const isValid = email.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { message } = await forgotPasswordApi(email.trim());
      setConfirmation(message);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível registrar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">Esqueci minha senha</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Não existe redefinição automática — o Administrador do sistema é avisado e gera um novo link de acesso para você.
            </p>
          </div>
        </div>

        {confirmation ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{confirmation}</span>
            </div>
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@instituicao.gov.br"
                autoComplete="username"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{error}</p>}

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Avisar o Administrador
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
