/**
 * Cliente HTTP para autorizações de pesquisa (Fase 7, §13 — ABAC). Listar exige
 * sessão autenticada (o Pesquisador precisa ver as autorizações pra filtrar a
 * própria consulta); criar e editar (inclusive revogar) exigem sessão de
 * Administrador — o servidor reconfere.
 */
import { ResearchAuthorization } from '../types/sgccco';
import { csrfHeaders } from './csrf';

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON
  }
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`), { code: data?.code });
  }
  return data;
}

export async function fetchAuthorizations(): Promise<ResearchAuthorization[]> {
  const res = await fetch('/api/research-authorizations');
  const data = await parseJsonOrThrow(res, 'Erro ao carregar autorizações de pesquisa');
  return data.authorizations;
}

export async function createAuthorizationApi(authorization: ResearchAuthorization): Promise<ResearchAuthorization> {
  const res = await fetch('/api/research-authorizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(authorization)
  });
  const data = await parseJsonOrThrow(res, 'Erro ao criar autorização de pesquisa');
  return data.authorization;
}

export async function updateAuthorizationApi(authorization: ResearchAuthorization): Promise<ResearchAuthorization> {
  const res = await fetch(`/api/research-authorizations/${encodeURIComponent(authorization.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(authorization)
  });
  const data = await parseJsonOrThrow(res, 'Erro ao editar autorização de pesquisa');
  return data.authorization;
}
