import React, { useState } from 'react';
import { changePasswordApi } from '../services/authService';
import { ErrorNotice } from './ErrorNotice';
import { toAppError, AppError } from '../utils/errorMessages';
import { KeyRound, X, Loader2, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  onClose: () => void;
}

/**
 * "Trocar minha senha", para quem já está logado (login real —
 * _local-adr-policy-202). Diferente do link de definição de senha (que o
 * Administrador gera para quem esqueceu), aqui a pessoa já está autenticada —
 * mas o servidor exige a senha atual de qualquer forma, para o caso de a
 * sessão estar aberta num computador compartilhado.
 */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [done, setDone] = useState(false);

  const isValid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === newPasswordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(toAppError(err, 'Não foi possível trocar a senha.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <KeyRound className="w-4.5 h-4.5 text-sky-600" />
            <h3 className="font-bold text-sm">Trocar minha senha</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">Senha trocada com sucesso.</p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label htmlFor="change-password-current" className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Senha atual</label>
              <input
                id="change-password-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="change-password-new" className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Nova senha (mínimo 8 caracteres)</label>
              <input
                id="change-password-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="change-password-confirm" className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Confirmar nova senha</label>
              <input
                id="change-password-confirm"
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              {newPasswordConfirm && newPassword !== newPasswordConfirm && (
                <p className="text-rose-600 dark:text-rose-400 mt-1">As senhas não coincidem.</p>
              )}
            </div>

            {error && <ErrorNotice code={error.code} message={error.message} />}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Trocar senha
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
