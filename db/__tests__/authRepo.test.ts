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
  createFirstAdmin,
  requestPasswordReset,
  listPendingPasswordResetRequests,
  resolvePendingPasswordResetRequests,
  changeOwnPassword,
  isLoginLocked,
  recordFailedLogin,
  clearLoginAttempts,
  hasUnactivatedAdministrator,
  claimAdministratorAccount
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
  await pool.query('DELETE FROM password_reset_requests');
  await pool.query('DELETE FROM login_attempts');
  await pool.query('DELETE FROM people');
});

describe('authRepo', () => {
  it('verifyLogin devolve null para e-mail sem senha definida ainda', async () => {
    await createPerson(pool, { name: 'Sem Senha', role: 'tecnico', institution: 'INC', email: 'sem.senha@inc.pf.gov.br', registrationNumber: '100' });

    const result = await verifyLogin(pool, 'sem.senha@inc.pf.gov.br', 'qualquer-coisa');

    expect(result).toBeNull();
  });

  it('verifyLogin devolve null para e-mail inexistente', async () => {
    const result = await verifyLogin(pool, 'nao-existe@inc.pf.gov.br', 'qualquer-coisa');
    expect(result).toBeNull();
  });

  it('verifyLogin devolve o perfil quando a senha está correta', async () => {
    const person = await createPerson(pool, { name: 'Com Senha', role: 'curador', institution: 'INC', email: 'com.senha@inc.pf.gov.br', registrationNumber: '200' });
    const passwordHash = await hashPassword('senha-correta-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    const result = await verifyLogin(pool, 'com.senha@inc.pf.gov.br', 'senha-correta-123');

    expect(result).toEqual(person);
  });

  it('verifyLogin é case-insensitive quanto ao e-mail', async () => {
    const person = await createPerson(pool, { name: 'Com Senha', role: 'curador', institution: 'INC', email: 'Com.Senha@inc.pf.gov.br', registrationNumber: '205' });
    const passwordHash = await hashPassword('senha-correta-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    const result = await verifyLogin(pool, 'com.senha@inc.pf.gov.br', 'senha-correta-123');

    expect(result).toEqual(person);
  });

  it('verifyLogin devolve null quando a senha está errada', async () => {
    const person = await createPerson(pool, { name: 'Com Senha', role: 'curador', institution: 'INC', email: 'com.senha2@inc.pf.gov.br', registrationNumber: '201' });
    const passwordHash = await hashPassword('senha-correta-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    const result = await verifyLogin(pool, 'com.senha2@inc.pf.gov.br', 'senha-errada');

    expect(result).toBeNull();
  });

  it('getPersonWithAuthStatus indica hasPassword=false antes de qualquer senha definida', async () => {
    const person = await createPerson(pool, { name: 'Fulano', role: 'estudante', institution: 'INC', email: 'fulano@inc.pf.gov.br', registrationNumber: '300' });

    const result = await getPersonWithAuthStatus(pool, person.id);

    expect(result).toEqual({ ...person, hasPassword: false });
  });

  it('getPersonWithAuthStatus indica hasPassword=true depois de definir senha', async () => {
    const person = await createPerson(pool, { name: 'Fulano', role: 'estudante', institution: 'INC', email: 'fulano2@inc.pf.gov.br', registrationNumber: '301' });
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
    const person = await createPerson(pool, { name: 'Novo Cadastro', role: 'tecnico', institution: 'INC', email: 'novo.cadastro@inc.pf.gov.br', registrationNumber: '400' });

    const { token } = await createPasswordSetupToken(pool, person.id, 'Administrador Teste');
    expect(token).toHaveLength(64); // 32 bytes em hex

    const updated = await consumePasswordSetupToken(pool, token, 'primeira-senha-123');
    expect(updated).toEqual(person);

    const loggedIn = await verifyLogin(pool, 'novo.cadastro@inc.pf.gov.br', 'primeira-senha-123');
    expect(loggedIn).toEqual(person);
  });

  it('consumePasswordSetupToken rejeita um token que não existe', async () => {
    await expect(consumePasswordSetupToken(pool, 'token-inventado', 'senha-123456')).rejects.toThrow(
      'Link inválido, expirado ou já utilizado.'
    );
  });

  it('consumePasswordSetupToken rejeita um token já usado (não pode ser reaproveitado)', async () => {
    const person = await createPerson(pool, { name: 'Usa Duas Vezes', role: 'tecnico', institution: 'INC', email: 'usa.duas.vezes@inc.pf.gov.br', registrationNumber: '401' });
    const { token } = await createPasswordSetupToken(pool, person.id, null);

    await consumePasswordSetupToken(pool, token, 'primeira-senha-123');

    await expect(consumePasswordSetupToken(pool, token, 'segunda-senha-123')).rejects.toThrow(
      'Link inválido, expirado ou já utilizado.'
    );
  });

  it('consumePasswordSetupToken rejeita um token expirado', async () => {
    const person = await createPerson(pool, { name: 'Token Vencido', role: 'tecnico', institution: 'INC', email: 'token.vencido@inc.pf.gov.br', registrationNumber: '402' });
    const { token } = await createPasswordSetupToken(pool, person.id, null, -1);

    await expect(consumePasswordSetupToken(pool, token, 'primeira-senha-123')).rejects.toThrow(
      'Link inválido, expirado ou já utilizado.'
    );
  });

  it('createFirstAdmin cria a primeira pessoa como administrador, com senha já definida', async () => {
    const person = await createFirstAdmin(pool, {
      name: 'Primeira Administradora',
      institution: 'INC/DITEC/PF',
      email: 'primeira.admin@inc.pf.gov.br',
      registrationNumber: '500',
      password: 'senha-bootstrap-123'
    });

    expect(person.role).toBe('administrador');

    const loggedIn = await verifyLogin(pool, 'primeira.admin@inc.pf.gov.br', 'senha-bootstrap-123');
    expect(loggedIn).toEqual(person);
  });

  it('createFirstAdmin funciona sem matrícula (pesquisador virando administrador inicial)', async () => {
    const person = await createFirstAdmin(pool, {
      name: 'Admin Sem Matrícula',
      institution: 'INC/DITEC/PF',
      email: 'admin.sem.matricula@inc.pf.gov.br',
      password: 'senha-bootstrap-123'
    });

    expect(person.registrationNumber).toBeUndefined();
  });

  it('createFirstAdmin recusa se já existir qualquer pessoa cadastrada', async () => {
    await createPerson(pool, { name: 'Já Existe', role: 'tecnico', institution: 'INC', email: 'ja.existe@inc.pf.gov.br', registrationNumber: '501' });

    await expect(
      createFirstAdmin(pool, { name: 'Segunda Tentativa', institution: 'INC', email: 'segunda.tentativa@inc.pf.gov.br', registrationNumber: '502', password: 'senha-bootstrap-123' })
    ).rejects.toThrow('Já existe gente cadastrada — o bootstrap só funciona com o sistema vazio.');
  });

  it('requestPasswordReset não lança erro para e-mail inexistente, e não cria pedido', async () => {
    await expect(requestPasswordReset(pool, 'nao-existe@inc.pf.gov.br')).resolves.not.toThrow();
    expect(await listPendingPasswordResetRequests(pool)).toEqual([]);
  });

  it('requestPasswordReset cria um pedido pendente para um e-mail existente', async () => {
    const person = await createPerson(pool, { name: 'Esqueceu a Senha', role: 'tecnico', institution: 'INC', email: 'esqueceu.senha@inc.pf.gov.br', registrationNumber: '600' });

    await requestPasswordReset(pool, 'esqueceu.senha@inc.pf.gov.br');

    const pending = await listPendingPasswordResetRequests(pool);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      personId: person.id,
      personName: 'Esqueceu a Senha',
      email: 'esqueceu.senha@inc.pf.gov.br'
    });
  });

  it('requestPasswordReset não duplica pedido se já existir um pendente para a mesma pessoa', async () => {
    await createPerson(pool, { name: 'Pediu Duas Vezes', role: 'tecnico', institution: 'INC', email: 'pediu.duas.vezes@inc.pf.gov.br', registrationNumber: '601' });

    await requestPasswordReset(pool, 'pediu.duas.vezes@inc.pf.gov.br');
    await requestPasswordReset(pool, 'pediu.duas.vezes@inc.pf.gov.br');

    expect(await listPendingPasswordResetRequests(pool)).toHaveLength(1);
  });

  it('listPendingPasswordResetRequests devolve os pedidos em ordem de chegada, sem os já resolvidos', async () => {
    const first = await createPerson(pool, { name: 'Primeiro', role: 'tecnico', institution: 'INC', email: 'primeiro@inc.pf.gov.br', registrationNumber: '602' });
    const second = await createPerson(pool, { name: 'Segundo', role: 'tecnico', institution: 'INC', email: 'segundo@inc.pf.gov.br', registrationNumber: '603' });

    await requestPasswordReset(pool, 'primeiro@inc.pf.gov.br');
    await requestPasswordReset(pool, 'segundo@inc.pf.gov.br');
    await resolvePendingPasswordResetRequests(pool, first.id, 'Admin Teste');

    const pending = await listPendingPasswordResetRequests(pool);
    expect(pending).toHaveLength(1);
    expect(pending[0].personId).toBe(second.id);
  });

  it('resolvePendingPasswordResetRequests é idempotente (resolver de novo não lança erro)', async () => {
    const person = await createPerson(pool, { name: 'Resolvido', role: 'tecnico', institution: 'INC', email: 'resolvido@inc.pf.gov.br', registrationNumber: '604' });
    await requestPasswordReset(pool, 'resolvido@inc.pf.gov.br');

    await resolvePendingPasswordResetRequests(pool, person.id, 'Admin Teste');
    await expect(resolvePendingPasswordResetRequests(pool, person.id, 'Admin Teste')).resolves.not.toThrow();
    expect(await listPendingPasswordResetRequests(pool)).toEqual([]);
  });

  it('changeOwnPassword troca a senha quando a senha atual está correta', async () => {
    const person = await createPerson(pool, { name: 'Troca Senha', role: 'tecnico', institution: 'INC', email: 'troca.senha@inc.pf.gov.br', registrationNumber: '700' });
    const passwordHash = await hashPassword('senha-antiga-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    await changeOwnPassword(pool, person.id, 'senha-antiga-123', 'senha-nova-456');

    expect(await verifyLogin(pool, 'troca.senha@inc.pf.gov.br', 'senha-antiga-123')).toBeNull();
    expect(await verifyLogin(pool, 'troca.senha@inc.pf.gov.br', 'senha-nova-456')).toEqual(person);
  });

  it('changeOwnPassword rejeita quando a senha atual está errada, sem trocar nada', async () => {
    const person = await createPerson(pool, { name: 'Senha Errada', role: 'tecnico', institution: 'INC', email: 'senha.errada@inc.pf.gov.br', registrationNumber: '701' });
    const passwordHash = await hashPassword('senha-antiga-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, person.id]);

    await expect(changeOwnPassword(pool, person.id, 'senha-errada', 'senha-nova-456')).rejects.toThrow('Senha atual incorreta.');
    expect(await verifyLogin(pool, 'senha.errada@inc.pf.gov.br', 'senha-antiga-123')).toEqual(person);
  });

  it('changeOwnPassword rejeita para pessoa inexistente', async () => {
    await expect(
      changeOwnPassword(pool, '00000000-0000-0000-0000-000000000000', 'qualquer', 'senha-nova-456')
    ).rejects.toThrow('Pessoa não encontrada.');
  });

  it('isLoginLocked começa false para e-mail sem histórico de tentativas', async () => {
    await createPerson(pool, { name: 'Sem Tentativas', role: 'tecnico', institution: 'INC', email: 'sem.tentativas@inc.pf.gov.br', registrationNumber: '800' });
    expect(await isLoginLocked(pool, 'sem.tentativas@inc.pf.gov.br')).toBe(false);
  });

  it('isLoginLocked devolve false para e-mail inexistente (nada a travar)', async () => {
    expect(await isLoginLocked(pool, 'nao-existe@inc.pf.gov.br')).toBe(false);
  });

  it('recordFailedLogin para e-mail inexistente não grava nada (evita crescimento sem limite)', async () => {
    await recordFailedLogin(pool, 'nao-existe@inc.pf.gov.br');
    const { rows } = await pool.query('SELECT * FROM login_attempts');
    expect(rows).toHaveLength(0);
  });

  it('trava depois de 5 tentativas falhas seguidas, e libera antes disso', async () => {
    await createPerson(pool, { name: 'Alvo do Ataque', role: 'tecnico', institution: 'INC', email: 'alvo.ataque@inc.pf.gov.br', registrationNumber: '801' });

    for (let i = 0; i < 4; i++) {
      await recordFailedLogin(pool, 'alvo.ataque@inc.pf.gov.br');
      expect(await isLoginLocked(pool, 'alvo.ataque@inc.pf.gov.br')).toBe(false);
    }
    await recordFailedLogin(pool, 'alvo.ataque@inc.pf.gov.br');
    expect(await isLoginLocked(pool, 'alvo.ataque@inc.pf.gov.br')).toBe(true);
  });

  it('clearLoginAttempts libera o e-mail e zera a contagem', async () => {
    await createPerson(pool, { name: 'Login Certo Depois', role: 'tecnico', institution: 'INC', email: 'login.certo.depois@inc.pf.gov.br', registrationNumber: '802' });

    await recordFailedLogin(pool, 'login.certo.depois@inc.pf.gov.br');
    await recordFailedLogin(pool, 'login.certo.depois@inc.pf.gov.br');
    await clearLoginAttempts(pool, 'login.certo.depois@inc.pf.gov.br');

    const { rows } = await pool.query('SELECT * FROM login_attempts');
    expect(rows).toHaveLength(0);
    expect(await isLoginLocked(pool, 'login.certo.depois@inc.pf.gov.br')).toBe(false);
  });

  it('depois de travar, uma nova tentativa falha começa a contagem de novo (não trava de novo na hora)', async () => {
    const person = await createPerson(pool, { name: 'Trava Expirada', role: 'tecnico', institution: 'INC', email: 'trava.expirada@inc.pf.gov.br', registrationNumber: '803' });
    for (let i = 0; i < 5; i++) {
      await recordFailedLogin(pool, 'trava.expirada@inc.pf.gov.br');
    }
    expect(await isLoginLocked(pool, 'trava.expirada@inc.pf.gov.br')).toBe(true);

    // Simula a trava já ter expirado (sem esperar 15 minutos de verdade).
    await pool.query('UPDATE login_attempts SET locked_until = now() - interval \'1 minute\' WHERE person_id = $1', [person.id]);
    expect(await isLoginLocked(pool, 'trava.expirada@inc.pf.gov.br')).toBe(false);

    await recordFailedLogin(pool, 'trava.expirada@inc.pf.gov.br');
    const { rows } = await pool.query('SELECT failed_count, locked_until FROM login_attempts WHERE person_id = $1', [person.id]);
    expect(rows[0].failed_count).toBe(1);
    expect(rows[0].locked_until).toBeNull();
  });

  it('hasUnactivatedAdministrator devolve false quando não há ninguém, ou só gente sem o papel, ou já ativado', async () => {
    expect(await hasUnactivatedAdministrator(pool)).toBe(false);

    await createPerson(pool, { name: 'Técnico', role: 'tecnico', institution: 'INC', email: 'tecnico@inc.pf.gov.br', registrationNumber: '900' });
    expect(await hasUnactivatedAdministrator(pool)).toBe(false);

    const admin = await createPerson(pool, { name: 'Admin Antigo', role: 'administrador', institution: 'INC', email: 'admin.antigo@inc.pf.gov.br', registrationNumber: '901' });
    expect(await hasUnactivatedAdministrator(pool)).toBe(true);

    const passwordHash = await hashPassword('senha-ja-ativa-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, admin.id]);
    expect(await hasUnactivatedAdministrator(pool)).toBe(false);
  });

  it('claimAdministratorAccount ativa um Administrador dos dados antigos (papel já cadastrado, sem senha)', async () => {
    const admin = await createPerson(pool, { name: 'Nicole', role: 'administrador', institution: 'INC', email: 'nicole@inc.pf.gov.br', registrationNumber: 'NIC-001' });

    const activated = await claimAdministratorAccount(pool, 'nicole@inc.pf.gov.br', 'senha-ativacao-123');

    expect(activated).toEqual(admin);
    expect(await hasUnactivatedAdministrator(pool)).toBe(false);
    expect(await verifyLogin(pool, 'nicole@inc.pf.gov.br', 'senha-ativacao-123')).toEqual(admin);
  });

  it('claimAdministratorAccount recusa e-mail que não existe', async () => {
    await expect(claimAdministratorAccount(pool, 'nao-existe@inc.pf.gov.br', 'senha-123456')).rejects.toThrow(
      'Não há Administrador pendente de ativação com esse e-mail.'
    );
  });

  it('claimAdministratorAccount recusa quem não é Administrador', async () => {
    await createPerson(pool, { name: 'Técnico Comum', role: 'tecnico', institution: 'INC', email: 'tecnico.comum@inc.pf.gov.br', registrationNumber: '902' });

    await expect(claimAdministratorAccount(pool, 'tecnico.comum@inc.pf.gov.br', 'senha-123456')).rejects.toThrow(
      'Não há Administrador pendente de ativação com esse e-mail.'
    );
  });

  it('claimAdministratorAccount recusa quem já tem senha (já foi ativado antes)', async () => {
    const admin = await createPerson(pool, { name: 'Já Ativou', role: 'administrador', institution: 'INC', email: 'ja.ativou@inc.pf.gov.br', registrationNumber: '903' });
    const passwordHash = await hashPassword('senha-existente-123');
    await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [passwordHash, admin.id]);

    await expect(claimAdministratorAccount(pool, 'ja.ativou@inc.pf.gov.br', 'outra-senha-123')).rejects.toThrow(
      'Não há Administrador pendente de ativação com esse e-mail.'
    );
  });
});
