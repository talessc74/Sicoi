import { describe, expect, it } from 'vitest';
import { friendlyMessage, ERROR_MESSAGES } from '../errorMessages';

describe('friendlyMessage', () => {
  it('traduz um código conhecido pra frase clara', () => {
    expect(friendlyMessage('HIST_HASH_INVALIDO')).toBe(ERROR_MESSAGES.HIST_HASH_INVALIDO);
    expect(friendlyMessage('HIST_HASH_INVALIDO')).not.toMatch(/hash|HistoryViolationError/i);
  });

  it('cai no fallback genérico quando o código não existe ou está ausente', () => {
    expect(friendlyMessage('CODIGO_QUE_NAO_EXISTE')).toBe(ERROR_MESSAGES.ERRO_DESCONHECIDO);
    expect(friendlyMessage(undefined)).toBe(ERROR_MESSAGES.ERRO_DESCONHECIDO);
    expect(friendlyMessage(null)).toBe(ERROR_MESSAGES.ERRO_DESCONHECIDO);
  });

  it('nenhuma frase amigável menciona termos técnicos vazados (Gemini, hash, HTTP, HistoryViolationError)', () => {
    const leaky = /\b(Gemini|hash|HTTP|HistoryViolationError|JSON|schema)\b/i;
    for (const [code, text] of Object.entries(ERROR_MESSAGES)) {
      expect(text, `código ${code} vaza termo técnico: "${text}"`).not.toMatch(leaky);
    }
  });
});
