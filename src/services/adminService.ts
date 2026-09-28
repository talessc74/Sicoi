/**
 * Cliente HTTP da Zona de Risco do Administrador (exclusão reversível de caixa,
 * conjunto ou tudo — ver db/adminRepo.ts). O servidor reconfere o papel Administrador
 * a cada chamada a partir da sessão de login (cookie) — nunca de um id que o
 * cliente informe; quem não estiver logado como Administrador recebe 401/403.
 * Ver _local-adr-policy-202.
 */
import { OsteologicalCollection } from '../types/sgccco';

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON (ex.: 204 No Content, ou erro de rede bruto)
  }
  if (!res.ok) {
    throw new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return data;
}

export interface DeletedCollectionSummary {
  nic: string;
  deletedAt: string;
  deletedByName: string | null;
  deletedReason: string | null;
  currentPhase: number;
}

export interface AdminActionRow {
  id: number;
  performedAt: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  kind: string;
  nic: string | null;
  boxId: string | null;
  reason: string | null;
  affectedCount: number;
}

export async function fetchDeletedCollections(): Promise<DeletedCollectionSummary[]> {
  const res = await fetch('/api/admin/deleted-collections');
  const data = await parseJsonOrThrow(res, 'Erro ao listar conjuntos excluídos');
  return data.collections;
}

export async function fetchAdminActions(): Promise<AdminActionRow[]> {
  const res = await fetch('/api/admin/actions');
  const data = await parseJsonOrThrow(res, 'Erro ao listar ações administrativas');
  return data.actions;
}

async function postAdmin(path: string, body: Record<string, unknown>, fallbackMessage: string) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return parseJsonOrThrow(res, fallbackMessage);
}

export async function deleteCollectionApi(nic: string, reason: string): Promise<void> {
  await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/delete`, { reason }, 'Erro ao excluir conjunto');
}

export async function restoreCollectionApi(nic: string): Promise<void> {
  await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/restore`, {}, 'Erro ao restaurar conjunto');
}

export async function deleteAllCollectionsApi(reason: string): Promise<{ affectedCount: number }> {
  return postAdmin('/api/admin/collections/delete-all', { reason }, 'Erro ao excluir todos os conjuntos');
}

export async function restoreAllCollectionsApi(): Promise<{ affectedCount: number }> {
  return postAdmin('/api/admin/collections/restore-all', {}, 'Erro ao restaurar todos os conjuntos');
}

export async function deleteBoxApi(nic: string, boxId: string, reason: string): Promise<OsteologicalCollection> {
  const data = await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/boxes/${encodeURIComponent(boxId)}/delete`, { reason }, 'Erro ao excluir caixa');
  return data.collection;
}

export async function restoreBoxApi(nic: string, boxId: string): Promise<OsteologicalCollection> {
  const data = await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/boxes/${encodeURIComponent(boxId)}/restore`, {}, 'Erro ao restaurar caixa');
  return data.collection;
}
