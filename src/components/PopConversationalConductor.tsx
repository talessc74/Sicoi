import React, { useState, useEffect, useRef } from 'react';
import { OsteologicalCollection, UserProfile, PhaseNumber } from '../types/sgccco';
import {
  INC_DITEC_PF_POPS,
  ConductorChatMessage,
  PopConductorStep,
  PopConductorPhotoChecklistItem,
  DEFAULT_AI_AGENT_CONFIG,
  AiConductorAgentConfig
} from '../services/popConductorService';
import { voiceService } from '../services/voiceAgent';
import { sendPopStepMessage } from '../services/geminiService';
import { uploadCollectionPhoto } from '../services/photoService';
import { PhotoSourceModal } from './PhotoSourceModal';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Camera,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Shield,
  FileCheck,
  ChevronRight,
  Info,
  ExternalLink,
  Cpu
} from 'lucide-react';

interface PopConversationalConductorProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  phaseNumber: PhaseNumber;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  onStepPhotoCaptured?: (photo: any) => void;
  isLocked?: boolean;
}

// O que fazer com o arquivo real assim que o seletor de câmera/arquivo devolver —
// decidido no clique do botão, antes do diálogo nativo abrir (ver handleCapturePhoto
// e handleCaptureChecklistPhoto), e consumido só depois do upload confirmar.
type PendingPhotoCapture =
  | { kind: 'step'; stepNumber: number; caption: string }
  | { kind: 'checklist'; item: PopConductorPhotoChecklistItem };

export const PopConversationalConductor: React.FC<PopConversationalConductorProps> = ({
  collection,
  currentUser,
  phaseNumber,
  onUpdateCollection,
  onStepPhotoCaptured,
  isLocked = false
}) => {
  const popDef = INC_DITEC_PF_POPS[phaseNumber] || INC_DITEC_PF_POPS[1];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [messages, setMessages] = useState<ConductorChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConductorAgentConfig>(DEFAULT_AI_AGENT_CONFIG);
  const [showExtractedPanel, setShowExtractedPanel] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Dois inputs ocultos: um com capture="environment" (força a câmera) e um
  // sem capture (seletor comum do dispositivo, que pode incluir a galeria) —
  // o PhotoSourceModal decide qual deles clicar (pedido do Tales, out/2026).
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pendingCaptureRef = useRef<PendingPhotoCapture | null>(null);
  const currentStep: PopConductorStep | undefined = popDef.steps[currentStepIndex];

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation on mount or phase change
  useEffect(() => {
    const initialMessages: ConductorChatMessage[] = [
      {
        id: `msg-intro-${Date.now()}`,
        sender: 'conductor',
        text: popDef.introMessage,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    if (popDef.steps.length > 0) {
      const firstStep = popDef.steps[0];
      initialMessages.push({
        id: `msg-step-0-${Date.now() + 1}`,
        sender: 'conductor',
        text: firstStep.conductorPrompt,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        stepNumber: firstStep.stepNumber,
        requiresPhoto: firstStep.requiresPhoto,
        suggestedReplies: firstStep.quickSuggestions
      });

      if (voiceEnabled) {
        voiceService.speak(firstStep.conductorPrompt);
      }
    }

    setMessages(initialMessages);
    setCurrentStepIndex(0);
  }, [phaseNumber]);

  // Speak conductor message
  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    setIsSpeaking(true);
    voiceService.speak(text, () => setIsSpeaking(false));
  };

  // Submit a user message to the conductor
  const handleSendMessage = async (rawText: string, isVoice = false) => {
    // Destrava a síntese de voz no iOS/Safari — precisa acontecer dentro de um
    // toque direto do usuário (botão Enviar, sugestão rápida, tecla Enter); ver
    // voiceAgent.ts. Idempotente, então é seguro chamar toda vez.
    voiceService.unlock();

    const text = rawText.trim();
    if (!text || isLocked) return;

    setInputText('');

    const userMsgId = `msg-user-${Date.now()}`;
    const userMessage: ConductorChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      stepNumber: currentStep?.stepNumber,
      isVoiceInput: isVoice
    };

    // Leitura preliminar do motor determinístico local — usada (a) como fallback se
    // a IA estiver desligada ou falhar, e (b) como pista enviada à IA sobre o que a
    // regex simples já reconheceu neste turno.
    let extractedPayload: Record<string, any> = {};
    let summaryText = '';
    let isComplete = false;

    if (currentStep) {
      const result = currentStep.extractData(text, collection);
      extractedPayload = result.data;
      summaryText = result.summaryText;
      isComplete = result.isComplete;
      userMessage.extractedData = extractedPayload;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Se o Agente de IA estiver ativo, é a IA quem decide a extração final e,
    // principalmente, `stepConfirmed` — julgamento sobre a intenção da fala, não uma
    // palavra-chave fixa. O motor determinístico acima só entra como fallback.
    let narrationText = '';
    let narrationTags: string[] | undefined;
    let aiDecided = false;

    if (aiConfig.enabled && currentStep) {
      try {
        const stepContext = [
          `Passo ${currentStep.stepNumber} de ${popDef.steps.length} — ${currentStep.stepTitle}`,
          `Pergunta do condutor: ${currentStep.conductorPrompt}`,
          currentStep.regulatoryNotice ? `Norma aplicável: ${currentStep.regulatoryNotice}` : '',
          currentStep.aiFieldHints || '',
          `Leitura preliminar de um motor de regras simples sobre esta mesma fala (pode confirmar ou corrigir): ${summaryText || 'nada reconhecido'}.`,
          `Campos que o motor de regras já extraiu nesta fala: ${JSON.stringify(extractedPayload)}.`
        ]
          .filter(Boolean)
          .join('\n');

        const aiResult = await sendPopStepMessage(text, stepContext);
        extractedPayload = { ...extractedPayload, ...aiResult.extractedFields };
        isComplete = aiResult.stepConfirmed;
        summaryText =
          aiResult.missingRequiredFields.length > 0
            ? `Ainda falta: ${aiResult.missingRequiredFields.join('; ')}.`
            : summaryText;
        narrationText = aiResult.conductorReplyText;
        narrationTags = [aiResult.modelUsed, 'IA Gemini · confirmação por julgamento'];
        aiDecided = true;
        userMessage.extractedData = extractedPayload;
      } catch (err: any) {
        console.warn('Fallback para motor procedimental devido a erro no Gemini:', err);
      }
    }

    if (!aiDecided) {
      narrationTags = ['Motor determinístico (regras locais)'];
    }

    // Descrições obrigatórias (Fase 1, passos 3 a 6): conferidas sobre o que já estava
    // gravado + o que foi extraído agora, venha da regra ou da IA. Se faltar alguma, o
    // passo não avança, mesmo que a IA tenha confirmado.
    if (currentStep?.blockingCheck) {
      const stillMissing = currentStep.blockingCheck(collection, extractedPayload);
      if (stillMissing.length > 0) {
        if (isComplete) narrationText = '';
        isComplete = false;
        summaryText = `Ainda falta: ${stillMissing.join('; ')}. Descreva agora: ${stillMissing[0].replace(/^descrição de /, '')}.`;
      }
    }

    // Aplica as extrações ao conjunto — sempre, esteja o passo completo ou não,
    // para não perder o que já foi dito enquanto falta um campo.
    await applyExtractionsToCollection(extractedPayload);

    // Motor procedimental determinístico: decide o avanço de passo. `isComplete` é a
    // única condição que libera o próximo passo — nunca avança só porque o usuário falou.
    setTimeout(() => {
      const nextStepIdx = currentStepIndex + 1;
      const hasMoreSteps = nextStepIdx < popDef.steps.length;

      if (!isComplete) {
        const replyText = narrationText || `Ainda não posso avançar: ${summaryText}`;
        const conductorReply: ConductorChatMessage = {
          id: `msg-cond-${Date.now()}`,
          sender: 'conductor',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          stepNumber: currentStep?.stepNumber,
          requiresPhoto: currentStep?.requiresPhoto,
          suggestedReplies: currentStep?.quickSuggestions,
          fieldTags: narrationTags
        };
        setMessages(prev => [...prev, conductorReply]);
        speakText(replyText);
        return; // não avança — currentStepIndex permanece o mesmo
      }

      let replyText = `Entendido e anotado: ${summaryText}. `;

      if (hasMoreSteps) {
        const nextStep = popDef.steps[nextStepIdx];
        replyText += narrationText || `Prosseguindo para o Passo ${nextStep.stepNumber}: ${nextStep.conductorPrompt}`;

        const conductorReply: ConductorChatMessage = {
          id: `msg-cond-${Date.now()}`,
          sender: 'conductor',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          stepNumber: nextStep.stepNumber,
          requiresPhoto: nextStep.requiresPhoto,
          suggestedReplies: nextStep.quickSuggestions,
          fieldTags: narrationTags
        };

        setMessages(prev => [...prev, conductorReply]);
        setCurrentStepIndex(nextStepIdx);
        speakText(replyText);
      } else {
        replyText += narrationText || popDef.completionMessage;
        const conductorReply: ConductorChatMessage = {
          id: `msg-cond-${Date.now()}`,
          sender: 'conductor',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          fieldTags: [...(narrationTags || []), 'Concluído', 'Apto para Assinatura']
        };

        setMessages(prev => [...prev, conductorReply]);
        setCurrentStepIndex(popDef.steps.length);
        speakText(replyText);
      }
    }, 600);
  };

  const PHASE1_OPTIONAL_FIELDS = ['geneticoPrimeiraCostelaDescricao', 'geneticoPatelaDescricao'];

  // Aplica os campos extraídos pelo motor de passos à coleção (Fase 1: Formulário A.1;
  // Fase 2: maceração/limpeza/secagem/acondicionamento — POP-01 §9.5-9.7).
  // Nunca fabrica foto: o checklist fotográfico (foto1SacoFechado etc.) só é marcado
  // pela extração quando o valor é 'nao_se_aplica' — 'sim'/true exige a foto real do
  // botão de captura (handleCaptureChecklistPhoto), que já atualiza esses campos junto
  // com o upload. extractData (popConductorService.ts) garante que a narração nunca
  // produz 'sim'/true para foto1SacoFechado/foto4_1RemanescentesIsolados.
  const applyExtractionsToCollection = (extractedData: Record<string, any>) => {
    if (Object.keys(extractedData).length === 0) return;

    const updated = { ...collection };

    if (phaseNumber === 1) {
      const p1 = { ...updated.phase1 };
      for (const [key, value] of Object.entries(extractedData)) {
        if (value === undefined) continue;
        // Campos opcionais do A.1 (ausentes em conjuntos antigos) também aceitam extração.
        if (key in p1 || PHASE1_OPTIONAL_FIELDS.includes(key)) {
          (p1 as any)[key] = { value, isAiSuggested: true };
        }
      }

      updated.phase1 = p1;
    } else if (phaseNumber === 2) {
      const p2 = { ...updated.phase2 };
      for (const [key, value] of Object.entries(extractedData)) {
        if (value === undefined) continue;
        if (key === 'dryingConfirmationAllBoxes') {
          p2.dryingConfirmationAllBoxes = Boolean(value);
          if (value) {
            p2.dryingConfirmedAt = new Date().toISOString();
            p2.dryingConfirmedBy = currentUser.name;
          }
          continue;
        }
        if (key in p2) {
          (p2 as any)[key] = { value, isAiSuggested: true };
        }
      }
      updated.phase2 = p2;
    }

    onUpdateCollection(updated);
  };

  // Mensagem visível no chat quando o microfone não funciona — sem isso, o usuário
  // toca no botão e nada acontece, sem nenhuma pista do porquê (bug encontrado ao
  // preparar um teste em iPhone: Safari/iOS não implementa a Web Speech API de
  // reconhecimento de voz, só a de síntese — então o condutor fala, mas não ouve).
  const pushSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: `msg-sys-${Date.now()}`,
      sender: 'system',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Trigger microphone input
  const handleToggleVoice = () => {
    voiceService.unlock(); // toque direto do usuário — ver voiceAgent.ts
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }

    if (!voiceService.isSupported) {
      pushSystemMessage(
        'Este navegador não suporta reconhecimento de voz (comum no Safari/iOS — a narração funciona, mas ouvir sua fala não). Use o campo de texto abaixo: é o mesmo motor de extração, só sem o áudio.'
      );
      return;
    }

    setIsListening(true);
    voiceService.startListening(
      (transcript) => {
        setIsListening(false);
        handleSendMessage(transcript, true);
      },
      (err) => {
        setIsListening(false);
        console.warn('Microphone fallback/error:', err);
        const reason = typeof err === 'string' ? err : err?.error || err?.message || 'erro desconhecido';
        pushSystemMessage(
          `Não consegui captar sua fala (${reason}). Confira se a permissão de microfone foi concedida ao navegador, ou responda pelo campo de texto abaixo.`
        );
      }
    );
  };

  // Abre o seletor real de arquivo/câmera do dispositivo (input oculto mais abaixo,
  // capture="environment") para o botão genérico "Fotografar Passo" — nunca mais
  // anexa a imagem fixa de um banco de terceiros. O upload de verdade só acontece
  // depois que o usuário escolhe o arquivo, em handleCaptureFileSelected.
  const handleCapturePhoto = (stepNum?: number) => {
    const step = stepNum || currentStep?.stepNumber || 1;
    pendingCaptureRef.current = {
      kind: 'step',
      stepNumber: step,
      caption: `Registro fotográfico do ${popDef.popCode} - Passo ${step}`
    };
    setShowPhotoSourceModal(true);
  };

  const handleChoosePhotoSource = (source: 'camera' | 'gallery') => {
    setShowPhotoSourceModal(false);
    (source === 'camera' ? cameraInputRef : galleryInputRef).current?.click();
  };

  // Reavalia se o passo atual ficou completo a partir do que já está salvo na
  // coleção (sem fala nova) e, se estiver, avança — usado depois de qualquer ação
  // que muda o formulário sem passar pelo chat de texto/voz (botões do checklist de
  // fotos). Sem isso, tocar nos botões nunca liberava o próximo passo: só o texto/voz
  // disparava a checagem de avanço.
  const checkStepCompletionAndAdvance = (updatedCollection: OsteologicalCollection) => {
    if (!currentStep) return;
    const result = currentStep.extractData('', updatedCollection);
    if (!result.isComplete) return;

    const nextStepIdx = currentStepIndex + 1;
    const hasMoreSteps = nextStepIdx < popDef.steps.length;
    let replyText = `Entendido e anotado: ${result.summaryText}. `;

    setTimeout(() => {
      if (hasMoreSteps) {
        const nextStep = popDef.steps[nextStepIdx];
        replyText += `Prosseguindo para o Passo ${nextStep.stepNumber}: ${nextStep.conductorPrompt}`;
        setMessages(prev => [...prev, {
          id: `msg-cond-${Date.now()}`,
          sender: 'conductor',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          stepNumber: nextStep.stepNumber,
          requiresPhoto: nextStep.requiresPhoto,
          suggestedReplies: nextStep.quickSuggestions
        }]);
        setCurrentStepIndex(nextStepIdx);
        speakText(replyText);
      } else {
        replyText += popDef.completionMessage;
        setMessages(prev => [...prev, {
          id: `msg-cond-${Date.now()}`,
          sender: 'conductor',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          fieldTags: ['Concluído', 'Apto para Assinatura']
        }]);
        setCurrentStepIndex(popDef.steps.length);
        speakText(replyText);
      }
    }, 400);
  };

  // Fotografa um item específico do checklist (Fase 1, Passo 2) — ao contrário do
  // botão genérico "Fotografar Passo", esta foto já entra na categoria certa e marca
  // o campo do Formulário A.1 correspondente, então tirar a foto realmente libera o
  // avanço (antes, tirar fotos e o checklist eram dois sistemas que não se falavam).
  // Mesmo seletor real de arquivo/câmera do botão genérico — só muda o que acontece
  // depois do upload confirmar (handleCaptureFileSelected).
  const handleCaptureChecklistPhoto = (item: PopConductorPhotoChecklistItem) => {
    pendingCaptureRef.current = { kind: 'checklist', item };
    setShowPhotoSourceModal(true);
  };

  // Só grava o registro da foto (e, no caso do checklist, marca o campo do
  // Formulário A.1) depois que o upload real confirma — bytes e hash calculados
  // pelo servidor sobre o arquivo de verdade, nunca sobre uma URL fixa de terceiros.
  const handleCaptureFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const pending = pendingCaptureRef.current;
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois
    pendingCaptureRef.current = null;
    if (!file || !pending) return;

    const phase: 'phase1' | 'phase2' = phaseNumber === 2 ? 'phase2' : 'phase1';
    const category = pending.kind === 'checklist' ? pending.item.category : `pop${phaseNumber}_passo${pending.stepNumber}`;
    const caption = pending.kind === 'checklist' ? `${pending.item.label} — ${popDef.popCode}` : pending.caption;

    setIsUploadingPhoto(true);
    try {
      const { collection: saved, photo } = await uploadCollectionPhoto(collection.nic, phase, category, file, caption);

      setMessages(prev => [...prev, {
        id: `msg-photo-${Date.now()}`,
        sender: 'user',
        text: `[Fotografia Registrada]: ${caption}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        photoAttached: { id: photo.id, url: photo.url, caption, sha256Hash: photo.sha256Hash, timestamp: photo.timestamp }
      }]);

      let updated = saved;
      if (pending.kind === 'checklist') {
        // Tri-state ('sim'/'nao_se_aplica') ou as duas obrigatórias sem meio-termo
        // ('sim'/'sem_foto_justificado') — em ambos os tipos, uma foto real recém
        // enviada sempre marca 'sim'.
        const p1 = { ...updated.phase1 };
        (p1 as any)[pending.item.field] = { value: 'sim', isAiSuggested: false };
        updated = { ...updated, phase1: p1 };
      }
      onUpdateCollection(updated);
      if (onStepPhotoCaptured) onStepPhotoCaptured(photo);

      if (pending.kind === 'checklist') {
        checkStepCompletionAndAdvance(updated);
      } else {
        setTimeout(() => {
          const ackMsg: ConductorChatMessage = {
            id: `msg-ack-${Date.now()}`,
            sender: 'conductor',
            text: `Fotografia anexada com sucesso e vinculada à cadeia de custódia (Hash SHA-256: ${photo.sha256Hash.slice(0, 16)}...). Pode prosseguir com o próximo questionamento.`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, ackMsg]);
          speakText(ackMsg.text);
        }, 400);
      }
    } catch (err: any) {
      pushSystemMessage(err?.message || 'Não foi possível registrar a foto. Confira a conexão e tente novamente.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Marca um item tri-state do checklist como "não se aplica" (ex.: não há placa de
  // cemitério neste caso) — sem foto, já que não há o que fotografar.
  const handleMarkChecklistNotApplicable = (item: PopConductorPhotoChecklistItem) => {
    if (!item.triState) return;

    setMessages(prev => [...prev, {
      id: `msg-nsa-${Date.now()}`,
      sender: 'user',
      text: `${item.label}: não se aplica.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }]);

    const updated = { ...collection };
    const p1 = { ...updated.phase1 };
    (p1 as any)[item.field] = { value: 'nao_se_aplica', isAiSuggested: false };
    updated.phase1 = p1;
    onUpdateCollection(updated);

    checkStepCompletionAndAdvance(updated);
  };

  // Restart conversation
  const handleRestartConversation = () => {
    setCurrentStepIndex(0);
    const firstStep = popDef.steps[0];
    const initial: ConductorChatMessage[] = [
      {
        id: `msg-intro-${Date.now()}`,
        sender: 'conductor',
        text: popDef.introMessage,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: `msg-step-0-${Date.now() + 1}`,
        sender: 'conductor',
        text: firstStep.conductorPrompt,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        stepNumber: firstStep.stepNumber,
        requiresPhoto: firstStep.requiresPhoto,
        suggestedReplies: firstStep.quickSuggestions
      }
    ];
    setMessages(initial);
    speakText(firstStep.conductorPrompt);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[650px] relative">
      {/* Top Conductor Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">
                Condutor do {popDef.popCode}
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Interação Conversacional
              </span>
              {aiConfig.enabled && (
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  Agente IA Conectado
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-white leading-snug">
              {popDef.popTitle}
            </h3>
          </div>
        </div>

        {/* Step Progress Pills & Action Tools */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300 font-mono">
            <span>Passo</span>
            <span className="text-sky-400 font-bold">
              {Math.min(currentStepIndex + 1, popDef.steps.length)}
            </span>
            <span>de</span>
            <span className="text-slate-400">{popDef.steps.length}</span>
          </div>

          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg text-xs transition-colors border ${
              voiceEnabled
                ? 'bg-sky-600/30 text-sky-300 border-sky-600'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={voiceEnabled ? 'Voz do Condutor ligada' : 'Voz do Condutor mutada'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* AI Agent Configuration Slot */}
          <button
            onClick={() => setShowAiModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Ver arquitetura do Agente de IA para conduzir este POP"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Slot Agente IA</span>
          </button>

          {/* Restart */}
          <button
            onClick={handleRestartConversation}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
            title="Reiniciar conversa do POP"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'conductor' && (
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
            )}
            {msg.sender === 'system' && (
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs mt-0.5">
                <Info className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-xs'
                  : msg.sender === 'system'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-tl-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-80">
                <span className="font-semibold font-mono">
                  {msg.sender === 'user' ? currentUser.name : msg.sender === 'system' ? 'Sistema' : 'Condutor do POP · COI-INC'}
                </span>
                <div className="flex items-center gap-1.5">
                  {msg.isVoiceInput && (
                    <span className="bg-sky-700/60 text-sky-100 px-1.5 py-0.2 rounded font-mono text-[9px]">
                      Voz
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {/* Message Text */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Attached Photo Preview */}
              {msg.photoAttached && (
                <div className="mt-2.5 rounded-xl overflow-hidden border border-white/20 bg-black/20 p-2">
                  <img
                    src={msg.photoAttached.url}
                    alt={msg.photoAttached.caption}
                    className="w-full h-36 object-cover rounded-lg"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-80 font-mono">
                    <span>{msg.photoAttached.caption}</span>
                    <span>SHA-256: {msg.photoAttached.sha256Hash.slice(0, 10)}...</span>
                  </div>
                </div>
              )}

              {/* Extracted Data Card (For User Messages) */}
              {msg.extractedData && Object.keys(msg.extractedData).length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-sky-500/30 text-xs">
                  <div className="flex items-center gap-1.5 text-sky-100 font-mono text-[10px] font-semibold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Dados Extraídos e Vinculados ao Conjunto:</span>
                  </div>
                  <div className="bg-sky-700/40 rounded-lg p-2 text-xs font-mono space-y-0.5 text-sky-50">
                    {Object.entries(msg.extractedData).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-1">
                        <span className="opacity-70">{key}:</span>
                        <span className="font-semibold text-white">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conductor Step Regulatory Notice or Photo Button(s) */}
              {msg.sender === 'conductor' &&
                msg.requiresPhoto &&
                msg.stepNumber === currentStep?.stepNumber &&
                currentStep?.photoChecklistItems && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium mb-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>Checklist fotográfico (§Art. 158-B) — cada item libera o campo correspondente</span>
                    </div>
                    {currentStep.photoChecklistItems.map((item) => {
                      const currentValue = (collection.phase1 as any)[item.field]?.value;
                      const isDone = currentValue === 'sim' || (item.triState && currentValue === 'nao_se_aplica');
                      return (
                        <div key={item.field} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg px-2.5 py-1.5">
                          <span className={`text-xs flex items-center gap-1.5 ${isDone ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                            {isDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                            {item.label}
                            {item.triState && currentValue === 'nao_se_aplica' && <span className="text-[10px] font-mono opacity-70">(não se aplica)</span>}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCaptureChecklistPhoto(item)}
                              disabled={isDone || isUploadingPhoto}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              {isUploadingPhoto ? 'Enviando...' : 'Fotografar'}
                            </button>
                            {item.triState && (
                              <button
                                onClick={() => handleMarkChecklistNotApplicable(item)}
                                disabled={isDone || isUploadingPhoto}
                                className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors"
                              >
                                Não se aplica
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              {msg.sender === 'conductor' && msg.requiresPhoto && !currentStep?.photoChecklistItems && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Info className="w-3.5 h-3.5" />
                    <span>Requer foto obrigatória (§Art. 158-B)</span>
                  </div>
                  <button
                    onClick={() => handleCapturePhoto(msg.stepNumber)}
                    disabled={isUploadingPhoto}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Enviando...' : 'Fotografar Passo'}</span>
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Replies for Hands-Free / Rapid Laboratory Work */}
      {currentStep && currentStep.quickSuggestions.length > 0 && !isLocked && (
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Sugestões Rápidas:
          </span>
          <div className="flex items-center gap-1.5">
            {currentStep.quickSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion, false)}
                className="whitespace-nowrap text-xs bg-white dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded-full font-sans transition-colors shrink-0 shadow-2xs hover:border-sky-400"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Interaction Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        {isLocked ? (
          <div className="text-center py-2 text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
            Fase assinada e lacrada criptograficamente. O condutor de conversa está em modo de somente leitura.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Microphone Button */}
            <button
              onClick={handleToggleVoice}
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                  : !voiceService.isSupported
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              }`}
              title={
                isListening
                  ? 'Parar escuta'
                  : !voiceService.isSupported
                  ? 'Reconhecimento de voz não suportado neste navegador — toque para ver detalhes'
                  : 'Ditar resposta por voz (mãos livres)'
              }
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className={`w-5 h-5 ${voiceService.isSupported ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-600'}`} />
              )}
            </button>

            {/* Photo Shortcut Button */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCaptureFileSelected}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCaptureFileSelected}
            />
            <button
              onClick={() => handleCapturePhoto()}
              disabled={isUploadingPhoto}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 disabled:opacity-40 transition-colors"
              title="Capturar foto de registro"
            >
              <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputText, false);
                  }
                }}
                placeholder={
                  isListening
                    ? 'Ouvindo... pode falar a observação técnica'
                    : 'Responda ao condutor do POP ou selecione uma sugestão acima...'
                }
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all font-sans"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSendMessage(inputText, false)}
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white transition-all shadow-xs"
              title="Enviar resposta ao condutor"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Escolha entre câmera e galeria antes de abrir qualquer seletor de arquivo. */}
      {showPhotoSourceModal && (
        <PhotoSourceModal
          onChooseCamera={() => handleChoosePhotoSource('camera')}
          onChooseGallery={() => handleChoosePhotoSource('gallery')}
          onCancel={() => {
            pendingCaptureRef.current = null;
            setShowPhotoSourceModal(false);
          }}
        />
      )}

      {/* Modal: AI Agent Architecture Slot (Future Integration) */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 border border-purple-300 dark:border-purple-800">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Slot de Agente de IA para o Condutor do POP</h3>
                  <p className="text-xs text-slate-500">Pronto para conexão com Gemini 3.8 / Live API ou LLM externo</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                <span className="font-bold text-purple-700 dark:text-purple-300 block mb-1">
                  Arquitetura de Condução Desacoplada:
                </span>
                Atualmente, a conversa é conduzida pelo <strong>Motor Procedimental INC/DITEC/PF (versão Alfa)</strong> (determinístico, rigoroso e auditável). O sistema já está 100% estruturado para você plugar seu modelo de inteligência artificial (ex.: Gemini 3.8 Live API) sem precisar refazer a interface.
              </div>

              <div className="space-y-2">
                <label className="font-semibold block text-slate-700 dark:text-slate-200">
                  Status do Motor:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAiConfig(prev => ({ ...prev, enabled: false }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      !aiConfig.enabled
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 font-bold text-sky-700 dark:text-sky-300 ring-1 ring-sky-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-semibold">Motor Procedimental (Ativo)</div>
                    <div className="text-[10px] opacity-70">Rigor normativo INC/DITEC/PF determinístico</div>
                  </button>

                  <button
                    onClick={() => setAiConfig(prev => ({ ...prev, enabled: true }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      aiConfig.enabled
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 font-bold text-purple-700 dark:text-purple-300 ring-1 ring-purple-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Agente de IA (Gemini Live)
                    </div>
                    <div className="text-[10px] opacity-70">Condução adaptativa por voz em tempo real</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Prompt de Sistema do Condutor:</label>
                <textarea
                  value={aiConfig.systemPromptPreset}
                  onChange={(e) => setAiConfig({ ...aiConfig, systemPromptPreset: e.target.value })}
                  rows={3}
                  className="w-full text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Modelo pretendido: <code className="text-sky-600 dark:text-sky-400">gemini-3.8-live / flash</code>
                </span>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
