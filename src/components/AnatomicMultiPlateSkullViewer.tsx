import React, { useState } from 'react';
import { OsteologicalPresenceCode, OsteologicalAlteracaoRegiao } from '../types/sgccco';

export type SkullSubgroupId = 'calota' | 'base_profunda' | 'face' | 'mandibula_cervical';

export interface SkullPlateHotspot {
  id: string;
  name: string;
  path: string;
  badge: { x: number; y: number };
}

export interface AnatomicMultiPlateSkullViewerProps {
  activeSubgroup: SkullSubgroupId;
  onSelectSubgroup: (subgroup: SkullSubgroupId) => void;
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

// Configuração das 4 Pranchas Anatômicas (783 x 1024)
export const SKULL_SUBGROUPS_CONFIG: Record<
  SkullSubgroupId,
  {
    title: string;
    subtitle: string;
    plateNumber: string;
    imageSrc: string;
    bones: string[];
    hotspots: SkullPlateHotspot[];
  }
> = {
  calota: {
    title: 'Calota Craniana & Neurocrânio',
    subtitle: 'Vistas Anterior, Lateral, Inferior e Assoalho',
    plateNumber: 'Figura 5.3 (Pág. 33)',
    imageSrc: '/images/anatomical/cranio_grupo1_calota.png',
    bones: [
      'Frontal',
      'Parietal direito',
      'Parietal esquerdo',
      'Temporal direito',
      'Temporal esquerdo',
      'Occipital'
    ],
    hotspots: [
      {
        id: 'Frontal',
        name: 'Frontal',
        path: 'M 80 195 L 140 100 L 220 95 L 300 105 L 360 195 L 355 235 L 290 230 L 220 230 L 150 230 L 85 235 Z',
        badge: { x: 220, y: 160 }
      },
      {
        id: 'Parietal direito',
        name: 'Parietal direito',
        path: 'M 445 170 L 490 115 L 550 95 L 630 105 L 680 145 L 630 215 L 570 220 L 510 215 L 460 205 Z',
        badge: { x: 560, y: 155 }
      },
      {
        id: 'Parietal esquerdo',
        name: 'Parietal esquerdo',
        path: 'M 620 105 L 660 125 L 690 160 L 690 200 L 660 230 L 630 220 L 640 160 Z',
        badge: { x: 665, y: 180 }
      },
      {
        id: 'Temporal direito',
        name: 'Temporal direito',
        path: 'M 505 225 L 585 225 L 645 240 L 670 280 L 670 340 L 620 360 L 560 365 L 515 335 L 495 280 Z',
        badge: { x: 575, y: 290 }
      },
      {
        id: 'Temporal esquerdo',
        name: 'Temporal esquerdo',
        path: 'M 540 600 L 600 580 L 650 610 L 630 670 L 570 665 Z',
        badge: { x: 600, y: 630 }
      },
      {
        id: 'Occipital',
        name: 'Occipital',
        path: 'M 130 680 L 195 660 L 330 660 L 410 680 L 415 780 L 365 845 L 270 860 L 175 845 L 130 780 Z',
        badge: { x: 270, y: 760 }
      }
    ]
  },

  base_profunda: {
    title: 'Base Craniana Profunda',
    subtitle: 'Etmóide e Esfenóide Ampliados em Vistas Múltiplas',
    plateNumber: 'Figura 5.4 (Pág. 35)',
    imageSrc: '/images/anatomical/cranio_grupo2_base_profunda.png',
    bones: ['Etmóide', 'Esfenóide'],
    hotspots: [
      {
        id: 'Etmóide',
        name: 'Osso Etmóide (Profundo)',
        path: 'M 80 80 L 360 80 L 360 270 L 360 560 L 340 870 L 100 870 L 75 560 Z',
        badge: { x: 220, y: 440 }
      },
      {
        id: 'Esfenóide',
        name: 'Osso Esfenóide (Base)',
        path: 'M 440 80 L 750 80 L 760 460 L 760 700 L 760 940 L 460 940 L 440 460 Z',
        badge: { x: 610, y: 580 }
      }
    ]
  },

  face: {
    title: 'Esqueleto Facial Menor & Nariz',
    subtitle: 'Nasais, Palatinos, Zigomáticos, Conchas, Lacrimais e Vômer',
    plateNumber: 'Figura 5.2 (Pág. 31)',
    imageSrc: '/images/anatomical/cranio_grupo3_face_pequenos.png',
    bones: [
      'Nasal direito',
      'Nasal esquerdo',
      'Palatino direito',
      'Palatino esquerdo',
      'Zigomático direito',
      'Zigomático esquerdo',
      'Concha nasal inferior direita',
      'Concha nasal inferior esquerda',
      'Lacrimal direito',
      'Lacrimal esquerdo',
      'Vômer'
    ],
    hotspots: [
      {
        id: 'Nasal direito',
        name: 'Nasal direito',
        path: 'M 190 80 L 260 80 L 258 240 L 190 240 Z',
        badge: { x: 225, y: 160 }
      },
      {
        id: 'Nasal esquerdo',
        name: 'Nasal esquerdo',
        path: 'M 260 80 L 330 80 L 330 240 L 260 240 Z',
        badge: { x: 295, y: 160 }
      },
      {
        id: 'Palatino direito',
        name: 'Palatino direito',
        path: 'M 460 70 L 600 70 L 600 260 L 460 260 Z',
        badge: { x: 530, y: 165 }
      },
      {
        id: 'Palatino esquerdo',
        name: 'Palatino esquerdo',
        path: 'M 600 70 L 740 70 L 740 260 L 600 260 Z',
        badge: { x: 670, y: 165 }
      },
      {
        id: 'Zigomático direito',
        name: 'Zigomático direito',
        path: 'M 130 250 L 280 250 L 300 480 L 130 480 Z',
        badge: { x: 205, y: 365 }
      },
      {
        id: 'Zigomático esquerdo',
        name: 'Zigomático esquerdo',
        path: 'M 280 250 L 385 250 L 385 480 L 300 480 Z',
        badge: { x: 335, y: 365 }
      },
      {
        id: 'Concha nasal inferior direita',
        name: 'Concha nasal inf. direita',
        path: 'M 500 280 L 625 280 L 625 420 L 500 420 Z',
        badge: { x: 560, y: 350 }
      },
      {
        id: 'Concha nasal inferior esquerda',
        name: 'Concha nasal inf. esquerda',
        path: 'M 625 280 L 750 280 L 750 420 L 625 420 Z',
        badge: { x: 690, y: 350 }
      },
      {
        id: 'Lacrimal direito',
        name: 'Lacrimal direito',
        path: 'M 190 500 L 265 500 L 265 660 L 190 660 Z',
        badge: { x: 228, y: 580 }
      },
      {
        id: 'Lacrimal esquerdo',
        name: 'Lacrimal esquerdo',
        path: 'M 265 500 L 340 500 L 340 660 L 265 660 Z',
        badge: { x: 303, y: 580 }
      },
      {
        id: 'Vômer',
        name: 'Vômer',
        path: 'M 530 450 L 670 450 L 670 650 L 530 650 Z',
        badge: { x: 600, y: 550 }
      }
    ]
  },

  mandibula_cervical: {
    title: 'Arcadas Dentárias & Mandíbula',
    subtitle: 'Maxilas, Mandíbula, Hióide e Estruturas Anexas',
    plateNumber: 'Figura 5.1 (Pág. 29)',
    imageSrc: '/images/anatomical/cranio_grupo4_arcadas_mandibula.png',
    bones: ['Mandíbula', 'Maxila direita', 'Maxila esquerda', 'Hióide'],
    hotspots: [
      {
        id: 'Mandíbula',
        name: 'Mandíbula Completa e Ramo',
        path: 'M 70 75 L 535 75 L 535 570 L 70 570 Z',
        badge: { x: 250, y: 320 }
      },
      {
        id: 'Maxila direita',
        name: 'Maxila direita (Lateral)',
        path: 'M 545 75 L 750 75 L 750 330 L 545 330 Z',
        badge: { x: 650, y: 195 }
      },
      {
        id: 'Maxila esquerda',
        name: 'Maxila esquerda (Medial)',
        path: 'M 545 335 L 750 335 L 750 600 L 545 600 Z',
        badge: { x: 650, y: 460 }
      },
      {
        id: 'Hióide',
        name: 'Hióide (Cervical)',
        path: 'M 250 870 L 520 870 L 520 950 L 250 950 Z',
        badge: { x: 385, y: 910 }
      }
    ]
  }
};

export const AnatomicMultiPlateSkullViewer: React.FC<AnatomicMultiPlateSkullViewerProps> = ({
  activeSubgroup,
  onSelectSubgroup,
  ossos,
  selectedBone,
  onSelectBone,
  alteracoes = [],
  readOnly = false
}) => {
  const [hoveredBone, setHoveredBone] = useState<string | null>(null);
  const [showBeaucheneModal, setShowBeaucheneModal] = useState<boolean>(false);

  const currentPlate = SKULL_SUBGROUPS_CONFIG[activeSubgroup];

  const hasBoneAlteration = (boneId: string) => {
    return alteracoes.some(a => a.osso === boneId && a.tipo !== 'sem_alteracao');
  };

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
      {/* Topo do Visualizador: Cabeçalho com Identificador da Prancha e Acesso à Panorâmica */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-amber-300/60 dark:border-slate-800 text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[11px]">
            {currentPlate.plateNumber} · {currentPlate.title}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowBeaucheneModal(true)}
          className="text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border border-sky-300/60 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 transition-all flex items-center gap-1 shadow-2xs"
          title="Abrir a prancha histórica panorâmica completa de Beauchêne"
        >
          🏛️ Ver Beauchêne
        </button>
      </div>

      {/* Mini-seletor rápido das 4 Pranchas no topo do Visualizador */}
      <div className="w-full grid grid-cols-4 gap-1 mb-2">
        {(Object.keys(SKULL_SUBGROUPS_CONFIG) as SkullSubgroupId[]).map(subId => {
          const cfg = SKULL_SUBGROUPS_CONFIG[subId];
          const isCurrent = activeSubgroup === subId;
          const filledCount = cfg.bones.filter(b => !!ossos[b]).length;
          const totalCount = cfg.bones.length;

          return (
            <button
              key={subId}
              type="button"
              onClick={() => onSelectSubgroup(subId)}
              className={`px-1.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all text-center flex flex-col items-center justify-center border ${
                isCurrent
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs dark:bg-sky-600 dark:border-sky-500'
                  : 'bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-amber-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate w-full">{cfg.title.split('&')[0].trim()}</span>
              <span
                className={`text-[9px] ${
                  isCurrent ? 'text-amber-100 dark:text-sky-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {filledCount}/{totalCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Container da Imagem com SVG Hotspots Sobrepostos 1:1 */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-inner border border-amber-900/20 dark:border-slate-700 bg-white">
        {/* Imagem Médica Didática da Prancha Ativa */}
        <img
          src={currentPlate.imageSrc}
          alt={currentPlate.title}
          className="w-full h-auto block select-none pointer-events-none"
        />

        {/* Camada SVG Vetorial Sobreposta 1:1 (783 x 1024) */}
        <svg
          viewBox="0 0 783 1024"
          className="absolute inset-0 w-full h-full select-none"
          aria-label={`Mapa Interativo - ${currentPlate.title}`}
        >
          {currentPlate.hotspots.map(spot => {
            const isSelected = selectedBone === spot.id;
            const currentCode = ossos[spot.id];
            const hasAlt = hasBoneAlteration(spot.id);
            const overlay = getStatusOverlay(currentCode, isSelected);
            const isHovered = hoveredBone === spot.id;

            return (
              <g
                key={spot.id}
                id={`hotspot-${spot.id.replace(/\s+/g, '-')}`}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectBone(spot.id)}
                onMouseEnter={() => setHoveredBone(spot.id)}
                onMouseLeave={() => setHoveredBone(null)}
              >
                <path
                  d={spot.path}
                  fill={isHovered && !isSelected ? 'rgba(2, 132, 199, 0.28)' : overlay.fill}
                  stroke={isHovered && !isSelected ? '#0284c7' : overlay.stroke}
                  strokeWidth={isHovered && !isSelected ? 3 : overlay.strokeWidth}
                  strokeDasharray={overlay.strokeDasharray}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  filter={overlay.filter}
                  className="transition-all duration-150"
                />

                {/* Badge Indicador de Código (P, F, I, A) */}
                {currentCode && (
                  <g>
                    <circle
                      cx={spot.badge.x}
                      cy={spot.badge.y}
                      r={14}
                      fill={getBadgeColor(currentCode)}
                      stroke="#ffffff"
                      strokeWidth={2}
                      filter="drop-shadow(0 1px 3px rgba(0,0,0,0.35))"
                    />
                    <text
                      x={spot.badge.x}
                      y={spot.badge.y + 4.5}
                      textAnchor="middle"
                      fontSize="13px"
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
                      cx={spot.badge.x + 16}
                      cy={spot.badge.y - 12}
                      r={9}
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      filter="drop-shadow(0 1px 3px rgba(0,0,0,0.3))"
                    />
                    <text
                      x={spot.badge.x + 16}
                      y={spot.badge.y - 8.5}
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
        </svg>
      </div>

      {/* Rodapé Didático */}
      <div className="w-full text-center text-[11px] text-amber-950/70 dark:text-slate-400 font-mono pt-2">
        💡 Toque diretamente nas peças anatômicas da prancha para selecionar e lançar no laudo.
      </div>

      {/* Modal da Panorâmica Completa de Beauchêne (Preservada!) */}
      {showBeaucheneModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowBeaucheneModal(false)}
        >
          <div
            className="bg-[#f7f3e8] dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 border border-amber-300 dark:border-slate-700 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-amber-300/60 dark:border-slate-800">
              <div>
                <h4 className="font-mono font-bold text-sm text-amber-950 dark:text-amber-200">
                  Prancha Clássica Panorâmica · Crânio de Beauchêne
                </h4>
                <p className="text-xs text-amber-900/70 dark:text-slate-400">
                  Explanatio Anatomica ad Usum Forensem · Conjunto Completo Montado
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBeaucheneModal(false)}
                className="w-7 h-7 rounded-full bg-amber-200/60 dark:bg-slate-800 text-amber-950 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-amber-300"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-amber-900/20 shadow-inner">
              <img
                src="/images/anatomical/cranio_beauchene_completo.jpg"
                alt="Crânio de Beauchêne Panorâmico Completo"
                className="w-full h-auto block select-none"
              />
            </div>

            <div className="text-right pt-1">
              <button
                type="button"
                onClick={() => setShowBeaucheneModal(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-mono text-xs font-semibold shadow-xs"
              >
                Fechar Visão Geral
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
