/**
 * Cliente HTTP do login real (matrícula + senha, sessão no servidor). Ver
 * _local-adr-policy-202. A identidade de quem está logado nunca é guardada
 * pelo cliente — só o servidor sabe, pelo cookie de sessão.
 */
import { UserProfile } from '../types/sgccco';

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON (ex.: 204 No Content)
  }
  if (!res.ok) {
    throw new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return data;
}

export async function fetchBootstrapStatus(): Promise<{ needsBootstrap: boolean }> {
  const res = await fetch('/api/auth/bootstrap-status');
  return parseJsonOrThrow(res, 'Erro ao conferir status inicial do sistema');
}

export async function bootstrapAdminApi(data: {
  name: string;
  institution: string;
  registrationNumber: string;
  password: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/bootstrap-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await parseJsonOrThrow(res, 'Erro ao criar o primeiro Administrador');
  return result.person;
}

export async function loginApi(registrationNumber: string, password: string): Promise<UserProfile> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber, password })
  });
  const result = await parseJsonOrThrow(res, 'Erro ao entrar');
  return result.person;
}

export async function logoutApi(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

/** Devolve a pessoa logada a partir da sessão, ou `null` se não houver sessão válida. */
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) return null;
  const result = await parseJsonOrThrow(res, 'Erro ao verificar sessão');
  return result.person;
}

// Só o Administrador autenticado pode chamar isto — o servidor reconfere.
export async function generateSetupLinkApi(personId: string): Promise<{ token: string; expiresAt: string }> {
  const res = await fetch('/api/auth/setup-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personId })
  });
  return parseJsonOrThrow(res, 'Erro ao gerar link de definição de senha');
}

// Pública — o token é a própria prova de quem pode definir a senha.
export async function setupPasswordApi(token: string, newPassword: string): Promise<UserProfile> {
  const res = await fetch('/api/auth/setup-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  const result = await parseJsonOrThrow(res, 'Erro ao definir senha');
  return result.person;
}

// "Esqueci a senha" — pública, deliberadamente sem dizer se a matrícula existe
// (mesmo cuidado do login). Sem e-mail/SMS configurado, o pedido só fica
// visível para o Administrador resolver em Configurações.
export async function forgotPasswordApi(registrationNumber: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber })
  });
  return parseJsonOrThrow(res, 'Erro ao registrar o pedido de redefinição de senha');
}

export interface PendingPasswordResetRequest {
  id: string;
  personId: string;
  personName: string;
  registrationNumber: string;
  requestedAt: string;
}

// Só o Administrador autenticado pode chamar isto — o servidor reconfere.
export async function fetchPendingPasswordResetRequestsApi(): Promise<PendingPasswordResetRequest[]> {
  const res = await fetch('/api/auth/password-reset-requests');
  const result = await parseJsonOrThrow(res, 'Erro ao listar pedidos de redefinição de senha');
  return result.requests;
}
