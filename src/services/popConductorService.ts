/**
 * Serviço de Condução Conversacional de POP (Procedimento Operacional Padrão)
 * Implementa a arquitetura de diálogo para condução normativa (INC/DITEC/PF),
 * com suporte a fala/áudio, extração de dados e slot para futuro Agente de IA.
 */

import { PhaseNumber } from '../types/sgccco';

const MONTHS_PT: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
};

/**
 * Reconhece data falada em português ("24 de setembro de 2026", sem ano assume o
 * ano corrente), "hoje", ou o formato numérico DD/MM/AAAA. Transcrição de voz
 * praticamente nunca produz DD/MM/AAAA — sem isso, qualquer data falada por
 * extenso travava o passo pra sempre pedindo "data" mesmo já tendo sido dita.
 */
function parseSpokenDate(input: string): string | undefined {
  if (/\bhoje\b/i.test(input)) return new Date().toISOString().slice(0, 10);

  const numeric = input.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (numeric) return `${numeric[3]}-${numeric[2]}-${numeric[1]}`;

  const spoken = input.match(/\b(\d{1,2})\s*(?:de\s+)?([a-zà-öø-ÿ]+)(?:\s+de\s+(\d{4}))?/i);
  if (spoken) {
    const day = spoken[1].padStart(2, '0');
    const monthName = spoken[2]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    const month = MONTHS_PT[monthName];
    if (month) {
      const year = spoken[3] || String(new Date().getFullYear());
      return `${year}-${month}-${day}`;
    }
  }
  return undefined;
}

/**
 * Um campo "já está preenchido" no context (collection) quando tem valor real —
 * inclusive `false` conta como resposta dada (ex.: "não houve danos"). Sem isso,
 * checar `!!valor` trataria uma resposta negativa legítima como "ainda não
 * respondido" e reabriria a pergunta.
 */
function alreadySet(context: any, phase: 'phase1' | 'phase2', field: string): boolean {
  const v = context?.[phase]?.[field]?.value;
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Opção de lista do Formulário A.1 (tipo de material, estado de preservação, exame
 * genético, análise isotópica). `field` = campo de descrição obrigatória quando a
 * opção é marcada; opções sem `field` entram só para separar trechos da fala.
 */
interface DescribedOption {
  value: string;
  label: string;
  keywords: string[];
  field?: string;
}

// Palavras que sozinhas não descrevem nada ("coletada", "uma"...): ficam de fora
// ao decidir se um trecho da fala traz uma descrição de verdade.
const FILLER_WORDS = new Set([
  'foi', 'foram', 'coletado', 'coletada', 'coletados', 'coletadas', 'presente', 'presentes',
  'um', 'uma', 'uns', 'umas', 'com', 'de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a', 'os', 'as',
  'tem', 'há', 'ha', 'também', 'tambem', 'no', 'na', 'em'
]);

const isResponsavelSegment = (segment: string) => /^respons[áa]vel\b/i.test(segment.trim());

function splitSpeechSegments(input: string): string[] {
  return input
    .split(/[,;.]|\s+e\s+/i)
    .map((seg) => seg.trim())
    .filter(Boolean);
}

function optionInSegment(segment: string, options: DescribedOption[]): DescribedOption | undefined {
  const lower = segment.toLowerCase();
  return options.find((o) => o.keywords.some((k) => lower.includes(k)));
}

function stripLeadingFiller(text: string): string {
  const words = text.split(/\s+/);
  while (words.length > 1 && FILLER_WORDS.has(words[0].toLowerCase())) words.shift();
  return words.join(' ');
}

/**
 * Descrições ditas junto com a opção ("uma prótese dentária, descrita como coroa
 * metálica" → descrição da prótese). O trecho que cita a opção, mais os trechos
 * seguintes que não citam outra opção, formam a descrição — desde que sobre alguma
 * palavra além do nome da opção e das palavras de ligação.
 */
function captureInlineDescriptions(
  input: string,
  options: DescribedOption[],
  selected: string[]
): Record<string, string> {
  const parts: Record<string, string[]> = {};
  let current: DescribedOption | undefined;
  for (const segment of splitSpeechSegments(input)) {
    if (isResponsavelSegment(segment)) {
      current = undefined;
      continue;
    }
    const found = optionInSegment(segment, options);
    if (found) {
      current = found;
      if (found.field && selected.includes(found.value)) parts[found.field] = [segment];
    } else if (current?.field && parts[current.field]) {
      parts[current.field].push(segment);
    }
  }

  const result: Record<string, string> = {};
  for (const option of options) {
    if (!option.field || !parts[option.field]) continue;
    const text = parts[option.field].join(', ');
    let leftover = text.toLowerCase();
    for (const k of option.keywords) leftover = leftover.split(k).join(' ');
    const meaningful = leftover
      .split(/[^a-zà-öø-ÿ0-9]+/i)
      .filter((w) => w.length >= 3 && !FILLER_WORDS.has(w));
    if (meaningful.length > 0) result[option.field] = stripLeadingFiller(text);
  }
  return result;
}

function describedFieldValue(context: any, data: Record<string, any>, field: string): string {
  if (typeof data[field] === 'string') return data[field];
  return context?.phase1?.[field]?.value || '';
}

/** Opções marcadas cuja descrição obrigatória ainda está vazia. */
export function pendingOptionDescriptions(
  selected: string[],
  options: DescribedOption[],
  context: any,
  data: Record<string, any> = {}
): DescribedOption[] {
  return options.filter(
    (o) => o.field && selected.includes(o.value) && !describedFieldValue(context, data, o.field).trim()
  );
}

/**
 * Passo de lista com descrições (passos 3 a 6 do POP-01). Enquanto a lista já está
 * gravada e falta descrição, a fala é lida como a descrição que falta — sem
 * reinterpretar opções (descrever "camisa com botões de osso" não pode marcar "Ossos").
 */
function extractDescribedChoice(
  input: string,
  context: any,
  cfg: {
    listField: string;
    options: DescribedOption[];
    detect: (lower: string) => string[];
  }
): { data: Record<string, any>; selected: string[]; pending: DescribedOption[] } {
  const data: Record<string, any> = {};
  const selectedBefore: string[] = context?.phase1?.[cfg.listField]?.value || [];
  const pendingBefore = pendingOptionDescriptions(selectedBefore, cfg.options, context);
  const speech = splitSpeechSegments(input).filter((seg) => !isResponsavelSegment(seg)).join(', ');

  if (selectedBefore.length > 0 && pendingBefore.length > 0) {
    const inline = captureInlineDescriptions(input, cfg.options, pendingBefore.map((o) => o.value));
    if (Object.keys(inline).length > 0) Object.assign(data, inline);
    else if (speech.length > 2) data[pendingBefore[0].field!] = speech;
  } else {
    const detected = cfg.detect(input.toLowerCase());
    if (detected.length > 0) {
      data[cfg.listField] = detected;
      Object.assign(data, captureInlineDescriptions(input, cfg.options, detected));
      // Opção retirada nesta fala: a descrição dela deixa de valer.
      for (const option of cfg.options) {
        if (option.field && !detected.includes(option.value) && context?.phase1?.[option.field]?.value) {
          data[option.field] = '';
        }
      }
    }
  }

  const selected: string[] = data[cfg.listField] ?? selectedBefore;
  return { data, selected, pending: pendingOptionDescriptions(selected, cfg.options, context, data) };
}

function describedChoiceSummary(missing: string[], pending: DescribedOption[], doneText: string): string {
  if (missing.length === 0) return doneText;
  const ask = pending.length > 0 ? ` Descreva agora: ${pending[0].label}.` : '';
  return `Ainda falta: ${missing.join('; ')}.${ask}`;
}

export const MATERIAL_OPTIONS_CONDUCTOR: DescribedOption[] = [
  { value: 'ossos', label: 'Ossos', keywords: ['osso'] },
  { value: 'dentes', label: 'Dentes', keywords: ['dente'] },
  { value: 'cabelo', label: 'Cabelo', keywords: ['cabelo'], field: 'cabeloDescricao' },
  { value: 'unha', label: 'Unha', keywords: ['unha'] },
  { value: 'proteses', label: 'Próteses', keywords: ['prótese', 'protese'], field: 'protesesDescricao' },
  { value: 'vestes', label: 'Vestes', keywords: ['veste'], field: 'vestesDescricao' },
  { value: 'pertences', label: 'Pertences', keywords: ['pertence'], field: 'pertencesDescricao' },
  { value: 'tecidos_moles', label: 'Tecidos moles e/ou mumificados', keywords: ['tecido mole', 'mumificad'], field: 'tecidosMolesDescricao' }
];

export const PRESERVATION_OPTIONS_CONDUCTOR: DescribedOption[] = [
  { value: 'mumificado', label: 'Mumificado', keywords: ['mumificad'] },
  { value: 'adipocera', label: 'Adipocera', keywords: ['adipocer'] },
  { value: 'outros', label: 'Outros (estado de preservação)', keywords: ['outro'], field: 'estadoPreservacaoOutrosDescricao' }
];

export const GENETIC_OPTIONS_CONDUCTOR: DescribedOption[] = [
  { value: 'falange', label: 'Falange', keywords: ['falange'], field: 'geneticoFalangeDescricao' },
  { value: 'ossos_tarsais', label: 'Ossos tarsais', keywords: ['tarsa'], field: 'geneticoOssosTarsaisDescricao' },
  { value: 'dente_higido', label: 'Dente hígido', keywords: ['dente', 'molar', 'incisivo', 'canino'], field: 'geneticoDenteHigidoDescricao' },
  { value: 'primeira_costela', label: '1ª costela', keywords: ['costela'], field: 'geneticoPrimeiraCostelaDescricao' },
  { value: 'patela', label: 'Patela', keywords: ['patela'], field: 'geneticoPatelaDescricao' },
  { value: 'outros', label: 'Outros (exame genético)', keywords: ['outro'], field: 'geneticoOutrosDescricao' }
];

export const ISOTOPIC_OPTIONS_CONDUCTOR: DescribedOption[] = [
  { value: 'cabelo', label: 'Cabelo (análise isotópica)', keywords: ['cabelo'], field: 'isotopicaCabeloDescricao' },
  { value: 'unha', label: 'Unha (análise isotópica)', keywords: ['unha'], field: 'isotopicaUnhaDescricao' },
  { value: 'dente', label: 'Dente (análise isotópica)', keywords: ['dente'], field: 'isotopicaDenteDescricao' }
];

const aiFieldHint = (listField: string, options: DescribedOption[]) =>
  `Campos deste passo: ${listField} (lista de valores: ${options.map((o) => o.value).join(', ')}); descrições obrigatórias por opção marcada: ${options
    .filter((o) => o.field)
    .map((o) => `${o.field} (${o.label})`)
    .join(', ')}.`;

export interface ConductorChatMessage {
  id: string;
  sender: 'conductor' | 'user' | 'system';
  text: string;
  timestamp: string;
  stepNumber?: number;
  extractedData?: Record<string, any>;
  requiresPhoto?: boolean;
  photoAttached?: {
    id: string;
    url: string;
    caption: string;
    sha256Hash: string;
    timestamp: string;
  };
  isVoiceInput?: boolean;
  suggestedReplies?: string[];
  fieldTags?: string[];
}

export interface PopConductorPhotoChecklistItem {
  field: string;
  category: string;
  label: string;
  triState: boolean;
}

export interface PopConductorStep {
  stepNumber: number;
  stepTitle: string;
  conductorPrompt: string;
  regulatoryNotice?: string;
  requiresPhoto: boolean;
  photoPrompt?: string;
  photoChecklistItems?: PopConductorPhotoChecklistItem[];
  quickSuggestions: string[];
  /** Nomes de campo enviados à IA, para ela preencher exatamente estes campos. */
  aiFieldHints?: string;
  /**
   * O que ainda falta depois de juntar o que já estava gravado com o que foi extraído
   * agora (regra ou IA). Se devolver algo, o passo não avança, mesmo que a IA confirme.
   */
  blockingCheck?: (context: any, data: Record<string, any>) => string[];
  extractData: (input: string, context?: any) => {
    data: Record<string, any>;
    summaryText: string;
    isComplete: boolean;
  };
}

export interface PopDefinition {
  phaseNumber: PhaseNumber;
  popCode: string;
  popTitle: string;
  regulatoryRef: string;
  introMessage: string;
  steps: PopConductorStep[];
  completionMessage: string;
}

// Definições dos POPs INC/DITEC/PF
export const INC_DITEC_PF_POPS: Record<PhaseNumber, PopDefinition> = {
  1: {
    phaseNumber: 1,
    popCode: 'POP-01',
    popTitle: 'Análise Preliminar e Limpeza dos Remanescentes Ósseos',
    regulatoryRef: 'POP-01 v1 · COI-INC · Formulário A.1',
    introMessage: 'Olá! Sou o Condutor do POP-01 (Análise Preliminar e Limpeza dos Remanescentes Ósseos). Vou orientar o preenchimento do Formulário A.1, passo a passo, exatamente na ordem do procedimento. Você pode responder falando no microfone ou digitando.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Identificação da Sessão (Livro de Protocolo)',
        conductorPrompt: 'Primeiro passo (POP-01 §9.2): Quem é a equipe envolvida na análise e limpeza, e qual a data e a hora de início do processamento?',
        regulatoryNotice: 'Registro obrigatório no Livro de Protocolo da Sala de Análise Preliminar e Maceração.',
        requiresPhoto: false,
        quickSuggestions: [
          'Equipe: Técnico João e Técnica Maria. Data de hoje, início às 09h15min.',
          'Equipe composta por dois técnicos. Hoje, 14h30min.'
        ],
        extractData: (input: string, context?: any) => {
          const data: Record<string, any> = {};
          const alreadyHasEquipe = !!context?.phase1?.equipeEnvolvidaLimpeza?.value;
          const alreadyHasData = !!context?.phase1?.dataAnalise?.value;
          const alreadyHasHora = !!context?.phase1?.horaAnalise?.value;

          const equipeMatch = input.match(/equipe[:\s]+([^.]+?)(?:\.|data|hora|$)/i);
          if (equipeMatch) data.equipeEnvolvidaLimpeza = equipeMatch[1].trim();

          const horaMatch = input.match(/(\d{1,2}h\d{0,2}(?:min)?)/i);
          if (horaMatch) data.horaAnalise = horaMatch[1];

          const parsedDate = parseSpokenDate(input);
          if (parsedDate) data.dataAnalise = parsedDate;

          // Só trata a frase inteira como "equipe" quando não achou a palavra-chave,
          // ainda não há equipe registrada, e a frase não é claramente só data/hora
          // (uma correção de "esqueci a data" não deve sobrescrever a equipe já dita).
          if (!data.equipeEnvolvidaLimpeza && !alreadyHasEquipe && !horaMatch && !parsedDate && input.trim().length > 3) {
            data.equipeEnvolvidaLimpeza = input.trim();
          }

          const missing: string[] = [];
          if (!alreadyHasEquipe && !data.equipeEnvolvidaLimpeza) missing.push('equipe envolvida');
          if (!alreadyHasData && !data.dataAnalise) missing.push('data');
          if (!alreadyHasHora && !data.horaAnalise) missing.push('hora');

          return {
            data,
            summaryText: missing.length === 0
              ? `Equipe: ${data.equipeEnvolvidaLimpeza ?? context?.phase1?.equipeEnvolvidaLimpeza?.value} · ${data.dataAnalise ?? context?.phase1?.dataAnalise?.value} ${data.horaAnalise ?? context?.phase1?.horaAnalise?.value}`
              : `Ainda falta informar: ${missing.join(', ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 2,
        stepTitle: 'Checklist Fotográfico (Formulário A.1, campos 5-9)',
        conductorPrompt: 'Segundo passo (POP-01 §9.2, conforme POP-03): Confirme cada fotografia obrigatória — saco fechado com lacre e escala; placa do cemitério, se houver; remanescentes com materiais associados; remanescentes isolados; e materiais associados isolados, se houver.',
        regulatoryNotice: 'Foto 1 e Foto 4.1 são sempre obrigatórias. As demais são "se aplicável".',
        requiresPhoto: true,
        photoPrompt: 'Registrar as fotos do checklist na ordem do POP-03',
        // Cada item tem seu próprio botão de foto na UI (ver PopConversationalConductor) —
        // tocar nele anexa a foto NA categoria certa e já marca este campo, em vez do
        // botão genérico "Fotografar Passo" que não sabia a qual item pertencia a foto.
        photoChecklistItems: [
          { field: 'foto1SacoFechado', category: 'foto1_saco_fechado', label: 'Saco fechado com lacre e escala', triState: false },
          { field: 'foto2PlacaCemiterio', category: 'foto2_placa_cemiterio', label: 'Placa do cemitério', triState: true },
          { field: 'foto3RemanescentesMateriais', category: 'foto3_remanescentes_materiais', label: 'Remanescentes com materiais associados', triState: true },
          { field: 'foto4_1RemanescentesIsolados', category: 'foto4_1_remanescentes_isolados', label: 'Remanescentes isolados', triState: false },
          { field: 'foto4_2MateriaisIsolados', category: 'foto4_2_materiais_isolados', label: 'Materiais associados isolados', triState: true }
        ],
        quickSuggestions: [
          'Placa de cemitério não se aplica. Materiais associados não se aplica.',
          'Placa de cemitério e materiais associados isolados fotografados.'
        ],
        extractData: (input: string, context?: any) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};

          // Foto 1 e Foto 4.1 não têm "não se aplica" — exigem foto real, então a
          // narração nunca marca estas duas por si só (só o botão de captura real
          // na UI faz isso; ver PopConversationalConductor.handleCaptureChecklistPhoto).
          if (/(placa).*(cemit[ée]rio)/.test(lower)) {
            data.foto2PlacaCemiterio = /n[ãa]o se aplica|sem placa/.test(lower) ? 'nao_se_aplica' : 'sim';
          }
          // Lookahead negativo (não "!/isolad/.test" no texto inteiro) — uma frase
          // real quase sempre menciona os dois itens juntos ("materiais associados
          // não se aplica... materiais associados isolados sim"), e checar "isolad"
          // em qualquer lugar do texto bloqueava o reconhecimento do foto3 inteiro.
          if (/materiais associados(?!\s*isolad)/.test(lower)) {
            data.foto3RemanescentesMateriais = /n[ãa]o se aplica/.test(lower) ? 'nao_se_aplica' : 'sim';
          }
          if (/materiais associados isolad/.test(lower) || /foto\s*4\.?2\b/.test(lower)) {
            data.foto4_2MateriaisIsolados = /n[ãa]o se aplica/.test(lower) ? 'nao_se_aplica' : 'sim';
          }
          if (/todas as fotos/.test(lower)) {
            if (!data.foto2PlacaCemiterio) data.foto2PlacaCemiterio = 'sim';
            if (!data.foto3RemanescentesMateriais) data.foto3RemanescentesMateriais = 'sim';
            if (!data.foto4_2MateriaisIsolados) data.foto4_2MateriaisIsolados = 'sim';
          }

          const missing: string[] = [];
          if (!alreadySet(context, 'phase1', 'foto1SacoFechado') && !data.foto1SacoFechado) missing.push('foto do saco fechado');
          if (!alreadySet(context, 'phase1', 'foto2PlacaCemiterio') && data.foto2PlacaCemiterio === undefined) missing.push('foto da placa do cemitério (ou "não se aplica")');
          if (!alreadySet(context, 'phase1', 'foto3RemanescentesMateriais') && data.foto3RemanescentesMateriais === undefined) missing.push('foto dos remanescentes com materiais associados (ou "não se aplica")');
          if (!alreadySet(context, 'phase1', 'foto4_1RemanescentesIsolados') && !data.foto4_1RemanescentesIsolados) missing.push('foto dos remanescentes isolados');
          if (!alreadySet(context, 'phase1', 'foto4_2MateriaisIsolados') && data.foto4_2MateriaisIsolados === undefined) missing.push('foto dos materiais associados isolados (ou "não se aplica")');

          return {
            data,
            summaryText: missing.length === 0 ? 'Checklist fotográfico completo.' : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 3,
        stepTitle: 'Tipo de Material Presente (campo 10)',
        conductorPrompt: 'Terceiro passo: Que tipos de material estão presentes no saco? Ossos, dentes, cabelo, unha, próteses, vestes, pertences, tecidos moles? Para cabelo, próteses, vestes, pertences e tecidos moles, descreva cada um.',
        requiresPhoto: false,
        quickSuggestions: [
          'Ossos e dentes presentes, sem outros materiais.',
          'Ossos, vestes e uma prótese dentária, descrita como coroa metálica no incisivo superior.'
        ],
        aiFieldHints: aiFieldHint('tipoMaterial', MATERIAL_OPTIONS_CONDUCTOR),
        blockingCheck: (context: any, data: Record<string, any>) => {
          const selected: string[] = data.tipoMaterial ?? context?.phase1?.tipoMaterial?.value ?? [];
          return pendingOptionDescriptions(selected, MATERIAL_OPTIONS_CONDUCTOR, context, data).map((o) => `descrição de "${o.label}"`);
        },
        extractData: (input: string, context?: any) => {
          const { data, selected, pending } = extractDescribedChoice(input, context, {
            listField: 'tipoMaterial',
            options: MATERIAL_OPTIONS_CONDUCTOR,
            detect: (lower) => {
              const types: string[] = [];
              if (lower.includes('osso')) types.push('ossos');
              if (lower.includes('dente')) types.push('dentes');
              if (lower.includes('cabelo')) types.push('cabelo');
              if (lower.includes('unha')) types.push('unha');
              if (lower.includes('prótese') || lower.includes('protese')) types.push('proteses');
              if (lower.includes('veste')) types.push('vestes');
              if (lower.includes('pertence')) types.push('pertences');
              if (lower.includes('tecido mole') || lower.includes('mumificad')) types.push('tecidos_moles');
              return types;
            }
          });

          const missing: string[] = [];
          if (selected.length === 0) missing.push('tipo de material');
          pending.forEach((o) => missing.push(`descrição de "${o.label}"`));

          return {
            data,
            summaryText: describedChoiceSummary(missing, pending, `Material presente: ${selected.join(', ')}.`),
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 4,
        stepTitle: 'Estado de Preservação (campo 16)',
        conductorPrompt: 'Quarto passo: Como está o estado de preservação dos remanescentes? Preservado/íntegro, degradado, fragmentado, friável, com erosão, úmido, seco, com fungo visível, manchas, perda de cortical, carbonização, insetos, mumificado, adipocera ou outros? Se for "outros", descreva.',
        requiresPhoto: false,
        quickSuggestions: [
          'Preservado e seco, sem sinais de degradação.',
          'Degradado, com fragmentação e perda de cortical em alguns segmentos.'
        ],
        aiFieldHints: aiFieldHint('estadoPreservacao', PRESERVATION_OPTIONS_CONDUCTOR),
        blockingCheck: (context: any, data: Record<string, any>) => {
          const selected: string[] = data.estadoPreservacao ?? context?.phase1?.estadoPreservacao?.value ?? [];
          return pendingOptionDescriptions(selected, PRESERVATION_OPTIONS_CONDUCTOR, context, data).map((o) => `descrição de "${o.label}"`);
        },
        extractData: (input: string, context?: any) => {
          const { data, selected, pending } = extractDescribedChoice(input, context, {
            listField: 'estadoPreservacao',
            options: PRESERVATION_OPTIONS_CONDUCTOR,
            detect: (lower) => {
              const chars: string[] = [];
              if (lower.includes('preservado') || lower.includes('íntegro') || lower.includes('integro')) chars.push('preservado_integro');
              if (lower.includes('degradad')) chars.push('degradado');
              if (lower.includes('fragment')) chars.push('fragmentacao');
              if (lower.includes('friável') || lower.includes('friavel')) chars.push('friavel');
              if (lower.includes('erosão') || lower.includes('erosao')) chars.push('erosao');
              if (lower.includes('úmido') || lower.includes('umido')) chars.push('umido');
              if (lower.includes('seco')) chars.push('seco');
              if (lower.includes('fungo')) chars.push('fungo_visivel');
              if (lower.includes('mancha')) chars.push('manchas');
              if (lower.includes('perda de cortical') || lower.includes('cortical')) chars.push('perda_cortical');
              if (lower.includes('carboniz')) chars.push('carbonizacao');
              if (lower.includes('inseto') || lower.includes('pupa')) chars.push('insetos_pupas');
              if (lower.includes('mumificad')) chars.push('mumificado');
              if (lower.includes('adipocer')) chars.push('adipocera');
              if (lower.includes('outro')) chars.push('outros');
              return chars;
            }
          });
          if (data.estadoPreservacao) data.observacoesGeraisPreservacao = input.trim();

          const missing: string[] = [];
          if (selected.length === 0) missing.push('estado de preservação');
          pending.forEach((o) => missing.push(`descrição de "${o.label}"`));

          return {
            data,
            summaryText: describedChoiceSummary(missing, pending, `Estado de preservação: ${selected.join(', ')}.`),
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 5,
        stepTitle: 'Coleta de Amostra Biológica — Exame Genético (POP-01 §9.3.1)',
        conductorPrompt: 'Quinto passo — importante: isto precisa ser feito ANTES da maceração. Foi coletada amostra para exame genético? De qual elemento (falange, ossos tarsais, dente hígido, primeira costela, patela ou outro), com a descrição de cada um, e quem é o responsável pela coleta?',
        regulatoryNotice: 'POP-01 §9.3.1: a coleta compromete-se se feita após a maceração — ordem de prioridade: falange distal, demais falanges, tarsais, dente, costela, patela.',
        requiresPhoto: false,
        quickSuggestions: [
          'Coletada falange distal da mão direita, responsável Técnico João.',
          'Não coletado, sem indicação de exame genético para este conjunto.'
        ],
        aiFieldHints: `${aiFieldHint('exameGenetico', GENETIC_OPTIONS_CONDUCTOR)} Responsável: geneticoResponsavelColeta.`,
        blockingCheck: (context: any, data: Record<string, any>) => {
          const selected: string[] = data.exameGenetico ?? context?.phase1?.exameGenetico?.value ?? [];
          return pendingOptionDescriptions(selected, GENETIC_OPTIONS_CONDUCTOR, context, data).map((o) => `descrição de "${o.label}"`);
        },
        extractData: (input: string, context?: any) => {
          const { data, selected, pending } = extractDescribedChoice(input, context, {
            listField: 'exameGenetico',
            options: GENETIC_OPTIONS_CONDUCTOR,
            detect: (lower) => {
              const elements: string[] = [];
              if (lower.includes('não coletad') || lower.includes('nao coletad')) return ['nao_coletado'];
              if (lower.includes('falange')) elements.push('falange');
              if (lower.includes('tarsa')) elements.push('ossos_tarsais');
              if (lower.includes('dente') || lower.includes('molar') || lower.includes('incisivo') || lower.includes('canino')) elements.push('dente_higido');
              if (lower.includes('costela')) elements.push('primeira_costela');
              if (lower.includes('patela')) elements.push('patela');
              if (lower.includes('outro')) elements.push('outros');
              return elements;
            }
          });

          const respMatch = input.match(/respons[áa]vel[:\s]+([^.]+)/i);
          if (respMatch) data.geneticoResponsavelColeta = respMatch[1].trim();
          else if (selected[0] === 'nao_coletado' && !alreadySet(context, 'phase1', 'geneticoResponsavelColeta')) data.geneticoResponsavelColeta = 'Não aplicável';

          const missing: string[] = [];
          if (selected.length === 0) missing.push('elemento coletado (ou "não coletado")');
          if (!alreadySet(context, 'phase1', 'geneticoResponsavelColeta') && !data.geneticoResponsavelColeta) missing.push('responsável pela coleta');
          pending.forEach((o) => missing.push(`descrição de "${o.label}"`));

          return {
            data,
            summaryText: describedChoiceSummary(
              missing,
              pending,
              `Exame genético: ${selected.join(', ')} · Responsável: ${data.geneticoResponsavelColeta ?? context?.phase1?.geneticoResponsavelColeta?.value}`
            ),
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 6,
        stepTitle: 'Coleta de Amostra Biológica — Análise Isotópica (POP-01 §9.3.2)',
        conductorPrompt: 'Sexto passo: Foi coletada amostra para análise isotópica — cabelo, unha ou dente? Descreva cada amostra e diga quem é o responsável pela coleta.',
        requiresPhoto: false,
        quickSuggestions: [
          'Coletado cabelo da região occipital, responsável Técnica Maria.',
          'Não coletado.'
        ],
        aiFieldHints: `${aiFieldHint('analiseIsotopica', ISOTOPIC_OPTIONS_CONDUCTOR)} Responsável: isotopicaResponsavelColeta.`,
        blockingCheck: (context: any, data: Record<string, any>) => {
          const selected: string[] = data.analiseIsotopica ?? context?.phase1?.analiseIsotopica?.value ?? [];
          return pendingOptionDescriptions(selected, ISOTOPIC_OPTIONS_CONDUCTOR, context, data).map((o) => `descrição de "${o.label}"`);
        },
        extractData: (input: string, context?: any) => {
          const { data, selected, pending } = extractDescribedChoice(input, context, {
            listField: 'analiseIsotopica',
            options: ISOTOPIC_OPTIONS_CONDUCTOR,
            detect: (lower) => {
              if (lower.includes('não coletad') || lower.includes('nao coletad')) return ['nao_coletado'];
              const materials: string[] = [];
              if (lower.includes('cabelo')) materials.push('cabelo');
              if (lower.includes('unha')) materials.push('unha');
              if (lower.includes('dente')) materials.push('dente');
              return materials;
            }
          });

          const respMatch = input.match(/respons[áa]vel[:\s]+([^.]+)/i);
          if (respMatch) data.isotopicaResponsavelColeta = respMatch[1].trim();
          else if (selected[0] === 'nao_coletado' && !alreadySet(context, 'phase1', 'isotopicaResponsavelColeta')) data.isotopicaResponsavelColeta = 'Não aplicável';

          const missing: string[] = [];
          if (selected.length === 0) missing.push('material coletado (ou "não coletado")');
          if (!alreadySet(context, 'phase1', 'isotopicaResponsavelColeta') && !data.isotopicaResponsavelColeta) missing.push('responsável pela coleta');
          pending.forEach((o) => missing.push(`descrição de "${o.label}"`));

          return {
            data,
            summaryText: describedChoiceSummary(
              missing,
              pending,
              `Análise isotópica: ${selected.join(', ')} · Responsável: ${data.isotopicaResponsavelColeta ?? context?.phase1?.isotopicaResponsavelColeta?.value}`
            ),
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 7,
        stepTitle: 'Limpeza (campos 32-33)',
        conductorPrompt: 'Sétimo passo: Qual a cor do saco de lavagem atribuído a este conjunto, e qual tipo de limpeza foi empregado — a seco, água fria ou água quente?',
        requiresPhoto: false,
        quickSuggestions: [
          'Saco azul, limpeza a seco.',
          'Saco verde, limpeza com água quente.'
        ],
        extractData: (input: string, context?: any) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};
          const corMatch = input.match(/saco\s+(\w+)/i) || input.match(/cor\s*[:\s]+(\w+)/i);
          if (corMatch) data.corSacoLavagem = corMatch[1];

          if (lower.includes('água quente') || lower.includes('agua quente')) data.tipoLimpeza = 'agua_quente';
          else if (lower.includes('água fria') || lower.includes('agua fria')) data.tipoLimpeza = 'agua_fria';
          else if (lower.includes('a seco') || lower.includes('seco')) data.tipoLimpeza = 'a_seco';

          const missing: string[] = [];
          if (!alreadySet(context, 'phase1', 'corSacoLavagem') && !data.corSacoLavagem) missing.push('cor do saco de lavagem');
          if (!alreadySet(context, 'phase1', 'tipoLimpeza') && !data.tipoLimpeza) missing.push('tipo de limpeza');

          return {
            data,
            summaryText: missing.length === 0
              ? `Saco ${data.corSacoLavagem ?? context?.phase1?.corSacoLavagem?.value} · Limpeza: ${data.tipoLimpeza ?? context?.phase1?.tipoLimpeza?.value}`
              : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 8,
        stepTitle: 'Danos Durante o Processamento (campos 34-35)',
        conductorPrompt: 'Último passo do Formulário A.1: houve algum dano durante o processamento? Se sim, descreva.',
        requiresPhoto: false,
        quickSuggestions: [
          'Não houve danos.',
          'Sim, pequena fratura na extremidade distal do rádio esquerdo durante a remoção de tecido aderido.'
        ],
        extractData: (input: string, context?: any) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};
          const alreadyHouve = alreadySet(context, 'phase1', 'houveDanos');
          const alreadyDescricao = alreadySet(context, 'phase1', 'descricaoDanos');
          const contextHouve = context?.phase1?.houveDanos?.value;

          if (/n[ãa]o houve|sem dano|nenhum dano/.test(lower)) {
            data.houveDanos = false;
          } else if (/sim|houve dano|dano/.test(lower)) {
            data.houveDanos = true;
            data.descricaoDanos = input.trim();
          } else if (alreadyHouve && contextHouve === true && !alreadyDescricao && input.trim().length > 3) {
            // Resposta de acompanhamento descrevendo o dano, sem repetir "sim"/"dano".
            data.descricaoDanos = input.trim();
          }

          const houveEfetivo = data.houveDanos ?? contextHouve;
          const missing: string[] = [];
          if (!alreadyHouve && data.houveDanos === undefined) missing.push('se houve dano (sim/não)');
          if (houveEfetivo === true && !alreadyDescricao && !data.descricaoDanos) missing.push('descrição do dano');

          return {
            data,
            summaryText: missing.length === 0
              ? (houveEfetivo ? `Dano registrado: "${(data.descricaoDanos ?? context?.phase1?.descricaoDanos?.value ?? '').slice(0, 60)}..."` : 'Sem danos registrados.')
              : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0
          };
        }
      }
    ],
    completionMessage: 'Formulário A.1 concluído. Todos os campos obrigatórios do POP-01 (itens 9.2 a 9.4) foram preenchidos e gravados. Prossiga para a maceração e limpeza (Fase 2).'
  },
  2: {
    phaseNumber: 2,
    popCode: 'POP-01',
    popTitle: 'Análise Preliminar e Limpeza — Maceração e Secagem',
    regulatoryRef: 'POP-01 v1 · COI-INC · Formulário A.2',
    introMessage: 'Continuando o Condutor do POP-01: agora vamos preencher o Formulário A.2, a partir do início da maceração até o fim da secagem.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Identificação da Sessão (Formulário A.2)',
        conductorPrompt: 'Primeiro passo: quem é a equipe envolvida na limpeza, e qual a data e a hora de início da maceração?',
        requiresPhoto: false,
        quickSuggestions: [
          'Equipe: Técnico João e Técnica Maria. Data de hoje, início às 14h00min.',
          'Equipe composta por dois técnicos. Hoje, 09h30min.'
        ],
        extractData: (input: string, context?: any) => {
          const data: Record<string, any> = {};
          const alreadyHasEquipe = !!context?.phase2?.equipeEnvolvidaLimpeza?.value;
          const alreadyHasData = !!context?.phase2?.dataAnalise?.value;
          const alreadyHasHora = !!context?.phase2?.horaAnalise?.value;

          const equipeMatch = input.match(/equipe[:\s]+([^.]+?)(?:\.|data|hora|$)/i);
          if (equipeMatch) data.equipeEnvolvidaLimpeza = equipeMatch[1].trim();

          const horaMatch = input.match(/(\d{1,2}h\d{0,2}(?:min)?)/i);
          if (horaMatch) data.horaAnalise = horaMatch[1];

          const parsedDate = parseSpokenDate(input);
          if (parsedDate) data.dataAnalise = parsedDate;

          if (!data.equipeEnvolvidaLimpeza && !alreadyHasEquipe && !horaMatch && !parsedDate && input.trim().length > 3) {
            data.equipeEnvolvidaLimpeza = input.trim();
          }

          const missing: string[] = [];
          if (!alreadyHasEquipe && !data.equipeEnvolvidaLimpeza) missing.push('equipe envolvida');
          if (!alreadyHasData && !data.dataAnalise) missing.push('data');
          if (!alreadyHasHora && !data.horaAnalise) missing.push('hora');

          return {
            data,
            summaryText: missing.length === 0
              ? `Equipe: ${data.equipeEnvolvidaLimpeza ?? context?.phase2?.equipeEnvolvidaLimpeza?.value} · ${data.dataAnalise ?? context?.phase2?.dataAnalise?.value} ${data.horaAnalise ?? context?.phase2?.horaAnalise?.value}`
              : `Ainda falta informar: ${missing.join(', ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 2,
        stepTitle: 'Maceração — Ciclos e Instrumentos (campos 5-7)',
        conductorPrompt: 'Segundo passo: quantos ciclos de maceração foram necessários, e quais instrumentos foram utilizados na limpeza — esponja, escova de dentes, escova grande, lâmina de bisturi, faca, pinça, pincéis, máquina redutora de corpos, panela/fogão?',
        requiresPhoto: false,
        quickSuggestions: [
          'Um ciclo, usamos esponja e escova de dentes.',
          'Dois ciclos, usamos escova grande, pincéis e panela/fogão.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};

          const ciclosMatch = input.match(/(\d+)\s*ciclo/i);
          if (ciclosMatch) data.maceracaoCiclosNecessarios = parseInt(ciclosMatch[1], 10);
          else if (/\bum\b|\buma\b/i.test(lower) && lower.includes('ciclo')) data.maceracaoCiclosNecessarios = 1;
          else if (/\bdois\b|\bduas\b/i.test(lower) && lower.includes('ciclo')) data.maceracaoCiclosNecessarios = 2;
          else if (/\btr[êe]s\b/i.test(lower) && lower.includes('ciclo')) data.maceracaoCiclosNecessarios = 3;

          const instruments: string[] = [];
          if (lower.includes('esponja')) instruments.push('esponja');
          if (lower.includes('escova de dentes')) instruments.push('escova_dentes');
          else if (lower.includes('escova grande')) instruments.push('escova_grande');
          if (lower.includes('lâmina') || lower.includes('lamina') || lower.includes('bisturi')) instruments.push('lamina_bisturi');
          if (lower.includes('faca')) instruments.push('faca');
          if (lower.includes('pinça') || lower.includes('pinca')) instruments.push('pinca');
          if (lower.includes('pincéis') || lower.includes('pinceis') || lower.includes('pincel')) instruments.push('pinceis');
          if (lower.includes('máquina redutora') || lower.includes('maquina redutora')) instruments.push('maquina_redutora_corpos');
          if (lower.includes('panela') || lower.includes('fogão') || lower.includes('fogao')) instruments.push('panela_fogao');
          if (instruments.length === 0 && lower.includes('outr')) instruments.push('outra');
          if (instruments.length > 0) data.instrumentosUtilizados = instruments;

          const missing: string[] = [];
          if (!data.instrumentosUtilizados) missing.push('instrumentos utilizados');

          return {
            data,
            summaryText: missing.length === 0
              ? `Ciclos: ${data.maceracaoCiclosNecessarios ?? 'não informado'} · Instrumentos: ${data.instrumentosUtilizados.join(', ')}`
              : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 3,
        stepTitle: 'Danos Durante a Maceração (campos 8-9)',
        conductorPrompt: 'Terceiro passo: houve algum dano durante a maceração? Se sim, descreva.',
        requiresPhoto: false,
        quickSuggestions: [
          'Não houve danos.',
          'Sim, pequena fissura na epífise distal do rádio direito durante a limpeza mecânica.'
        ],
        extractData: (input: string, context?: any) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};
          const alreadyHouve = alreadySet(context, 'phase2', 'houveDanosMaceracao');
          const alreadyDescricao = alreadySet(context, 'phase2', 'descricaoDanosMaceracao');
          const contextHouve = context?.phase2?.houveDanosMaceracao?.value;

          if (/n[ãa]o houve|sem dano|nenhum dano/.test(lower)) {
            data.houveDanosMaceracao = false;
          } else if (/sim|houve dano|dano/.test(lower)) {
            data.houveDanosMaceracao = true;
            data.descricaoDanosMaceracao = input.trim();
          } else if (alreadyHouve && contextHouve === true && !alreadyDescricao && input.trim().length > 3) {
            data.descricaoDanosMaceracao = input.trim();
          }

          const houveEfetivo = data.houveDanosMaceracao ?? contextHouve;
          const missing: string[] = [];
          if (!alreadyHouve && data.houveDanosMaceracao === undefined) missing.push('se houve dano (sim/não)');
          if (houveEfetivo === true && !alreadyDescricao && !data.descricaoDanosMaceracao) missing.push('descrição do dano');

          return {
            data,
            summaryText: missing.length === 0
              ? (houveEfetivo ? `Dano registrado: "${(data.descricaoDanosMaceracao ?? context?.phase2?.descricaoDanosMaceracao?.value ?? '').slice(0, 60)}..."` : 'Sem danos registrados na maceração.')
              : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 4,
        stepTitle: 'Secagem (campo 10)',
        conductorPrompt: 'Último passo do Formulário A.2: qual foi a forma de secagem — estufa, aquecedor ou temperatura ambiente? E você confirma que a secagem está concluída, sem umidade visível em nenhuma caixa?',
        requiresPhoto: false,
        quickSuggestions: [
          'Secagem em estufa. Concluída, sem umidade em nenhuma caixa.',
          'Secagem em temperatura ambiente, ainda não concluída.'
        ],
        extractData: (input: string, context?: any) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};

          if (lower.includes('estufa')) data.formaSecagem = 'estufa';
          else if (lower.includes('aquecedor')) data.formaSecagem = 'aquecedor';
          else if (lower.includes('temperatura ambiente') || lower.includes('ambiente')) data.formaSecagem = 'temperatura_ambiente';

          if (lower.includes('conclu') && (lower.includes('confirm') || lower.includes('sem umidade') || !lower.includes('não') && !lower.includes('nao'))) {
            data.dryingConfirmationAllBoxes = true;
          }
          if (lower.includes('não conclu') || lower.includes('nao conclu') || lower.includes('umidade residual') || lower.includes('ainda com umidade')) {
            data.dryingConfirmationAllBoxes = false;
          }

          // dryingConfirmationAllBoxes não é FieldWithAiSuggestion (é boolean puro no
          // Phase2Data), então lê direto do context, sem o ?.value dos outros campos.
          const alreadyFormaSecagem = !!context?.phase2?.formaSecagem?.value;
          const contextConfirmation = context?.phase2?.dryingConfirmationAllBoxes;
          const alreadyConfirmation = contextConfirmation !== undefined;

          const missing: string[] = [];
          if (!alreadyFormaSecagem && !data.formaSecagem) missing.push('forma de secagem');
          if (!alreadyConfirmation && data.dryingConfirmationAllBoxes === undefined) missing.push('confirmação de secagem completa');

          const confirmacaoEfetiva = data.dryingConfirmationAllBoxes ?? contextConfirmation;

          return {
            data,
            summaryText: missing.length === 0
              ? `Secagem: ${data.formaSecagem ?? context?.phase2?.formaSecagem?.value} · Completa: ${confirmacaoEfetiva ? 'sim' : 'não'}`
              : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0 && confirmacaoEfetiva === true
          };
        }
      }
    ],
    completionMessage: 'Formulário A.2 concluído — maceração e secagem registradas (POP-01 §9.5-9.6). O conjunto está pronto para o armazenamento provisório (Fase 3).'
  },
  3: {
    phaseNumber: 3,
    popCode: 'POP-INC-DITEC-PF-03',
    popTitle: 'Acondicionamento Provisório e Inventário',
    regulatoryRef: 'POP-INC-DITEC-PF-03 · Rastreabilidade de Caixas e Galpão',
    introMessage: 'Iniciando o Condutor do POP-INC-DITEC-PF-03. Vamos associar as caixas de polionda alveolar neutro e registrar a coordenada física na sala de espera de curadoria.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Alocação Física no Laboratório',
        conductorPrompt: 'Qual é a Estante, Prateleira e Vão de armazenamento provisório onde a caixa foi alocada?',
        requiresPhoto: false,
        quickSuggestions: [
          'Estante 04, Prateleira 02, Vão 01 da Sala B-10.',
          'Estante 02, Prateleira 01, Vão 02 do Laboratório Central.',
          'Estante 05, Prateleira 03, Vão 04.'
        ],
        extractData: (input: string) => {
          let rack = 'Estante 04';
          let shelf = 'Prateleira 02';
          let slot = 'Vão 01';

          const rackMatch = input.match(/estante\s*([0-9A-Za-z]+)/i);
          if (rackMatch) rack = `Estante ${rackMatch[1]}`;

          const shelfMatch = input.match(/prateleira\s*([0-9A-Za-z]+)/i);
          if (shelfMatch) shelf = `Prateleira ${shelfMatch[1]}`;

          const slotMatch = input.match(/v[aã]o\s*([0-9A-Za-z]+)/i);
          if (slotMatch) slot = `Vão ${slotMatch[1]}`;

          return {
            data: { rack, shelf, slot },
            summaryText: `Local: ${rack} / ${shelf} / ${slot}`,
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Acondicionamento provisório do POP-03 registrado e vinculado ao inventário do laboratório.'
  },
  4: {
    phaseNumber: 4,
    popCode: 'POP-INC-DITEC-PF-04',
    popTitle: 'Curadoria e Perfil Biológico',
    regulatoryRef: 'POP-INC-DITEC-PF-04 · Antropologia Forense',
    introMessage: 'Iniciando o Condutor do POP-INC-DITEC-PF-04. Vamos conduzir o pareamento anatômico, consolidação do NMI final e estimativas antropológicas de sexo, idade e ancestralidade.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Pareamento e Confirmação de NMI Final',
        conductorPrompt: 'Após o pareamento anatômico completo, quantos indivíduos distintos (NMI definitivo) foram individualizados e qual método foi utilizado?',
        requiresPhoto: true,
        photoPrompt: 'Visão anatômica em norma dorsal e pareamento de ossos longos',
        quickSuggestions: [
          'NMI definitivo consolidado em 2 indivíduos com base em fêmures e mandíbulas duplicadas.',
          'NMI de 1 indivíduo completo com esqueleto pareado e sem duplicidades.',
          'Identificados 2 indivíduos: Indivíduo A (masculino robusto) e Indivíduo B (feminino).'
        ],
        extractData: (input: string) => {
          let nmi = 1;
          if (input.includes('2') || input.toLowerCase().includes('dois')) nmi = 2;
          return {
            data: { finalNmi: nmi, pairingNotes: input.trim() },
            summaryText: `NMI Definitivo: ${nmi} indivíduo(s)`,
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Curadoria do POP-04 registrada com sucesso.'
  },
  5: {
    phaseNumber: 5,
    popCode: 'POP-INC-DITEC-PF-05',
    popTitle: 'Patologias, Traumatologia e DICOM',
    regulatoryRef: 'POP-INC-DITEC-PF-05 · Traumatologia Forense',
    introMessage: 'Condutor do POP-INC-DITEC-PF-05 ativo. Descreva as lesões traumáticas ante-mortem, peri-mortem ou pós-mortem e o status dos exames de imagem tomográfica.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Lesões e Traumatologia',
        conductorPrompt: 'Quais lesões ósseas ou traumas foram identificados? Indique a cronologia (antemortem/perimortem) e a região anatômica.',
        requiresPhoto: true,
        photoPrompt: 'Fotografia macroscópica em detalhe da lesão perimortem com escala milimetrada',
        quickSuggestions: [
          'Fratura perimortem com biselamento na escama do osso parietal esquerdo por PAF.',
          'Calo ósseo consolidado (antemortem) no terço médio da fíbula direita.',
          'Ausência de lesões traumáticas relevantes ou fraturas perimortem.'
        ],
        extractData: (input: string) => {
          return {
            data: { traumaNotes: input.trim() },
            summaryText: `Lesões registradas: "${input.trim().slice(0, 60)}..."`,
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Passo traumatológico do POP-05 concluído com registro fotográfico e escala.'
  },
  6: {
    phaseNumber: 6,
    popCode: 'POP-INC-DITEC-PF-06',
    popTitle: 'Marcação Física e Galpão Definitivo',
    regulatoryRef: 'POP-INC-DITEC-PF-06 · Custódia Permanente',
    introMessage: 'Condutor do POP-INC-DITEC-PF-06 ativo. Conduzindo a marcação dos elementos ósseos com Paraloid B-72, rotulagem das caixas definitivas e guarda permanente.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Marcação Física em Paraloid B-72',
        conductorPrompt: 'Confirme a aplicação do verniz Paraloid B-72, nanquim indelével e selagem superficial nos ossos diagnósticos.',
        requiresPhoto: true,
        photoPrompt: 'Fotografia macro da marcação com o número COI no fêmur',
        quickSuggestions: [
          'Marcação executada com Paraloid B-72 a 15% e tinta nanquim preta em todos os ossos principais.',
          'Camada de base e cobertura de Paraloid B-72 em acetona aplicadas com sucesso.'
        ],
        extractData: (input: string) => {
          return {
            data: { markingConfirmed: true, markingNotes: input.trim() },
            summaryText: 'Marcação em Paraloid B-72 confirmada.',
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Marcação e acondicionamento permanente do POP-06 concluídos com integridade assegurada.'
  },
  7: {
    phaseNumber: 7,
    popCode: 'POP-INC-DITEC-PF-07',
    popTitle: 'Consulta, Amostragem e Cadeia de Custódia ABAC',
    regulatoryRef: 'POP-INC-DITEC-PF-07 · Controle de Amostragem Destrutiva',
    introMessage: 'Condutor do POP-INC-DITEC-PF-07 ativo. Registro conversacional de autorização de pesquisa e controle de amostragem física.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Validação de Pesquisa e Amostragem',
        conductorPrompt: 'Descreva a instituição requisitante, o parecer do comitê de ética e a massa óssea retirada em gramas.',
        requiresPhoto: false,
        quickSuggestions: [
          'Projeto acadêmico USP - Amostra de 1,5g da diáfise femoral para extração de DNA antigo.',
          'Consulta visual não destrutiva autorizada para pesquisador credenciado.'
        ],
        extractData: (input: string) => {
          return {
            data: { sampleNotes: input.trim() },
            summaryText: `Amostragem: "${input.trim().slice(0, 60)}..."`,
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Controle de custódia ABAC registrado conforme POP-07.'
  }
};

/**
 * Interface de Configuração para o Futuro Agente de IA (Gemini 3.8 / Live API)
 */
export interface AiConductorAgentConfig {
  enabled: boolean;
  agentName: string;
  modelIdentifier: string;
  voicePersona: 'polite_forensic' | 'direct_rigorous' | 'live_bilingual';
  streamingMode: boolean;
  autoSpeak: boolean;
  systemPromptPreset: string;
  externalApiKeyConfigured: boolean;
}

export const DEFAULT_AI_AGENT_CONFIG: AiConductorAgentConfig = {
  enabled: false,
  agentName: 'Assistente Virtual do Condutor COI-INC (IA)',
  modelIdentifier: 'models/gemini-3.8-flash',
  voicePersona: 'polite_forensic',
  streamingMode: false,
  autoSpeak: true,
  systemPromptPreset: `Você é o Condutor do POP do SIGCOI, sistema de gestão da Coleção Osteológica Identificada do INC (COI-INC/DITEC/PF), coleção de referência para pesquisa e ensino em antropologia forense instituída pela Portaria DITEC/PF nº 1415/2024. Sua missão é guiar o perito ou técnico no laboratório com perguntas precisas e objetivas para preencher a documentação da coleção osteológica sem distrações. Sempre confirme os números de lacre, a integridade das embalagens e a identificação das caixas.`,
  externalApiKeyConfigured: false
};
