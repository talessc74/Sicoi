/**
 * Cliente HTTP para persistência de conjuntos osteológicos (PostgreSQL via /api/collections).
 * Substitui o estado local em memória (mockData) como fonte de verdade do App.
 */
import { OsteologicalCollection } from '../types/sgccco';

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON (ex.: erro de rede bruto)
  }
  if (!res.ok) {
    throw new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return data;
}

export async function fetchCollections(): Promise<OsteologicalCollection[]> {
  const res = await fetch('/api/collections');
  const data = await parseJsonOrThrow(res, 'Erro ao carregar conjuntos');
  return data.collections;
}

// Quem está gravando vem da sessão de login no servidor (cookie) — não é mais
// enviado pelo cliente. Ver _local-adr-policy-202.
export async function createCollectionApi(collection: OsteologicalCollection): Promise<OsteologicalCollection> {
  const res = await fetch('/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection })
  });
  const data = await parseJsonOrThrow(res, 'Erro ao criar conjunto');
  return data.collection;
}

export async function saveCollectionApi(collection: OsteologicalCollection): Promise<OsteologicalCollection> {
  const res = await fetch(`/api/collections/${encodeURIComponent(collection.nic)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection })
  });
  const data = await parseJsonOrThrow(res, 'Erro ao salvar conjunto');
  return data.collection;
}

export interface CollectionHistory {
  signatures: OsteologicalCollection['signatures'];
  changes: {
    id: number;
    changedAt: string;
    actorId: string | null;
    actorName: string | null;
    actorRole: string | null;
    kind: 'criacao' | 'campo' | 'assinatura' | 'reabertura' | 'custodia';
    phaseNumber: number | null;
    path: string | null;
    oldValue: unknown;
    newValue: unknown;
    note: string | null;
  }[];
  chain: { ok: boolean; brokenAtId: number | null };
}

export async function fetchCollectionHistory(nic: string): Promise<CollectionHistory> {
  const res = await fetch(`/api/collections/${encodeURIComponent(nic)}/history`);
  return parseJsonOrThrow(res, 'Erro ao carregar o histórico do conjunto');
}
