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
    path: 'M 448 142 L 480 150 L 520 180 L 555 220 L 565 275 L 555 335 L 540 345 L 515 330 L 475 325 L 460 370 L 448 372 L 436 370 L 421 325 L 381 330 L 356 345 L 341 335 L 331 275 L 341 220 L 376 180 L 416 150 Z',
    badge: { x: 448, y: 235 }
  },
  {
    id: 'Parietal direito',
    name: 'Parietal direito',
    path: 'M 240 218 L 300 235 L 345 275 L 350 325 L 340 375 L 315 415 L 275 440 L 210 430 L 155 405 L 140 355 L 150 295 L 185 250 Z',
    badge: { x: 245, y: 325 }
  },
  {
    id: 'Parietal esquerdo',
    name: 'Parietal esquerdo',
    path: 'M 656 218 L 596 235 L 551 275 L 546 325 L 556 375 L 581 415 L 621 440 L 686 430 L 741 405 L 756 355 L 746 295 L 711 250 Z',
    badge: { x: 651, y: 325 }
  },
  {
    id: 'Temporal direito',
    name: 'Temporal direito',
    path: 'M 170 430 L 225 415 L 280 435 L 305 475 L 280 520 L 245 545 L 215 565 L 150 565 L 105 520 L 95 465 Z',
    badge: { x: 195, y: 485 }
  },
  {
    id: 'Temporal esquerdo',
    name: 'Temporal esquerdo',
    path: 'M 726 430 L 671 415 L 616 435 L 591 475 L 616 520 L 651 545 L 681 565 L 746 565 L 791 520 L 801 465 Z',
    badge: { x: 701, y: 485 }
  },
  {
    id: 'Esfenóide',
    name: 'Esfenóide (Base)',
    path: 'M 335 405 L 375 435 L 415 440 L 425 440 L 425 460 L 375 480 L 375 510 L 405 515 L 415 470 L 430 465 L 435 440 L 448 388 L 461 440 L 466 465 L 481 470 L 491 515 L 521 510 L 521 480 L 471 460 L 471 440 L 481 440 L 521 435 L 561 405 L 555 430 L 540 455 L 475 460 L 475 440 L 421 440 L 421 460 L 356 455 L 341 430 Z',
    badge: { x: 525, y: 435 }
  },
  {
    id: 'Etmóide',
    name: 'Etmóide (Profundo)',
    path: 'M 448 388 L 466 405 L 468 435 L 460 455 L 448 458 L 436 455 L 428 435 L 430 405 Z',
    badge: { x: 448, y: 422 }
  },
  {
    id: 'Vômer',
    name: 'Vômer',
    path: 'M 438 465 L 458 465 L 458 510 L 438 510 Z',
    badge: { x: 448, y: 488 }
  },
  {
    id: 'Concha nasal inferior direita',
    name: 'Concha nasal inf. direita',
    path: 'M 430 565 L 446 565 L 446 615 L 430 615 Z',
    badge: { x: 438, y: 590 }
  },
  {
    id: 'Concha nasal inferior esquerda',
    name: 'Concha nasal inf. esquerda',
    path: 'M 450 565 L 466 565 L 466 615 L 450 615 Z',
    badge: { x: 458, y: 590 }
  },
  {
    id: 'Nasal direito',
    name: 'Nasal direito',
    path: 'M 432 515 L 447 515 L 447 560 L 432 560 Z',
    badge: { x: 439, y: 538 }
  },
  {
    id: 'Nasal esquerdo',
    name: 'Nasal esquerdo',
    path: 'M 449 515 L 464 515 L 464 560 L 449 560 Z',
    badge: { x: 457, y: 538 }
  },
  {
    id: 'Lacrimal direito',
    name: 'Lacrimal direito',
    path: 'M 386 515 L 408 515 L 408 560 L 386 560 Z',
    badge: { x: 398, y: 538 }
  },
  {
    id: 'Lacrimal esquerdo',
    name: 'Lacrimal esquerdo',
    path: 'M 488 515 L 510 515 L 510 560 L 488 560 Z',
    badge: { x: 498, y: 538 }
  },
  {
    id: 'Zigomático direito',
    name: 'Zigomático direito',
    path: 'M 265 545 L 315 505 L 360 535 L 345 595 L 285 605 L 265 565 Z',
    badge: { x: 315, y: 555 }
  },
  {
    id: 'Zigomático esquerdo',
    name: 'Zigomático esquerdo',
    path: 'M 631 545 L 581 505 L 536 535 L 551 595 L 611 605 L 631 565 Z',
    badge: { x: 581, y: 555 }
  },
  {
    id: 'Maxila direita',
    name: 'Maxila direita',
    path: 'M 360 540 L 428 535 L 428 620 L 448 620 L 448 650 L 370 650 L 350 610 Z',
    badge: { x: 390, y: 610 }
  },
  {
    id: 'Maxila esquerda',
    name: 'Maxila esquerda',
    path: 'M 468 535 L 536 540 L 546 610 L 526 650 L 448 650 L 448 620 L 468 620 Z',
    badge: { x: 506, y: 610 }
  },
  {
    id: 'Palatino direito',
    name: 'Palatino direito',
    path: 'M 412 515 L 432 515 L 432 555 L 412 555 Z',
    badge: { x: 422, y: 535 }
  },
  {
    id: 'Palatino esquerdo',
    name: 'Palatino esquerdo',
    path: 'M 464 515 L 484 515 L 484 555 L 464 555 Z',
    badge: { x: 474, y: 535 }
  },
  {
    id: 'Occipital',
    name: 'Occipital',
    path: 'M 448 655 L 495 660 L 540 690 L 525 745 L 480 760 L 448 762 L 416 760 L 371 745 L 356 690 L 401 660 Z',
    badge: { x: 448, y: 715 }
  },
  {
    id: 'Mandíbula',
    name: 'Mandíbula',
    path: 'M 345 660 L 330 715 L 345 785 L 375 850 L 410 895 L 448 905 L 486 895 L 521 850 L 551 785 L 566 715 L 551 660 L 525 675 L 500 755 L 448 765 L 396 755 L 371 675 Z',
    badge: { x: 448, y: 835 }
  },
  {
    id: 'Hióide',
    name: 'Hióide (Pescoço)',
    path: 'M 385 918 L 420 935 L 448 935 L 476 935 L 511 918 L 500 958 L 466 960 L 448 960 L 430 960 L 396 958 Z',
    badge: { x: 448, y: 948 }
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
              cx={190}
              cy={737}
              r={72}
              fill={hasOssD ? 'rgba(16, 185, 129, 0.28)' : 'transparent'}
              stroke={hasOssD ? '#059669' : 'transparent'}
              strokeWidth={hasOssD ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasOssD && (
              <g>
                <circle cx={190} cy={677} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={190} y={681} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
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
              cx={705}
              cy={739}
              r={71}
              fill={hasOssE ? 'rgba(16, 185, 129, 0.28)' : 'transparent'}
              stroke={hasOssE ? '#059669' : 'transparent'}
              strokeWidth={hasOssE ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasOssE && (
              <g>
                <circle cx={705} cy={679} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={705} y={683} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
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
              d="M 385 960 L 448 1005 L 511 960 L 525 1015 L 510 1050 L 490 1065 L 448 1030 L 406 1065 L 386 1050 L 371 1015 Z"
              fill={hasTireoidea ? 'rgba(16, 185, 129, 0.32)' : 'transparent'}
              stroke={hasTireoidea ? '#059669' : 'transparent'}
              strokeWidth={hasTireoidea ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasTireoidea && (
              <g>
                <circle cx={448} cy={1020} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={448} y={1024} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
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
              d="M 415 1060 L 448 1080 L 481 1060 L 495 1085 L 485 1115 L 448 1118 L 411 1115 L 401 1085 Z"
              fill={hasCricoide ? 'rgba(16, 185, 129, 0.32)' : 'transparent'}
              stroke={hasCricoide ? '#059669' : 'transparent'}
              strokeWidth={hasCricoide ? 3 : 1}
              className="hover:stroke-sky-500 hover:stroke-[3] hover:fill-sky-500/20 transition-all"
            />
            {hasCricoide && (
              <g>
                <circle cx={448} cy={1090} r={12} fill="#059669" stroke="#fff" strokeWidth={2} />
                <text x={448} y={1094} textAnchor="middle" fontSize="11px" fontWeight="bold" fill="#fff">
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
