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
export const MAX_POP_TRANSCRIPT_LENGTH = 4000;
export const MAX_POP_STEP_CONTEXT_LENGTH = 20000;
// ~15MB de áudio bruto (base64 é ~1.37x maior que o binário original).
export const MAX_AUDIO_BASE64_LENGTH = 20_000_000;

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
