import React, { useState } from 'react';
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

interface BoneHotspot {
  id: string;
  name: string;
  path: string;
  badge: { x: number; y: number };
}

const BONE_HOTSPOTS: BoneHotspot[] = [
  {
    id: 'Frontal',
    name: 'Frontal',
    path: 'M 350 290 C 330 200, 370 140, 448 140 C 526 140, 566 200, 546 290 C 520 305, 480 305, 448 300 C 416 305, 376 305, 350 290 Z',
    badge: { x: 448, y: 200 }
  },
  {
    id: 'Parietal direito',
    name: 'Parietal direito',
    path: 'M 160 330 C 140 240, 240 215, 335 225 C 330 300, 290 380, 220 395 C 170 380, 160 350, 160 330 Z',
    badge: { x: 240, y: 300 }
  },
  {
    id: 'Parietal esquerdo',
    name: 'Parietal esquerdo',
    path: 'M 736 330 C 756 240, 656 215, 561 225 C 566 300, 606 380, 676 395 C 726 380, 736 350, 736 330 Z',
    badge: { x: 656, y: 300 }
  },
  {
    id: 'Temporal direito',
    name: 'Temporal direito',
    path: 'M 95 440 C 90 400, 200 390, 280 405 C 300 460, 260 520, 210 520 C 130 520, 95 480, 95 440 Z',
    badge: { x: 195, y: 455 }
  },
  {
    id: 'Temporal esquerdo',
    name: 'Temporal esquerdo',
    path: 'M 801 440 C 806 400, 696 390, 616 405 C 596 460, 636 520, 686 520 C 766 520, 801 480, 801 440 Z',
    badge: { x: 701, y: 455 }
  },
  {
    id: 'Occipital',
    name: 'Occipital',
    path: 'M 360 600 C 360 550, 536 550, 536 600 C 536 660, 480 670, 448 670 C 416 670, 360 660, 360 600 Z',
    badge: { x: 448, y: 610 }
  },
  {
    id: 'Esfenóide',
    name: 'Esfenóide (Base)',
    path: 'M 345 350 C 380 320, 516 320, 551 350 C 565 390, 520 410, 448 405 C 376 410, 331 390, 345 350 Z',
    badge: { x: 448, y: 365 }
  },
  {
    id: 'Etmóide',
    name: 'Etmóide (Profundo)',
    path: 'M 425 315 C 430 300, 466 300, 471 315 C 475 365, 421 365, 425 315 Z',
    badge: { x: 448, y: 335 }
  },
  {
    id: 'Vômer',
    name: 'Vômer',
    path: 'M 436 385 L 460 385 L 455 425 L 441 425 Z',
    badge: { x: 448, y: 405 }
  },
  {
    id: 'Concha nasal inferior direita',
    name: 'Concha nasal inf. direita',
    path: 'M 390 425 C 385 410, 420 410, 425 435 C 420 455, 385 455, 390 425 Z',
    badge: { x: 405, y: 435 }
  },
  {
    id: 'Concha nasal inferior esquerda',
    name: 'Concha nasal inf. esquerda',
    path: 'M 506 425 C 511 410, 476 410, 471 435 C 476 455, 511 455, 506 425 Z',
    badge: { x: 491, y: 435 }
  },
  {
    id: 'Nasal direito',
    name: 'Nasal direito',
    path: 'M 428 430 L 445 430 L 444 465 L 426 465 Z',
    badge: { x: 436, y: 448 }
  },
  {
    id: 'Nasal esquerdo',
    name: 'Nasal esquerdo',
    path: 'M 451 430 L 468 430 L 470 465 L 452 465 Z',
    badge: { x: 460, y: 448 }
  },
  {
    id: 'Lacrimal direito',
    name: 'Lacrimal direito',
    path: 'M 395 415 L 415 415 L 412 435 L 392 435 Z',
    badge: { x: 404, y: 425 }
  },
  {
    id: 'Lacrimal esquerdo',
    name: 'Lacrimal esquerdo',
    path: 'M 481 415 L 501 415 L 504 435 L 484 435 Z',
    badge: { x: 492, y: 425 }
  },
  {
    id: 'Zigomático direito',
    name: 'Zigomático direito',
    path: 'M 290 470 C 270 430, 360 415, 365 470 C 370 520, 305 530, 290 470 Z',
    badge: { x: 330, y: 470 }
  },
  {
    id: 'Zigomático esquerdo',
    name: 'Zigomático esquerdo',
    path: 'M 606 470 C 626 430, 536 415, 531 470 C 526 520, 591 530, 606 470 Z',
    badge: { x: 566, y: 470 }
  },
  {
    id: 'Maxila direita',
    name: 'Maxila direita',
    path: 'M 355 460 C 360 420, 440 420, 444 470 L 444 550 L 370 550 C 350 520, 350 490, 355 460 Z',
    badge: { x: 405, y: 510 }
  },
  {
    id: 'Maxila esquerda',
    name: 'Maxila esquerda',
    path: 'M 541 460 C 536 420, 456 420, 452 470 L 452 550 L 526 550 C 546 520, 546 490, 541 460 Z',
    badge: { x: 491, y: 510 }
  },
  {
    id: 'Palatino direito',
    name: 'Palatino direito',
    path: 'M 385 410 L 415 410 L 415 425 L 385 425 Z',
    badge: { x: 400, y: 418 }
  },
  {
    id: 'Palatino esquerdo',
    name: 'Palatino esquerdo',
    path: 'M 481 410 L 511 410 L 511 425 L 481 425 Z',
    badge: { x: 496, y: 418 }
  },
  {
    id: 'Mandíbula',
    name: 'Mandíbula',
    path: 'M 345 580 C 345 570, 551 570, 551 580 C 560 670, 510 755, 448 755 C 386 755, 336 670, 345 580 Z',
    badge: { x: 448, y: 710 }
  },
  {
    id: 'Hióide',
    name: 'Hióide (Pescoço)',
    path: 'M 390 765 C 410 755, 486 755, 506 765 C 506 795, 390 795, 390 765 Z',
    badge: { x: 448, y: 775 }
  }
];

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
  const [hoveredBone, setHoveredBone] = useState<string | null>(null);

  const hasBoneAlteration = (boneId: string) => {
    return alteracoes.some(a => a.osso === boneId && a.tipo !== 'sem_alteracao');
  };

  const hasOssD = ossiculosDireitos.length > 0;
  const hasOssE = ossiculosEsquerdos.length > 0;
  const hasTireoidea = cartilagensLaringe.includes('tireoidea');
  const hasCricoide = cartilagensLaringe.includes('cricoide');

  const getStatusOverlay = (code?: OsteologicalPresenceCode, isSelected?: boolean) => {
    if (isSelected) {
      return {
        fill: 'rgba(2, 132, 199, 0.35)',
        stroke: '#0284c7',
        strokeWidth: 3.5,
        filter: 'drop-shadow(0 0 10px rgba(2, 132, 199, 0.6))'
      };
    }
    if (code === 'P') {
      return {
        fill: 'rgba(16, 185, 129, 0.30)',
        stroke: '#059669',
        strokeWidth: 2.5,
        filter: 'none'
      };
    }
    if (code === 'F') {
      return {
        fill: 'rgba(245, 158, 11, 0.32)',
        stroke: '#d97706',
        strokeWidth: 2.5,
        filter: 'none'
      };
    }
    if (code === 'I') {
      return {
        fill: 'rgba(168, 85, 247, 0.32)',
        stroke: '#9333ea',
        strokeWidth: 2.5,
        filter: 'none'
      };
    }
    if (code === 'A') {
      return {
        fill: 'rgba(100, 116, 139, 0.40)',
        stroke: '#475569',
        strokeWidth: 2.5,
        strokeDasharray: '4 3',
        filter: 'none'
      };
    }
    return {
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 1,
      filter: 'none'
    };
  };

  const getBadgeColor = (code: OsteologicalPresenceCode) => {
    if (code === 'P') return '#059669';
    if (code === 'F') return '#d97706';
    if (code === 'I') return '#9333ea';
    return '#475569';
  };

  return (
    <div className="bg-amber-100/40 dark:bg-slate-900/90 rounded-2xl p-3 border border-amber-300/80 dark:border-slate-800 shadow-xl relative flex flex-col items-center">
      {/* Topo do Visualizador */}
      <div className="w-full flex items-center justify-between pb-2 mb-1.5 border-b border-amber-300/60 dark:border-slate-800 text-xs px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[11px]">
            Placa Anatômica Gravada · Crânio de Beauchêne
          </span>
        </div>
        <span className="text-amber-900/70 dark:text-slate-400 text-[10px] font-mono">
          23 Ossos + Ossículos + Cartilagens
        </span>
      </div>

      {/* Container da Gravura com SVG Hotspots Sobrepostos */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-inner border border-amber-900/20 dark:border-slate-700 bg-[#f7f3e8]">
        {/* Imagem Médica Gravada em Alta Resolução */}
        <img
          src="/images/anatomical/cranio_beauchene_completo.jpg"
          alt="Crânio de Beauchêne e Estruturas Laríngeas"
          className="w-full h-auto block select-none pointer-events-none"
        />

        {/* Camada SVG Vetorial Sobreposta 1:1 */}
        <svg
          viewBox="0 0 896 1200"
          className="absolute inset-0 w-full h-full select-none"
          aria-label="Mapa Interativo sobre a Placa do Crânio"
        >
          {/* 1. Hotspots dos 23 Ossos Craniofaciais */}
          {BONE_HOTSPOTS.map(bone => {
            const isSelected = selectedBone === bone.id;
            const currentCode = ossos[bone.id];
            const hasAlt = hasBoneAlteration(bone.id);
            const overlay = getStatusOverlay(currentCode, isSelected);
            const isHovered = hoveredBone === bone.id;

            return (
              <g
                key={bone.id}
                id={`hotspot-${bone.id.replace(/\s+/g, '-')}`}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectBone(bone.id)}
                onMouseEnter={() => setHoveredBone(bone.id)}
                onMouseLeave={() => setHoveredBone(null)}
              >
                <path
                  d={bone.path}
                  fill={isHovered && !isSelected ? 'rgba(2, 132, 199, 0.28)' : overlay.fill}
                  stroke={isHovered && !isSelected ? '#0284c7' : overlay.stroke}
                  strokeWidth={isHovered && !isSelected ? 3 : overlay.strokeWidth}
                  strokeDasharray={overlay.strokeDasharray}
                  filter={overlay.filter}
                  className="transition-all duration-150"
                />

                {/* Badge Indicador de Código (P, F, I, A) */}
                {currentCode && (
                  <g>
                    <circle
                      cx={bone.badge.x}
                      cy={bone.badge.y}
                      r={13}
                      fill={getBadgeColor(currentCode)}
                      stroke="#ffffff"
                      strokeWidth={2}
                      filter="drop-shadow(0 1px 3px rgba(0,0,0,0.3))"
                    />
                    <text
                      x={bone.badge.x}
                      y={bone.badge.y + 4.5}
                      textAnchor="middle"
                      fontSize="12px"
                      fontWeight="bold"
                      fill="#ffffff"
                    >
                      {currentCode}
                    </text>
                  </g>
                )}

                {/* Badge de Alteração Óssea (!) */}
                {hasAlt && (
                  <g>
                    <circle
                      cx={bone.badge.x + 16}
                      cy={bone.badge.y - 12}
                      r={9}
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      filter="drop-shadow(0 1px 3px rgba(0,0,0,0.3))"
                    />
                    <text
                      x={bone.badge.x + 16}
                      y={bone.badge.y - 8.5}
                      textAnchor="middle"
                      fontSize="10px"
                      fontWeight="bold"
                      fill="#ffffff"
                    >
                      !
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. Hotspots dos Círculos dos Ossículos da Audição */}
          {/* Ossículos Direitos (Círculo da Esquerda na Imagem) */}
          <g
            className="cursor-pointer transition-all duration-200"
            onClick={() => {
              if (!readOnly && onToggleOssiculo) {
                onToggleOssiculo('direitos', 'martelo');
              }
            }}
          >
            <circle
              cx={215}
              cy={615}
              r={72}
              fill={hasOssD ? 'rgba(16, 185, 129, 0.28)' : 'transparent'}
              stroke={hasOssD ? '#059669' : 'transparent'}
              strokeWidth={hasOssD ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasOssD && (
              <g>
                <circle cx={215} cy={555} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={215} y={559} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
                  ✓
                </text>
              </g>
            )}
          </g>

          {/* Ossículos Esquerdos (Círculo da Direita na Imagem) */}
          <g
            className="cursor-pointer transition-all duration-200"
            onClick={() => {
              if (!readOnly && onToggleOssiculo) {
                onToggleOssiculo('esquerdos', 'martelo');
              }
            }}
          >
            <circle
              cx={681}
              cy={615}
              r={72}
              fill={hasOssE ? 'rgba(16, 185, 129, 0.28)' : 'transparent'}
              stroke={hasOssE ? '#059669' : 'transparent'}
              strokeWidth={hasOssE ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasOssE && (
              <g>
                <circle cx={681} cy={555} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={681} y={559} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
                  ✓
                </text>
              </g>
            )}
          </g>

          {/* 3. Hotspots das Cartilagens da Laringe (Abaixo do Hióide) */}
          {/* Cartilagem Tireóidea */}
          <g
            className="cursor-pointer transition-all duration-200"
            onClick={() => {
              if (!readOnly && onToggleCartilagem) {
                onToggleCartilagem('tireoidea');
              }
            }}
          >
            <path
              d="M 380 810 C 400 795, 496 795, 516 810 C 516 880, 480 885, 448 885 C 416 885, 380 880, 380 810 Z"
              fill={hasTireoidea ? 'rgba(16, 185, 129, 0.32)' : 'transparent'}
              stroke={hasTireoidea ? '#059669' : 'transparent'}
              strokeWidth={hasTireoidea ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasTireoidea && (
              <g>
                <circle cx={448} cy={845} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={448} y={849} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
                  ✓
                </text>
              </g>
            )}
          </g>

          {/* Cartilagem Cricoide */}
          <g
            className="cursor-pointer transition-all duration-200"
            onClick={() => {
              if (!readOnly && onToggleCartilagem) {
                onToggleCartilagem('cricoide');
              }
            }}
          >
            <path
              d="M 405 885 C 420 875, 476 875, 491 885 C 491 920, 405 920, 405 885 Z"
              fill={hasCricoide ? 'rgba(16, 185, 129, 0.32)' : 'transparent'}
              stroke={hasCricoide ? '#059669' : 'transparent'}
              strokeWidth={hasCricoide ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasCricoide && (
              <g>
                <circle cx={448} cy={900} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={448} y={904} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
                  ✓
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Rodapé Elegante */}
      <div className="w-full text-center text-[11px] text-amber-950/70 dark:text-slate-400 font-mono pt-2">
        💡 Toque diretamente nas peças da gravura médica para sincronizar com o laudo pericial.
      </div>
    </div>
  );
};
