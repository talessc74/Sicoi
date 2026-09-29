/**
 * Cliente HTTP para o cadastro de pessoas (papéis de acesso). Listar exige sessão
 * autenticada; cadastrar e remover exigem sessão de Administrador — o servidor
 * reconfere (ver _local-adr-policy-202). A senha de cada pessoa é definida
 * separadamente, pelo link gerado em authService.generateSetupLinkApi.
 */
import { UserProfile } from '../types/sgccco';
import { csrfHeaders } from './csrf';

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON
  }
  if (!res.ok) {
    throw new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return data;
}

export async function fetchPeople(): Promise<UserProfile[]> {
  const res = await fetch('/api/people');
  const data = await parseJsonOrThrow(res, 'Erro ao carregar pessoas');
  return data.people;
}

export async function createPersonApi(person: {
  name: string;
  role: UserProfile['role'];
  institution: string;
  email: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(person)
  });
  const data = await parseJsonOrThrow(res, 'Erro ao cadastrar pessoa');
  return data.person;
}

export async function deletePersonApi(id: string): Promise<void> {
  const res = await fetch(`/api/people/${encodeURIComponent(id)}`, { method: 'DELETE', headers: csrfHeaders() });
  await parseJsonOrThrow(res, 'Erro ao remover pessoa');
}
