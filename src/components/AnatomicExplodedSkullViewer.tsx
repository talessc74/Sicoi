import React from 'react';
import { OsteologicalPresenceCode, OsteologicalAlteracaoRegiao } from '../types/sgccco';

export interface AnatomicExplodedSkullViewerProps {
  ossos: Record<string, OsteologicalPresenceCode>;
  selectedBone?: string | null;
  onSelectBone: (bone: string) => void;
  alteracoes?: OsteologicalAlteracaoRegiao[];
  cartilagensLaringe?: string[];
  ossiculosDireitos?: string[];
  ossiculosEsquerdos?: string[];
  onToggleCartilagem?: (id: string) => void;
  onToggleOssiculo?: (lado: 'direitos' | 'esquerdos', id: string) => void;
  readOnly?: boolean;
}

interface BoneGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  label: string;
  isSpecial?: boolean;
}

const CRANIO_GEOMETRY: Record<string, BoneGeometry> = {
  // Calvária Superior e Laterais
  'Frontal': { x: 235, y: 24, w: 130, h: 52, rx: 12, label: 'Frontal' },
  'Parietal direito': { x: 95, y: 58, w: 120, h: 62, rx: 10, label: 'Parietal D.' },
  'Parietal esquerdo': { x: 385, y: 58, w: 120, h: 62, rx: 10, label: 'Parietal E.' },
  'Temporal direito': { x: 95, y: 132, w: 120, h: 58, rx: 10, label: 'Temporal D.' },
  'Temporal esquerdo': { x: 385, y: 132, w: 120, h: 58, rx: 10, label: 'Temporal E.' },
  'Occipital': { x: 235, y: 88, w: 130, h: 48, rx: 10, label: 'Occipital' },

  // Base Interna e Estruturas Profundas (Destaque Técnico)
  'Esfenóide': { x: 215, y: 148, w: 170, h: 48, rx: 8, label: '★ Esfenóide (Base)' },
  'Etmóide': { x: 220, y: 206, w: 160, h: 44, rx: 8, label: '★ Etmóide (Profundo)', isSpecial: true },
  'Vômer': { x: 282, y: 260, w: 36, h: 48, rx: 4, label: 'Vômer' },

  // Cavidade Nasal e Face (Destaque Técnico para Conchas)
  'Concha nasal inferior direita': { x: 205, y: 262, w: 68, h: 42, rx: 6, label: 'Concha D.', isSpecial: true },
  'Concha nasal inferior esquerda': { x: 327, y: 262, w: 68, h: 42, rx: 6, label: 'Concha E.', isSpecial: true },
  'Nasal direito': { x: 235, y: 314, w: 38, h: 36, rx: 4, label: 'Nas.D' },
  'Nasal esquerdo': { x: 327, y: 314, w: 38, h: 36, rx: 4, label: 'Nas.E' },
  'Lacrimal direito': { x: 180, y: 314, w: 45, h: 36, rx: 4, label: 'Lacr.D' },
  'Lacrimal esquerdo': { x: 375, y: 314, w: 45, h: 36, rx: 4, label: 'Lacr.E' },
  'Zigomático direito': { x: 95, y: 240, w: 85, h: 62, rx: 8, label: 'Zigomático D.' },
  'Zigomático esquerdo': { x: 420, y: 240, w: 85, h: 62, rx: 8, label: 'Zigomático E.' },
  'Maxila direita': { x: 180, y: 362, w: 90, h: 56, rx: 8, label: 'Maxila D.' },
  'Maxila esquerda': { x: 330, y: 362, w: 90, h: 56, rx: 8, label: 'Maxila E.' },
  'Palatino direito': { x: 190, y: 426, w: 80, h: 34, rx: 6, label: 'Palatino D.' },
  'Palatino esquerdo': { x: 330, y: 426, w: 80, h: 34, rx: 6, label: 'Palatino E.' },

  // Mandíbula e Pescoço (Cadeia Hióide-Laríngea)
  'Mandíbula': { x: 175, y: 470, w: 250, h: 52, rx: 12, label: 'Mandíbula' },
  'Hióide': { x: 215, y: 530, w: 170, h: 34, rx: 8, label: 'Hióide (Pescoço)' }
};

export const AnatomicExplodedSkullViewer: React.FC<AnatomicExplodedSkullViewerProps> = ({
  ossos,
  selectedBone,
  onSelectBone,
  alteracoes = [],
  cartilagensLaringe = [],
  ossiculosDireitos = [],
  ossiculosEsquerdos = [],
  onToggleCartilagem,
  onToggleOssiculo,
  readOnly = false
}) => {
  // Retorna estilos de cor de acordo com o código P / F / I / A
  const getBoneStyle = (boneId: string) => {
    const code = ossos[boneId];
    if (code === 'P') {
      return { fill: '#d1fae5', stroke: '#059669', text: '#065f46', darkFill: '#064e3b', darkStroke: '#10b981', darkText: '#a7f3d0' };
    }
    if (code === 'F') {
      return { fill: '#fef3c7', stroke: '#d97706', text: '#92400e', darkFill: '#78350f', darkStroke: '#f59e0b', darkText: '#fde68a' };
    }
    if (code === 'I') {
      return { fill: '#f3e8ff', stroke: '#9333ea', text: '#6b21a8', darkFill: '#581c87', darkStroke: '#a855f7', darkText: '#e9d5ff' };
    }
    if (code === 'A') {
      return { fill: '#e2e8f0', stroke: '#64748b', text: '#334155', darkFill: '#1e293b', darkStroke: '#475569', darkText: '#94a3b8' };
    }
    return { fill: '#f8fafc', stroke: '#cbd5e1', text: '#64748b', darkFill: '#0f172a', darkStroke: '#334155', darkText: '#94a3b8' };
  };

  const hasBoneAlteration = (boneId: string) => {
    return alteracoes.some(a => a.osso === boneId && a.tipo !== 'sem_alteracao');
  };

  const hasOssD = ossiculosDireitos.length > 0;
  const hasOssE = ossiculosEsquerdos.length > 0;
  const hasTireoidea = cartilagensLaringe.includes('tireoidea');
  const hasCricoide = cartilagensLaringe.includes('cricoide');

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl relative flex flex-col items-center">
      {/* Cabeçalho do Visualizador */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-sky-400 font-bold uppercase tracking-wider">
            Crânio de Beauchêne & Cadeia Laríngea
          </span>
        </div>
        <span className="text-slate-400 text-[11px] font-mono">
          23 Ossos + Ossículos + Cartilagens
        </span>
      </div>

      {/* SVG Interativo com Visualização Radial e Zoom Suave */}
      <svg
        viewBox="0 0 600 660"
        className="w-full max-w-[540px] h-auto my-2 select-none"
        aria-label="Mapa Anatômico Explodido do Crânio"
      >
        {/* Linhas Guias Anatômicas (Topologia de Desarticulação) */}
        <g stroke="#334155" strokeDasharray="3 3" strokeWidth="1.2">
          <path d="M 300 76 L 300 88" />
          <path d="M 300 136 L 300 148" />
          <path d="M 300 196 L 300 206" />
          <path d="M 300 250 L 300 260" />
          <path d="M 300 308 L 300 362" />
          <path d="M 300 418 L 300 470" />
          <path d="M 300 522 L 300 530" />
          <path d="M 300 564 L 300 574" />
          <path d="M 300 608 L 300 616" />
        </g>

        {/* 1. Elementos Ósseos Principais (23 Ossos) */}
        {Object.entries(CRANIO_GEOMETRY).map(([boneId, geom]) => {
          const style = getBoneStyle(boneId);
          const isSelected = selectedBone === boneId;
          const currentCode = ossos[boneId];
          const hasAlt = hasBoneAlteration(boneId);

          return (
            <g
              key={boneId}
              id={`svg-bone-${boneId.replace(/\s+/g, '-')}`}
              className="cursor-pointer transition-all duration-200 hover:opacity-90"
              onClick={() => onSelectBone(boneId)}
            >
              <rect
                x={geom.x}
                y={geom.y}
                width={geom.w}
                height={geom.h}
                rx={geom.rx}
                fill={style.fill}
                stroke={isSelected ? '#38bdf8' : geom.isSpecial ? '#0284c7' : style.stroke}
                strokeWidth={isSelected ? 3 : geom.isSpecial ? 2 : 1.5}
                filter={isSelected ? 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))' : undefined}
              />
              <text
                x={geom.x + geom.w / 2}
                y={geom.y + geom.h / 2 + 4}
                textAnchor="middle"
                fontSize={geom.w < 60 ? '10px' : '11px'}
                fontWeight={geom.isSpecial || isSelected ? '700' : '600'}
                fill={style.text}
              >
                {geom.label}
              </text>

              {/* Indicador de Presença P / F / I / A */}
              {currentCode && (
                <g>
                  <circle
                    cx={geom.x + geom.w - 11}
                    cy={geom.y + 11}
                    r={7}
                    fill={style.stroke}
                  />
                  <text
                    x={geom.x + geom.w - 11}
                    y={geom.y + 14}
                    textAnchor="middle"
                    fontSize="9px"
                    fontWeight="bold"
                    fill="white"
                  >
                    {currentCode}
                  </text>
                </g>
              )}

              {/* Badge de Alteração Óssea (!) */}
              {hasAlt && (
                <g>
                  <circle
                    cx={geom.x + 11}
                    cy={geom.y + 11}
                    r={7}
                    fill="#dc2626"
                  />
                  <text
                    x={geom.x + 11}
                    y={geom.y + 14}
                    textAnchor="middle"
                    fontSize="9px"
                    fontWeight="bold"
                    fill="white"
                  >
                    !
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 2. Ala Esquerda: Ossículos da Audição Direitos (Martelo, Bigorna, Estribo) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (!readOnly && onToggleOssiculo) {
              onToggleOssiculo('direitos', 'martelo');
            }
          }}
        >
          <line x1="95" y1="160" x2="68" y2="160" stroke="#0284c7" strokeDasharray="3 2" strokeWidth="1.5" />
          <rect
            x="6"
            y="125"
            width="62"
            height="72"
            rx="8"
            fill={hasOssD ? '#e0f2fe' : '#1e293b'}
            stroke={hasOssD ? '#0284c7' : '#475569'}
            strokeWidth="1.5"
          />
          <text x="37" y="142" textAnchor="middle" fontSize="9px" fontWeight="bold" fill={hasOssD ? '#0369a1' : '#94a3b8'}>
            OSSÍCULOS D.
          </text>
          <text x="37" y="157" textAnchor="middle" fontSize="8px" fill={ossiculosDireitos.includes('martelo') ? '#059669' : '#64748b'}>
            • Martelo {ossiculosDireitos.includes('martelo') ? '✓' : ''}
          </text>
          <text x="37" y="170" textAnchor="middle" fontSize="8px" fill={ossiculosDireitos.includes('bigorna') ? '#059669' : '#64748b'}>
            • Bigorna {ossiculosDireitos.includes('bigorna') ? '✓' : ''}
          </text>
          <text x="37" y="183" textAnchor="middle" fontSize="8px" fill={ossiculosDireitos.includes('estribo') ? '#059669' : '#64748b'}>
            • Estribo {ossiculosDireitos.includes('estribo') ? '✓' : ''}
          </text>
        </g>

        {/* 3. Ala Direita: Ossículos da Audição Esquerdos (Martelo, Bigorna, Estribo) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (!readOnly && onToggleOssiculo) {
              onToggleOssiculo('esquerdos', 'martelo');
            }
          }}
        >
          <line x1="505" y1="160" x2="532" y2="160" stroke="#0284c7" strokeDasharray="3 2" strokeWidth="1.5" />
          <rect
            x="532"
            y="125"
            width="62"
            height="72"
            rx="8"
            fill={hasOssE ? '#e0f2fe' : '#1e293b'}
            stroke={hasOssE ? '#0284c7' : '#475569'}
            strokeWidth="1.5"
          />
          <text x="563" y="142" textAnchor="middle" fontSize="9px" fontWeight="bold" fill={hasOssE ? '#0369a1' : '#94a3b8'}>
            OSSÍCULOS E.
          </text>
          <text x="563" y="157" textAnchor="middle" fontSize="8px" fill={ossiculosEsquerdos.includes('martelo') ? '#059669' : '#64748b'}>
            • Martelo {ossiculosEsquerdos.includes('martelo') ? '✓' : ''}
          </text>
          <text x="563" y="170" textAnchor="middle" fontSize="8px" fill={ossiculosEsquerdos.includes('bigorna') ? '#059669' : '#64748b'}>
            • Bigorna {ossiculosEsquerdos.includes('bigorna') ? '✓' : ''}
          </text>
          <text x="563" y="183" textAnchor="middle" fontSize="8px" fill={ossiculosEsquerdos.includes('estribo') ? '#059669' : '#64748b'}>
            • Estribo {ossiculosEsquerdos.includes('estribo') ? '✓' : ''}
          </text>
        </g>

        {/* 4. Cartilagens da Laringe Ossificadas (Abaixo do Hióide) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (!readOnly && onToggleCartilagem) {
              onToggleCartilagem('tireoidea');
            }
          }}
        >
          <rect
            x="205"
            y="574"
            width="190"
            height="34"
            rx="8"
            fill={hasTireoidea ? '#dcfce7' : '#1e293b'}
            stroke={hasTireoidea ? '#16a34a' : '#475569'}
            strokeWidth="1.5"
          />
          <text
            x="300"
            y="595"
            textAnchor="middle"
            fontSize="10px"
            fontWeight="bold"
            fill={hasTireoidea ? '#15803d' : '#94a3b8'}
          >
            🛡️ Cartilagem Tireóidea (Laringe) {hasTireoidea ? '✓' : ''}
          </text>
        </g>

        <g
          className="cursor-pointer"
          onClick={() => {
            if (!readOnly && onToggleCartilagem) {
              onToggleCartilagem('cricoide');
            }
          }}
        >
          <rect
            x="225"
            y="616"
            width="150"
            height="30"
            rx="8"
            fill={hasCricoide ? '#dcfce7' : '#1e293b'}
            stroke={hasCricoide ? '#16a34a' : '#475569'}
            strokeWidth="1.5"
          />
          <text
            x="300"
            y="635"
            textAnchor="middle"
            fontSize="10px"
            fontWeight="bold"
            fill={hasCricoide ? '#15803d' : '#94a3b8'}
          >
            ⭕ Cartilagem Cricoide (Laringe) {hasCricoide ? '✓' : ''}
          </text>
        </g>
      </svg>

      {/* Rodapé explicativo de navegação pericial */}
      <div className="w-full text-center text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
        💡 Clique em qualquer peça para rolar e selecionar o osso correspondente na lista pericial.
      </div>
    </div>
  );
};
