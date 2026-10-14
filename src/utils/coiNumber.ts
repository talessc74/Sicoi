// Número do conjunto na COI-INC (padronizado pela curadoria, out/2026): COI-XXX,
// com pelo menos 3 algarismos — o mesmo número da caixa na planilha de controle
// (1 → COI-001, 204 → COI-204, 1000 → COI-1000). Nos POPs este número é chamado
// de NIC; no sistema, o campo continua sendo `nic`.

export const COI_PREFIX = 'COI-';

// Devolve o número formatado, ou null se o que foi digitado não for um número
// inteiro positivo (só algarismos; zeros à esquerda são aceitos e normalizados).
export function formatCoiNumber(raw: string): string | null {
  const digits = raw.trim();
  if (!/^\d+$/.test(digits)) return null;
  const value = digits.replace(/^0+/, '');
  if (!value) return null;
  return `${COI_PREFIX}${value.padStart(3, '0')}`;
}
