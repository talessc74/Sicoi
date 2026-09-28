import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { createPerson } from '../peopleRepo';
import {
  hashPassword,
  verifyLogin,
  getPersonWithAuthStatus,
  createPasswordSetupToken,
  consumePasswordSetupToken,
  createFirstAdmin
} from '../authRepo';

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
  await pool.query('DELETE FROM password_setup_tokens');
  await pool.query('DELETE FROM people');
});

describe('authRepo', () => {
  it('verifyLogin devolve null para matrícula sem senha definida ainda', async () => {
    await createPerson(pool, { name: 'Sem Senha', role: 'tecnico', institution: 'INC', registrationNumber: '100' });

    const result = await verifyLogin(pool, '100', 'qualquer-coisa');

    expect(result).toBeNull();
  });

  it('verifyLogin devolve null para matrícula inexistente', async () => {
    const result = await verifyLogin(pool, 'não-existe', 'qualquer-coisa');
    expect(result).toBeNull();
  });

  it('verifyLogin devolve o perfil quando a senha está correta', async () => {
    const person = await createPerson(pool, { name: 'Com Senha', role: 'curador', institution: 'INC', registrationNumber: '200' });
    const passwordHash = await hashPassword('senha-correta-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    const result = await verifyLogin(pool, '200', 'senha-correta-123');

    expect(result).toEqual(person);
  });

  it('verifyLogin devolve null quando a senha está errada', async () => {
    const person = await createPerson(pool, { name: 'Com Senha', role: 'curador', institution: 'INC', registrationNumber: '201' });
    const passwordHash = await hashPassword('senha-correta-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    const result = await verifyLogin(pool, '201', 'senha-errada');

    expect(result).toBeNull();
  });

  it('getPersonWithAuthStatus indica hasPassword=false antes de qualquer senha definida', async () => {
    const person = await createPerson(pool, { name: 'Fulano', role: 'estudante', institution: 'INC', registrationNumber: '300' });

    const result = await getPersonWithAuthStatus(pool, person.id);

    expect(result).toEqual({ ...person, hasPassword: false });
  });

  it('getPersonWithAuthStatus indica hasPassword=true depois de definir senha', async () => {
    const person = await createPerson(pool, { name: 'Fulano', role: 'estudante', institution: 'INC', registrationNumber: '301' });
    const passwordHash = await hashPassword('outra-senha-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    const result = await getPersonWithAuthStatus(pool, person.id);

    expect(result).toEqual({ ...person, hasPassword: true });
  });

  it('getPersonWithAuthStatus devolve null para id inexistente', async () => {
    const result = await getPersonWithAuthStatus(pool, '00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('createPasswordSetupToken + consumePasswordSetupToken: fluxo completo de primeira senha', async () => {
    const person = await createPerson(pool, { name: 'Novo Cadastro', role: 'tecnico', institution: 'INC', registrationNumber: '400' });

    const { token } = await createPasswordSetupToken(pool, person.id, 'Administrador Teste');
    expect(token).toHaveLength(64); // 32 bytes em hex

    const updated = await consumePasswordSetupToken(pool, token, 'primeira-senha-123');
    expect(updated).toEqual(person);

    const loggedIn = await verifyLogin(pool, '400', 'primeira-senha-123');
    expect(loggedIn).toEqual(person);
  });

  it('consumePasswordSetupToken rejeita um token que não existe', async () => {
    await expect(consumePasswordSetupToken(pool, 'token-inventado', 'senha-123456')).rejects.toThrow(
      'Link inválido, expirado ou já utilizado.'
    );
  });

  it('consumePasswordSetupToken rejeita um token já usado (não pode ser reaproveitado)', async () => {
    const person = await createPerson(pool, { name: 'Usa Duas Vezes', role: 'tecnico', institution: 'INC', registrationNumber: '401' });
    const { token } = await createPasswordSetupToken(pool, person.id, null);

    await consumePasswordSetupToken(pool, token, 'primeira-senha-123');

    await expect(consumePasswordSetupToken(pool, token, 'segunda-senha-123')).rejects.toThrow(
      'Link inválido, expirado ou já utilizado.'
    );
  });

  it('consumePasswordSetupToken rejeita um token expirado', async () => {
    const person = await createPerson(pool, { name: 'Token Vencido', role: 'tecnico', institution: 'INC', registrationNumber: '402' });
    const { token } = await createPasswordSetupToken(pool, person.id, null, -1);

    await expect(consumePasswordSetupToken(pool, token, 'primeira-senha-123')).rejects.toThrow(
      'Link inválido, expirado ou já utilizado.'
    );
  });

  it('createFirstAdmin cria a primeira pessoa como administrador, com senha já definida', async () => {
    const person = await createFirstAdmin(pool, {
      name: 'Primeira Administradora',
      institution: 'INC/DITEC/PF',
      registrationNumber: '500',
      password: 'senha-bootstrap-123'
    });

    expect(person.role).toBe('administrador');

    const loggedIn = await verifyLogin(pool, '500', 'senha-bootstrap-123');
    expect(loggedIn).toEqual(person);
  });

  it('createFirstAdmin recusa se já existir qualquer pessoa cadastrada', async () => {
    await createPerson(pool, { name: 'Já Existe', role: 'tecnico', institution: 'INC', registrationNumber: '501' });

    await expect(
      createFirstAdmin(pool, { name: 'Segunda Tentativa', institution: 'INC', registrationNumber: '502', password: 'senha-bootstrap-123' })
    ).rejects.toThrow('Já existe gente cadastrada — o bootstrap só funciona com o sistema vazio.');
  });
});
