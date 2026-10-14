import { describe, expect, it } from 'vitest';
import { formatCoiNumber } from '../coiNumber';

describe('número do conjunto COI-XXX', () => {
  it('completa com zeros até 3 algarismos', () => {
    expect(formatCoiNumber('1')).toBe('COI-001');
    expect(formatCoiNumber('42')).toBe('COI-042');
    expect(formatCoiNumber('204')).toBe('COI-204');
  });

  it('passa de 999 sem cortar', () => {
    expect(formatCoiNumber('1000')).toBe('COI-1000');
  });

  it('normaliza zeros digitados à esquerda e espaços', () => {
    expect(formatCoiNumber(' 007 ')).toBe('COI-007');
    expect(formatCoiNumber('0001')).toBe('COI-001');
  });

  it('recusa o que não é número inteiro positivo', () => {
    for (const raw of ['', '0', '000', 'A1', '1-2', '12a', '-3', '1.5']) {
      expect(formatCoiNumber(raw)).toBeNull();
    }
  });
});
