import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { listPeople, createPerson, getPerson, deletePerson, countPeople } from '../peopleRepo';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

beforeAll(async () => {
  await runMigrations(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM people');
});

describe('peopleRepo', () => {
  it('cadastra uma pessoa e devolve o UserProfile mapeado', async () => {
    const person = await createPerson(pool, {
      name: 'Perito Y',
      role: 'tecnico',
      institution: 'INC/DITEC/PF',
      email: 'perito.y@inc.pf.gov.br',
      registrationNumber: '12345'
    });

    expect(person.id).toBeTruthy();
    expect(person.name).toBe('Perito Y');
    expect(person.role).toBe('tecnico');
    expect(person.institution).toBe('INC/DITEC/PF');
    expect(person.email).toBe('perito.y@inc.pf.gov.br');
    expect(person.registrationNumber).toBe('12345');
  });

  it('cadastra uma pessoa sem matrícula (pesquisador externo)', async () => {
    const person = await createPerson(pool, {
      name: 'Pesquisadora Externa',
      role: 'pesquisador',
      institution: 'Universidade X',
      email: 'pesquisadora@universidade-x.edu'
    });

    expect(person.email).toBe('pesquisadora@universidade-x.edu');
    expect(person.registrationNumber).toBeUndefined();
  });

  it('lista pessoas na ordem de cadastro', async () => {
    await createPerson(pool, { name: 'Primeira', role: 'tecnico', institution: 'INC', email: 'primeira@inc.pf.gov.br', registrationNumber: '1' });
    await createPerson(pool, { name: 'Segunda', role: 'curador', institution: 'INC', email: 'segunda@inc.pf.gov.br', registrationNumber: '2' });

    const people = await listPeople(pool);

    expect(people.map((p) => p.name)).toEqual(['Primeira', 'Segunda']);
  });

  it('busca uma pessoa por id existente', async () => {
    const created = await createPerson(pool, { name: 'Alguém', role: 'curador', institution: 'INC', email: 'alguem@inc.pf.gov.br', registrationNumber: '9' });

    const found = await getPerson(pool, created.id);

    expect(found).toEqual(created);
  });

  it('devolve null para um id de formato inválido, sem consultar o banco', async () => {
    const found = await getPerson(pool, 'não-é-um-uuid');
    expect(found).toBeNull();
  });

  it('devolve null para um uuid bem formado que não existe', async () => {
    const found = await getPerson(pool, '00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('remove uma pessoa cadastrada', async () => {
    const created = await createPerson(pool, { name: 'Removível', role: 'estudante', institution: 'INC', email: 'removivel@inc.pf.gov.br', registrationNumber: '7' });

    await deletePerson(pool, created.id);

    expect(await getPerson(pool, created.id)).toBeNull();
  });

  it('remover um id inexistente não lança erro (idempotente)', async () => {
    await expect(deletePerson(pool, '00000000-0000-0000-0000-000000000000')).resolves.not.toThrow();
  });

  it('countPeople devolve 0 numa tabela vazia', async () => {
    expect(await countPeople(pool)).toBe(0);
  });

  it('countPeople conta as pessoas cadastradas', async () => {
    await createPerson(pool, { name: 'Primeira', role: 'tecnico', institution: 'INC', email: 'primeira@inc.pf.gov.br', registrationNumber: '1' });
    await createPerson(pool, { name: 'Segunda', role: 'curador', institution: 'INC', email: 'segunda@inc.pf.gov.br', registrationNumber: '2' });

    expect(await countPeople(pool)).toBe(2);
  });
});
