import React, { useState } from 'react';
import { ToothRecord } from '../types/sgccco';
import { Plus, X } from 'lucide-react';

type DenticaoMode = 'permanente' | 'mista' | 'decidua';
type QuadrantePar = 1 | 2 | 3 | 4;
type LadoPar = 'permanente' | 'decidua';

interface SupernumeraryTooth {
  id: string;
  descricaoPosicao: string;
}

interface OdontogramViewerProps {
  teeth: ToothRecord[];
  onUpdateTooth?: (toothNumber: number, condition: ToothRecord['condition'], notes?: string) => void;
  onBulkMarkTeeth?: (toothNumbers: number[], condition: ToothRecord['condition']) => void;
  denticao?: DenticaoMode;
  onSetDenticao?: (d: DenticaoMode) => void;
  denticaoQuadrantePares?: Partial<Record<QuadrantePar, LadoPar>>;
  onSetQuadrantePar?: (quadrante: QuadrantePar, lado: LadoPar) => void;
  supernumeraryTeeth?: SupernumeraryTooth[];
  onSetSupernumeraryTeeth?: (list: SupernumeraryTooth[]) => void;
  readOnly?: boolean;
}

// Par anatômico entre quadrante permanente (1-4) e seu correspondente
// decíduo (5-8) — mesma posição na boca, nunca os dois ao mesmo tempo numa
// dentição mista.
const DECIDUOUS_QUADRANT_OF: Record<QuadrantePar, 5 | 6 | 7 | 8> = { 1: 5, 2: 6, 3: 7, 4: 8 };
const PERMANENT_QUADRANT_OF: Record<5 | 6 | 7 | 8, QuadrantePar> = { 5: 1, 6: 2, 7: 3, 8: 4 };
const QUADRANT_PAIR_LABEL: Record<QuadrantePar, string> = {
  1: 'Superior Direito',
  2: 'Superior Esquerdo',
  3: 'Inferior Esquerdo',
  4: 'Inferior Direito'
};

export const OdontogramViewer: React.FC<OdontogramViewerProps> = ({
  teeth,
  onUpdateTooth,
  onBulkMarkTeeth,
  denticao = 'permanente',
  onSetDenticao,
  denticaoQuadrantePares,
  onSetQuadrantePar,
  supernumeraryTeeth = [],
  onSetSupernumeraryTeeth,
  readOnly = false
}) => {
  const [selectedTooth, setSelectedTooth] = useState<ToothRecord | null>(null);
  const [toothNotes, setToothNotes] = useState('');
  const [novaDescricaoSupranumerario, setNovaDescricaoSupranumerario] = useState('');

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

  // Qual lado (permanente/decídua) está ativo pro par de quadrante que
  // contém este número de dente — fora da dentição mista, o lado ativo é
  // sempre o da própria dentição escolhida.
  const activeSideForQuadrant = (quadrant: number): LadoPar => {
    if (denticao !== 'mista') return denticao === 'decidua' ? 'decidua' : 'permanente';
    const permQuadrant = (quadrant <= 4 ? quadrant : PERMANENT_QUADRANT_OF[quadrant as 5 | 6 | 7 | 8]) as QuadrantePar;
    return denticaoQuadrantePares?.[permQuadrant] ?? 'permanente';
  };
  const isQuadrantEditable = (quadrant: number): boolean => {
    const thisSide: LadoPar = quadrant <= 4 ? 'permanente' : 'decidua';
    return activeSideForQuadrant(quadrant) === thisSide;
  };

  // Layout ISO 3950 (permanente):
  // Upper Right (18 to 11) | Upper Left (21 to 28)
  // Lower Right (48 to 41) | Lower Left (31 to 38)
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  // Mesmo posicionamento anatômico, dentição decídua.
  const upperRightDeciduous = [55, 54, 53, 52, 51];
  const upperLeftDeciduous = [61, 62, 63, 64, 65];
  const lowerRightDeciduous = [85, 84, 83, 82, 81];
  const lowerLeftDeciduous = [71, 72, 73, 74, 75];

  const showPermanent = denticao === 'permanente' || denticao === 'mista';
  const showDeciduous = denticao === 'decidua' || denticao === 'mista';

  // Dentes editáveis de cada arcada agora — base das ações "Edêntulo em
  // lote" abaixo, pra nunca tocar o lado inativo do par (mista) nem a outra
  // arcada.
  const maxilaEditableNumbers = [
    ...(showPermanent ? upperRight.filter(n => isQuadrantEditable(1)) : []),
    ...(showPermanent ? upperLeft.filter(n => isQuadrantEditable(2)) : []),
    ...(showDeciduous ? upperRightDeciduous.filter(n => isQuadrantEditable(5)) : []),
    ...(showDeciduous ? upperLeftDeciduous.filter(n => isQuadrantEditable(6)) : [])
  ];
  const mandibulaEditableNumbers = [
    ...(showPermanent ? lowerLeft.filter(n => isQuadrantEditable(3)) : []),
    ...(showPermanent ? lowerRight.filter(n => isQuadrantEditable(4)) : []),
    ...(showDeciduous ? lowerLeftDeciduous.filter(n => isQuadrantEditable(7)) : []),
    ...(showDeciduous ? lowerRightDeciduous.filter(n => isQuadrantEditable(8)) : [])
  ];

  const archIsAllCondition = (numbers: number[], condition: ToothRecord['condition']) =>
    numbers.length > 0 && numbers.every(n => getTooth(n)?.condition === condition);

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

  const handleAddSupernumerary = () => {
    if (!novaDescricaoSupranumerario.trim() || !onSetSupernumeraryTeeth) return;
    onSetSupernumeraryTeeth([
      ...supernumeraryTeeth,
      { id: `supranumerario-${Date.now()}`, descricaoPosicao: novaDescricaoSupranumerario.trim() }
    ]);
    setNovaDescricaoSupranumerario('');
  };
  const handleRemoveSupernumerary = (id: string) => {
    if (!onSetSupernumeraryTeeth) return;
    onSetSupernumeraryTeeth(supernumeraryTeeth.filter(s => s.id !== id));
  };

  const renderToothButton = (num: number, editable: boolean, numberFirst: boolean) => {
    const tooth = getTooth(num);
    const cond = tooth ? conditionLabels[tooth.condition] : conditionLabels.higido;
    const isSel = selectedTooth?.toothNumberFdi === num;
    const content = (
      <>
        <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">{num}</span>
        <span className="text-[9px] truncate max-w-full font-sans font-medium text-slate-600 dark:text-slate-300">
          {tooth?.condition.substring(0, 3).toUpperCase()}
        </span>
      </>
    );
    return (
      <button
        key={num}
        disabled={!editable}
        onClick={() => editable && tooth && handleSelectTooth(tooth)}
        title={!editable ? 'Lado inativo deste par de quadrante na dentição mista.' : undefined}
        className={`h-14 rounded-md border flex flex-col items-center justify-between p-1 text-center transition-all ${cond.bg} ${
          isSel ? 'ring-2 ring-sky-600 scale-105 z-10' : editable ? 'hover:opacity-90' : 'opacity-35 cursor-not-allowed'
        }`}
      >
        {numberFirst ? content : <>{content}</>}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Inventário Odontológico (Padrão FDI / ISO 3950)
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Clique num dente para inspecionar ou alterar a condição clínica.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
            {teeth.filter(t => t.condition !== 'higido').length} anomalias registradas
          </span>
        </div>
      </div>

      {/* Seletor de Dentição */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Dentição:</span>
        <div className="flex gap-1.5">
          {(['permanente', 'mista', 'decidua'] as DenticaoMode[]).map((d) => (
            <button
              key={d}
              type="button"
              disabled={readOnly}
              onClick={() => onSetDenticao?.(d)}
              className={`px-2.5 py-1 rounded text-[11px] border transition-colors disabled:opacity-50 ${
                denticao === d
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold border-transparent'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {d === 'permanente' ? 'Permanente' : d === 'mista' ? 'Mista' : 'Decídua'}
            </button>
          ))}
        </div>

        {denticao === 'mista' && (
          <div className="flex flex-wrap items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            {([1, 2, 3, 4] as QuadrantePar[]).map((q) => {
              const lado = denticaoQuadrantePares?.[q] ?? 'permanente';
              return (
                <div key={q} className="flex items-center gap-1 text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400">{QUADRANT_PAIR_LABEL[q]}:</span>
                  {(['permanente', 'decidua'] as LadoPar[]).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      disabled={readOnly}
                      onClick={() => onSetQuadrantePar?.(q, lv)}
                      className={`px-1.5 py-0.5 rounded border transition-colors disabled:opacity-50 ${
                        lado === lv
                          ? 'bg-sky-600 text-white border-transparent font-semibold'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {lv === 'permanente' ? 'Perm.' : 'Decíd.'}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Marcação em lote — Edêntulo */}
      {!readOnly && (maxilaEditableNumbers.length > 0 || mandibulaEditableNumbers.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Edêntulo em lote:</span>
          {maxilaEditableNumbers.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onBulkMarkTeeth?.(maxilaEditableNumbers, 'ausente_ante_mortem')}
                className={`px-2 py-1 rounded border ${
                  archIsAllCondition(maxilaEditableNumbers, 'ausente_ante_mortem')
                    ? 'bg-purple-600 text-white border-transparent font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Maxila — ante-mortem
              </button>
              <button
                type="button"
                onClick={() => onBulkMarkTeeth?.(maxilaEditableNumbers, 'ausente_post_mortem')}
                className={`px-2 py-1 rounded border ${
                  archIsAllCondition(maxilaEditableNumbers, 'ausente_post_mortem')
                    ? 'bg-amber-600 text-white border-transparent font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Maxila — post-mortem
              </button>
            </>
          )}
          {mandibulaEditableNumbers.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onBulkMarkTeeth?.(mandibulaEditableNumbers, 'ausente_ante_mortem')}
                className={`px-2 py-1 rounded border ${
                  archIsAllCondition(mandibulaEditableNumbers, 'ausente_ante_mortem')
                    ? 'bg-purple-600 text-white border-transparent font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Mandíbula — ante-mortem
              </button>
              <button
                type="button"
                onClick={() => onBulkMarkTeeth?.(mandibulaEditableNumbers, 'ausente_post_mortem')}
                className={`px-2 py-1 rounded border ${
                  archIsAllCondition(mandibulaEditableNumbers, 'ausente_post_mortem')
                    ? 'bg-amber-600 text-white border-transparent font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Mandíbula — post-mortem
              </button>
            </>
          )}
          <span className="text-slate-400 dark:text-slate-500">
            Editar qualquer dente manualmente tira a marcação de edêntulo do botão.
          </span>
        </div>
      )}

      {/* Visual Chart ISO 3950 — Dentição Permanente */}
      {showPermanent && (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[580px] space-y-4">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold text-center mb-1">
                Maxila (Arcada Superior)
              </div>
              <div className="grid grid-cols-16 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                {upperRight.map(num => renderToothButton(num, isQuadrantEditable(1), true))}
                {upperLeft.map(num => renderToothButton(num, isQuadrantEditable(2), true))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 w-full"></div>
              <span className="absolute bg-white dark:bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase">
                Linha de Oclusão
              </span>
            </div>

            <div>
              <div className="grid grid-cols-16 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                {lowerRight.map(num => renderToothButton(num, isQuadrantEditable(4), false))}
                {lowerLeft.map(num => renderToothButton(num, isQuadrantEditable(3), false))}
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold text-center mt-1">
                Mandíbula (Arcada Inferior)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Chart — Dentição Decídua */}
      {showDeciduous && (
        <div className="overflow-x-auto pb-2 mt-2">
          <div className="min-w-[380px] space-y-4">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold text-center mb-1">
                Maxila Decídua (Arcada Superior)
              </div>
              <div className="grid grid-cols-10 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                {upperRightDeciduous.map(num => renderToothButton(num, isQuadrantEditable(5), true))}
                {upperLeftDeciduous.map(num => renderToothButton(num, isQuadrantEditable(6), true))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 w-full"></div>
              <span className="absolute bg-white dark:bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase">
                Linha de Oclusão
              </span>
            </div>

            <div>
              <div className="grid grid-cols-10 gap-1 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800">
                {lowerRightDeciduous.map(num => renderToothButton(num, isQuadrantEditable(8), false))}
                {lowerLeftDeciduous.map(num => renderToothButton(num, isQuadrantEditable(7), false))}
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold text-center mt-1">
                Mandíbula Decídua (Arcada Inferior)
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Dentes Supranumerários */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        <h5 className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-2">
          Dentes Supranumerários
        </h5>
        <div className="space-y-2">
          {supernumeraryTeeth.length === 0 && (
            <p className="text-[11px] text-slate-400 italic">Nenhum dente supranumerário registrado.</p>
          )}
          {supernumeraryTeeth.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs">
                {s.descricaoPosicao}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  aria-label="Remover dente supranumerário"
                  onClick={() => handleRemoveSupernumerary(s.id)}
                  className="shrink-0 w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={novaDescricaoSupranumerario}
                placeholder="Descreva a posição (ex: mesiodente entre os incisivos centrais superiores)"
                onChange={(e) => setNovaDescricaoSupranumerario(e.target.value)}
                className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
              <button
                type="button"
                onClick={handleAddSupernumerary}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
