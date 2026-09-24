/**
 * Serviço de Condução Conversacional de POP (Procedimento Operacional Padrão)
 * Implementa a arquitetura de diálogo para condução normativa (SENASP/DITEC),
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

export interface PopConductorStep {
  stepNumber: number;
  stepTitle: string;
  conductorPrompt: string;
  regulatoryNotice?: string;
  requiresPhoto: boolean;
  photoPrompt?: string;
  quickSuggestions: string[];
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

// Definições dos POPs SENASP
export const SENASP_POPS: Record<PhaseNumber, PopDefinition> = {
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
          'Equipe composta por dois peritos. Hoje, 14h30min.'
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
        quickSuggestions: [
          'Foto do saco fechado feita. Placa de cemitério não se aplica. Materiais associados não se aplica. Remanescentes isolados fotografados.',
          'Todas as fotos obrigatórias feitas, incluindo placa do cemitério e materiais associados isolados.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};

          if (/saco.*(fechado|lacre)/.test(lower) || /foto\s*1\b/.test(lower)) data.foto1SacoFechado = true;
          if (/(placa).*(cemit[ée]rio)/.test(lower)) {
            data.foto2PlacaCemiterio = /n[ãa]o se aplica|sem placa/.test(lower) ? 'nao_se_aplica' : 'sim';
          }
          if (/materiais associados/.test(lower) && !/isolad/.test(lower)) {
            data.foto3RemanescentesMateriais = /n[ãa]o se aplica/.test(lower) ? 'nao_se_aplica' : 'sim';
          }
          if (/remanescentes isolad/.test(lower) || /foto\s*4\.?1\b/.test(lower)) data.foto4_1RemanescentesIsolados = true;
          if (/materiais associados isolad/.test(lower) || /foto\s*4\.?2\b/.test(lower)) {
            data.foto4_2MateriaisIsolados = /n[ãa]o se aplica/.test(lower) ? 'nao_se_aplica' : 'sim';
          }
          if (/todas as fotos/.test(lower)) {
            data.foto1SacoFechado = true;
            data.foto4_1RemanescentesIsolados = true;
            if (!data.foto2PlacaCemiterio) data.foto2PlacaCemiterio = 'sim';
            if (!data.foto3RemanescentesMateriais) data.foto3RemanescentesMateriais = 'sim';
            if (!data.foto4_2MateriaisIsolados) data.foto4_2MateriaisIsolados = 'sim';
          }

          const missing: string[] = [];
          if (!data.foto1SacoFechado) missing.push('foto do saco fechado');
          if (data.foto2PlacaCemiterio === undefined) missing.push('foto da placa do cemitério (ou "não se aplica")');
          if (data.foto3RemanescentesMateriais === undefined) missing.push('foto dos remanescentes com materiais associados (ou "não se aplica")');
          if (!data.foto4_1RemanescentesIsolados) missing.push('foto dos remanescentes isolados');
          if (data.foto4_2MateriaisIsolados === undefined) missing.push('foto dos materiais associados isolados (ou "não se aplica")');

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
        conductorPrompt: 'Terceiro passo: Que tipos de material estão presentes no saco? Ossos, dentes, cabelo, unha, próteses, vestes, pertences, tecidos moles?',
        requiresPhoto: false,
        quickSuggestions: [
          'Ossos e dentes presentes, sem outros materiais.',
          'Ossos, vestes e uma prótese dentária, descrita como coroa metálica no incisivo superior.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const types: string[] = [];
          if (lower.includes('osso')) types.push('ossos');
          if (lower.includes('dente')) types.push('dentes');
          if (lower.includes('cabelo')) types.push('cabelo');
          if (lower.includes('unha')) types.push('unha');
          if (lower.includes('prótese') || lower.includes('protese')) types.push('proteses');
          if (lower.includes('veste')) types.push('vestes');
          if (lower.includes('pertence')) types.push('pertences');
          if (lower.includes('tecido mole') || lower.includes('mumificad')) types.push('tecidos_moles');

          return {
            data: types.length > 0 ? { tipoMaterial: types } : {},
            summaryText: types.length > 0 ? `Material presente: ${types.join(', ')}.` : 'Nenhum tipo de material reconhecido ainda.',
            isComplete: types.length > 0
          };
        }
      },
      {
        stepNumber: 4,
        stepTitle: 'Estado de Preservação (campo 16)',
        conductorPrompt: 'Quarto passo: Como está o estado de preservação dos remanescentes? Preservado/íntegro, degradado, fragmentado, friável, com erosão, úmido, seco, com fungo visível, manchas, perda de cortical, carbonização ou insetos?',
        requiresPhoto: false,
        quickSuggestions: [
          'Preservado e seco, sem sinais de degradação.',
          'Degradado, com fragmentação e perda de cortical em alguns segmentos.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
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

          return {
            data: chars.length > 0 ? { estadoPreservacao: chars, observacoesGeraisPreservacao: input.trim() } : {},
            summaryText: chars.length > 0 ? `Estado de preservação: ${chars.join(', ')}.` : 'Nenhuma característica de preservação reconhecida ainda.',
            isComplete: chars.length > 0
          };
        }
      },
      {
        stepNumber: 5,
        stepTitle: 'Coleta de Amostra Biológica — Exame Genético (POP-01 §9.3.1)',
        conductorPrompt: 'Quinto passo — importante: isto precisa ser feito ANTES da maceração. Foi coletada amostra para exame genético? De qual elemento (falange, ossos tarsais, dente hígido, primeira costela, patela) e quem é o responsável pela coleta?',
        regulatoryNotice: 'POP-01 §9.3.1: a coleta compromete-se se feita após a maceração — ordem de prioridade: falange distal, demais falanges, tarsais, dente, costela, patela.',
        requiresPhoto: false,
        quickSuggestions: [
          'Coletada falange distal, responsável Técnico João.',
          'Não coletado, sem indicação de exame genético neste caso.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const elements: string[] = [];
          if (lower.includes('não coletad') || lower.includes('nao coletad')) elements.push('nao_coletado');
          else {
            if (lower.includes('falange')) elements.push('falange');
            if (lower.includes('tarsa')) elements.push('ossos_tarsais');
            if (lower.includes('dente') || lower.includes('molar') || lower.includes('incisivo') || lower.includes('canino')) elements.push('dente_higido');
            if (lower.includes('costela')) elements.push('primeira_costela');
            if (lower.includes('patela')) elements.push('patela');
            if (elements.length === 0 && lower.includes('outro')) elements.push('outros');
          }

          const respMatch = input.match(/respons[áa]vel[:\s]+([^.]+)/i);
          const data: Record<string, any> = {};
          if (elements.length > 0) data.exameGenetico = elements;
          if (respMatch) data.geneticoResponsavelColeta = respMatch[1].trim();
          else if (elements[0] === 'nao_coletado') data.geneticoResponsavelColeta = 'Não aplicável';

          const missing: string[] = [];
          if (!data.exameGenetico) missing.push('elemento coletado (ou "não coletado")');
          if (!data.geneticoResponsavelColeta) missing.push('responsável pela coleta');

          return {
            data,
            summaryText: missing.length === 0 ? `Exame genético: ${data.exameGenetico?.join(', ')} · Responsável: ${data.geneticoResponsavelColeta}` : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0
          };
        }
      },
      {
        stepNumber: 6,
        stepTitle: 'Coleta de Amostra Biológica — Análise Isotópica (POP-01 §9.3.2)',
        conductorPrompt: 'Sexto passo: Foi coletada amostra para análise isotópica — cabelo, unha ou dente? Quem é o responsável pela coleta?',
        requiresPhoto: false,
        quickSuggestions: [
          'Coletado cabelo e unhas, responsável Técnica Maria.',
          'Não coletado.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const materials: string[] = [];
          if (lower.includes('não coletad') || lower.includes('nao coletad')) materials.push('nao_coletado');
          else {
            if (lower.includes('cabelo')) materials.push('cabelo');
            if (lower.includes('unha')) materials.push('unha');
            if (lower.includes('dente')) materials.push('dente');
          }

          const respMatch = input.match(/respons[áa]vel[:\s]+([^.]+)/i);
          const data: Record<string, any> = {};
          if (materials.length > 0) data.analiseIsotopica = materials;
          if (respMatch) data.isotopicaResponsavelColeta = respMatch[1].trim();
          else if (materials[0] === 'nao_coletado') data.isotopicaResponsavelColeta = 'Não aplicável';

          const missing: string[] = [];
          if (!data.analiseIsotopica) missing.push('material coletado (ou "não coletado")');
          if (!data.isotopicaResponsavelColeta) missing.push('responsável pela coleta');

          return {
            data,
            summaryText: missing.length === 0 ? `Análise isotópica: ${data.analiseIsotopica?.join(', ')} · Responsável: ${data.isotopicaResponsavelColeta}` : `Ainda falta: ${missing.join('; ')}.`,
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
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};
          const corMatch = input.match(/saco\s+(\w+)/i) || input.match(/cor\s*[:\s]+(\w+)/i);
          if (corMatch) data.corSacoLavagem = corMatch[1];

          if (lower.includes('água quente') || lower.includes('agua quente')) data.tipoLimpeza = 'agua_quente';
          else if (lower.includes('água fria') || lower.includes('agua fria')) data.tipoLimpeza = 'agua_fria';
          else if (lower.includes('a seco') || lower.includes('seco')) data.tipoLimpeza = 'a_seco';

          const missing: string[] = [];
          if (!data.corSacoLavagem) missing.push('cor do saco de lavagem');
          if (!data.tipoLimpeza) missing.push('tipo de limpeza');

          return {
            data,
            summaryText: missing.length === 0 ? `Saco ${data.corSacoLavagem} · Limpeza: ${data.tipoLimpeza}` : `Ainda falta: ${missing.join('; ')}.`,
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
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};
          if (/n[ãa]o houve|sem dano|nenhum dano/.test(lower)) {
            data.houveDanos = false;
          } else if (/sim|houve dano|dano/.test(lower)) {
            data.houveDanos = true;
            data.descricaoDanos = input.trim();
          }

          const missing: string[] = [];
          if (data.houveDanos === undefined) missing.push('se houve dano (sim/não)');
          if (data.houveDanos === true && !data.descricaoDanos) missing.push('descrição do dano');

          return {
            data,
            summaryText: missing.length === 0
              ? (data.houveDanos ? `Dano registrado: "${data.descricaoDanos.slice(0, 60)}..."` : 'Sem danos registrados.')
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
          'Equipe composta por dois peritos. Hoje, 09h30min.'
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
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          const data: Record<string, any> = {};
          if (/n[ãa]o houve|sem dano|nenhum dano/.test(lower)) {
            data.houveDanosMaceracao = false;
          } else if (/sim|houve dano|dano/.test(lower)) {
            data.houveDanosMaceracao = true;
            data.descricaoDanosMaceracao = input.trim();
          }

          const missing: string[] = [];
          if (data.houveDanosMaceracao === undefined) missing.push('se houve dano (sim/não)');
          if (data.houveDanosMaceracao === true && !data.descricaoDanosMaceracao) missing.push('descrição do dano');

          return {
            data,
            summaryText: missing.length === 0
              ? (data.houveDanosMaceracao ? `Dano registrado: "${data.descricaoDanosMaceracao.slice(0, 60)}..."` : 'Sem danos registrados na maceração.')
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
        extractData: (input: string) => {
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

          const missing: string[] = [];
          if (!data.formaSecagem) missing.push('forma de secagem');
          if (data.dryingConfirmationAllBoxes === undefined) missing.push('confirmação de secagem completa');

          return {
            data,
            summaryText: missing.length === 0
              ? `Secagem: ${data.formaSecagem} · Completa: ${data.dryingConfirmationAllBoxes ? 'sim' : 'não'}`
              : `Ainda falta: ${missing.join('; ')}.`,
            isComplete: missing.length === 0 && data.dryingConfirmationAllBoxes === true
          };
        }
      }
    ],
    completionMessage: 'Formulário A.2 concluído — maceração e secagem registradas (POP-01 §9.5-9.6). O conjunto está pronto para o armazenamento provisório (Fase 3).'
  },
  3: {
    phaseNumber: 3,
    popCode: 'POP-SENASP-03',
    popTitle: 'Acondicionamento Provisório e Inventário',
    regulatoryRef: 'POP-SENASP-03 · Rastreabilidade de Caixas e Galpão',
    introMessage: 'Iniciando o Condutor do POP-SENASP-03. Vamos associar as caixas de polionda alveolar neutro e registrar a coordenada física na sala de espera de curadoria.',
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
    popCode: 'POP-SENASP-04',
    popTitle: 'Curadoria e Perfil Biológico',
    regulatoryRef: 'POP-SENASP-04 · Antropologia Forense',
    introMessage: 'Iniciando o Condutor do POP-SENASP-04. Vamos conduzir o pareamento anatômico, consolidação do MNI final e estimativas antropológicas de sexo, idade e ancestralidade.',
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
          let mni = 1;
          if (input.includes('2') || input.toLowerCase().includes('dois')) mni = 2;
          return {
            data: { finalMni: mni, pairingNotes: input.trim() },
            summaryText: `NMI Definitivo: ${mni} indivíduo(s)`,
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Curadoria do POP-04 registrada com sucesso.'
  },
  5: {
    phaseNumber: 5,
    popCode: 'POP-SENASP-05',
    popTitle: 'Patologias, Traumatologia e DICOM',
    regulatoryRef: 'POP-SENASP-05 · Traumatologia Forense',
    introMessage: 'Condutor do POP-SENASP-05 ativo. Descreva as lesões traumáticas ante-mortem, peri-mortem ou pós-mortem e o status dos exames de imagem tomográfica.',
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
          'Ausência de lesões traumáticas de relevância pericial ou fraturas perimortem.'
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
    popCode: 'POP-SENASP-06',
    popTitle: 'Marcação Física e Galpão Definitivo',
    regulatoryRef: 'POP-SENASP-06 · Custódia Permanente',
    introMessage: 'Condutor do POP-SENASP-06 ativo. Conduzindo a marcação dos elementos ósseos com Paraloid B-72, rotulagem das caixas definitivas e guarda permanente.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Marcação Física em Paraloid B-72',
        conductorPrompt: 'Confirme a aplicação do verniz Paraloid B-72, nanquim indelével e selagem superficial nos ossos diagnósticos.',
        requiresPhoto: true,
        photoPrompt: 'Fotografia macro da marcação com sigla NIC no fêmur',
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
    popCode: 'POP-SENASP-07',
    popTitle: 'Consulta, Amostragem e Cadeia de Custódia ABAC',
    regulatoryRef: 'POP-SENASP-07 · Controle de Amostragem Destrutiva',
    introMessage: 'Condutor do POP-SENASP-07 ativo. Registro conversacional de autorização de pesquisa e controle de amostragem física.',
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
  agentName: 'Agente Forense Virtual SENASP (IA)',
  modelIdentifier: 'models/gemini-3.8-flash',
  voicePersona: 'polite_forensic',
  streamingMode: false,
  autoSpeak: true,
  systemPromptPreset: `Você é o Condutor Forense Oficial do SGCCCO, treinado nas diretrizes SENASP/DITEC e Código de Processo Penal (Art. 158-A a 158-F). Sua missão é guiar o perito/técnico no laboratório através de perguntas rigorosas, precisas e objetivas para preencher a documentação da coleção osteológica sem distrações. Sempre confirme os números de lacre, integridade e termos periciais.`,
  externalApiKeyConfigured: false
};
