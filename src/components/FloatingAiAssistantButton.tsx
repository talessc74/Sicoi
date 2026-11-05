import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, GripVertical, ArrowLeftRight, Sparkles } from 'lucide-react';

export interface FloatingAiPosition {
  x: number;
  y: number;
}

export interface FloatingAiAssistantButtonProps {
  isOpen: boolean;
  onOpenChat: () => void;
  isHidden: boolean;
  onHide: () => void;
  onRestore: () => void;
}

export const FAB_POSITION_STORAGE_KEY = 'sigcoi_ai_fab_position';
export const FAB_HIDDEN_STORAGE_KEY = 'sigcoi_ai_fab_hidden';

const BUTTON_APPROX_WIDTH = 220;
const BUTTON_APPROX_HEIGHT = 52;
const SCREEN_MARGIN = 16;

/**
 * Garante que as coordenadas do botão fiquem sempre contidas dentro da janela visível.
 */
export function clampPosition(
  pos: FloatingAiPosition,
  windowWidth: number,
  windowHeight: number,
  buttonWidth = BUTTON_APPROX_WIDTH,
  buttonHeight = BUTTON_APPROX_HEIGHT,
  margin = SCREEN_MARGIN
): FloatingAiPosition {
  const maxX = Math.max(margin, windowWidth - buttonWidth - margin);
  const maxY = Math.max(margin, windowHeight - buttonHeight - margin);
  return {
    x: Math.min(Math.max(margin, pos.x), maxX),
    y: Math.min(Math.max(margin, pos.y), maxY)
  };
}

/**
 * Calcula a posição inicial padrão (canto inferior direito).
 */
export function getDefaultPosition(
  windowWidth: number,
  windowHeight: number,
  buttonWidth = BUTTON_APPROX_WIDTH,
  buttonHeight = BUTTON_APPROX_HEIGHT,
  margin = SCREEN_MARGIN
): FloatingAiPosition {
  return clampPosition(
    {
      x: windowWidth - buttonWidth - margin,
      y: windowHeight - buttonHeight - margin - 20
    },
    windowWidth,
    windowHeight,
    buttonWidth,
    buttonHeight,
    margin
  );
}

export const FloatingAiAssistantButton: React.FC<FloatingAiAssistantButtonProps> = ({
  isOpen,
  onOpenChat,
  isHidden,
  onHide,
  onRestore
}) => {
  const [position, setPosition] = useState<FloatingAiPosition>(() => {
    if (typeof window === 'undefined') return { x: 100, y: 100 };
    try {
      const saved = localStorage.getItem(FAB_POSITION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return clampPosition(parsed, window.innerWidth, window.innerHeight);
        }
      }
    } catch {}
    return getDefaultPosition(window.innerWidth, window.innerHeight);
  });

  const [isDragging, setIsDragging] = useState(false);
  const isPointerDownRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; posX: number; posY: number }>({
    pointerX: 0,
    pointerY: 0,
    posX: 0,
    posY: 0
  });

  // Re-clamp ao redimensionar a tela para nunca ficar fora do viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev, window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Se o clique foi num botão de subação (fechar ou alternar lado), não inicia drag
    if ((e.target as HTMLElement).closest('button[data-subaction]')) {
      return;
    }

    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (!hasMovedRef.current && Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      const newPos = clampPosition(
        {
          x: dragStartRef.current.posX + dx,
          y: dragStartRef.current.posY + dy
        },
        window.innerWidth,
        window.innerHeight
      );
      setPosition(newPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedRef.current) {
      setIsDragging(false);
      try {
        localStorage.setItem(FAB_POSITION_STORAGE_KEY, JSON.stringify(position));
      } catch {}
    } else {
      // Foi apenas um clique simples (sem arrastar) -> abre o chat
      onOpenChat();
    }
  };

  // Alterna rapidamente o botão entre o lado esquerdo e direito da tela com 1 clique
  const handleSwapSide = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyOnRight = position.x > window.innerWidth / 2;
    const newX = isCurrentlyOnRight
      ? SCREEN_MARGIN
      : Math.max(SCREEN_MARGIN, window.innerWidth - BUTTON_APPROX_WIDTH - SCREEN_MARGIN);

    const newPos = clampPosition({ x: newX, y: position.y }, window.innerWidth, window.innerHeight);
    setPosition(newPos);
    try {
      localStorage.setItem(FAB_POSITION_STORAGE_KEY, JSON.stringify(newPos));
    } catch {}
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHide();
  };

  // Quando o modal do chat já está aberto, ocultamos temporariamente para não poluir
  if (isOpen) {
    return null;
  }

  // Se o botão flutuante estiver fechado/ocultado, exibe uma mini aba discreta na borda da tela
  if (isHidden) {
    const isDockedOnLeft = position.x < window.innerWidth / 2;
    return (
      <div
        className={`fixed z-40 transition-all ${
          isDockedOnLeft ? 'left-0' : 'right-0'
        }`}
        style={{ top: `${Math.min(Math.max(position.y, 80), window.innerHeight - 80)}px` }}
      >
        <button
          onClick={onRestore}
          title="Reabrir botão flutuante do Assistente IA"
          className={`flex items-center gap-1.5 py-2 px-2.5 bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all text-xs font-semibold border border-white/20 backdrop-blur-md cursor-pointer ${
            isDockedOnLeft ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0'
          }`}
        >
          <Bot className="w-4 h-4 text-sky-200" />
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span className="hidden sm:inline text-[11px] font-sans">Assistente IA</span>
        </button>
      </div>
    );
  }

  const isPositionedOnRight = position.x > window.innerWidth / 2;

  return (
    <div
      role="region"
      aria-label="Botão Flutuante do Assistente IA"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      className={`fixed z-40 select-none group flex items-center gap-1.5 p-1.5 pl-3 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 border border-white/25 backdrop-blur-md transition-shadow ${
        isDragging ? 'cursor-grabbing scale-105 ring-2 ring-sky-300/60 shadow-2xl' : 'cursor-grab hover:shadow-2xl'
      }`}
      title="Assistente IA (Gemini) — Clique para abrir ou arraste para reposicionar na tela"
    >
      {/* Alça de Arraste / Indicador de Mobilidade */}
      <div
        className="text-white/60 group-hover:text-white/90 transition-colors -ml-1 pr-0.5"
        title="Arraste para mover para onde quiser"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Indicador de Status com Pulso */}
      <div className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </div>

      <Bot className="w-4 h-4 text-sky-200 shrink-0" />

      {/* Rótulo Principal */}
      <span className="font-sans font-semibold text-xs tracking-wide pr-1 whitespace-nowrap">
        Assistente IA
      </span>

      <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 bg-black/25 rounded-md font-bold text-sky-100">
        Gemini
      </span>

      {/* Ações Rápidas Secundárias (Mudar de Lado & Fechar) */}
      <div className="flex items-center gap-0.5 pl-1 border-l border-white/20">
        {/* Botão de Alternar Lado Esquerda/Direita */}
        <button
          type="button"
          data-subaction="swap"
          onClick={handleSwapSide}
          title={isPositionedOnRight ? 'Mover para o lado esquerdo' : 'Mover para o lado direito'}
          className="p-1 rounded-lg text-white/75 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>

        {/* Botão para Fechar / Ocultar */}
        <button
          type="button"
          data-subaction="close"
          onClick={handleClose}
          title="Fechar/Ocultar botão flutuante (você pode reativá-lo a qualquer momento)"
          className="p-1 rounded-lg text-white/75 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
