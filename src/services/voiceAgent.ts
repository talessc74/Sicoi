/**
 * Serviço de Voz (TTS/STT) para condução do POP com as mãos livres / luvas cirúrgicas.
 * O roteiro do POP em si (os passos, os campos e a extração) vive em
 * popConductorService.ts (SENASP_POPS) — fonte única, para não duplicar o script
 * do procedimento em dois lugares divergentes.
 */

export class VoiceSpeechService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private unlocked = false;
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

  /**
   * Safari/iOS só libera speechSynthesis.speak() se a PRIMEIRA chamada da sessão
   * acontecer dentro de um toque direto do usuário (mesma regra de autoplay de
   * áudio/vídeo) — senão, engole a fala em silêncio, sem erro nenhum. Nossa
   * narração real dispara depois (setTimeout, callback assíncrono), nunca no
   * instante exato do toque, então cai nesse bloqueio. Chamar unlock() de dentro
   * de um onClick (botão de microfone, enviar, sugestão rápida) resolve isso uma
   * única vez por sessão — chamadas de speak() depois, mesmo assíncronas, tocam
   * normalmente.
   */
  unlock(): void {
    if (this.unlocked || !this.synth) return;
    this.unlocked = true;
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    this.synth.speak(silent);
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
