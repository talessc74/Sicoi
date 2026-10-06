/**
 * Busca de ossos parecidos entre os conjuntos já cadastrados, pra comparar com
 * um osso em mãos fora do acervo (ex.: achado isolado). Só compara o que já é
 * registrado hoje na Fase 4 (Curadoria) — nenhum campo novo no banco.
 *
 * Puramente determinístico: nenhuma IA aqui. A extração da descrição livre do
 * usuário em critério estruturado, e a explicação da semelhança sobre os
 * candidatos que esta busca traz, são passos separados (ver geminiService.ts).
 */
import type { Pool } from 'pg';
import type { OsteologicalCollection, SkeletalElement, IndividualHypothesis } from '../src/types/sgccco';

export interface BoneSimilarityCriteria {
  // Substring contra o nome em português do osso (ex.: "fêmur" casa com "Fêmur
  // Direito" e "Fêmur Esquerdo") — comparação sem acento e sem caixa, porque é
  // o jeito mais natural de descrever um osso em texto livre.
  boneNameQuery?: string;
  side?: SkeletalElement['side'];
  sexEstimate?: IndividualHypothesis['biologicalProfile']['sexEstimate']['value'];
  ageCategory?: IndividualHypothesis['biologicalProfile']['ageCategory']['value'];
}

export interface BoneSimilarityCandidate {
  nic: string;
  element: SkeletalElement;
  individual: IndividualHypothesis | null;
  similarity?: BoneSimilarityExplanation;
}

export interface BoneSimilarityExplanation {
  similarityScore: number;
  explanation: string;
  confidence: 'alta' | 'media' | 'baixa';
}

export const SIMILARITY_CONFIDENCES = new Set(['alta', 'media', 'baixa']);

const MAX_CANDIDATES = 100;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function matchesCriteria(
  element: SkeletalElement,
  individual: IndividualHypothesis | null,
  criteria: BoneSimilarityCriteria
): boolean {
  if (criteria.boneNameQuery && !normalize(element.namePt).includes(normalize(criteria.boneNameQuery))) {
    return false;
  }
  if (criteria.side && element.side !== criteria.side) {
    return false;
  }
  if (criteria.sexEstimate && individual?.biologicalProfile.sexEstimate.value !== criteria.sexEstimate) {
    return false;
  }
  if (criteria.ageCategory && individual?.biologicalProfile.ageCategory.value !== criteria.ageCategory) {
    return false;
  }
  return true;
}

/**
 * Varre todos os conjuntos não excluídos buscando elementos ósseos (Fase 4) que
 * casam com o critério — filtro em memória sobre o `full_state` já carregado,
 * suficiente neste volume (~500 conjuntos) sem precisar de índice novo.
 */
export async function findSimilarSkeletalElements(
  pool: Pool,
  criteria: BoneSimilarityCriteria
): Promise<BoneSimilarityCandidate[]> {
  const { rows } = await pool.query<{ nic: string; full_state: OsteologicalCollection }>(
    'SELECT nic, full_state FROM collections WHERE deleted_at IS NULL'
  );

  const candidates: BoneSimilarityCandidate[] = [];
  for (const row of rows) {
    const elements = row.full_state.phase4?.skeletalElements || [];
    const individuals = row.full_state.phase4?.individuals || [];
    for (const element of elements) {
      const individual = individuals.find((i) => i.id === element.associatedIndividualId) || null;
      if (matchesCriteria(element, individual, criteria)) {
        candidates.push({ nic: row.nic, element, individual });
        if (candidates.length >= MAX_CANDIDATES) {
          return candidates;
        }
      }
    }
  }
  return candidates;
}

/**
 * Valida a resposta do Gemini pra explicação de semelhança (resposta de
 * `BONE_SIMILARITY_EXPLANATION_RESPONSE_SCHEMA` em server.ts): descarta qualquer
 * item que não seja um dos `knownIds` (um elemento inventado pelo modelo nunca
 * chega ao cliente — _local-adr-policy-103), que tenha tipo errado em qualquer
 * campo, ou cuja `confidence` não seja um dos três valores esperados. Função
 * pura, sem IA nem banco — testável isoladamente.
 */
export function parseBoneSimilarityExplanations(
  parsed: unknown,
  knownIds: Set<string>
): Map<string, BoneSimilarityExplanation> {
  const explanations = new Map<string, BoneSimilarityExplanation>();
  if (!Array.isArray(parsed)) return explanations;

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const { elementId, similarityScore, explanation, confidence } = item as Record<string, unknown>;
    if (typeof elementId !== 'string' || !knownIds.has(elementId)) continue;
    if (typeof similarityScore !== 'number' || Number.isNaN(similarityScore)) continue;
    if (typeof explanation !== 'string') continue;
    if (typeof confidence !== 'string' || !SIMILARITY_CONFIDENCES.has(confidence)) continue;
    explanations.set(elementId, {
      similarityScore: Math.max(0, Math.min(1, similarityScore)),
      explanation,
      confidence: confidence as BoneSimilarityExplanation['confidence']
    });
  }
  return explanations;
}
