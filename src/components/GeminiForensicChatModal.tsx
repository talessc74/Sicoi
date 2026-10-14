import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Sparkles,
  X,
  RotateCcw,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { ErrorNotice } from './ErrorNotice';
import { toAppError, AppError } from '../utils/errorMessages';
import {
  ChatMessage,
  sendChatMessage,
  transcribeAudioBlob,
  checkGeminiStatus,
  ApiStatus,
} from '../services/geminiService';
import { OsteologicalCollection, UserProfile } from '../types/sgccco';

interface GeminiForensicChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCollection?: OsteologicalCollection | null;
  currentUser: UserProfile;
}

export const GeminiForensicChatModal: React.FC<GeminiForensicChatModalProps> = ({
  isOpen,
  onClose,
  activeCollection,
  currentUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-init',
        role: 'assistant',
        content: `Olá, ${currentUser.name}! Sou o Assistente com IA do SIGCOI, de apoio à montagem e inventário, à pesquisa e ao ensino na COI-INC. Posso apoiar na interpretação de parâmetros osteológicos (estimativa de sexo, idade pelo método Suchey-Brooks, NMI, tafonomia), rastreabilidade das caixas e do acervo e transcrição de anotações de laboratório por voz. Em que posso ajudar?`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash',
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<'general' | 'complex' | 'fast'>('fast');
  const [selectedRole, setSelectedRole] = useState<'perito' | 'custodia' | 'antropologo'>('perito');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [errorNotice, setErrorNotice] = useState<AppError | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Monitorar status da API na inicialização
  useEffect(() => {
    if (isOpen) {
      checkGeminiStatus().then((status) => {
        setApiStatus(status);
        if (status && !status.hasApiKey) {
          setErrorNotice({
            code: 'IA_CHAVE_AUSENTE',
            message:
              'Aviso de Configuração: GEMINI_API_KEY não foi detectada. Verifique se o seu segredo está adicionado no menu Settings > Secrets do Google AI Studio para evitar erro 401.'
          });
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, transcribing]);

  if (!isOpen) return null;

  const roleInstructions: Record<'perito' | 'custodia' | 'antropologo', string> = {
    perito: `Você é o assistente de Antropologia Forense do SIGCOI (versão Alfa), sistema de gestão da Coleção Osteológica Identificada do Instituto Nacional de Criminalística (COI-INC/DITEC/PF). A COI-INC é um biobanco e coleção osteológica de referência, instituída pela Portaria DITEC/PF nº 1415/2024, destinada à pesquisa aplicada, à capacitação e ao ensino em antropologia forense e áreas correlatas — não é usada para a resolução de casos criminais. Responda com linguagem científica técnica, considerando o conjunto ${activeCollection?.nic || 'Geral'}. Forneça diretrizes osteométricas precisas, estimativas antropológicas (sexo, idade, ancestralidade, estatura), diagnóstico diferencial de lesões peri-mortem vs pós-mortem para fins de registro e pesquisa, e cálculos de NMI (Número Mínimo de Indivíduos).`,
    custodia: `Você apoia o controle e a rastreabilidade do acervo da COI-INC (Portaria DITEC/PF nº 1415/2024). Seu foco é a integridade física dos lacres e das embalagens, o protocolo de recebimento, a regularidade dos termos de doação, os termos de descarte biológico, a rastreabilidade das caixas e a localização física de cada conjunto no ossário.`,
    antropologo: `Você é o Curador Especialista em Antropologia Física e Conservação Curatorial. Seu foco é na higienização sem degradação do colágeno ósseo, acondicionamento em caixas de polipropileno corrugado, secagem controlada e preservação das características métricas e morfológicas para pesquisa.`,
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    setErrorNotice(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Filtrar histórico para envio
      const chatHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatMessage(
        chatHistory,
        selectedModel,
        roleInstructions[selectedRole]
      );

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.modelUsed,
        fallbackNotice: res.fallbackNotice,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Erro no envio do chat:', err);
      const appErr = toAppError(err, 'Falha na comunicação com o Gemini.');
      setErrorNotice(appErr);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Não foi possível processar a consulta:\n\n${appErr.message}\n\n💡 Dica sobre o Erro 401: Certifique-se de que a sua chave GEMINI_API_KEY no Google AI Studio (menu lateral > Settings > Secrets) está ativa e com saldo de requisições.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Falha de Autenticação / Conexão',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Gravação de microfone e transcrição de áudio com gemini-3.5-transcribe
  const startRecording = async () => {
    setErrorNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        if (audioBlob.size > 500) {
          setTranscribing(true);
          try {
            const transcript = await transcribeAudioBlob(audioBlob);
            if (transcript) {
              setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
            } else {
              setErrorNotice({ code: 'IA_AUDIO_NAO_DETECTADO', message: 'Áudio recebido, mas nenhuma fala clara foi detectada.' });
            }
          } catch (transcribeErr: any) {
            setErrorNotice(
              toAppError(transcribeErr, 'Erro na transcrição por voz (gemini-3.5-transcribe).')
            );
          } finally {
            setTranscribing(false);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      setErrorNotice({
        code: 'IA_MICROFONE_NEGADO',
        message: 'Permissão de microfone negada ou não suportada. Conceda acesso ao microfone no navegador.'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-init-reset',
        role: 'assistant',
        content: `Histórico reiniciado. Pronto para uma nova análise técnica para a coleção ${activeCollection?.nic || 'Geral'}.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash',
      },
    ]);
    setErrorNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho do Chat */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Assistente IA · SIGCOI
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Gemini API Ativa
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assistência Técnica Multi-Turn · Transcrição de Áudio Integrada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              title="Limpar histórico da conversa"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Controles: Papel do Assistente e Seleção de Modelo */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Seletor de Modelo Gemini */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono font-medium text-[11px] flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              Modelo:
            </span>
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedModel('general')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                  selectedModel === 'general'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="gemini-3.5-flash: Ideal para tarefas gerais e análises rápidas"
              >
                gemini-3.5-flash
              </button>
              <button
                onClick={() => setSelectedModel('complex')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                  selectedModel === 'complex'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="gemini-3.1-pro-preview: Raciocínio científico aprofundado"
              >
                gemini-3.1-pro-preview
              </button>
              <button
                onClick={() => setSelectedModel('fast')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all ${
                  selectedModel === 'fast'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="gemini-3.1-flash-lite: Menor latência para consultas instantâneas"
              >
                gemini-3.1-flash-lite
              </button>
            </div>
          </div>

          {/* Seletor de Papel / System Instruction */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono font-medium text-[11px] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
              Papel:
            </span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-hidden"
            >
              <option value="perito">Antropologia Forense & Pesquisa</option>
              <option value="custodia">Controle & Rastreabilidade do Acervo</option>
              <option value="antropologo">Montagem e Inventário & Conservação Física</option>
            </select>
          </div>
        </div>

        {/* Diagnóstico de Erro 401 / Status da Chave */}
        {errorNotice && (
          <div className="px-4 py-2.5 border-b border-amber-200 dark:border-amber-800/80 space-y-1.5">
            <ErrorNotice code={errorNotice.code} message={errorNotice.message} onDismiss={() => setErrorNotice(null)} />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Se você visualizou erro 401 no painel ou no navegador, isso ocorre quando: 1) A chave GEMINI_API_KEY no AI Studio expirou; 2) Foi acessado o link privado de dev sem login com a conta Google autorizada do desenvolvedor; ou 3) Os cookies de terceiros estão bloqueados no navegador.
            </p>
          </div>
        )}

        {/* Thread de Mensagens com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-gradient-to-tr from-sky-500 to-indigo-600'
                }`}
              >
                {msg.role === 'user' ? (
                  currentUser.name.substring(0, 2).toUpperCase()
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-1.5">
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>

                <div
                  className={`flex items-center gap-2 text-[10px] text-slate-400 font-mono ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.modelUsed && (
                    <>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-sm">
                        {msg.modelUsed}
                      </span>
                    </>
                  )}
                  {msg.fallbackNotice && (
                    <span className="text-amber-500">({msg.fallbackNotice})</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Indicador de Carregamento e Transcrição */}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-xl animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-600 flex items-center justify-center text-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-mono flex items-center gap-2">
                <span>Processando análise científica com {selectedModel}...</span>
              </div>
            </div>
          )}

          {transcribing && (
            <div className="flex gap-3 mr-auto max-w-xl animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center text-xs">
                <Mic className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 font-mono flex items-center gap-2">
                <span>Transcrevendo gravação com gemini-3.5-transcribe...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugestões Rápidas de Consulta */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-400 font-mono shrink-0">Consultas Rápidas:</span>
          {[
            'Como calcular o NMI na presença de 3 fêmures direitos e 2 crânios?',
            'Protocolo de recebimento e conferência de lacres de um novo conjunto',
            'Método Suchey-Brooks para sínfise púbica (fases 1 a 6)',
            'Diferença tafonômica entre fratura ante-mortem e pós-mortem',
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(promptText)}
              className="px-3 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-colors"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Barra de Entrada de Texto e Áudio */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Botão de Gravação de Voz com Transcrição Gemini */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-2xl transition-all flex items-center justify-center shrink-0 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={
                isRecording
                  ? 'Clique para parar e transcrever com gemini-3.5-transcribe'
                  : 'Ditar por voz (Transcreve com gemini-3.5-transcribe)'
              }
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-purple-500" />}
            </button>

            {/* Input de Texto */}
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={
                isRecording
                  ? 'Gravando seu áudio... fale agora...'
                  : transcribing
                  ? 'Transcrevendo com gemini-3.5-transcribe...'
                  : 'Digite sua dúvida ou clique no microfone para transcrever áudio...'
              }
              disabled={isLoading || transcribing}
              className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/40 transition-all"
            />

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={isLoading || transcribing || !inputPrompt.trim()}
              className="p-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 rounded-2xl transition-all shadow-md shrink-0 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-slate-400" />
              <span>Chave segura via Proxy Express</span>
            </span>
            <span>Microfone · Modelo: gemini-3.5-transcribe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
