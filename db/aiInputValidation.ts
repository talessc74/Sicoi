/**
 * Validação de forma/tamanho das rotas públicas de IA (/api/chat,
 * /api/pop-step, /api/transcribe): nenhuma das três exige sessão (gap de
 * segurança pré-existente, registrado em _local-adr-policy-103, fora do
 * escopo aqui — este módulo não decide autenticação). O que faltava e é
 * corrigido aqui é validação de forma/tamanho: sem limite nenhum, qualquer
 * corpo aceito virava prompt enviado direto ao Gemini, custeado pelo
 * servidor. Puramente funções puras, sem IA nem banco — testáveis isoladas.
 */

export const MAX_CHAT_MESSAGE_LENGTH = 8000;
export const MAX_CHAT_MESSAGES = 50;
export const MAX_CHAT_SYSTEM_INSTRUCTION_LENGTH = 4000;
export const MAX_POP_TRANSCRIPT_LENGTH = 4000;
export const MAX_POP_STEP_CONTEXT_LENGTH = 20000;
// ~15MB de áudio bruto (base64 é ~1.37x maior que o binário original).
export const MAX_AUDIO_BASE64_LENGTH = 20_000_000;

// Apelidos que o front-end já manda hoje (sendChatMessage em geminiService.ts)
// mais os nomes de modelo canônicos que o servidor resolve internamente —
// qualquer outro valor nunca chega ao SDK do Gemini.
export const VALID_CHAT_MODEL_INPUTS = new Set([
  'fast',
  'lite',
  'complex',
  'pro',
  'general',
  'flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash'
]);

// /api/pop-step nunca recebe "model" do cliente hoje (sendPopStepMessage
// sempre omite o campo) — só o default do servidor é aceito.
export const VALID_POP_STEP_MODEL_INPUTS = new Set(['gemini-3.1-flash-lite']);

export function validateChatMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Nenhuma mensagem fornecida para a conversa.';
  }
  if (messages.length > MAX_CHAT_MESSAGES) {
    return `A conversa deve ter até ${MAX_CHAT_MESSAGES} mensagens.`;
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      return 'Cada mensagem deve ser um objeto com "role" e "content".';
    }
    const content = (m as { content?: unknown }).content;
    if (typeof content !== 'string') {
      return 'O campo "content" de cada mensagem deve ser texto.';
    }
    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      return `Cada mensagem deve ter até ${MAX_CHAT_MESSAGE_LENGTH} caracteres.`;
    }
  }
  return null;
}

export function validateChatSystemInstruction(systemInstruction: unknown): string | null {
  if (typeof systemInstruction !== 'string') {
    return 'O campo "systemInstruction" deve ser texto.';
  }
  if (systemInstruction.length > MAX_CHAT_SYSTEM_INSTRUCTION_LENGTH) {
    return `"systemInstruction" deve ter até ${MAX_CHAT_SYSTEM_INSTRUCTION_LENGTH} caracteres.`;
  }
  return null;
}

export function validateChatModel(model: unknown): string | null {
  if (typeof model !== 'string' || !VALID_CHAT_MODEL_INPUTS.has(model)) {
    return '"model" deve ser um dos modelos suportados.';
  }
  return null;
}

export function validatePopStepInput(transcript: unknown, stepContext: unknown): string | null {
  if (typeof transcript !== 'string' || !transcript.trim() || typeof stepContext !== 'string' || !stepContext.trim()) {
    return 'Requisição deve conter { transcript, stepContext } como texto não vazio.';
  }
  if (transcript.length > MAX_POP_TRANSCRIPT_LENGTH) {
    return `"transcript" deve ter até ${MAX_POP_TRANSCRIPT_LENGTH} caracteres.`;
  }
  if (stepContext.length > MAX_POP_STEP_CONTEXT_LENGTH) {
    return `"stepContext" deve ter até ${MAX_POP_STEP_CONTEXT_LENGTH} caracteres.`;
  }
  return null;
}

export function validatePopStepModel(model: unknown): string | null {
  if (typeof model !== 'string' || !VALID_POP_STEP_MODEL_INPUTS.has(model)) {
    return '"model" deve ser um dos modelos suportados.';
  }
  return null;
}

export function validateTranscribeInput(audioBase64: unknown, mimeType: unknown): string | null {
  if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
    return 'Nenhum áudio codificado em base64 foi enviado.';
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    return 'Áudio excede o tamanho máximo aceito (~15MB).';
  }
  if (typeof mimeType !== 'string' || !mimeType.startsWith('audio/')) {
    return '"mimeType" deve ser um tipo de áudio válido (ex.: audio/webm).';
  }
  return null;
}
