import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { listPeople, createPerson, updatePerson, getPerson, deletePerson, countPeople } from '../peopleRepo';

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
      email: 'perito.y@inc.pf.gov.br'
    });

    expect(person.id).toBeTruthy();
    expect(person.name).toBe('Perito Y');
    expect(person.role).toBe('tecnico');
    expect(person.institution).toBe('INC/DITEC/PF');
    expect(person.email).toBe('perito.y@inc.pf.gov.br');
  });

  it('recusa cadastrar dois e-mails iguais ignorando maiúsculas/minúsculas', async () => {
    await createPerson(pool, { name: 'Primeira', role: 'tecnico', institution: 'INC', email: 'igual@inc.pf.gov.br' });

    await expect(
      createPerson(pool, { name: 'Segunda', role: 'tecnico', institution: 'INC', email: 'Igual@INC.PF.GOV.BR' })
    ).rejects.toMatchObject({ code: '23505', constraint: 'people_email_key' });
  });

  it('lista pessoas na ordem de cadastro', async () => {
    await createPerson(pool, { name: 'Primeira', role: 'tecnico', institution: 'INC', email: 'primeira@inc.pf.gov.br' });
    await createPerson(pool, { name: 'Segunda', role: 'curador', institution: 'INC', email: 'segunda@inc.pf.gov.br' });

    const people = await listPeople(pool);

    expect(people.map((p) => p.name)).toEqual(['Primeira', 'Segunda']);
  });

  it('busca uma pessoa por id existente', async () => {
    const created = await createPerson(pool, { name: 'Alguém', role: 'curador', institution: 'INC', email: 'alguem@inc.pf.gov.br' });

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
    const created = await createPerson(pool, { name: 'Removível', role: 'estudante', institution: 'INC', email: 'removivel@inc.pf.gov.br' });

    await deletePerson(pool, created.id);

    expect(await getPerson(pool, created.id)).toBeNull();
  });

  it('edita nome, papel, instituição e e-mail de uma pessoa cadastrada', async () => {
    const created = await createPerson(pool, {
      name: 'Nome Antigo',
      role: 'tecnico',
      institution: 'INC',
      email: 'antigo@inc.pf.gov.br'
    });

    const updated = await updatePerson(pool, created.id, {
      name: 'Nome Novo',
      role: 'curador',
      institution: 'PF',
      email: 'novo@inc.pf.gov.br'
    });

    expect(updated).toEqual({
      id: created.id,
      name: 'Nome Novo',
      role: 'curador',
      institution: 'PF',
      email: 'novo@inc.pf.gov.br',
      adminAccess: false
    });
  });

  it('guarda o acesso de Administrador somado ao papel principal (Curadora que também administra)', async () => {
    const created = await createPerson(pool, {
      name: 'Curadora',
      role: 'curador',
      institution: 'INC',
      email: 'curadora@inc.pf.gov.br',
      adminAccess: true
    });
    expect(created.role).toBe('curador');
    expect(created.adminAccess).toBe(true);

    const listed = await listPeople(pool);
    expect(listed[0].adminAccess).toBe(true);

    const updated = await updatePerson(pool, created.id, {
      name: 'Curadora',
      role: 'curador',
      institution: 'INC',
      email: 'curadora@inc.pf.gov.br'
    });
    expect(updated?.adminAccess).toBe(false);
  });

  it('cadastro sem a marca não ganha acesso de Administrador', async () => {
    const person = await createPerson(pool, { name: 'Técnico', role: 'tecnico', institution: 'INC', email: 'tec@inc.pf.gov.br' });
    expect(person.adminAccess).toBe(false);
  });

  it('permite preencher o e-mail de um registro antigo, sem e-mail (de antes do login real)', async () => {
    const { rows } = await pool.query(
      `INSERT INTO people (name, role, institution) VALUES ($1, $2, $3) RETURNING id`,
      ['Pessoa Fictícia', 'curador', 'INC']
    );
    const legacyId = rows[0].id;

    const updated = await updatePerson(pool, legacyId, {
      name: 'Pessoa Fictícia',
      role: 'curador',
      institution: 'INC',
      email: 'agora-tem-email@inc.pf.gov.br'
    });

    expect(updated?.email).toBe('agora-tem-email@inc.pf.gov.br');
  });

  it('devolve null ao editar um id inexistente', async () => {
    const updated = await updatePerson(pool, '00000000-0000-0000-0000-000000000000', {
      name: 'Ninguém',
      role: 'tecnico',
      institution: 'INC',
      email: 'ninguem@inc.pf.gov.br'
    });
    expect(updated).toBeNull();
  });

  it('recusa editar para um e-mail já usado por outra pessoa', async () => {
    await createPerson(pool, { name: 'Já tem', role: 'tecnico', institution: 'INC', email: 'ocupado@inc.pf.gov.br' });
    const other = await createPerson(pool, { name: 'Outra', role: 'tecnico', institution: 'INC', email: 'livre@inc.pf.gov.br' });

    await expect(
      updatePerson(pool, other.id, { name: 'Outra', role: 'tecnico', institution: 'INC', email: 'ocupado@inc.pf.gov.br' })
    ).rejects.toMatchObject({ code: '23505', constraint: 'people_email_key' });
  });

  it('remover um id inexistente não lança erro (idempotente)', async () => {
    await expect(deletePerson(pool, '00000000-0000-0000-0000-000000000000')).resolves.not.toThrow();
  });

  it('countPeople devolve 0 numa tabela vazia', async () => {
    expect(await countPeople(pool)).toBe(0);
  });

  it('countPeople conta as pessoas cadastradas', async () => {
    await createPerson(pool, { name: 'Primeira', role: 'tecnico', institution: 'INC', email: 'primeira@inc.pf.gov.br' });
    await createPerson(pool, { name: 'Segunda', role: 'curador', institution: 'INC', email: 'segunda@inc.pf.gov.br' });

    expect(await countPeople(pool)).toBe(2);
  });
});
