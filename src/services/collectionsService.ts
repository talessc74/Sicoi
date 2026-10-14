/**
 * Cliente HTTP para persistência de conjuntos osteológicos (PostgreSQL via /api/collections).
 * Substitui o estado local em memória (mockData) como fonte de verdade do App.
 */
import { IndividualHypothesis, OsteologicalCollection } from '../types/sgccco';
import { csrfHeaders } from './csrf';

async function parseJsonOrThrow(res: Response, fallbackMessage: string) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON (ex.: erro de rede bruto)
  }
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `${fallbackMessage} (HTTP ${res.status})`), { code: data?.code });
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
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ collection })
  });
  const data = await parseJsonOrThrow(res, 'Erro ao criar conjunto');
  return data.collection;
}

export async function saveCollectionApi(collection: OsteologicalCollection): Promise<OsteologicalCollection> {
  const res = await fetch(`/api/collections/${encodeURIComponent(collection.nic)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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

export interface IndividualReferenceMatch {
  nic: string;
  individual: IndividualHypothesis;
  sharedTraits: string[];
}

// Fase 4 (§15): busca indivíduos com perfil biológico comparável em outros
// conjuntos do acervo, a partir de um indivíduo já registrado neste conjunto.
export async function searchIndividualReferences(
  nic: string,
  individualId: string
): Promise<IndividualReferenceMatch[]> {
  const res = await fetch('/api/phase4/individuals/reference-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ nic, individualId })
  });
  const data = await parseJsonOrThrow(res, 'Erro na busca de referência entre conjuntos');
  return data.matches;
}
