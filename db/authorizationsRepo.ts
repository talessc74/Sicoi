/**
 * Autorizações de pesquisa (Fase 7, §13 — ABAC), feitas pelo Administrador.
 * full_state é a fonte de verdade do objeto inteiro — mesmo padrão de
 * collectionsRepo.ts para `collections.full_state`.
 */
import type { Pool } from 'pg';
import type { ResearchAuthorization } from '../src/types/sgccco';

export async function listAuthorizations(pool: Pool): Promise<ResearchAuthorization[]> {
  const { rows } = await pool.query<{ full_state: ResearchAuthorization }>(
    'SELECT full_state FROM research_authorizations ORDER BY created_at ASC'
  );
  return rows.map((r) => r.full_state);
}

export async function createAuthorization(
  pool: Pool,
  authorization: ResearchAuthorization
): Promise<ResearchAuthorization> {
  const { rows } = await pool.query<{ full_state: ResearchAuthorization }>(
    `INSERT INTO research_authorizations (id, status, principal_investigator, institution, full_state)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING full_state`,
    [authorization.id, authorization.status, authorization.principalInvestigator, authorization.institution, authorization]
  );
  return rows[0].full_state;
}

export async function updateAuthorization(
  pool: Pool,
  id: string,
  authorization: ResearchAuthorization
): Promise<ResearchAuthorization | null> {
  const { rows } = await pool.query<{ full_state: ResearchAuthorization }>(
    `UPDATE research_authorizations
     SET status = $2, principal_investigator = $3, institution = $4, full_state = $5, updated_at = now()
     WHERE id = $1
     RETURNING full_state`,
    [id, authorization.status, authorization.principalInvestigator, authorization.institution, authorization]
  );
  return rows[0]?.full_state ?? null;
}
