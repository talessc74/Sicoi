import React, { useState } from 'react';
import {
  ToothRecord,
  ToothPresenceCondition,
  ToothClinicalCondition
} from '../types/sgccco';
import { Plus, X, Check, Info } from 'lucide-react';

export type DenticaoMode = 'permanente' | 'mista' | 'decidua';

export interface SupernumeraryTooth {
  id: string;
  descricaoPosicao: string;
  arch?: 'maxila' | 'mandibula';
}

export interface OdontogramViewerProps {
  teeth: ToothRecord[];
  onUpdateTooth?: (
    toothNumber: number,
    update: {
      presence: ToothPresenceCondition;
      clinicalConditions: ToothClinicalCondition[];
      condition: ToothRecord['condition'];
    },
    notes?: string
  ) => void;
  onBulkMarkTeeth?: (
    toothNumbers: number[],
    mark: {
      presence: ToothPresenceCondition;
      condition: ToothRecord['condition'];
    }
  ) => void;
  denticao?: DenticaoMode;
  onSetDenticao?: (d: DenticaoMode) => void;
  denticaoQuadrantePares?: Partial<Record<1 | 2 | 3 | 4, 'permanente' | 'decidua'>>;
  onSetQuadrantePar?: (quadrante: 1 | 2 | 3 | 4, lado: 'permanente' | 'decidua') => void;
  mistaActiveDeciduous?: number[];
  onSetMistaActiveDeciduous?: (list: number[]) => void;
  supernumeraryTeeth?: SupernumeraryTooth[];
  onSetSupernumeraryTeeth?: (list: SupernumeraryTooth[]) => void;
  readOnly?: boolean;
}

// Mapeamento anatômico de pares entre dentes permanentes (11-15, 21-25, 31-35, 41-45)
// e seus correspondentes decíduos (51-55, 61-65, 71-75, 81-85).
export const PAIR_MAP: Record<number, number> = {
  15: 55, 14: 54, 13: 53, 12: 52, 11: 51,
  21: 61, 22: 62, 23: 63, 24: 64, 25: 65,
  45: 85, 44: 84, 43: 83, 42: 82, 41: 81,
  31: 71, 32: 72, 33: 73, 34: 74, 35: 75,
  // Reverso (decíduo -> permanente)
  55: 15, 54: 14, 53: 13, 52: 12, 51: 11,
  61: 21, 62: 22, 63: 23, 64: 24, 65: 25,
  85: 45, 84: 44, 83: 43, 82: 42, 81: 41,
  71: 31, 72: 32, 73: 33, 74: 34, 75: 35
};

// Metadados das 4 opções obrigatórias do Estágio 1 (Presença)
export const PRESENCE_CONDITIONS_META: Record<
  ToothPresenceCondition,
  { label: string; abbr: string; description: string }
> = {
  articulado: {
    label: 'Articulado',
    abbr: 'ART',
    description: 'Elemento presente na arcada e articulado no alvéolo ósseo.'
  },
  desarticulado: {
    label: 'Desarticulado',
    abbr: 'DES',
    description: 'Elemento presente avulso ou fora da articulação alveolar.'
  },
  ausente_ante_mortem: {
    label: 'Ausente ante-mortem',
    abbr: 'AAM',
    description: 'Perda dentária ocorrida em vida com fechamento/reabsorção do alvéolo.'
  },
  ausente_post_mortem: {
    label: 'Ausente post-mortem',
    abbr: 'APM',
    description: 'Perda dentária post-mortem com alvéolo ósseo aberto e vazio.'
  }
};

// Metadados das 17 características clínicas do Estágio 2 (Múltipla escolha)
export const CLINICAL_CONDITIONS_META: Record<
  ToothClinicalCondition,
  { label: string; abbr: string; category: 'irrupcao' | 'higido' | 'patologia' | 'intervencao' | 'alinhamento' }
> = {
  parcialmente_irrompido: { label: 'Parcialmente irrompido', abbr: 'PIR', category: 'irrupcao' },
  nao_irrompido: { label: 'Não irrompido', abbr: 'NIR', category: 'irrupcao' },
  higido: { label: 'Hígido', abbr: 'HIG', category: 'higido' },
  cariado: { label: 'Cariado', abbr: 'CAR', category: 'patologia' },
  mancha: { label: 'Mancha', abbr: 'MAN', category: 'patologia' },
  resto_radicular: { label: 'Resto radicular', abbr: 'RAD', category: 'patologia' },
  fratura: { label: 'Fratura', abbr: 'FRA', category: 'patologia' },
  com_material_restaurador: { label: 'Com material restaurador', abbr: 'RES', category: 'intervencao' },
  com_material_protetico: { label: 'Com material protético', abbr: 'PRO', category: 'intervencao' },
  implante: { label: 'Implante', abbr: 'IMP', category: 'intervencao' },
  aparelho_ortodontico: { label: 'Aparelho ortodôntico/ortopédico', abbr: 'ORT', category: 'intervencao' },
  tartaro: { label: 'Tártaro', abbr: 'TAR', category: 'patologia' },
  erosao: { label: 'Erosão', abbr: 'ERO', category: 'patologia' },
  abrasao: { label: 'Abrasão', abbr: 'ABR', category: 'patologia' },
  abfracao: { label: 'Abfração', abbr: 'ABF', category: 'patologia' },
  giroversao: { label: 'Giroversão', abbr: 'GIR', category: 'alinhamento' },
  apinhamento: { label: 'Apinhamento', abbr: 'API', category: 'alinhamento' }
};

// Deriva condição legada para manter 100% de compatibilidade reversa
export function deriveLegacyCondition(
  presence: ToothPresenceCondition,
  clinicalConditions: ToothClinicalCondition[]
): ToothRecord['condition'] {
  if (presence === 'ausente_ante_mortem') return 'ausente_ante_mortem';
  if (presence === 'ausente_post_mortem') return 'ausente_post_mortem';
  if (clinicalConditions.includes('cariado')) return 'carie';
  if (clinicalConditions.includes('com_material_restaurador') || clinicalConditions.includes('com_material_protetico') || clinicalConditions.includes('implante')) {
    return 'restauracao';
  }
  if (clinicalConditions.includes('resto_radicular')) return 'raiz_residual';
  if (clinicalConditions.includes('nao_irrompido')) return 'nao_erupcionado';
  if (clinicalConditions.includes('abrasao') || clinicalConditions.includes('erosao') || clinicalConditions.includes('abfracao')) {
    return 'desgaste_severo';
  }
  return 'higido';
}

// Normaliza ToothRecord suportando dados legados
export function normalizeToothRecord(t: ToothRecord | undefined, toothNumber: number): {
  presence: ToothPresenceCondition;
  clinicalConditions: ToothClinicalCondition[];
  notes: string;
} {
  if (!t) {
    return {
      presence: 'articulado',
      clinicalConditions: ['higido'],
      notes: ''
    };
  }

  let presence: ToothPresenceCondition = t.presence || 'articulado';
  if (!t.presence) {
    if (t.condition === 'ausente_ante_mortem') presence = 'ausente_ante_mortem';
    else if (t.condition === 'ausente_post_mortem') presence = 'ausente_post_mortem';
    else presence = 'articulado';
  }

  let clinicalConditions: ToothClinicalCondition[] = t.clinicalConditions ? [...t.clinicalConditions] : [];
  if (t.clinicalConditions === undefined) {
    if (presence === 'ausente_ante_mortem' || presence === 'ausente_post_mortem') {
      clinicalConditions = [];
    } else if (t.condition === 'carie') {
      clinicalConditions = ['cariado'];
    } else if (t.condition === 'restauracao') {
      clinicalConditions = ['com_material_restaurador'];
    } else if (t.condition === 'desgaste_severo') {
      clinicalConditions = ['abrasao'];
    } else if (t.condition === 'raiz_residual') {
      clinicalConditions = ['resto_radicular'];
    } else if (t.condition === 'nao_erupcionado') {
      clinicalConditions = ['nao_irrompido'];
    } else {
      clinicalConditions = ['higido'];
    }
  }

  return {
    presence,
    clinicalConditions,
    notes: t.notes || ''
  };
}

export const OdontogramViewer: React.FC<OdontogramViewerProps> = ({
  teeth,
  onUpdateTooth,
  onBulkMarkTeeth,
  denticao = 'permanente',
  onSetDenticao,
  mistaActiveDeciduous = [],
  onSetMistaActiveDeciduous,
  supernumeraryTeeth = [],
  onSetSupernumeraryTeeth,
  readOnly = false
}) => {
  const [selectedToothNum, setSelectedToothNum] = useState<number | null>(null);
  const [toothNotes, setToothNotes] = useState('');
  const [showSupernumeraryMaxila, setShowSupernumeraryMaxila] = useState(false);
  const [showSupernumeraryMandibula, setShowSupernumeraryMandibula] = useState(false);
  const [descSupranumerarioMaxila, setDescSupranumerarioMaxila] = useState('');
  const [descSupranumerarioMandibula, setDescSupranumerarioMandibula] = useState('');

  // Estado local para resposta tátil instantânea em iPads/dispositivos touch
  const [localDenticao, setLocalDenticao] = useState<DenticaoMode>(denticao || 'permanente');
  const [localMistaActiveDeciduous, setLocalMistaActiveDeciduous] = useState<number[]>(mistaActiveDeciduous || []);

  React.useEffect(() => {
    if (denticao) {
      setLocalDenticao(denticao);
    }
  }, [denticao]);

  React.useEffect(() => {
    if (mistaActiveDeciduous) {
      setLocalMistaActiveDeciduous(mistaActiveDeciduous);
    }
  }, [mistaActiveDeciduous]);

  const activeDenticao = localDenticao || denticao || 'permanente';
  const currentMistaActive = localMistaActiveDeciduous.length > 0 ? localMistaActiveDeciduous : (mistaActiveDeciduous || []);

  const handleSelectDenticao = (newMode: DenticaoMode) => {
    setLocalDenticao(newMode);
    onSetDenticao?.(newMode);
  };

  const getTooth = (num: number) => teeth.find(t => t.toothNumberFdi === num);

  // Verifica se o dente está ativo/habilitado conforme o modo de dentição
  const isToothActive = (num: number): boolean => {
    if (activeDenticao === 'permanente') {
      return num < 50; // Apenas permanentes (11-48)
    }
    if (activeDenticao === 'decidua') {
      return num >= 50; // Apenas decíduos (51-85)
    }
    // Dentição mista:
    // Molares permanentes (18..16, 26..28, 48..46, 36..38) sempre ativos
    if ([18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(num)) {
      return true;
    }
    // Dentes decíduos (50-80): ativos se estiverem em currentMistaActive
    if (num >= 50) {
      return currentMistaActive.includes(num);
    }
    // Dentes permanentes emparelhados (15..11, 21..25, 45..41, 31..35):
    // Ativos por padrão, a menos que o par decíduo correspondente tenha sido ativado!
    const deciduousPair = PAIR_MAP[num];
    return !currentMistaActive.includes(deciduousPair);
  };

  // Alterna ativação entre um dente decíduo e seu par permanente em dentição mista
  const handleToggleMistaPair = (clickedNum: number) => {
    if (readOnly || activeDenticao !== 'mista') return;
    const pair = PAIR_MAP[clickedNum];
    if (!pair) return;

    let updated: number[];
    if (clickedNum >= 50) {
      // Clicou no decíduo (dezenas 50, 60, 70, 80) -> ativa decíduo e desabilita o correspondente de 10..40
      if (!currentMistaActive.includes(clickedNum)) {
        updated = [...currentMistaActive, clickedNum];
      } else {
        updated = currentMistaActive;
      }
    } else {
      // Clicou no permanente (dezenas 10, 20, 30, 40) -> reabilita o permanente e desativa o par decíduo correspondente
      updated = currentMistaActive.filter(d => d !== pair);
    }
    setLocalMistaActiveDeciduous(updated);
    onSetMistaActiveDeciduous?.(updated);
  };

  // Listas de números ativos por arcada para cálculo de ações em lote (Edêntulo)
  const getMaxilaActiveNumbers = (): number[] => {
    if (activeDenticao === 'permanente') {
      return [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    }
    if (activeDenticao === 'decidua') {
      return [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
    }
    // Mista:
    const upperRightPairs = [15, 14, 13, 12, 11].map(p => (currentMistaActive.includes(PAIR_MAP[p]) ? PAIR_MAP[p] : p));
    const upperLeftPairs = [21, 22, 23, 24, 25].map(p => (currentMistaActive.includes(PAIR_MAP[p]) ? PAIR_MAP[p] : p));
    return [18, 17, 16, ...upperRightPairs, ...upperLeftPairs, 26, 27, 28];
  };

  const getMandibulaActiveNumbers = (): number[] => {
    if (activeDenticao === 'permanente') {
      return [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    }
    if (activeDenticao === 'decidua') {
      return [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
    }
    // Mista:
    const lowerRightPairs = [45, 44, 43, 42, 41].map(p => (currentMistaActive.includes(PAIR_MAP[p]) ? PAIR_MAP[p] : p));
    const lowerLeftPairs = [31, 32, 33, 34, 35].map(p => (currentMistaActive.includes(PAIR_MAP[p]) ? PAIR_MAP[p] : p));
    return [48, 47, 46, ...lowerRightPairs, ...lowerLeftPairs, 36, 37, 38];
  };

  const maxilaActiveNumbers = getMaxilaActiveNumbers();
  const mandibulaActiveNumbers = getMandibulaActiveNumbers();

  // Verifica estado de Edêntulo Ante-Mortem e Post-Mortem de forma dinâmica:
  // Se qualquer dente for alterado para 'articulado' ou 'desarticulado', a condição
  // every(...) se torna falsa automaticamente, desmarcando o botão, mas mantendo
  // todos os outros dentes ausentes!
  const isMaxilaEdentuloAnte =
    maxilaActiveNumbers.length > 0 &&
    maxilaActiveNumbers.every(n => {
      const norm = normalizeToothRecord(getTooth(n), n);
      return norm.presence === 'ausente_ante_mortem';
    });

  const isMaxilaEdentuloPost =
    maxilaActiveNumbers.length > 0 &&
    maxilaActiveNumbers.every(n => {
      const norm = normalizeToothRecord(getTooth(n), n);
      return norm.presence === 'ausente_post_mortem';
    });

  const isMandibulaEdentuloAnte =
    mandibulaActiveNumbers.length > 0 &&
    mandibulaActiveNumbers.every(n => {
      const norm = normalizeToothRecord(getTooth(n), n);
      return norm.presence === 'ausente_ante_mortem';
    });

  const isMandibulaEdentuloPost =
    mandibulaActiveNumbers.length > 0 &&
    mandibulaActiveNumbers.every(n => {
      const norm = normalizeToothRecord(getTooth(n), n);
      return norm.presence === 'ausente_post_mortem';
    });

  // Ações de marcação Edêntulo em lote por arcada
  const handleToggleEdentulo = (
    arch: 'maxila' | 'mandibula',
    type: 'ausente_ante_mortem' | 'ausente_post_mortem'
  ) => {
    if (readOnly || !onBulkMarkTeeth) return;
    const targetNumbers = arch === 'maxila' ? maxilaActiveNumbers : mandibulaActiveNumbers;
    const isCurrentlyActive =
      arch === 'maxila'
        ? type === 'ausente_ante_mortem' ? isMaxilaEdentuloAnte : isMaxilaEdentuloPost
        : type === 'ausente_ante_mortem' ? isMandibulaEdentuloAnte : isMandibulaEdentuloPost;

    if (isCurrentlyActive) {
      // Desmarca Edêntulo: restaura elementos para Articulado Hígido
      onBulkMarkTeeth(targetNumbers, {
        presence: 'articulado',
        condition: 'higido'
      });
    } else {
      // Marca todos os elementos ativos da arcada como Ausente
      onBulkMarkTeeth(targetNumbers, {
        presence: type,
        condition: type
      });
    }
  };

  // Gerenciamento de dentes supranumerários
  const handleAddSupernumerary = (arch: 'maxila' | 'mandibula') => {
    const text = arch === 'maxila' ? descSupranumerarioMaxila : descSupranumerarioMandibula;
    if (!text.trim() || !onSetSupernumeraryTeeth) return;
    onSetSupernumeraryTeeth([
      ...supernumeraryTeeth,
      {
        id: `supranumerario-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        descricaoPosicao: text.trim(),
        arch
      }
    ]);
    if (arch === 'maxila') setDescSupranumerarioMaxila('');
    else setDescSupranumerarioMandibula('');
  };

  const handleRemoveSupernumerary = (id: string) => {
    if (readOnly || !onSetSupernumeraryTeeth) return;
    onSetSupernumeraryTeeth(supernumeraryTeeth.filter(s => s.id !== id));
  };

  // Seleção de dente individual para inspeção e edição
  const handleSelectTooth = (num: number) => {
    setSelectedToothNum(num);
    const t = getTooth(num);
    setToothNotes(t?.notes || '');
  };

  // Atualização do Estágio 1 (Presença)
  const handleChangePresence = (newPresence: ToothPresenceCondition) => {
    if (selectedToothNum === null || !onUpdateTooth || readOnly) return;
    const current = normalizeToothRecord(getTooth(selectedToothNum), selectedToothNum);

    let updatedClinical: ToothClinicalCondition[];
    if (newPresence === 'ausente_ante_mortem' || newPresence === 'ausente_post_mortem') {
      // Se ausente, aceita apenas a condição de ausência e limpa condições clínicas
      updatedClinical = [];
    } else {
      // Se articulado ou desarticulado, mantém ou inicializa com 'higido' se estava vazio
      updatedClinical = current.clinicalConditions.length > 0 ? current.clinicalConditions : ['higido'];
    }

    const legacyCondition = deriveLegacyCondition(newPresence, updatedClinical);
    onUpdateTooth(
      selectedToothNum,
      {
        presence: newPresence,
        clinicalConditions: updatedClinical,
        condition: legacyCondition
      },
      toothNotes
    );
  };

  // Atualização do Estágio 2 (Características Clínicas de Múltipla Escolha)
  const handleToggleClinicalCondition = (cond: ToothClinicalCondition) => {
    if (selectedToothNum === null || !onUpdateTooth || readOnly) return;
    const current = normalizeToothRecord(getTooth(selectedToothNum), selectedToothNum);
    if (current.presence === 'ausente_ante_mortem' || current.presence === 'ausente_post_mortem') return;

    let updated: ToothClinicalCondition[];
    if (cond === 'higido') {
      // Clicou em Hígido: limpa anomalias patológicas e fixa apenas Hígido
      updated = ['higido'];
    } else {
      const exists = current.clinicalConditions.includes(cond);
      if (exists) {
        updated = current.clinicalConditions.filter(c => c !== cond);
        // Se ficou vazio, volta para 'higido'
        if (updated.length === 0) updated = ['higido'];
      } else {
        // Remove 'higido' e adiciona a nova característica
        updated = [...current.clinicalConditions.filter(c => c !== 'higido'), cond];
      }
    }

    const legacyCondition = deriveLegacyCondition(current.presence, updated);
    onUpdateTooth(
      selectedToothNum,
      {
        presence: current.presence,
        clinicalConditions: updated,
        condition: legacyCondition
      },
      toothNotes
    );
  };

  const handleSaveNotes = () => {
    if (selectedToothNum === null || !onUpdateTooth || readOnly) return;
    const current = normalizeToothRecord(getTooth(selectedToothNum), selectedToothNum);
    const legacyCondition = deriveLegacyCondition(current.presence, current.clinicalConditions);
    onUpdateTooth(
      selectedToothNum,
      {
        presence: current.presence,
        clinicalConditions: current.clinicalConditions,
        condition: legacyCondition
      },
      toothNotes
    );
  };

  // Cálculo de legenda e estilo de exibição do dente
  const renderToothButton = (num: number) => {
    const active = isToothActive(num);
    const rawTooth = getTooth(num);
    const norm = normalizeToothRecord(rawTooth, num);
    const isSelected = selectedToothNum === num;

    // Determina a legenda na unidade
    let badgeText = '';
    let isCountBadge = false;
    let badgeColorClass = '';
    let buttonThemeClass = '';

    if (norm.presence === 'ausente_ante_mortem') {
      badgeText = 'AAM';
      buttonThemeClass = 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800';
      badgeColorClass = 'bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-100';
    } else if (norm.presence === 'ausente_post_mortem') {
      badgeText = 'APM';
      buttonThemeClass = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
      badgeColorClass = 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100';
    } else {
      // Articulado ou Desarticulado
      const count = norm.clinicalConditions.length;
      if (count > 1) {
        // REGRA DO USUÁRIO: Mais de uma opção marcada -> legenda deixa de ser letras e exibe o número "2", "3", "4"...
        badgeText = `${count}`;
        isCountBadge = true;
        badgeColorClass = 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold';
        buttonThemeClass = 'bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800';
      } else if (count === 1) {
        const condMeta = CLINICAL_CONDITIONS_META[norm.clinicalConditions[0]];
        badgeText = condMeta ? condMeta.abbr : 'ALT';
        if (norm.clinicalConditions[0] === 'higido') {
          buttonThemeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
          badgeColorClass = 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100';
        } else if (['cariado', 'fratura', 'resto_radicular', 'mancha'].includes(norm.clinicalConditions[0])) {
          buttonThemeClass = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
          badgeColorClass = 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100';
        } else {
          buttonThemeClass = 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800';
          badgeColorClass = 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100';
        }
      } else {
        badgeText = norm.presence === 'articulado' ? 'ART' : 'DES';
        buttonThemeClass = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
        badgeColorClass = 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
      }

      // Se for desarticulado, aplica borda tracejada diferenciadora
      if (norm.presence === 'desarticulado') {
        buttonThemeClass += ' border-dashed border-2';
      }
    }

    const handleClick = () => {
      if (activeDenticao === 'mista' && !active) {
        // Clicou no par inativo: ativa o dente e desativa seu correspondente
        handleToggleMistaPair(num);
      }
      setSelectedToothNum(num);
      const t = getTooth(num);
      setToothNotes(t?.notes || '');
    };

    const tooltip = active
      ? `Dente #${num}: ${PRESENCE_CONDITIONS_META[norm.presence].label}${
          norm.clinicalConditions.length > 0
            ? ` (${norm.clinicalConditions.map(c => CLINICAL_CONDITIONS_META[c]?.label || c).join(', ')})`
            : ''
        }`
      : `Dente #${num}: Inativo na dentição mista (clique para ativar e desabilitar o par #${PAIR_MAP[num]})`;

    return (
      <button
        key={num}
        type="button"
        onClick={handleClick}
        title={tooltip}
        className={`h-14 rounded-md border flex flex-col items-center justify-between p-1 text-center transition-all touch-manipulation select-none cursor-pointer ${
          !active
            ? 'opacity-30 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:opacity-70'
            : buttonThemeClass
        } ${
          isSelected
            ? 'ring-2 ring-sky-600 scale-105 z-10 shadow-md font-bold'
            : active
            ? 'hover:scale-[1.02] hover:shadow-xs active:scale-95'
            : 'active:scale-95'
        }`}
      >
        <span className="text-[10px] font-mono font-bold leading-none">{num}</span>
        <span
          className={`text-[9px] font-mono px-1 py-0.5 rounded leading-none transition-all ${
            isCountBadge ? 'shadow-xs scale-105' : ''
          } ${badgeColorClass}`}
        >
          {badgeText}
        </span>
      </button>
    );
  };

  const selectedToothRecord = selectedToothNum !== null ? normalizeToothRecord(getTooth(selectedToothNum), selectedToothNum) : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Inventário Odontológico
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Clique em uma unidade dentária para registrar a condição de presença e características clínicas.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
            {[...maxilaActiveNumbers, ...mandibulaActiveNumbers].filter(n => {
              const norm = normalizeToothRecord(getTooth(n), n);
              return norm.presence !== 'articulado' || !norm.clinicalConditions.includes('higido');
            }).length} anomalias registradas
          </span>
        </div>
      </div>

      {/* Seletor de Três Opções de Dentição (Logo abaixo da descrição e acima de Maxila) */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Tipo de Dentição:
        </span>
        <div className="flex gap-2">
          {[
            { id: 'permanente', label: 'Dentição permanente' },
            { id: 'mista', label: 'Dentição mista' },
            { id: 'decidua', label: 'Dentição decídua' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectDenticao(opt.id as DenticaoMode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all touch-manipulation select-none cursor-pointer active:scale-95 ${
                activeDenticao === opt.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {activeDenticao === 'mista' && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            * Clique em qualquer número decíduo para ativá-lo e desabilitar o par permanente (e vice-versa).
          </span>
        )}
      </div>

      {/* ARCADA SUPERIOR: Maxila (arcada superior) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs uppercase font-mono font-bold text-slate-700 dark:text-slate-300">
            Maxila (arcada superior)
          </h5>
          <span className="text-[10px] font-mono text-slate-400">
            Lado Direito do Paciente ◄─────────► Lado Esquerdo do Paciente
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Matriz de Dentes da Maxila */}
          <div className="lg:col-span-3 overflow-x-auto p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            {activeDenticao === 'permanente' && (
              <div>
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1 text-center">
                  Quadrante 1 (18–11) &emsp;|&emsp; Quadrante 2 (21–28)
                </div>
                <div className="grid grid-cols-16 gap-1 min-w-[560px]">
                  {[18, 17, 16, 15, 14, 13, 12, 11].map(num => renderToothButton(num))}
                  {[21, 22, 23, 24, 25, 26, 27, 28].map(num => renderToothButton(num))}
                </div>
              </div>
            )}

            {activeDenticao === 'mista' && (
              <div className="space-y-2 min-w-[560px]">
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1 text-center">
                    Dentição Permanente: 18..11 &emsp;|&emsp; 21..28
                  </div>
                  <div className="grid grid-cols-16 gap-1">
                    {[18, 17, 16, 15, 14, 13, 12, 11].map(num => renderToothButton(num))}
                    {[21, 22, 23, 24, 25, 26, 27, 28].map(num => renderToothButton(num))}
                  </div>
                </div>

                {/* Linha decídua alinhada abaixo de 15..11 e 21..25 */}
                <div>
                  <div className="text-[10px] uppercase font-mono text-sky-600 dark:text-sky-400 font-semibold mb-1 text-center">
                    Dentição Decídua correspondente (55..51 e 61..65):
                  </div>
                  <div className="grid grid-cols-16 gap-1">
                    {/* Espaços vazios correspondentes a 18, 17, 16 */}
                    <div className="col-span-3 flex items-center justify-center text-[10px] font-mono text-slate-400">
                      (Molares permanentes)
                    </div>
                    {/* 55..51 abaixo de 15..11 */}
                    {[55, 54, 53, 52, 51].map(num => renderToothButton(num))}
                    {/* 61..65 abaixo de 21..25 */}
                    {[61, 62, 63, 64, 65].map(num => renderToothButton(num))}
                    {/* Espaços vazios correspondentes a 26, 27, 28 */}
                    <div className="col-span-3 flex items-center justify-center text-[10px] font-mono text-slate-400">
                      (Molares permanentes)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDenticao === 'decidua' && (
              <div className="min-w-[360px]">
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1 text-center">
                  Quadrante 5 (55–51) &emsp;|&emsp; Quadrante 6 (61–65)
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {[55, 54, 53, 52, 51].map(num => renderToothButton(num))}
                  {[61, 62, 63, 64, 65].map(num => renderToothButton(num))}
                </div>
              </div>
            )}
          </div>

          {/* Painel Lateral: Edêntulo em Lote & Dente Supranumerário da Maxila */}
          <div className="lg:col-span-1 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <span className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase font-mono">
              Opções da Maxila:
            </span>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleEdentulo('maxila', 'ausente_ante_mortem')}
              className={`w-full text-left p-2 rounded border flex items-center justify-between text-[11px] transition-colors touch-manipulation select-none cursor-pointer active:scale-95 ${
                isMaxilaEdentuloAnte
                  ? 'bg-purple-600 text-white font-bold border-transparent'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Edêntulo ante-mortem (Alvéolos fechados)</span>
              {isMaxilaEdentuloAnte && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleEdentulo('maxila', 'ausente_post_mortem')}
              className={`w-full text-left p-2 rounded border flex items-center justify-between text-[11px] transition-colors touch-manipulation select-none cursor-pointer active:scale-95 ${
                isMaxilaEdentuloPost
                  ? 'bg-amber-600 text-white font-bold border-transparent'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Edêntulo post-mortem (Alvéolos abertos)</span>
              {isMaxilaEdentuloPost && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>

            {/* Dente Supranumerário Maxila */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSupernumeraryMaxila(!showSupernumeraryMaxila)}
                className="w-full text-left font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center justify-between text-[11px]"
              >
                <span>Dente supranumerário (Maxila)</span>
                <span>{showSupernumeraryMaxila ? '▲' : '▼'}</span>
              </button>

              {showSupernumeraryMaxila && (
                <div className="mt-2 space-y-2">
                  <label className="block text-[10px] font-bold uppercase font-mono text-slate-600 dark:text-slate-400">
                    Descreva a posição
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={descSupranumerarioMaxila}
                      onChange={e => setDescSupranumerarioMaxila(e.target.value)}
                      placeholder="Ex: Mesiodente entre 11 e 21..."
                      className="flex-1 p-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      disabled={readOnly || !descSupranumerarioMaxila.trim()}
                      onClick={() => handleAddSupernumerary('maxila')}
                      className="px-2 py-1 bg-sky-600 text-white rounded text-xs font-semibold disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lista de supranumerários da Maxila */}
                  <div className="space-y-1">
                    {supernumeraryTeeth
                      .filter(s => s.arch === 'maxila' || !s.arch)
                      .map(s => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                        >
                          <span className="truncate pr-1">{s.descricaoPosicao}</span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSupernumerary(s.id)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Linha de Oclusão */}
      <div className="relative flex items-center justify-center my-3">
        <div className="border-t border-dashed border-slate-300 dark:border-slate-700 w-full"></div>
        <span className="absolute bg-white dark:bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Linha de Oclusão
        </span>
      </div>

      {/* ARCADA INFERIOR: Mandíbula (arcada inferior) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-xs uppercase font-mono font-bold text-slate-700 dark:text-slate-300">
            Mandíbula (arcada inferior)
          </h5>
          <span className="text-[10px] font-mono text-slate-400">
            Lado Direito do Paciente ◄─────────► Lado Esquerdo do Paciente
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Matriz de Dentes da Mandíbula */}
          <div className="lg:col-span-3 overflow-x-auto p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            {activeDenticao === 'permanente' && (
              <div>
                <div className="grid grid-cols-16 gap-1 min-w-[560px]">
                  {[48, 47, 46, 45, 44, 43, 42, 41].map(num => renderToothButton(num))}
                  {[31, 32, 33, 34, 35, 36, 37, 38].map(num => renderToothButton(num))}
                </div>
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mt-1 text-center">
                  Quadrante 4 (48–41) &emsp;|&emsp; Quadrante 3 (31–38)
                </div>
              </div>
            )}

            {activeDenticao === 'mista' && (
              <div className="space-y-2 min-w-[560px]">
                {/* Linha decídua alinhada acima de 45..41 e 31..35 */}
                <div>
                  <div className="text-[10px] uppercase font-mono text-sky-600 dark:text-sky-400 font-semibold mb-1 text-center">
                    Dentição Decídua correspondente (85..81 e 71..75):
                  </div>
                  <div className="grid grid-cols-16 gap-1">
                    {/* Espaços vazios correspondentes a 48, 47, 46 */}
                    <div className="col-span-3 flex items-center justify-center text-[10px] font-mono text-slate-400">
                      (Molares permanentes)
                    </div>
                    {/* 85..81 acima de 45..41 */}
                    {[85, 84, 83, 82, 81].map(num => renderToothButton(num))}
                    {/* 71..75 acima de 31..35 */}
                    {[71, 72, 73, 74, 75].map(num => renderToothButton(num))}
                    {/* Espaços vazios correspondentes a 36, 37, 38 */}
                    <div className="col-span-3 flex items-center justify-center text-[10px] font-mono text-slate-400">
                      (Molares permanentes)
                    </div>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-16 gap-1">
                    {[48, 47, 46, 45, 44, 43, 42, 41].map(num => renderToothButton(num))}
                    {[31, 32, 33, 34, 35, 36, 37, 38].map(num => renderToothButton(num))}
                  </div>
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mt-1 text-center">
                    Dentição Permanente: 48..41 &emsp;|&emsp; 31..38
                  </div>
                </div>
              </div>
            )}

            {activeDenticao === 'decidua' && (
              <div className="min-w-[360px]">
                <div className="grid grid-cols-10 gap-1">
                  {[85, 84, 83, 82, 81].map(num => renderToothButton(num))}
                  {[71, 72, 73, 74, 75].map(num => renderToothButton(num))}
                </div>
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mt-1 text-center">
                  Quadrante 8 (85–81) &emsp;|&emsp; Quadrante 7 (71–75)
                </div>
              </div>
            )}
          </div>

          {/* Painel Lateral: Edêntulo em Lote & Dente Supranumerário da Mandíbula */}
          <div className="lg:col-span-1 p-3 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <span className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase font-mono">
              Opções da Mandíbula:
            </span>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleEdentulo('mandibula', 'ausente_ante_mortem')}
              className={`w-full text-left p-2 rounded border flex items-center justify-between text-[11px] transition-colors touch-manipulation select-none cursor-pointer active:scale-95 ${
                isMandibulaEdentuloAnte
                  ? 'bg-purple-600 text-white font-bold border-transparent'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Edêntulo ante-mortem (Alvéolos fechados)</span>
              {isMandibulaEdentuloAnte && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>

            <button
              type="button"
              disabled={readOnly}
              onClick={() => handleToggleEdentulo('mandibula', 'ausente_post_mortem')}
              className={`w-full text-left p-2 rounded border flex items-center justify-between text-[11px] transition-colors touch-manipulation select-none cursor-pointer active:scale-95 ${
                isMandibulaEdentuloPost
                  ? 'bg-amber-600 text-white font-bold border-transparent'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Edêntulo post-mortem (Alvéolos abertos)</span>
              {isMandibulaEdentuloPost && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>

            {/* Dente Supranumerário Mandíbula */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSupernumeraryMandibula(!showSupernumeraryMandibula)}
                className="w-full text-left font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center justify-between text-[11px]"
              >
                <span>Dente supranumerário (Mandíbula)</span>
                <span>{showSupernumeraryMandibula ? '▲' : '▼'}</span>
              </button>

              {showSupernumeraryMandibula && (
                <div className="mt-2 space-y-2">
                  <label className="block text-[10px] font-bold uppercase font-mono text-slate-600 dark:text-slate-400">
                    Descreva a posição
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={descSupranumerarioMandibula}
                      onChange={e => setDescSupranumerarioMandibula(e.target.value)}
                      placeholder="Ex: Paracúspide lingual próximo ao 44..."
                      className="flex-1 p-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      disabled={readOnly || !descSupranumerarioMandibula.trim()}
                      onClick={() => handleAddSupernumerary('mandibula')}
                      className="px-2 py-1 bg-sky-600 text-white rounded text-xs font-semibold disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lista de supranumerários da Mandíbula */}
                  <div className="space-y-1">
                    {supernumeraryTeeth
                      .filter(s => s.arch === 'mandibula')
                      .map(s => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                        >
                          <span className="truncate pr-1">{s.descricaoPosicao}</span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSupernumerary(s.id)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE INSPEÇÃO E EDIÇÃO DO ELEMENTO SELECIONADO (2 ESTÁGIOS) */}
      {selectedToothNum !== null && selectedToothRecord && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-4">
          {/* Cabeçalho do Elemento */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white font-mono">
                Dente #{selectedToothNum}
              </span>
              <span className="text-slate-500 ml-2 font-mono">
                ({selectedToothNum >= 50 ? 'Dentição Decídua' : 'Dentição Permanente'} · Quadrante {Math.floor(selectedToothNum / 10)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Condição Atual:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                {PRESENCE_CONDITIONS_META[selectedToothRecord.presence].label}
                {selectedToothRecord.clinicalConditions.length > 0 &&
                  ` (${selectedToothRecord.clinicalConditions.map(c => CLINICAL_CONDITIONS_META[c]?.label || c).join(', ')})`}
              </span>
            </div>
          </div>

          {!readOnly ? (
            <div className="space-y-4">
              {/* ESTÁGIO 1: CONDIÇÃO DE PRESENÇA (OBRIGATÓRIA - UMA DAS 4 OPÇÕES) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono mb-2">
                  1. Condição de Presença (Obrigatória — Seleção Única):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PRESENCE_CONDITIONS_META) as ToothPresenceCondition[]).map(condKey => {
                    const meta = PRESENCE_CONDITIONS_META[condKey];
                    const isSelected = selectedToothRecord.presence === condKey;
                    return (
                      <button
                        key={condKey}
                        type="button"
                        onClick={() => handleChangePresence(condKey)}
                        className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all touch-manipulation select-none cursor-pointer active:scale-95 ${
                          isSelected
                            ? condKey.startsWith('ausente')
                              ? condKey === 'ausente_ante_mortem'
                                ? 'bg-purple-600 text-white font-bold border-transparent shadow-xs'
                                : 'bg-amber-600 text-white font-bold border-transparent shadow-xs'
                              : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold border-transparent shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-bold text-xs">{meta.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        <span className={`text-[10px] leading-tight ${isSelected ? 'opacity-90' : 'text-slate-500'}`}>
                          {meta.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ESTÁGIO 2: CARACTERÍSTICAS CLÍNICAS (MÚLTIPLA SELEÇÃO — APENAS SE ARTICULADO OU DESARTICULADO) */}
              {(selectedToothRecord.presence === 'articulado' || selectedToothRecord.presence === 'desarticulado') ? (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
                      2. Características Clínicas (Múltipla Seleção):
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Pode marcar mais de uma opção simultaneamente.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                    {(Object.keys(CLINICAL_CONDITIONS_META) as ToothClinicalCondition[]).map(cKey => {
                      const meta = CLINICAL_CONDITIONS_META[cKey];
                      const isChecked = selectedToothRecord.clinicalConditions.includes(cKey);
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => handleToggleClinicalCondition(cKey)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-colors touch-manipulation select-none cursor-pointer active:scale-95 ${
                            isChecked
                              ? 'bg-sky-600 text-white font-semibold border-transparent shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate pr-1 text-[11px]">{meta.label}</span>
                          {isChecked && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>
                    O elemento está marcado como <strong>{PRESENCE_CONDITIONS_META[selectedToothRecord.presence].label}</strong>. Características clínicas aplicam-se apenas quando o elemento é <strong>Articulado</strong> ou <strong>Desarticulado</strong>.
                  </span>
                </div>
              )}

              {/* Observações Antropológicas / Detalhes de Desgaste ou Restauração */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Observações Antropológicas / Detalhes de Desgaste ou Restauração:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={toothNotes}
                    onChange={e => setToothNotes(e.target.value)}
                    placeholder="Ex: Restauração em resina composta na face oclusal; faceta de desgaste severo..."
                    className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors text-xs whitespace-nowrap"
                  >
                    Salvar Nota
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic">
              Modo somente leitura ativado. Não é possível alterar as características deste elemento.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
