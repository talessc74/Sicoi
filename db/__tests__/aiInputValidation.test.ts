import { describe, it, expect } from 'vitest';
import {
  validateChatMessages,
  validatePopStepInput,
  validateTranscribeInput,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_POP_TRANSCRIPT_LENGTH,
  MAX_POP_STEP_CONTEXT_LENGTH,
  MAX_AUDIO_BASE64_LENGTH
} from '../aiInputValidation';

describe('validateChatMessages', () => {
  it('aceita uma conversa válida', () => {
    expect(validateChatMessages([{ role: 'user', content: 'Olá' }])).toBeNull();
  });

  it('recusa lista vazia ou que não é array', () => {
    expect(validateChatMessages([])).toMatch(/Nenhuma mensagem/);
    expect(validateChatMessages('não é array')).toMatch(/Nenhuma mensagem/);
    expect(validateChatMessages(undefined)).toMatch(/Nenhuma mensagem/);
  });

  it('recusa mais mensagens que o limite', () => {
    const messages = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' }));
    expect(validateChatMessages(messages)).toMatch(new RegExp(`até ${MAX_CHAT_MESSAGES}`));
  });

  it('recusa mensagem sem content de texto', () => {
    expect(validateChatMessages([{ role: 'user' }])).toMatch(/content.*texto/);
    expect(validateChatMessages([{ role: 'user', content: 123 }])).toMatch(/content.*texto/);
    expect(validateChatMessages(['não é objeto'])).toMatch(/role.*content/);
  });

  it('recusa mensagem mais longa que o limite', () => {
    const tooLong = 'x'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1);
    expect(validateChatMessages([{ role: 'user', content: tooLong }])).toMatch(new RegExp(`até ${MAX_CHAT_MESSAGE_LENGTH}`));
  });
});

describe('validatePopStepInput', () => {
  it('aceita transcript e stepContext válidos', () => {
    expect(validatePopStepInput('transcrição', 'contexto do passo')).toBeNull();
  });

  it('recusa transcript ou stepContext vazios, ausentes ou não-texto', () => {
    expect(validatePopStepInput('', 'contexto')).toMatch(/texto não vazio/);
    expect(validatePopStepInput('transcrição', '')).toMatch(/texto não vazio/);
    expect(validatePopStepInput(undefined, 'contexto')).toMatch(/texto não vazio/);
    expect(validatePopStepInput(123, 'contexto')).toMatch(/texto não vazio/);
  });

  it('recusa transcript mais longo que o limite', () => {
    const tooLong = 'x'.repeat(MAX_POP_TRANSCRIPT_LENGTH + 1);
    expect(validatePopStepInput(tooLong, 'contexto')).toMatch(new RegExp(`transcript.*até ${MAX_POP_TRANSCRIPT_LENGTH}`));
  });

  it('recusa stepContext mais longo que o limite', () => {
    const tooLong = 'x'.repeat(MAX_POP_STEP_CONTEXT_LENGTH + 1);
    expect(validatePopStepInput('transcrição', tooLong)).toMatch(new RegExp(`stepContext.*até ${MAX_POP_STEP_CONTEXT_LENGTH}`));
  });
});

describe('validateTranscribeInput', () => {
  it('aceita áudio válido', () => {
    expect(validateTranscribeInput('base64==', 'audio/webm')).toBeNull();
  });

  it('recusa audioBase64 vazio, ausente ou não-texto', () => {
    expect(validateTranscribeInput('', 'audio/webm')).toMatch(/Nenhum áudio/);
    expect(validateTranscribeInput(undefined, 'audio/webm')).toMatch(/Nenhum áudio/);
    expect(validateTranscribeInput(123, 'audio/webm')).toMatch(/Nenhum áudio/);
  });

  it('recusa áudio maior que o limite', () => {
    const tooLong = 'x'.repeat(MAX_AUDIO_BASE64_LENGTH + 1);
    expect(validateTranscribeInput(tooLong, 'audio/webm')).toMatch(/tamanho máximo/);
  });

  it('recusa mimeType que não comece com audio/', () => {
    expect(validateTranscribeInput('base64==', 'video/mp4')).toMatch(/tipo de áudio válido/);
    expect(validateTranscribeInput('base64==', '')).toMatch(/tipo de áudio válido/);
  });
});
