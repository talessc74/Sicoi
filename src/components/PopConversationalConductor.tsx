import React, { useState, useEffect, useRef } from 'react';
import { OsteologicalCollection, UserProfile, PhaseNumber } from '../types/sgccco';
import {
  SENASP_POPS,
  ConductorChatMessage,
  PopConductorStep,
  DEFAULT_AI_AGENT_CONFIG,
  AiConductorAgentConfig
} from '../services/popConductorService';
import { voiceService } from '../services/voiceAgent';
import { calculateSha256 } from '../services/auditService';
import { sendChatMessage } from '../services/geminiService';
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

export const PopConversationalConductor: React.FC<PopConversationalConductorProps> = ({
  collection,
  currentUser,
  phaseNumber,
  onUpdateCollection,
  onStepPhotoCaptured,
  isLocked = false
}) => {
  const popDef = SENASP_POPS[phaseNumber] || SENASP_POPS[1];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [messages, setMessages] = useState<ConductorChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConductorAgentConfig>(DEFAULT_AI_AGENT_CONFIG);
  const [showExtractedPanel, setShowExtractedPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
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

    // Step Extraction (motor determinístico local — fonte de verdade para o que foi
    // efetivamente preenchido e para o gate de avanço; ver applyExtractionsToCollection).
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

    // Aplica as extrações ao conjunto — sempre, esteja o passo completo ou não,
    // para não perder o que já foi dito enquanto falta um campo.
    await applyExtractionsToCollection(extractedPayload);

    // Turno de narração: se o Agente de IA (Gemini) estiver ativo, ele só formula o texto
    // de resposta — quem decide se o passo avança é sempre o `isComplete` do motor local.
    // TODO(follow-up): trocar por saída estruturada do Gemini (responseSchema com
    // extractedFields + stepConfirmed) para a extração/confirmação virarem julgamento da
    // IA em vez de regex determinístico. Ver plano de implementação.
    let narrationText = '';
    let narrationTags: string[] | undefined;
    if (aiConfig.enabled) {
      try {
        const historyForGemini = [
          ...messages.slice(-6).map((m) => ({
            role: m.sender === 'conductor' ? 'assistant' : 'user',
            content: m.text,
          })),
          { role: 'user', content: text },
        ];

        const geminiRes = await sendChatMessage(
          historyForGemini,
          'general',
          `${aiConfig.systemPromptPreset} Atualmente no passo ${currentStep?.stepNumber || 1} (${currentStep?.stepTitle || 'Triagem'}). Dados extraídos neste turno: ${summaryText || 'nenhum'}. ${
            isComplete
              ? 'O passo está completo — confirme os dados e informe que vai avançar.'
              : 'O passo AINDA NÃO está completo — não diga que vai avançar; pergunte objetivamente o que falta.'
          }`
        );
        narrationText = geminiRes.reply;
        narrationTags = [geminiRes.modelUsed, 'IA Gemini Conductor Ativo'];
      } catch (err: any) {
        console.warn('Fallback para motor procedimental devido a erro no Gemini:', err);
      }
    }

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

  // Categorias do checklist fotográfico da Fase 1, cada uma vinculada ao campo booleano/tri-state
  // do Formulário A.1 que a extração pode acionar por voz.
  const PHASE1_PHOTO_TRIGGERS: { field: string; category: string; truthy: (v: any) => boolean }[] = [
    { field: 'foto1SacoFechado', category: 'foto1_saco_fechado', truthy: (v) => v === true },
    { field: 'foto2PlacaCemiterio', category: 'foto2_placa_cemiterio', truthy: (v) => v === 'sim' },
    { field: 'foto3RemanescentesMateriais', category: 'foto3_remanescentes_materiais', truthy: (v) => v === 'sim' },
    { field: 'foto4_1RemanescentesIsolados', category: 'foto4_1_remanescentes_isolados', truthy: (v) => v === true },
    { field: 'foto4_2MateriaisIsolados', category: 'foto4_2_materiais_isolados', truthy: (v) => v === 'sim' }
  ];

  // Aplica os campos extraídos pelo motor de passos à coleção (Fase 1: Formulário A.1;
  // Fase 2: maceração/limpeza/secagem/acondicionamento — POP-01 §9.5-9.7).
  const applyExtractionsToCollection = async (extractedData: Record<string, any>) => {
    if (Object.keys(extractedData).length === 0) return;

    const updated = { ...collection };

    if (phaseNumber === 1) {
      const p1 = { ...updated.phase1 };
      for (const [key, value] of Object.entries(extractedData)) {
        if (value === undefined) continue;
        if (key in p1) {
          (p1 as any)[key] = { value, isAiSuggested: true };
        }
      }

      // Checklist fotográfico: quando a extração confirma uma foto por voz, gera o
      // registro real (com hash) — não só o boolean do formulário.
      const newPhotos = [...p1.photos];
      for (const trigger of PHASE1_PHOTO_TRIGGERS) {
        const value = extractedData[trigger.field];
        const alreadyHasPhoto = newPhotos.some((ph) => ph.category === trigger.category);
        if (value !== undefined && trigger.truthy(value) && !alreadyHasPhoto) {
          const photoId = `photo-p1-${trigger.category}-${Date.now()}`;
          const url = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80';
          const hash = await calculateSha256(`${url}|${trigger.category}|${collection.nic}|${currentUser.id}`);
          newPhotos.push({
            id: photoId,
            category: trigger.category,
            author: currentUser.name,
            timestamp: new Date().toISOString(),
            sha256Hash: hash,
            url
          });
        }
      }
      p1.photos = newPhotos;

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

  // Trigger microphone input
  const handleToggleVoice = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      voiceService.startListening(
        (transcript) => {
          setIsListening(false);
          handleSendMessage(transcript, true);
        },
        (err) => {
          setIsListening(false);
          console.warn('Microphone fallback/error:', err);
        }
      );
    }
  };

  // Capture step photo via conversation
  const handleCapturePhoto = async (stepNum?: number) => {
    const step = stepNum || currentStep?.stepNumber || 1;
    const category = `pop${phaseNumber}_passo${step}`;
    const photoId = `photo-pop-${phaseNumber}-${Date.now()}`;
    const url = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80';
    const hash = await calculateSha256(`${url}|${category}|${collection.nic}|${currentUser.id}`);
    const caption = `Registro pericial do ${popDef.popCode} - Passo ${step}`;
    const newPhoto = {
      id: photoId,
      category,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      sha256Hash: hash,
      url,
      caption
    };

    // Append to messages
    const photoMessage: ConductorChatMessage = {
      id: `msg-photo-${Date.now()}`,
      sender: 'user',
      text: `[Fotografia Forense Registrada]: ${caption}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      photoAttached: newPhoto
    };

    setMessages(prev => [...prev, photoMessage]);

    // Update collection
    const updated = { ...collection };
    if (phaseNumber === 1) {
      updated.phase1 = { ...updated.phase1, photos: [...updated.phase1.photos, newPhoto] };
    } else if (phaseNumber === 2) {
      updated.phase2 = { ...updated.phase2, photos: [...updated.phase2.photos, newPhoto] };
    }
    onUpdateCollection(updated);

    if (onStepPhotoCaptured) {
      onStepPhotoCaptured(newPhoto);
    }

    // Conductor acknowledges photo
    setTimeout(() => {
      const ackMsg: ConductorChatMessage = {
        id: `msg-ack-${Date.now()}`,
        sender: 'conductor',
        text: `Fotografia anexada com sucesso e vinculada à cadeia de custódia (Hash SHA-256: ${hash.slice(0, 16)}...). Pode prosseguir com o próximo questionamento.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, ackMsg]);
      speakText(ackMsg.text);
    }, 400);
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

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-80">
                <span className="font-semibold font-mono">
                  {msg.sender === 'user' ? currentUser.name : 'Condutor Forense SENASP'}
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
                    <span>Dados Extraídos e Vinculados ao NIC:</span>
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

              {/* Conductor Step Regulatory Notice or Photo Button */}
              {msg.sender === 'conductor' && msg.requiresPhoto && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Info className="w-3.5 h-3.5" />
                    <span>Requer foto obrigatória (§Art. 158-B)</span>
                  </div>
                  <button
                    onClick={() => handleCapturePhoto(msg.stepNumber)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Fotografar Passo</span>
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
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              }`}
              title={isListening ? 'Parar escuta' : 'Ditar resposta por voz (mãos livres)'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
            </button>

            {/* Photo Shortcut Button */}
            <button
              onClick={() => handleCapturePhoto()}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
              title="Capturar foto pericial"
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
                Atualmente, a conversa é conduzida pelo <strong>Motor Procedimental SENASP v3.2</strong> (determinístico, rigoroso e auditável). O sistema já está 100% estruturado para você plugar seu modelo de inteligência artificial (ex.: Gemini 3.8 Live API) sem precisar refazer a interface.
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
                    <div className="text-[10px] opacity-70">Rigor normativo SENASP determinístico</div>
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
