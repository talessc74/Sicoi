/**
 * Serviço de Condução Conversacional de POP (Procedimento Operacional Padrão)
 * Implementa a arquitetura de diálogo para condução normativa (SENASP/DITEC),
 * com suporte a fala/áudio, extração de dados e slot para futuro Agente de IA.
 */

import { PhaseNumber } from '../types/sgccco';

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
    popCode: 'POP-SENASP-01',
    popTitle: 'Recebimento e Triagem Inicial',
    regulatoryRef: 'Portaria SENASP/MJSP nº 04/2023 · Art. 158-B CPP',
    introMessage: 'Olá! Sou o Condutor do POP-SENASP-01 (Recebimento e Triagem Inicial). Vou orientar passo a passo a conferência de entrada, lacres de custódia e triagem anatômica preliminar. Você pode responder falando no microfone ou digitando.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Conferência de Invólucros e Lacres de Custódia',
        conductorPrompt: 'Primeiro passo (§Art. 158-B CPP): Quantos sacos ou caixas de transporte foram entregues e quais são os números de lacre gravados nos fechos?',
        regulatoryNotice: 'Obrigatório conferir a integridade física dos lacres antes do rompimento.',
        requiresPhoto: true,
        photoPrompt: 'Registrar foto frontal dos sacos e lacres inviolados',
        quickSuggestions: [
          '2 sacos entregues com lacres azul LAC-0841A e LAC-0841B intactos.',
          '1 saco de transporte com lacre verde LAC-9012 íntegro.',
          '3 sacos com lacres LAC-101, LAC-102 e LAC-103 sem violação aparente.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          let bags = 1;
          if (lower.includes('dois') || lower.includes('2') || lower.includes('duas')) bags = 2;
          else if (lower.includes('três') || lower.includes('tres') || lower.includes('3')) bags = 3;
          else if (lower.includes('quatro') || lower.includes('4')) bags = 4;

          const seals: string[] = [];
          const sealMatches = input.match(/(lacre[s]?|lac|fecho[s]?)\s*[:\-]?\s*([A-Za-z0-9\-]+)/gi);
          if (sealMatches) {
            sealMatches.forEach(s => {
              const clean = s.replace(/(lacre[s]?|lac|fecho[s]?)\s*[:\-]?\s*/i, '').trim();
              if (clean.length >= 3) seals.push(clean.toUpperCase());
            });
          }
          if (seals.length === 0) {
            // Check for general alphanumerics like LAC-0841A or 0841A
            const altMatches = input.match(/\b([A-Z]{2,4}-?[0-9]{3,5}[A-Z]?)\b/gi);
            if (altMatches) {
              altMatches.forEach(m => seals.push(m.toUpperCase()));
            }
          }
          if (seals.length === 0) {
            seals.push(`LACRE-${Math.floor(1000 + Math.random() * 9000)}`);
          }

          return {
            data: {
              receivedBagsCount: bags,
              bagSealNumbers: seals
            },
            summaryText: `${bags} invólucro(s) registrado(s) · Lacres: ${seals.join(', ')}`,
            isComplete: true
          };
        }
      },
      {
        stepNumber: 2,
        stepTitle: 'Condição Inicial do Material e Sedimentos',
        conductorPrompt: 'Segundo passo: Qual é o estado preliminar dos ossos? Descreva umidade (seco/úmido), impregnação de terra/sedimentos ou se há tecidos moles aderidos.',
        regulatoryNotice: 'POP-01 item 4.2: Proibido lavar antes da conferência de sedimentos.',
        requiresPhoto: false,
        quickSuggestions: [
          'Ossadas secas com impregnação argilosa avermelhada, sem tecidos moles.',
          'Material úmido com resíduos de solo arenoso, presença de raízes vegetais finas.',
          'Ossos secos, esbranquiçados por intemperismo solar superficial, ausência de tecidos moles.'
        ],
        extractData: (input: string) => {
          return {
            data: {
              initialConditionNotes: input.trim()
            },
            summaryText: `Condição registrada: "${input.trim().slice(0, 70)}..."`,
            isComplete: input.trim().length > 8
          };
        }
      },
      {
        stepNumber: 3,
        stepTitle: 'Triagem Anatômica e Estimativa de NMI',
        conductorPrompt: 'Terceiro passo: Durante a triagem preliminar na bancada, quais elementos anatômicos principais foram identificados? Qual a estimativa de Número Mínimo de Indivíduos (NMI)?',
        regulatoryNotice: 'Basear o NMI em elementos repetidos (ex.: crânios, mandíbulas, fêmures esquerdos).',
        requiresPhoto: true,
        photoPrompt: 'Fotografia panorâmica dos elementos na bancada de triagem',
        quickSuggestions: [
          '2 crânios com mandíbulas e fêmures bilaterais. NMI preliminar de 2.',
          '1 crânio íntegro com esqueleto pós-craniano compatível. NMI de 1 indivíduo.',
          'Fragmentos cranianos dispersos e 3 fêmures direitos. NMI preliminar de 3 indivíduos.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          let mni = 1;
          if (lower.includes('dois') || lower.includes('2') || lower.includes('duas')) mni = 2;
          else if (lower.includes('três') || lower.includes('tres') || lower.includes('3')) mni = 3;
          else if (lower.includes('quatro') || lower.includes('4')) mni = 4;

          const bones: string[] = [];
          if (lower.includes('crânio') || lower.includes('cranio')) bones.push('Crânio(s)');
          if (lower.includes('mandíbula') || lower.includes('mandibula')) bones.push('Mandíbula(s)');
          if (lower.includes('fêmur') || lower.includes('femur')) bones.push('Fêmures');
          if (lower.includes('úmero') || lower.includes('umero')) bones.push('Úmeros');
          if (lower.includes('pelve') || lower.includes('ilíaco') || lower.includes('iliaco')) bones.push('Ossos ilíacos');
          if (lower.includes('costela')) bones.push('Costelas');
          if (lower.includes('vértebra') || lower.includes('vertebra')) bones.push('Vértebras');
          if (bones.length === 0) bones.push('Elementos esqueléticos dispersos');

          return {
            data: {
              apparentMni: mni,
              preliminaryBonesNoted: bones
            },
            summaryText: `NMI Preliminar: ${mni} | Ossos: ${bones.join(', ')}`,
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Parabéns! Todos os 3 passos do POP-SENASP-01 foram preenchidos pela conversa. Os dados já foram consolidados na coleção. Agora você pode gerar as etiquetas de caixas e assinar a Fase 1 com certificado digital.'
  },
  2: {
    phaseNumber: 2,
    popCode: 'POP-SENASP-02',
    popTitle: 'Limpeza e Higienização Forense',
    regulatoryRef: 'POP-SENASP-02 · Diretrizes DITEC/SENASP',
    introMessage: 'Iniciando o Condutor do POP-SENASP-02 (Limpeza e Secagem). Vamos registrar o método de higienização mecânica ou aquosa e conferir o protocolo de secagem em estufa.',
    steps: [
      {
        stepNumber: 1,
        stepTitle: 'Método de Higienização e Temperatura',
        conductorPrompt: 'Passo 1 do POP-02: Qual o método de limpeza empregado na caixa selecionada e a temperatura média da água utilizada?',
        requiresPhoto: false,
        quickSuggestions: [
          'Lavagem mecânica suave com pincéis de cerdas macias em água a 24°C.',
          'Pincelamento a seco com escovas macias (sem uso de água).',
          'Maceração aquosa controlada a 23°C com água destilada corrente.'
        ],
        extractData: (input: string) => {
          const lower = input.toLowerCase();
          let method: 'lavagem_mecanica_pinceis' | 'pincelamento_seco' | 'outro_justificado' = 'lavagem_mecanica_pinceis';
          if (lower.includes('seco') || lower.includes('pincelamento')) method = 'pincelamento_seco';
          else if (lower.includes('macer') || lower.includes('outro')) method = 'outro_justificado';

          let temp = 24;
          const match = input.match(/(\d+)\s*(°|graus|c)/i);
          if (match) temp = parseInt(match[1], 10);

          return {
            data: {
              methodUsed: method,
              waterTemperatureC: temp,
              observations: input.trim()
            },
            summaryText: `Método: ${method} · Temperatura: ${temp}°C`,
            isComplete: true
          };
        }
      },
      {
        stepNumber: 2,
        stepTitle: 'Conferência de Secagem Completa em Estufa',
        conductorPrompt: 'Passo 2 do POP-02: Confirme se os ossos já cumpriram o período regulamentar em estufa ventilada (mínimo 72h) e se encontram completamente secos e sem odores.',
        requiresPhoto: true,
        photoPrompt: 'Fotografia dos ossos secos dispostos em bancada sobre papel absorvente neutro',
        quickSuggestions: [
          'Confirmo secagem completa após 72 horas em estufa ventilada a 30°C.',
          'Material perfeitamente seco, sem sinais de fungos ou umidade residual.',
          'Secagem concluída em 48h com umidade relativa inferior a 45%.'
        ],
        extractData: (input: string) => {
          return {
            data: {
              dryingConfirmed: true,
              dryingNotes: input.trim()
            },
            summaryText: 'Secagem integral confirmada conforme POP-02.',
            isComplete: true
          };
        }
      }
    ],
    completionMessage: 'Higienização e secagem do POP-02 concluídas com sucesso. O conjunto está apto para transferência ao acondicionamento provisório.'
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
