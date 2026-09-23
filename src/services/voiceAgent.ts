/**
 * Agente de Captura por Voz (POP guiado por voz para tablet em laboratório)
 * Permite operação com as mãos livres / luvas cirúrgicas.
 */

export interface PopStep {
  stepNumber: number;
  title: string;
  narrativeText: string;
  requiredFields: string[];
  requiresPhoto: boolean;
  photoPrompt?: string;
  sampleVoicePrompt: string;
  extractLogic: (transcript: string) => Record<string, any>;
}

export const POP_PHASE_1_STEPS: PopStep[] = [
  {
    stepNumber: 1,
    title: 'Abertura dos Sacos e Verificação de Lacres',
    narrativeText: 'Passo um: Inspecione os lacres dos sacos entregues. Descreva o número de sacos e os códigos dos lacres.',
    requiredFields: ['receivedBagsCount', 'bagSealNumbers'],
    requiresPhoto: true,
    photoPrompt: 'Fotografe os sacos com os lacres visíveis',
    sampleVoicePrompt: 'Recebi dois sacos com lacres azul zero oito quatro um A e azul zero oito quatro um B intactos.',
    extractLogic: (transcript: string) => {
      const lower = transcript.toLowerCase();
      let count = 1;
      if (lower.includes('dois') || lower.includes('2') || lower.includes('duas')) count = 2;
      else if (lower.includes('três') || lower.includes('3')) count = 3;
      else if (lower.includes('quatro') || lower.includes('4')) count = 4;

      const seals: string[] = [];
      const sealMatches = transcript.match(/lacre[s]?\s+([A-Za-z0-9\-]+)/gi);
      if (sealMatches) {
        sealMatches.forEach(s => seals.push(s.replace(/lacre[s]?\s+/i, '').toUpperCase()));
      }
      if (seals.length === 0) {
        seals.push(`LACRE-${Math.floor(1000 + Math.random() * 9000)}`);
      }

      return {
        receivedBagsCount: count,
        bagSealNumbers: seals
      };
    }
  },
  {
    stepNumber: 2,
    title: 'Análise Preliminar A.1 e Condição do Material',
    narrativeText: 'Passo dois: Descreva o estado preliminar dos ossos, umidade, presença de terra ou tecidos moles.',
    requiredFields: ['initialConditionNotes'],
    requiresPhoto: false,
    sampleVoicePrompt: 'Ossadas secas com impregnação de terra argilosa, sem restos de tecidos moles, coloração ocre clara.',
    extractLogic: (transcript: string) => {
      return {
        initialConditionNotes: transcript
      };
    }
  },
  {
    stepNumber: 3,
    title: 'Triagem Inicial e Estimativa de NMI',
    narrativeText: 'Passo três: Conte os crânios e elementos pares evidentes. Qual o Número Mínimo de Indivíduos presumido?',
    requiredFields: ['apparentMni', 'preliminaryBonesNoted'],
    requiresPhoto: true,
    photoPrompt: 'Fotografe a visão panorâmica da bancada de triagem',
    sampleVoicePrompt: 'Identifico dois crânios com mandíbulas, fêmures bilaterais e ossos longos, NMI preliminar de dois.',
    extractLogic: (transcript: string) => {
      const lower = transcript.toLowerCase();
      let mni = 1;
      if (lower.includes('dois') || lower.includes('2') || lower.includes('duas')) mni = 2;
      else if (lower.includes('três') || lower.includes('3')) mni = 3;

      const bones: string[] = [];
      if (lower.includes('crânio') || lower.includes('cranio')) bones.push('Crânio(s)');
      if (lower.includes('mandíbula') || lower.includes('mandibula')) bones.push('Mandíbula(s)');
      if (lower.includes('fêmur') || lower.includes('femur')) bones.push('Fêmures');
      if (lower.includes('costela')) bones.push('Costelas');
      if (lower.includes('pelve') || lower.includes('ilíaco')) bones.push('Ossos ilíacos');
      if (bones.length === 0) bones.push('Elementos esqueléticos dispersos');

      return {
        apparentMni: mni,
        preliminaryBonesNoted: bones
      };
    }
  }
];

export const POP_PHASE_2_STEPS: PopStep[] = [
  {
    stepNumber: 1,
    title: 'Método de Limpeza e Condições Térmicas',
    narrativeText: 'Passo um da Limpeza: Declare o procedimento técnico aplicado na caixa selecionada e a temperatura da água.',
    requiredFields: ['methodUsed', 'waterTemperatureC'],
    requiresPhoto: false,
    sampleVoicePrompt: 'Iniciando lavagem mecânica com pincéis macios em água destilada corrente a vinte e quatro graus.',
    extractLogic: (transcript: string) => {
      const lower = transcript.toLowerCase();
      let method = 'lavagem_mecanica_pinceis';
      if (lower.includes('maceração') || lower.includes('aquosa')) method = 'maceracao_aquosa_suave';
      else if (lower.includes('enzimática') || lower.includes('enzima')) method = 'enzimatica_controlada';

      let temp = 23;
      const numMatch = transcript.match(/(\d+)\s*(graus|°|c)/i);
      if (numMatch) temp = parseInt(numMatch[1], 10);

      return {
        methodUsed: method,
        waterTemperatureC: temp,
        observations: transcript
      };
    }
  },
  {
    stepNumber: 2,
    title: 'Conferência de Secagem Completa',
    narrativeText: 'Passo dois: Confirme se os ossos da caixa estão completamente secos para liberação.',
    requiredFields: ['dryingConfirmed'],
    requiresPhoto: true,
    photoPrompt: 'Fotografe a caixa com os ossos secos dispostos sobre a bancada',
    sampleVoicePrompt: 'Caixa seca após setenta e duas horas em estufa ventilada, pronto para armazenar.',
    extractLogic: (transcript: string) => {
      return {
        dryingConfirmed: true,
        dryingNotes: transcript
      };
    }
  }
];

export class VoiceSpeechService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  public isSupported = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis || null;
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.lang = 'pt-BR';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.isSupported = true;
      }
    }
  }

  speak(text: string, onEnd?: () => void): void {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    if (onEnd) utterance.onend = onEnd;
    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  startListening(onResult: (text: string) => void, onError?: (err: any) => void): void {
    if (!this.recognition) {
      if (onError) onError('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    try {
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      };
      this.recognition.onerror = (event: any) => {
        if (onError) onError(event.error);
      };
      this.recognition.start();
    } catch (e) {
      if (onError) onError(e);
    }
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
  }
}

export const voiceService = new VoiceSpeechService();
