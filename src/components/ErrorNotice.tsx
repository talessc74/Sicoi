import React, { useState } from 'react';
import { friendlyMessage } from '../utils/errorMessages';
import { AlertCircle } from 'lucide-react';

interface ErrorNoticeProps {
  // Código estável vindo do servidor (ou de um serviço do cliente, pros erros
  // de rede) — ver src/utils/errorMessages.ts. Ausente/desconhecido cai no
  // fallback genérico, nunca na mensagem técnica crua.
  code?: string | null;
  // Mensagem técnica original — nunca escondida de vez, só atrás de "Ver
  // detalhes técnicos" (pedido do Tales: quem usa não é técnico, mas quem
  // for reportar um problema precisa poder mostrar o detalhe real).
  message: string;
  variant?: 'banner' | 'inline';
  onDismiss?: () => void;
  className?: string;
}

/**
 * Exibição única de erro pro usuário final — substitui os ~16 pontos do app
 * que antes mostravam `err.message` cru (§ pedido do Tales, out/2026).
 */
export const ErrorNotice: React.FC<ErrorNoticeProps> = ({ code, message, variant = 'inline', onDismiss, className = '' }) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const friendly = friendlyMessage(code);

  if (variant === 'banner') {
    return (
      <div className={`bg-rose-600 text-white text-xs ${className}`}>
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <span className="min-w-0">⚠ {friendly}</span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowTechnical((v) => !v)}
              className="underline opacity-90 hover:opacity-100"
            >
              {showTechnical ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
            </button>
            {onDismiss && (
              <button onClick={onDismiss} className="underline">
                Dispensar
              </button>
            )}
          </div>
        </div>
        {showTechnical && (
          <div className="px-4 pb-2 pt-2 border-t border-rose-500/40 font-mono text-[11px] text-rose-100">
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] space-y-1.5 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-start gap-1.5 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{friendly}</span>
        </span>
        <button
          onClick={() => setShowTechnical((v) => !v)}
          className="underline shrink-0 opacity-80 hover:opacity-100"
        >
          {showTechnical ? 'Ocultar' : 'Detalhes técnicos'}
        </button>
      </div>
      {showTechnical && (
        <div className="font-mono text-[10px] opacity-80 pt-1.5 border-t border-rose-200 dark:border-rose-800">
          {message}
        </div>
      )}
    </div>
  );
};
