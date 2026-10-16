// Pendências de um conjunto: o que ainda falta para cada fase aberta (não
// assinada) até a fase atual. Usado pela etiqueta "Pendências" do painel
// inicial e pelas próprias telas das Fases 1 e 2, para que a lista do painel e
// a lista "falta preencher" de cada fase usem exatamente o mesmo critério.
//
// Ficam de fora os bloqueios que dependem de quem está olhando (papel da pessoa
// ativa): pendência é do conjunto, não da pessoa.
import type { OsteologicalCollection, Phase1Data, Phase2Data, PhaseNumber } from '../types/sgccco';
import {
  MATERIAL_TYPE_OPTIONS,
  PRESERVATION_OPTIONS,
  GENETIC_OPTIONS,
  ISOTOPIC_OPTIONS,
  MATERIAL_DESCRIPTION_FIELDS,
  PRESERVATION_DESCRIPTION_FIELDS,
  GENETIC_DESCRIPTION_FIELDS,
  ISOTOPIC_DESCRIPTION_FIELDS,
  Phase1DescriptionKey
} from '../data/phase1Options';
import { getLatestPhaseSignature } from './signatures';

export interface PhasePendencies {
  phase: PhaseNumber;
  title: string;
  items: string[];
}

const PHASE_TITLES: Record<PhaseNumber, string> = {
  0: 'Identificação e DO',
  1: 'Análise Preliminar',
  2: 'Limpeza & Secagem (A.2)',
  3: 'Acondicionamento Provisório',
  4: 'Montagem, Inventário & Perfil',
  5: 'Alterações Ósseas & Exames',
  6: 'Armazenamento Definitivo',
  7: 'Pesquisa & Grafo'
};

// Campos obrigatórios do Formulário A.1 ainda vazios — cada um vira um item
// legível (mesma lista mostrada no fim da tela da Fase 1).
export function phase1MissingFields(p1: Phase1Data): string[] {
  const missing: string[] = [];
  const descriptionValue = (key: Phase1DescriptionKey): string => p1[key]?.value || '';
  const pushMissingDescriptions = <T extends string>(
    selected: T[] | undefined,
    options: { value: T; label: string }[],
    descriptionFields: Partial<Record<T, Phase1DescriptionKey>>,
    sectionLabel: string
  ) => {
    for (const option of options) {
      const key = descriptionFields[option.value];
      if (key && selected?.includes(option.value) && !descriptionValue(key).trim()) {
        missing.push(`descrição de "${option.label}" (${sectionLabel})`);
      }
    }
  };

  if (!Boolean(p1.equipeEnvolvidaLimpeza.value)) missing.push('equipe envolvida');
  if (!Boolean(p1.dataAnalise.value)) missing.push('data da análise');
  if (!Boolean(p1.horaAnalise.value)) missing.push('hora da análise');
  if (p1.foto1SacoFechado.value === undefined) missing.push('foto do saco fechado (ou confirmar que não há foto)');
  if (p1.foto2PlacaCemiterio.value === undefined) missing.push('foto da placa do cemitério (ou "não se aplica")');
  if (p1.foto3RemanescentesMateriais.value === undefined) missing.push('foto dos materiais associados (ou "não se aplica")');
  if (p1.foto4_1RemanescentesIsolados.value === undefined) missing.push('foto dos remanescentes isolados (ou confirmar que não há foto)');
  if (p1.foto4_2MateriaisIsolados.value === undefined) missing.push('foto dos materiais associados isolados (ou "não se aplica")');
  if ((p1.tipoMaterial.value?.length || 0) === 0) missing.push('tipo de material');
  pushMissingDescriptions(p1.tipoMaterial.value, MATERIAL_TYPE_OPTIONS, MATERIAL_DESCRIPTION_FIELDS, 'tipo de material');
  if ((p1.estadoPreservacao.value?.length || 0) === 0) missing.push('estado de preservação');
  pushMissingDescriptions(p1.estadoPreservacao.value, PRESERVATION_OPTIONS, PRESERVATION_DESCRIPTION_FIELDS, 'estado de preservação');
  if ((p1.exameGenetico.value?.length || 0) === 0) missing.push('exame genético');
  pushMissingDescriptions(p1.exameGenetico.value, GENETIC_OPTIONS, GENETIC_DESCRIPTION_FIELDS, 'exame genético');
  if (!Boolean(p1.geneticoResponsavelColeta.value)) missing.push('responsável pela coleta genética');
  if ((p1.analiseIsotopica.value?.length || 0) === 0) missing.push('análise isotópica');
  pushMissingDescriptions(p1.analiseIsotopica.value, ISOTOPIC_OPTIONS, ISOTOPIC_DESCRIPTION_FIELDS, 'análise isotópica');
  if (!Boolean(p1.isotopicaResponsavelColeta.value)) missing.push('responsável pela coleta isotópica');
  if (!Boolean(p1.corSacoLavagem.value)) missing.push('cor do saco de lavagem');
  if (!Boolean(p1.tipoLimpeza.value)) missing.push('tipo de limpeza');
  if (p1.houveDanos.value === undefined) missing.push('se houve dano');
  if (p1.houveDanos.value === true && !Boolean(p1.descricaoDanos.value)) missing.push('descrição do dano');
  return missing;
}

// Campos obrigatórios do Formulário A.2 ainda vazios (mesma lista da tela da Fase 2).
export function phase2MissingFields(p2: Phase2Data): string[] {
  const missing: string[] = [];
  if (!Boolean(p2.equipeEnvolvidaLimpeza.value)) missing.push('equipe envolvida');
  if (!Boolean(p2.dataAnalise.value)) missing.push('data da análise');
  if (!Boolean(p2.horaAnalise.value)) missing.push('hora da análise');
  if ((p2.instrumentosUtilizados.value?.length || 0) === 0) missing.push('instrumentos utilizados');
  if (p2.houveDanosMaceracao.value === undefined) missing.push('se houve dano na maceração');
  if (p2.houveDanosMaceracao.value === true && !Boolean(p2.descricaoDanosMaceracao.value)) missing.push('descrição do dano na maceração');
  if (!Boolean(p2.formaSecagem.value)) missing.push('forma de secagem');
  return missing;
}

function phaseItems(collection: OsteologicalCollection, phase: PhaseNumber): string[] {
  const boxes = collection.phase1.preliminaryBoxes;
  switch (phase) {
    case 0:
      return ['assinatura da Fase 0'];
    case 1: {
      const items = phase1MissingFields(collection.phase1);
      if (boxes.length === 0) items.push('nenhuma caixa vinculada ao conjunto');
      items.push('assinatura da Fase 1');
      return items;
    }
    case 2: {
      const items = phase2MissingFields(collection.phase2);
      // O status de secagem vive em phase2.boxDryingStatus; caixa sem entrada é 'pendente'.
      const notDry = boxes.filter(
        (b) => collection.phase2.boxDryingStatus.find((d) => d.boxId === b.id)?.cleaningStatus !== 'seca'
      );
      if (boxes.length === 0 || notDry.length > 0) {
        items.push(`caixas ainda sem status "Seca"${notDry.length ? `: ${notDry.map((b) => b.boxCode).join(', ')}` : ''}`);
      }
      items.push('assinatura da Fase 2');
      return items;
    }
    case 3: {
      const items: string[] = [];
      const unplaced = boxes.filter((b) => !collection.phase3.boxLocations.some((bl) => bl.boxId === b.id));
      if (boxes.length === 0 || unplaced.length > 0) {
        items.push(`local de guarda provisória ainda não registrado${unplaced.length ? `: ${unplaced.map((b) => b.boxCode).join(', ')}` : ''}`);
      }
      items.push('assinatura da Fase 3');
      return items;
    }
    case 4: {
      const p4 = collection.phase4;
      const items: string[] = [];
      if (!p4.completeAssemblyPhotoApproved && !p4.assemblyPhotoJustification) {
        items.push('foto da montagem completa (ou justificativa de ausência)');
      }
      if (!p4.technicianAssemblySign) items.push('assinatura da montagem (Técnico)');
      if (p4.individuals.length === 0) items.push('NMI: nenhum indivíduo cadastrado no inventário');
      if (!p4.curatorInventorySign) items.push('assinatura do inventário (Curador)');
      return items;
    }
    case 5: {
      const p5 = collection.phase5;
      const checklist = p5.phase5Checklist;
      const items: string[] = [];
      if (!checklist?.pathologiesReviewed) items.push('revisão das alterações ósseas');
      if (!checklist?.examsAttached) items.push('exames complementares anexados');
      if (!checklist?.finalPhotosRegistered) items.push('fotos finais registradas');
      if (!checklist?.boneMarkingCompleted) items.push('marcação física dos ossos com o número COI');
      if (!checklist?.inertPackagingCompleted) items.push('embalagem final em material inerte');
      if (!p5.curatorScientificSign) items.push('assinatura científica (Curador)');
      if (!p5.technicianPhysicalSign) items.push('assinatura física (Técnico)');
      return items;
    }
    case 6: {
      const items: string[] = [];
      if (!collection.phase6.finalLocations || collection.phase6.finalLocations.length === 0) {
        items.push('entrega no galpão definitivo (local final das caixas)');
      }
      items.push('assinatura da Fase 6 (dupla custódia)');
      return items;
    }
    default:
      return [];
  }
}

// Fases abertas (sem assinatura travada) até a fase atual, cada uma com o que
// falta. Fase 7 (consulta) não tem pendência de assinatura. Conjuntos criados
// antes da Fase 0 existir não têm phase0 e não ganham pendência retroativa nela.
export function listCollectionPendencies(collection: OsteologicalCollection): PhasePendencies[] {
  const result: PhasePendencies[] = [];
  const lastPhase = Math.min(collection.currentPhase, 6) as PhaseNumber;
  for (let p = 0; p <= lastPhase; p++) {
    const phase = p as PhaseNumber;
    if (phase === 0 && !collection.phase0) continue;
    if (getLatestPhaseSignature(collection.signatures, phase)?.status === 'locked') continue;
    const items = phaseItems(collection, phase);
    if (items.length > 0) result.push({ phase, title: PHASE_TITLES[phase], items });
  }
  return result;
}

export function countPendencies(pendencies: PhasePendencies[]): number {
  return pendencies.reduce((total, p) => total + p.items.length, 0);
}
