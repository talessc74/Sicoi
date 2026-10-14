import { describe, it, expect } from 'vitest';
import {
  validateChatMessages,
  validateChatSystemInstruction,
  validateChatModel,
  validatePopStepInput,
  validatePopStepModel,
  validateTranscribeInput,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_SYSTEM_INSTRUCTION_LENGTH,
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

describe('validateChatSystemInstruction', () => {
  it('aceita texto dentro do limite', () => {
    expect(validateChatSystemInstruction('Você é um assistente.')).toBeNull();
  });

  it('recusa valor que não é texto', () => {
    expect(validateChatSystemInstruction(123)).toMatch(/texto/);
    expect(validateChatSystemInstruction(undefined)).toMatch(/texto/);
    expect(validateChatSystemInstruction(null)).toMatch(/texto/);
  });

  it('recusa texto mais longo que o limite', () => {
    const tooLong = 'x'.repeat(MAX_CHAT_SYSTEM_INSTRUCTION_LENGTH + 1);
    expect(validateChatSystemInstruction(tooLong)).toMatch(new RegExp(`até ${MAX_CHAT_SYSTEM_INSTRUCTION_LENGTH}`));
  });
});

describe('validateChatModel', () => {
  it('aceita os apelidos que o front-end já manda hoje', () => {
    for (const model of ['fast', 'lite', 'complex', 'pro', 'general', 'flash']) {
      expect(validateChatModel(model)).toBeNull();
    }
  });

  it('aceita os nomes canônicos de modelo que o servidor resolve internamente', () => {
    for (const model of ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3.5-flash']) {
      expect(validateChatModel(model)).toBeNull();
    }
  });

  it('recusa qualquer valor fora da lista permitida', () => {
    expect(validateChatModel('gpt-4')).toMatch(/modelos suportados/);
    expect(validateChatModel(123)).toMatch(/modelos suportados/);
    expect(validateChatModel(undefined)).toMatch(/modelos suportados/);
  });
});

describe('validatePopStepModel', () => {
  it('aceita o único modelo que o front-end usa hoje', () => {
    expect(validatePopStepModel('gemini-3.1-flash-lite')).toBeNull();
  });

  it('recusa qualquer outro valor', () => {
    expect(validatePopStepModel('gemini-3.5-flash')).toMatch(/modelos suportados/);
    expect(validatePopStepModel(undefined)).toMatch(/modelos suportados/);
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
