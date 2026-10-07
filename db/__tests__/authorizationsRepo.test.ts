import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { listAuthorizations, createAuthorization, updateAuthorization } from '../authorizationsRepo';
import type { ResearchAuthorization } from '../../src/types/sgccco';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

function authorization(overrides: Partial<ResearchAuthorization> = {}): ResearchAuthorization {
  return {
    id: 'AUTH-0001',
    title: 'Projeto de Pesquisa X',
    principalInvestigator: 'Dra. Helena Rios',
    investigatorEmail: 'helena.rios@usp.br',
    institution: 'USP',
    cepEthicsApprovalNumber: 'CEP-123/2026',
    status: 'ativa',
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    scope: {
      allowedAnatomicalElements: [],
      allowedCollectionsNic: ['NIC-2026-0001'],
      allowedVariables: ['perfil_biologico'],
      allowedMediaTypes: [],
      exportFormatAllowed: ['json']
    },
    ...overrides
  };
}

beforeAll(async () => {
  await runMigrations(pool);
});

beforeEach(async () => {
  await pool.query('DELETE FROM research_authorizations');
});

afterAll(async () => {
  await pool.end();
});

describe('authorizationsRepo', () => {
  it('cria uma autorização e devolve o objeto completo', async () => {
    const created = await createAuthorization(pool, authorization());
    expect(created).toEqual(authorization());
  });

  it('lista autorizações na ordem de criação', async () => {
    await createAuthorization(pool, authorization({ id: 'AUTH-0001', title: 'Primeira' }));
    await createAuthorization(pool, authorization({ id: 'AUTH-0002', title: 'Segunda' }));

    const list = await listAuthorizations(pool);
    expect(list.map((a) => a.title)).toEqual(['Primeira', 'Segunda']);
  });

  it('edita uma autorização existente (ex.: revogar)', async () => {
    await createAuthorization(pool, authorization());

    const updated = await updateAuthorization(pool, 'AUTH-0001', authorization({ status: 'revogada' }));

    expect(updated?.status).toBe('revogada');
    const [persisted] = await listAuthorizations(pool);
    expect(persisted.status).toBe('revogada');
  });

  it('devolve null ao editar um id inexistente', async () => {
    const updated = await updateAuthorization(pool, 'AUTH-INEXISTENTE', authorization({ id: 'AUTH-INEXISTENTE' }));
    expect(updated).toBeNull();
  });

  it('recusa duas autorizações com o mesmo id', async () => {
    await createAuthorization(pool, authorization());
    await expect(createAuthorization(pool, authorization())).rejects.toMatchObject({ code: '23505' });
  });
});
