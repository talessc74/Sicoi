import React, { useState, useRef } from 'react';
import { ComplementaryExam } from '../types/sgccco';
import { ZoomIn, ZoomOut, RotateCw, Layers, Crosshair, Sliders, Maximize2 } from 'lucide-react';

interface DicomViewerProps {
  exam: ComplementaryExam;
  onClose?: () => void;
}

export const DicomViewer: React.FC<DicomViewerProps> = ({ exam, onClose }) => {
  const [currentSlice, setCurrentSlice] = useState(32);
  const [totalSlices] = useState(exam.dicomMetadata?.slicesCount || 64);
  const [windowPreset, setWindowPreset] = useState<'bone' | 'soft' | 'invert'>('bone');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePlane, setActivePlane] = useState<'axial' | 'sagital' | 'coronal'>('axial');
  const [crosshairPos, setCrosshairPos] = useState({ x: 220, y: 190 });
  const [showCrosshair, setShowCrosshair] = useState(true);

  // Simulated Hounsfield Units calculation based on crosshair distance from center
  const getHuValue = (x: number, y: number) => {
    const dist = Math.hypot(x - 250, y - 220);
    if (dist < 40) return Math.round(1180 - dist * 3); // Cortical Bone (+1000 to +1200 HU)
    if (dist < 90) return Math.round(450 - dist * 2);  // Trabecular Bone (+300 to +500 HU)
    if (dist < 150) return Math.round(45 - dist * 0.2); // Soft tissue res
    return -980; // Air (-1000 HU)
  };

  const currentHu = getHuValue(crosshairPos.x, crosshairPos.y);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setCrosshairPos({ x, y });
  };

  return (
    <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-semibold">
            <Layers className="w-4 h-4" />
            <span>DICOM 3.0 · {exam.fileName}</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono text-[11px]">
            ID: {exam.dicomMetadata?.patientPseudoId || 'ANON'}
          </span>
          <span className="text-slate-400 font-mono text-[11px] hidden md:inline">
            Série: {exam.dicomMetadata?.seriesDescription}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Plane selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px]">
            {(['axial', 'sagital', 'coronal'] as const).map(plane => (
              <button
                key={plane}
                onClick={() => setActivePlane(plane)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  activePlane === plane ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                {plane}
              </button>
            ))}
          </div>

          {/* Preset selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px]">
            <button
              onClick={() => setWindowPreset('bone')}
              className={`px-2 py-1 rounded ${windowPreset === 'bone' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400'}`}
              title="Janela Óssea (W: 2000, L: 500)"
            >
              Janela Óssea
            </button>
            <button
              onClick={() => setWindowPreset('soft')}
              className={`px-2 py-1 rounded ${windowPreset === 'soft' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400'}`}
              title="Janela Tecidos (W: 400, L: 50)"
            >
              Tecidos
            </button>
            <button
              onClick={() => setWindowPreset('invert')}
              className={`px-2 py-1 rounded ${windowPreset === 'invert' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400'}`}
              title="Inverter Contraste"
            >
              Invertido
            </button>
          </div>

          {/* Crosshair toggle */}
          <button
            onClick={() => setShowCrosshair(!showCrosshair)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showCrosshair ? 'bg-cyan-950/60 border-cyan-800 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Mira Hounsfield"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Zoom buttons */}
          <button
            onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(Math.max(0.75, zoomLevel - 0.25))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 bg-black min-h-[420px]">
        {/* Visualizer Canvas Display */}
        <div
          className="lg:col-span-3 relative flex items-center justify-center p-4 overflow-hidden select-none cursor-crosshair"
          onMouseMove={handleCanvasMouseMove}
        >
          {/* Overlay HUD Technical Legend */}
          <div className="absolute top-3 left-3 z-20 text-[10px] font-mono text-cyan-400 space-y-0.5 pointer-events-none bg-black/60 p-2 rounded backdrop-blur-xs">
            <div>MOD: CT · KVP: {exam.parametersExtractedByMethodPrepop.kVp || 120} kV</div>
            <div>ESPESSURA: {exam.parametersExtractedByMethodPrepop.sliceThicknessMm || 0.625} mm</div>
            <div>CORTE: {currentSlice} / {totalSlices} ({activePlane.toUpperCase()})</div>
            <div>DENSIDADE: <span className="text-white font-bold">{currentHu} HU</span></div>
          </div>

          <div className="absolute top-3 right-3 z-20 text-[10px] font-mono text-slate-400 pointer-events-none text-right bg-black/60 p-2 rounded backdrop-blur-xs">
            <div>W: {windowPreset === 'bone' ? 2000 : 400} L: {windowPreset === 'bone' ? 500 : 50}</div>
            <div>ZOOM: {(zoomLevel * 100).toFixed(0)}%</div>
            <div>SIGCOI-DICOM v3.2</div>
          </div>

          {/* Simulated Osteological CT Slice Rendering */}
          <div
            className="relative transition-transform duration-75 flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <svg
              width="440"
              height="400"
              viewBox="0 0 500 450"
              className={`rounded-lg transition-colors ${
                windowPreset === 'invert' ? 'filter invert contrast-125' : windowPreset === 'soft' ? 'contrast-75' : 'contrast-150'
              }`}
            >
              <defs>
                <radialGradient id="boneGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#e2e8f0" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#64748b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </radialGradient>
                <radialGradient id="trabecularPattern" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
                </radialGradient>
              </defs>

              {/* Background scanner field */}
              <circle cx="250" cy="225" r="210" fill="#05070a" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

              {/* Anatomical Bone Cross Section (Femoral Diaphysis with Callus) */}
              <g transform={`translate(${currentSlice % 4 - 2}, ${currentSlice % 3 - 1})`}>
                {/* Periosteal cortical border */}
                <ellipse cx="250" cy="225" rx={75 + (currentSlice > 30 && currentSlice < 45 ? 18 : 0)} ry={85} fill="#090d16" stroke="#f8fafc" strokeWidth="16" />
                
                {/* Healing Callus prominence on lateral border (Pathology) */}
                {currentSlice >= 25 && currentSlice <= 45 && (
                  <path
                    d="M 325 190 Q 365 225 325 260 Z"
                    fill="#f1f5f9"
                    stroke="#ffffff"
                    strokeWidth="4"
                    opacity="0.9"
                  />
                )}

                {/* Medullary Canal (Cavidade Medular) */}
                <ellipse cx="250" cy="225" rx="42" ry="48" fill="url(#trabecularPattern)" stroke="#64748b" strokeWidth="4" />

                {/* Trabecular micro-mesh */}
                <circle cx="240" cy="220" r="15" fill="#334155" opacity="0.6" />
                <circle cx="260" cy="235" r="12" fill="#334155" opacity="0.6" />
              </g>

              {/* Scale bar (50mm) */}
              <line x1="50" y1="410" x2="150" y2="410" stroke="#06b6d4" strokeWidth="3" />
              <text x="75" y="402" fill="#06b6d4" fontSize="10" fontFamily="monospace">50 mm</text>
            </svg>

            {/* Crosshair probe */}
            {showCrosshair && (
              <div
                className="absolute pointer-events-none"
                style={{ left: `${crosshairPos.x}px`, top: `${crosshairPos.y}px` }}
              >
                <div className="w-6 h-6 -ml-3 -mt-3 border border-cyan-400/80 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel: Slice Scrubber & Metadata */}
        <div className="p-4 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between text-xs space-y-4">
          <div>
            <h5 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Controle de Cortes (Slices)
            </h5>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between font-mono text-[11px] text-slate-400">
                <span>Corte Atual:</span>
                <span className="text-white font-bold">{currentSlice} de {totalSlices}</span>
              </div>
              <input
                type="range"
                min="1"
                max={totalSlices}
                value={currentSlice}
                onChange={(e) => setCurrentSlice(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Proximal (C1)</span>
                <span>Distal (C{totalSlices})</span>
              </div>
            </div>

            {/* Parâmetros normalizados de método (§16) */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold block">
                Parâmetros Pré-preenchidos de Método (§9)
              </span>
              <p className="text-[11px] text-slate-300">
                Normalizados a partir dos metadados da imagem tomográfica:
              </p>
              <div className="font-mono text-[11px] space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>kVp:</span>
                  <span className="text-white">{exam.parametersExtractedByMethodPrepop.kVp || 120}</span>
                </div>
                <div className="flex justify-between">
                  <span>Espessura:</span>
                  <span className="text-white">{exam.parametersExtractedByMethodPrepop.sliceThicknessMm || 0.625} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Hounsfield Médio:</span>
                  <span className="text-white">{exam.parametersExtractedByMethodPrepop.hounsfieldMean || 1150} HU</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Visualizador DICOM nativo sem dependência de plugins externos. Roda em tablet de bancada.
          </div>
        </div>
      </div>
    </div>
  );
};
