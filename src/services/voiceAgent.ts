/**
 * Serviço de Voz (TTS/STT) para condução do POP com as mãos livres / luvas cirúrgicas.
 * O roteiro do POP em si (os passos, os campos e a extração) vive em
 * popConductorService.ts (SENASP_POPS) — fonte única, para não duplicar o script
 * do procedimento em dois lugares divergentes.
 */

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
