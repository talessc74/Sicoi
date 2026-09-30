/**
 * Token anti-CSRF (padrão double-submit) do login real — ver
 * _local-adr-policy-202. O servidor devolve esse token na resposta de
 * login/bootstrap/"quem sou eu"; toda chamada que muda estado (POST/PUT/
 * DELETE) com sessão autenticada precisa devolvê-lo no cabeçalho
 * X-CSRF-Token. Guardado só em memória (nunca em localStorage/cookie
 * acessível por JS de outro site) — some ao recarregar a página, e a
 * próxima chamada a /api/auth/me devolve um novo.
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function csrfHeaders(): Record<string, string> {
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
}
