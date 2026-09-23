import React, { useState } from 'react';
import { ToothRecord } from '../types/sgccco';

interface OdontogramViewerProps {
  teeth: ToothRecord[];
  onUpdateTooth?: (toothNumber: number, condition: ToothRecord['condition'], notes?: string) => void;
  readOnly?: boolean;
}

export const OdontogramViewer: React.FC<OdontogramViewerProps> = ({
  teeth,
  onUpdateTooth,
  readOnly = false
}) => {
  const [selectedTooth, setSelectedTooth] = useState<ToothRecord | null>(null);
  const [toothNotes, setToothNotes] = useState('');

  const conditionLabels: Record<ToothRecord['condition'], { label: string; color: string; bg: string }> = {
    higido: { label: 'Hígido', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300' },
    ausente_ante_mortem: { label: 'Ausente Ante-Mortem (Alvéolo Fechado)', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300' },
    ausente_post_mortem: { label: 'Ausente Post-Mortem (Alvéolo Aberto)', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300' },
    carie: { label: 'Cárie Dentária', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300' },
    restauracao: { label: 'Restauração Odontológica', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300' },
    desgaste_severo: { label: 'Desgaste Severo / Faceta', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-950/60 border-orange-300' },
    raiz_residual: { label: 'Raiz Residual', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-200 dark:bg-slate-800 border-slate-400' },
    nao_erupcionado: { label: 'Não Erupcionado / Incluso', color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300' }
  };

  const getTooth = (num: number) => teeth.find(t => t.toothNumberFdi === num);

  // Layout ISO 3950:
  // Upper Right (18 to 11) | Upper Left (21 to 28)
  // Lower Right (48 to 41) | Lower Left (31 to 38)
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  const handleSelectTooth = (t: ToothRecord) => {
    setSelectedTooth(t);
    setToothNotes(t.notes || '');
  };

  const handleChangeCondition = (cond: ToothRecord['condition']) => {
    if (selectedTooth && onUpdateTooth && !readOnly) {
      onUpdateTooth(selectedTooth.toothNumberFdi, cond, toothNotes);
      setSelectedTooth({ ...selectedTooth, condition: cond, notes: toothNotes });
    }
  };

  const handleSaveNotes = () => {
    if (selectedTooth && onUpdateTooth && !readOnly) {
      onUpdateTooth(selectedTooth.toothNumberFdi, selectedTooth.condition, toothNotes);
      setSelectedTooth({ ...selectedTooth, notes: toothNotes });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Odontograma Forense (Padrão FDI / ISO 3950)
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Dentadura permanente · 32 elementos anatômicos · Clique para inspecionar ou alterar
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
            {teeth.filter(t => t.condition !== 'higido').length} anomalias registradas
          </span>
        </div>
      </div>

      {/* Visual Chart ISO 3950 */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[580px] space-y-4">
          {/* Maxila Superior */}
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold text-center mb-1">
              Maxila Superior (Arcada Superior)
            </div>
            <div className="grid grid-cols-16 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
              {upperRight.map(num => {
                const tooth = getTooth(num);
                const cond = tooth ? conditionLabels[tooth.condition] : conditionLabels.higido;
                const isSel = selectedTooth?.toothNumberFdi === num;
                return (
                  <button
                    key={num}
                    onClick={() => tooth && handleSelectTooth(tooth)}
                    className={`h-14 rounded-md border flex flex-col items-center justify-between p-1 text-center transition-all ${
                      cond.bg
                    } ${isSel ? 'ring-2 ring-sky-600 scale-105 z-10' : 'hover:opacity-90'}`}
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">{num}</span>
                    <span className="text-[9px] truncate max-w-full font-sans font-medium text-slate-600 dark:text-slate-300">
                      {tooth?.condition.substring(0, 3).toUpperCase()}
                    </span>
                  </button>
                );
              })}
              {upperLeft.map(num => {
                const tooth = getTooth(num);
                const cond = tooth ? conditionLabels[tooth.condition] : conditionLabels.higido;
                const isSel = selectedTooth?.toothNumberFdi === num;
                return (
                  <button
                    key={num}
                    onClick={() => tooth && handleSelectTooth(tooth)}
                    className={`h-14 rounded-md border flex flex-col items-center justify-between p-1 text-center transition-all ${
                      cond.bg
                    } ${isSel ? 'ring-2 ring-sky-600 scale-105 z-10' : 'hover:opacity-90'}`}
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">{num}</span>
                    <span className="text-[9px] truncate max-w-full font-sans font-medium text-slate-600 dark:text-slate-300">
                      {tooth?.condition.substring(0, 3).toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linha Média */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-dashed border-slate-300 dark:border-slate-700 w-full"></div>
            <span className="absolute bg-white dark:bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase">
              Linha de Oclusão
            </span>
          </div>

          {/* Mandíbula Inferior */}
          <div>
            <div className="grid grid-cols-16 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
              {lowerRight.map(num => {
                const tooth = getTooth(num);
                const cond = tooth ? conditionLabels[tooth.condition] : conditionLabels.higido;
                const isSel = selectedTooth?.toothNumberFdi === num;
                return (
                  <button
                    key={num}
                    onClick={() => tooth && handleSelectTooth(tooth)}
                    className={`h-14 rounded-md border flex flex-col items-center justify-between p-1 text-center transition-all ${
                      cond.bg
                    } ${isSel ? 'ring-2 ring-sky-600 scale-105 z-10' : 'hover:opacity-90'}`}
                  >
                    <span className="text-[9px] truncate max-w-full font-sans font-medium text-slate-600 dark:text-slate-300">
                      {tooth?.condition.substring(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">{num}</span>
                  </button>
                );
              })}
              {lowerLeft.map(num => {
                const tooth = getTooth(num);
                const cond = tooth ? conditionLabels[tooth.condition] : conditionLabels.higido;
                const isSel = selectedTooth?.toothNumberFdi === num;
                return (
                  <button
                    key={num}
                    onClick={() => tooth && handleSelectTooth(tooth)}
                    className={`h-14 rounded-md border flex flex-col items-center justify-between p-1 text-center transition-all ${
                      cond.bg
                    } ${isSel ? 'ring-2 ring-sky-600 scale-105 z-10' : 'hover:opacity-90'}`}
                  >
                    <span className="text-[9px] truncate max-w-full font-sans font-medium text-slate-600 dark:text-slate-300">
                      {tooth?.condition.substring(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">{num}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold text-center mt-1">
              Mandíbula (Arcada Inferior)
            </div>
          </div>
        </div>
      </div>

      {/* Editor do Dente Selecionado */}
      {selectedTooth && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                Dente #{selectedTooth.toothNumberFdi}
              </span>
              <span className="text-slate-500 ml-2 font-mono">
                (Quadrante {selectedTooth.quadrant})
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded font-medium border ${conditionLabels[selectedTooth.condition].bg} ${conditionLabels[selectedTooth.condition].color}`}>
              {conditionLabels[selectedTooth.condition].label}
            </span>
          </div>

          {!readOnly && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Alterar Condição Clínica:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(conditionLabels) as ToothRecord['condition'][]).map(cond => (
                    <button
                      key={cond}
                      onClick={() => handleChangeCondition(cond)}
                      className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                        selectedTooth.condition === cond
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {conditionLabels[cond].label.split('(')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Observações Antropológicas / Detalhes de Desgaste ou Restauração:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={toothNotes}
                    onChange={(e) => setToothNotes(e.target.value)}
                    placeholder="Ex: Restauração oclusal com amálgama; cúspide vestibular fraturada..."
                    className="flex-1 p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 rounded bg-sky-600 text-white font-medium hover:bg-sky-500 transition-colors"
                  >
                    Salvar Nota
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
