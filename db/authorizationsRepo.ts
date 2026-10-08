/**
 * Autorizações de pesquisa (Fase 7, §13 — ABAC), feitas pelo Administrador.
 * full_state é a fonte de verdade do objeto inteiro — mesmo padrão de
 * collectionsRepo.ts para `collections.full_state`.
 */
import type { Pool } from 'pg';
import type { ResearchAuthorization } from '../src/types/sgccco';

export const VALID_AUTHORIZATION_STATUS = new Set(['ativa', 'expirada', 'suspensa', 'revogada', 'aprovada']);

// Validação de forma pura (sem IA, sem banco) do corpo de criar/editar uma
// autorização — testável isolada, mesmo padrão de db/aiInputValidation.ts.
export function validateAuthorizationBody(body: any, isValidEmail: (email: string) => boolean): string | null {
  const { id, title, principalInvestigator, investigatorEmail, institution, cepEthicsApprovalNumber, status, validFrom, validUntil, scope } =
    body || {};
  if (!id || !title || !principalInvestigator || !investigatorEmail || !institution || !cepEthicsApprovalNumber || !validFrom || !validUntil) {
    return 'Informe id, title, principalInvestigator, investigatorEmail, institution, cepEthicsApprovalNumber, validFrom e validUntil.';
  }
  if (!VALID_AUTHORIZATION_STATUS.has(status)) {
    return 'status inválido. Use ativa, expirada, suspensa, revogada ou aprovada.';
  }
  if (!isValidEmail(investigatorEmail)) {
    return 'investigatorEmail deve ser um e-mail válido.';
  }
  if (new Date(validFrom).getTime() > new Date(validUntil).getTime()) {
    return 'validFrom não pode ser depois de validUntil.';
  }
  if (!Array.isArray(scope?.allowedCollectionsNic) || scope.allowedCollectionsNic.length === 0) {
    return 'Informe ao menos um NIC autorizado em scope.allowedCollectionsNic (ou "*" para todos).';
  }
  return null;
}

// Quem pode ver cada autorização ao listar: o Administrador vê todas; qualquer
// outro papel só vê as que o próprio e-mail autoriza — nunca o e-mail/
// instituição/CEP de outro pesquisador (minimização de dados, mesmo espírito
// de GET /api/people exigir sessão de Administrador).
export function visibleAuthorizationsFor(
  authorizations: ResearchAuthorization[],
  person: { role: string; email?: string }
): ResearchAuthorization[] {
  if (person.role === 'administrador') {
    return authorizations;
  }
  const ownEmail = String(person.email || '').toLowerCase();
  return authorizations.filter((a) => String(a.investigatorEmail || '').toLowerCase() === ownEmail);
}

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
