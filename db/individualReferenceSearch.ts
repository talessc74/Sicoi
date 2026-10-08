/**
 * Busca de referência entre conjuntos (Fase 4, §15): a curadora tem um
 * indivíduo em mãos e quer saber se já classificou outro parecido em algum
 * outro conjunto do acervo — mesmo perfil biológico, mesmo método de
 * estimativa. É o agente de apoio previsto no README da Fase 4 (o modal já
 * existia; a busca em si era texto fixo, nunca consultava o acervo de
 * verdade — corrigido aqui).
 *
 * Puramente determinístico, igual a `boneSimilarity.ts`: nenhuma IA, nenhuma
 * gravação. Compara só o que já está registrado hoje (biologicalProfile de
 * `phase4.individuals`), sem inventar campo novo.
 */
import type { Pool } from 'pg';
import type { IndividualHypothesis, OsteologicalCollection } from '../src/types/sgccco';

export interface IndividualReferenceMatch {
  nic: string;
  individual: IndividualHypothesis;
  sharedTraits: string[];
}

const MAX_MATCHES = 20;

/**
 * Casa quando sexo OU idade bate em valor E método de estimativa — exigir os
 * dois juntos evita que a comparação vire "todo mundo classificado como
 * adulto" (pouco útil pra curadoria). "indeterminado" nunca conta como
 * traço em comum: é o valor padrão de todo indivíduo recém-criado (ver
 * `handleAddIndividual` em `Phase4Curadoria.tsx`), não uma classificação de
 * verdade — sem essa exclusão, dois indivíduos ainda não analisados
 * "combinam" só por nenhum dos dois ter sido classificado ainda. Retorna a
 * lista de traços em comum (pode ter os dois).
 */
function sharedTraits(
  a: IndividualHypothesis['biologicalProfile'],
  b: IndividualHypothesis['biologicalProfile']
): string[] {
  const shared: string[] = [];
  if (
    b.sexEstimate.value !== 'indeterminado' &&
    a.sexEstimate.value === b.sexEstimate.value &&
    a.sexEstimate.methodCode === b.sexEstimate.methodCode
  ) {
    shared.push(`Sexo estimado "${b.sexEstimate.value}" pelo mesmo método (${b.sexEstimate.methodCode})`);
  }
  if (a.ageCategory.value === b.ageCategory.value && a.ageCategory.methodCode === b.ageCategory.methodCode) {
    shared.push(`Categoria de idade "${b.ageCategory.value}" pelo mesmo método (${b.ageCategory.methodCode})`);
  }
  return shared;
}

/**
 * Varre todos os conjuntos não excluídos buscando, em OUTROS conjuntos
 * (nunca no mesmo conjunto do indivíduo de referência — comparar dois
 * indivíduos do mesmo conjunto não é "achar referência no acervo"),
 * indivíduos (Fase 4) com perfil biológico comparável ao indivíduo de
 * referência — filtro em memória sobre o `full_state` já carregado, mesmo
 * padrão de `boneSimilarity.findSimilarSkeletalElements`.
 */
export async function findSimilarIndividuals(
  pool: Pool,
  excludeNic: string,
  referenceProfile: IndividualHypothesis['biologicalProfile']
): Promise<IndividualReferenceMatch[]> {
  const { rows } = await pool.query<{ nic: string; full_state: OsteologicalCollection }>(
    'SELECT nic, full_state FROM collections WHERE deleted_at IS NULL'
  );

  const matches: IndividualReferenceMatch[] = [];
  for (const row of rows) {
    if (row.nic === excludeNic) continue;
    const individuals = row.full_state.phase4?.individuals || [];
    for (const individual of individuals) {
      const traits = sharedTraits(referenceProfile, individual.biologicalProfile);
      if (traits.length > 0) {
        matches.push({ nic: row.nic, individual, sharedTraits: traits });
        if (matches.length >= MAX_MATCHES) return matches;
      }
    }
  }
  return matches;
}
