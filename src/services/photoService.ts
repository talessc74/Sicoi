/**
 * Captura real de foto (Fase 1 e Fase 2) — upload multipart pra
 * POST /api/collections/:nic/photos, que guarda os bytes direto no Postgres
 * e devolve o conjunto já salvo com a foto nova em full_state
 * (_local-adr-policy-301). Substitui o antigo placeholder (URL fixa de um
 * banco de imagens de terceiros, hash calculado sobre texto) que nunca
 * tirou foto nenhuma.
 */
import { OsteologicalCollection, Phase1Photo } from '../types/sgccco';
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

export async function uploadCollectionPhoto(
  nic: string,
  phase: 'phase1' | 'phase2',
  category: string,
  file: File,
  caption?: string
): Promise<{ collection: OsteologicalCollection; photo: Phase1Photo }> {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('phase', phase);
  formData.append('category', category);
  if (caption) formData.append('caption', caption);

  // Sem 'Content-Type' manual: o navegador define o boundary multipart sozinho.
  const res = await fetch(`/api/collections/${encodeURIComponent(nic)}/photos`, {
    method: 'POST',
    headers: { ...csrfHeaders() },
    body: formData
  });
  return parseJsonOrThrow(res, 'Erro ao registrar foto');
}
