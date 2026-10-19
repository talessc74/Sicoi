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
    title: "Calota Craniana & Neurocrânio",
    subtitle: "Frontal, Parietais, Temporais e Occipital",
    plateNumber: "Figura 5.3 (Pág. 33)",
    imageSrc: "/images/anatomical/cranio_grupo1_calota.png",
    bones: ["Frontal", "Parietal direito", "Parietal esquerdo", "Temporal direito", "Temporal esquerdo", "Occipital"],
    hotspots: [
      {
        id: "Frontal",
        name: "Frontal (Fronte & Cúpula)",
        path: "M 281 170 L 283 249 L 75 249 L 75 140 L 123 111 L 169 95 L 195 95 L 253 128 Z M 656 130 L 664 130 L 688 157 L 707 194 L 723 259 L 710 279 L 620 279 L 620 193 Z",
        badge: { x: 220, y: 150 }
      },
      {
        id: "Parietal direito",
        name: "Parietal direito",
        path: "M 460 102 L 475 95 L 557 95 L 644 120 L 644 215 L 569 224 L 468 181 L 460 164 Z",
        badge: { x: 540, y: 150 }
      },
      {
        id: "Parietal esquerdo",
        name: "Parietal esquerdo (Base Interna)",
        path: "M 550 504 L 601 509 L 635 527 L 704 619 L 704 629 L 550 629 Z",
        badge: { x: 660, y: 550 }
      },
      {
        id: "Temporal direito",
        name: "Temporal direito (Escama/Mastóide)",
        path: "M 674 225 L 674 374 L 501 374 L 485 356 L 485 293 L 541 225 Z",
        badge: { x: 580, y: 295 }
      },
      {
        id: "Temporal esquerdo",
        name: "Temporal esquerdo (Porção Petrosa)",
        path: "M 672 610 L 679 623 L 679 719 L 588 719 L 550 698 L 550 626 L 566 610 Z",
        badge: { x: 615, y: 665 }
      },
      {
        id: "Occipital",
        name: "Occipital (Base & Forame Magno)",
        path: "M 346 630 L 359 656 L 351 781 L 310 864 L 105 856 L 111 630 Z M 460 246 L 467 245 L 504 248 L 504 282 L 455 268 L 454 261 Z M 691 700 L 691 766 L 683 812 L 671 835 L 653 854 L 581 854 L 565 814 L 565 752 L 576 700 Z",
        badge: { x: 265, y: 760 }
      }
    ]
  },
  base_profunda: {
    title: "Base Craniana Profunda",
    subtitle: "Etmóide e Esfenóide Ampliados em Vistas Múltiplas",
    plateNumber: "Figura 5.4 (Pág. 35)",
    imageSrc: "/images/anatomical/cranio_grupo2_base_profunda.png",
    bones: ["Etmóide", "Esfenóide"],
    hotspots: [
      {
        id: "Etmóide",
        name: "Etmóide (Profundo)",
        path: "M 188 75 L 211 92 L 239 172 L 239 214 L 223 245 L 191 269 L 147 269 L 120 248 L 108 226 L 105 159 L 126 92 L 147 75 Z M 162 320 L 255 379 L 279 480 L 228 551 L 126 545 L 89 518 L 65 477 L 99 383 Z M 135 650 L 212 654 L 242 674 L 247 686 L 237 790 L 222 833 L 202 858 L 107 853 L 85 725 L 102 677 Z",
        badge: { x: 175, y: 440 }
      },
      {
        id: "Esfenóide",
        name: "Esfenóide (Base)",
        path: "M 554 75 L 579 93 L 604 173 L 604 215 L 590 247 L 560 269 L 514 269 L 487 247 L 475 224 L 470 197 L 474 154 L 485 110 L 501 86 L 517 75 Z M 691 272 L 626 436 L 602 459 L 455 452 L 360 280 Z M 692 513 L 703 563 L 651 685 L 413 699 L 380 546 L 396 509 Z M 365 794 L 382 761 L 709 767 L 667 860 L 600 942 L 459 949 L 392 858 Z",
        badge: { x: 540, y: 360 }
      }
    ]
  },
  face: {
    title: "Esqueleto Facial Menor & Nariz",
    subtitle: "Nasais, Palatinos, Zigomáticos, Conchas, Lacrimais e Vômer",
    plateNumber: "Figura 5.2 (Pág. 31)",
    imageSrc: "/images/anatomical/cranio_grupo3_face_pequenos.png",
    bones: ["Nasal direito", "Nasal esquerdo", "Palatino direito", "Palatino esquerdo", "Zigomático direito", "Zigomático esquerdo", "Concha nasal inferior direita", "Concha nasal inferior esquerda", "Lacrimal direito", "Lacrimal esquerdo", "Vômer"],
    hotspots: [
      {
        id: "Nasal direito",
        name: "Nasal direito",
        path: "M 212 93 L 212 193 L 175 192 L 175 158 L 185 108 L 198 97 Z",
        badge: { x: 195, y: 140 }
      },
      {
        id: "Nasal esquerdo",
        name: "Nasal esquerdo",
        path: "M 212 93 L 233 112 L 244 182 L 242 190 L 238 193 L 212 192 Z",
        badge: { x: 235, y: 140 }
      },
      {
        id: "Palatino direito",
        name: "Palatino direito",
        path: "M 510 76 L 600 79 L 600 223 L 470 225 Z",
        badge: { x: 535, y: 145 }
      },
      {
        id: "Palatino esquerdo",
        name: "Palatino esquerdo",
        path: "M 600 76 L 668 79 L 711 223 L 600 225 Z",
        badge: { x: 665, y: 145 }
      },
      {
        id: "Zigomático direito",
        name: "Zigomático direito",
        path: "M 203 264 L 217 265 L 267 298 L 288 383 L 236 449 L 210 449 L 140 374 L 189 270 Z M 389 788 L 389 819 L 329 839 L 315 827 L 315 788 L 334 760 Z",
        badge: { x: 240, y: 340 }
      },
      {
        id: "Zigomático esquerdo",
        name: "Zigomático esquerdo (Crânio E)",
        path: "M 692 770 L 687 859 L 665 859 L 665 789 L 673 770 Z",
        badge: { x: 705, y: 815 }
      },
      {
        id: "Concha nasal inferior direita",
        name: "Concha nasal inf. direita",
        path: "M 520 337 L 561 302 L 595 314 L 595 360 L 591 366 L 564 360 Z M 599 810 L 599 854 L 575 854 L 575 810 Z",
        badge: { x: 550, y: 330 }
      },
      {
        id: "Concha nasal inferior esquerda",
        name: "Concha nasal inf. esquerda",
        path: "M 595 302 L 621 314 L 661 349 L 635 360 L 595 366 Z M 615 810 L 639 810 L 639 842 L 631 842 L 615 827 Z",
        badge: { x: 640, y: 330 }
      },
      {
        id: "Lacrimal direito",
        name: "Lacrimal direito",
        path: "M 215 526 L 249 557 L 249 565 L 220 614 L 210 619 L 184 590 L 181 584 L 181 569 L 189 546 Z",
        badge: { x: 210, y: 570 }
      },
      {
        id: "Lacrimal esquerdo",
        name: "Lacrimal esquerdo (Órbita E)",
        path: "M 630 776 L 640 775 L 659 783 L 659 814 L 630 814 Z",
        badge: { x: 645, y: 790 }
      },
      {
        id: "Vômer",
        name: "Vômer (Septo Nasal)",
        path: "M 579 471 L 619 481 L 613 543 L 598 599 L 594 599 L 577 477 Z M 617 810 L 617 859 L 598 859 L 598 810 Z",
        badge: { x: 605, y: 525 }
      }
    ]
  },
  mandibula_cervical: {
    title: "Arcadas Dentárias & Mandíbula",
    subtitle: "Maxilas, Mandíbula, Hióide e Estruturas Anexas",
    plateNumber: "Figura 5.1 (Pág. 29)",
    imageSrc: "/images/anatomical/cranio_grupo4_arcadas_mandibula.png",
    bones: ["Mandíbula", "Maxila direita", "Maxila esquerda", "Hióide"],
    hotspots: [
      {
        id: "Mandíbula",
        name: "Mandíbula (Corpo, Ramos & Crânio)",
        path: "M 302 119 L 309 145 L 264 268 L 108 309 L 80 286 L 80 200 L 164 82 L 210 86 Z M 311 377 L 311 446 L 259 514 L 201 548 L 91 564 L 80 557 L 80 473 L 238 356 Z M 565 289 L 541 331 L 491 379 L 396 392 L 371 386 L 349 366 L 349 352 L 410 235 L 444 233 Z M 260 793 L 298 780 L 359 780 L 469 886 L 469 903 L 347 914 L 289 874 L 260 841 Z M 673 903 L 656 924 L 597 912 L 551 880 L 540 835 L 679 835 L 679 886 Z",
        badge: { x: 240, y: 200 }
      },
      {
        id: "Maxila direita",
        name: "Maxila direita (Lateral & Crânio)",
        path: "M 698 79 L 726 122 L 734 160 L 732 236 L 709 250 L 658 252 L 615 245 L 595 230 L 590 213 L 589 154 L 596 126 L 608 107 L 689 77 Z M 609 750 L 609 844 L 544 844 L 535 839 L 535 750 Z",
        badge: { x: 665, y: 170 }
      },
      {
        id: "Maxila esquerda",
        name: "Maxila esquerda (Medial & Crânio)",
        path: "M 729 412 L 738 434 L 730 500 L 707 518 L 603 550 L 574 515 L 595 418 L 628 363 Z M 684 779 L 684 844 L 610 844 L 610 750 L 662 764 Z",
        badge: { x: 665, y: 455 }
      },
      {
        id: "Hióide",
        name: "Hióide (Cervical)",
        path: "M 240 935 L 520 935 L 520 965 L 240 965 Z",
        badge: { x: 380, y: 950 }
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
