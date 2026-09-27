/**
 * Cliente HTTP da Zona de Risco do Administrador (exclusão reversível de caixa,
 * conjunto ou tudo — ver db/adminRepo.ts). O servidor reconfere o papel Administrador
 * a cada chamada; um `actorId` que não seja de um administrador cadastrado recebe 403.
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

export async function fetchDeletedCollections(actorId: string): Promise<DeletedCollectionSummary[]> {
  const res = await fetch(`/api/admin/deleted-collections?actorId=${encodeURIComponent(actorId)}`);
  const data = await parseJsonOrThrow(res, 'Erro ao listar conjuntos excluídos');
  return data.collections;
}

export async function fetchAdminActions(actorId: string): Promise<AdminActionRow[]> {
  const res = await fetch(`/api/admin/actions?actorId=${encodeURIComponent(actorId)}`);
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

export async function deleteCollectionApi(nic: string, actorId: string, reason: string): Promise<void> {
  await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/delete`, { actorId, reason }, 'Erro ao excluir conjunto');
}

export async function restoreCollectionApi(nic: string, actorId: string): Promise<void> {
  await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/restore`, { actorId }, 'Erro ao restaurar conjunto');
}

export async function deleteAllCollectionsApi(actorId: string, reason: string): Promise<{ affectedCount: number }> {
  return postAdmin('/api/admin/collections/delete-all', { actorId, reason }, 'Erro ao excluir todos os conjuntos');
}

export async function restoreAllCollectionsApi(actorId: string): Promise<{ affectedCount: number }> {
  return postAdmin('/api/admin/collections/restore-all', { actorId }, 'Erro ao restaurar todos os conjuntos');
}

export async function deleteBoxApi(nic: string, boxId: string, actorId: string, reason: string): Promise<OsteologicalCollection> {
  const data = await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/boxes/${encodeURIComponent(boxId)}/delete`, { actorId, reason }, 'Erro ao excluir caixa');
  return data.collection;
}

export async function restoreBoxApi(nic: string, boxId: string, actorId: string): Promise<OsteologicalCollection> {
  const data = await postAdmin(`/api/admin/collections/${encodeURIComponent(nic)}/boxes/${encodeURIComponent(boxId)}/restore`, { actorId }, 'Erro ao restaurar caixa');
  return data.collection;
}
