import React, { useState } from 'react';
import { PopStep, voiceService } from '../services/voiceAgent';
import { Mic, MicOff, Volume2, Camera, Check, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

interface VoiceHandsFreeBarProps {
  currentStep: PopStep;
  totalSteps: number;
  onStepExtracted: (data: Record<string, any>, transcript: string) => void;
  onNextStep: () => void;
  onTakeStepPhoto?: () => void;
  isLocked: boolean;
}

export const VoiceHandsFreeBar: React.FC<VoiceHandsFreeBarProps> = ({
  currentStep,
  totalSteps,
  onStepExtracted,
  onNextStep,
  onTakeStepPhoto,
  isLocked
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [showSimModal, setShowSimModal] = useState(false);

  const handleSpeakStep = () => {
    setIsSpeaking(true);
    voiceService.speak(currentStep.narrativeText, () => {
      setIsSpeaking(false);
    });
  };

  const handleToggleListen = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      voiceService.startListening(
        (transcript) => {
          setIsListening(false);
          setLastTranscript(transcript);
          // Check for voice command
          const lower = transcript.toLowerCase();
          if (lower.includes('foto') && onTakeStepPhoto) {
            onTakeStepPhoto();
          } else if (lower.includes('confirmar') || lower.includes('próximo')) {
            onNextStep();
          } else {
            const extracted = currentStep.extractLogic(transcript);
            onStepExtracted(extracted, transcript);
          }
        },
        (err) => {
          setIsListening(false);
          console.warn('Speech rec fallback:', err);
          // Suggest simulated technical voice test
          setShowSimModal(true);
        }
      );
    }
  };

  const handleApplySimulatedVoice = (text: string) => {
    setLastTranscript(text);
    const extracted = currentStep.extractLogic(text);
    onStepExtracted(extracted, text);
    setShowSimModal(false);
  };

  if (isLocked) {
    return null;
  }

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono text-xs font-bold">
            {currentStep.stepNumber}/{totalSteps}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-sky-400 font-mono font-semibold">
                POP Guiado por Voz · Mãos Livres
              </span>
              <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded font-mono">
                Tablet Lab
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white">{currentStep.title}</h4>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpeakStep}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Ouvir instrução falada do POP"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-sky-400 animate-pulse' : ''}`} />
            <span>Narra Passo</span>
          </button>

          <button
            onClick={handleToggleListen}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
            title="Ditar observações do POP pelo microfone"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isListening ? 'Ouvindo...' : 'Falar (Microfone)'}</span>
          </button>

          <button
            onClick={() => setShowSimModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
            title="Testar com frases laboratoriais sintéticas"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
            <span className="hidden sm:inline">Exemplo Falado</span>
          </button>

          {currentStep.requiresPhoto && onTakeStepPhoto && (
            <button
              onClick={onTakeStepPhoto}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
              title="Voz: diga 'foto' para capturar"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto POP</span>
            </button>
          )}

          <button
            onClick={onNextStep}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Avançar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Narrative guidance text */}
      <p className="text-xs text-slate-300 leading-relaxed font-sans mb-2">
        {currentStep.narrativeText}
      </p>

      {/* Last recognized transcript bar */}
      {lastTranscript && (
        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex items-start justify-between gap-3 text-xs">
          <div className="flex-1">
            <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold block mb-0.5">
              Última Transcrição Capturada (Rastreabilidade §7):
            </span>
            <span className="text-slate-200 italic font-mono text-[11px]">"{lastTranscript}"</span>
          </div>
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded shrink-0">
            sugerida_por_ia
          </span>
        </div>
      )}

      {/* Simulation / Lab Voice Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Simular Narração Técnica de Laboratório
              </h4>
              <button
                onClick={() => setShowSimModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Caso esteja em ambiente sem microfone físico, selecione uma fala sintética padronizada para testar a extração imediata com rastreabilidade da transcrição:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleApplySimulatedVoice(currentStep.sampleVoicePrompt)}
                className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition-colors"
              >
                <span className="font-semibold text-sky-300 block mb-1">Fala Padrão do Passo:</span>
                <span className="italic text-slate-200">"{currentStep.sampleVoicePrompt}"</span>
              </button>
              <button
                onClick={() => handleApplySimulatedVoice('Abertura de dois sacos lacrados com lacres azul 0841A e 0841B. Dois crânios íntegros com ossos pares de membros inferiores.')}
                className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition-colors"
              >
                <span className="font-semibold text-sky-300 block mb-1">Variação de NMI 2:</span>
                <span className="italic text-slate-200">"Dois crânios íntegros com ossos pares de membros inferiores."</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
