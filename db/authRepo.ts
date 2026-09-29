/**
 * Login real — Fase 1 (§ Segurança, pedido do Tales, set/2026).
 *
 * Substitui o modelo em que "ser alguém" no sistema era só o navegador
 * declarar um UUID (a lacuna que a auditoria de segurança encontrou:
 * qualquer pessoa com acesso à API podia se passar por Administrador
 * sabendo o UUID de alguém que fosse). A partir de agora, a identidade de
 * quem está agindo vem da sessão autenticada no servidor — nunca de um
 * campo que o cliente manda.
 *
 * Identificador de login é o e-mail (não a matrícula): nem toda pessoa tem
 * matrícula — pesquisadores externos, por exemplo, não têm — mas e-mail,
 * todo mundo tem. Comparação sempre case-insensitive (`lower(email)`).
 *
 * Duas regras de segurança seguidas à risca aqui:
 * - Senha nunca é gravada em texto puro — só o hash bcrypt.
 * - Token de "definir senha" nunca é gravado em texto puro — só o hash
 *   SHA-256 dele (determinístico, para permitir a busca por igualdade; o
 *   token em si tem entropia alta o bastante para isso ser seguro, ao
 *   contrário de uma senha escolhida por humano).
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import type { UserProfile } from '../src/types/sgccco';

const BCRYPT_COST = 12;
const DEFAULT_TOKEN_TTL_HOURS = 72;
// Chave arbitrária (só precisa ser estável e exclusiva deste uso) para a trava
// consultiva do bootstrap do primeiro Administrador.
const BOOTSTRAP_ADVISORY_LOCK_KEY = 8825001;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

interface PersonAuthRow {
  id: string;
  name: string;
  role: string;
  institution: string;
  email: string;
  registration_number: string | null;
  password_hash: string | null;
}

function toUserProfile(row: PersonAuthRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role as UserProfile['role'],
    institution: row.institution,
    email: row.email,
    registrationNumber: row.registration_number ?? undefined
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf-8').digest('hex');
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

/**
 * Confere e-mail + senha. Devolve o perfil em caso de sucesso, `null` em
 * qualquer caso de falha (e-mail inexistente, sem senha definida ainda, ou
 * senha errada) — deliberadamente sem distinguir esses casos na resposta,
 * para não revelar a quem está tentando logar se o e-mail existe.
 */
export async function verifyLogin(pool: Pool, email: string, plainPassword: string): Promise<UserProfile | null> {
  const { rows } = await pool.query<PersonAuthRow>(
    'SELECT id, name, role, institution, email, registration_number, password_hash FROM people WHERE lower(email) = lower($1)',
    [email]
  );
  const row = rows[0];
  if (!row || !row.password_hash) return null;
  const matches = await bcrypt.compare(plainPassword, row.password_hash);
  return matches ? toUserProfile(row) : null;
}

/**
 * Freio de força bruta no login, persistente em Postgres (substitui o Map em
 * memória da Fase 1 — sobrevivia só até o próximo reinício e crescia sem
 * limite com e-mails inventados). Só grava linha para e-mail que corresponde
 * a uma pessoa real: sem conta, não há o que travar, e o tamanho da tabela
 * fica limitado ao número de pessoas cadastradas, nunca ao número de
 * tentativas de um atacante.
 */
export async function isLoginLocked(pool: Pool, email: string): Promise<boolean> {
  const { rows } = await pool.query<{ locked_until: string | null }>(
    `SELECT la.locked_until FROM login_attempts la
     JOIN people p ON p.id = la.person_id
     WHERE lower(p.email) = lower($1)`,
    [email]
  );
  const lockedUntil = rows[0]?.locked_until;
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

export async function recordFailedLogin(pool: Pool, email: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: peopleRows } = await client.query<{ id: string }>(
      'SELECT id FROM people WHERE lower(email) = lower($1)',
      [email]
    );
    const person = peopleRows[0];
    if (!person) {
      await client.query('ROLLBACK');
      return;
    }
    const { rows } = await client.query<{ failed_count: number; locked_until: string | null }>(
      'SELECT failed_count, locked_until FROM login_attempts WHERE person_id = $1 FOR UPDATE',
      [person.id]
    );
    const current = rows[0];
    // Uma trava expirada conta como zerada — a próxima tentativa falha começa a
    // contagem de novo, em vez de continuar de onde travou.
    const lockExpired = Boolean(current?.locked_until && new Date(current.locked_until).getTime() <= Date.now());
    const previousCount = lockExpired ? 0 : (current?.failed_count || 0);
    const nextCount = previousCount + 1;
    const shouldLock = nextCount >= LOGIN_MAX_ATTEMPTS;
    await client.query(
      `INSERT INTO login_attempts (person_id, failed_count, locked_until, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (person_id) DO UPDATE SET failed_count = $2, locked_until = $3, updated_at = now()`,
      [person.id, shouldLock ? 0 : nextCount, shouldLock ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000) : null]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function clearLoginAttempts(pool: Pool, email: string): Promise<void> {
  await pool.query(
    'DELETE FROM login_attempts WHERE person_id = (SELECT id FROM people WHERE lower(email) = lower($1))',
    [email]
  );
}

export async function getPersonWithAuthStatus(pool: Pool, id: string): Promise<(UserProfile & { hasPassword: boolean }) | null> {
  const { rows } = await pool.query<PersonAuthRow>(
    'SELECT id, name, role, institution, email, registration_number, password_hash FROM people WHERE id = $1',
    [id]
  );
  if (!rows[0]) return null;
  return { ...toUserProfile(rows[0]), hasPassword: rows[0].password_hash !== null };
}

/**
 * Migração do modelo antigo para o login real (complemento à Fase 3 —
 * _local-adr-policy-202): quando o sistema já tem gente cadastrada de antes
 * (produção real), o bootstrap de banco vazio (`createFirstAdmin`) não se
 * aplica — o banco não está vazio. `needsAdminClaim` (server.ts) usa isto
 * para saber se ainda existe algum Administrador dos dados antigos que
 * nunca ativou o próprio acesso.
 */
export async function hasUnactivatedAdministrator(pool: Pool): Promise<boolean> {
  const { rows } = await pool.query(
    "SELECT 1 FROM people WHERE role = 'administrador' AND password_hash IS NULL LIMIT 1"
  );
  return rows.length > 0;
}

/**
 * Ativa o acesso de uma pessoa que já era Administrador antes do login real
 * existir (papel já cadastrado, sem senha ainda) — nunca cria pessoa nova,
 * só destrava uma já existente. A prova de quem pode fazer isto não é esta
 * função: é a rota em server.ts conferir o código de ativação
 * (ADMIN_BOOTSTRAP_SECRET) antes de chamar isto. Mensagem de erro
 * deliberadamente genérica — não distingue "e-mail não existe" de "existe
 * mas não é Administrador" de "já tem senha", mesmo cuidado de `verifyLogin`.
 */
export async function claimAdministratorAccount(pool: Pool, email: string, newPassword: string): Promise<UserProfile> {
  const { rows } = await pool.query<PersonAuthRow>(
    'SELECT id, name, role, institution, email, registration_number, password_hash FROM people WHERE lower(email) = lower($1)',
    [email]
  );
  const row = rows[0];
  if (!row || row.role !== 'administrador' || row.password_hash !== null) {
    throw new Error('Não há Administrador pendente de ativação com esse e-mail.');
  }
  const passwordHash = await hashPassword(newPassword);
  const { rows: updated } = await pool.query<PersonAuthRow>(
    `UPDATE people SET password_hash = $1 WHERE id = $2
     RETURNING id, name, role, institution, email, registration_number, password_hash`,
    [passwordHash, row.id]
  );
  return toUserProfile(updated[0]);
}

/**
 * Troca a própria senha de quem já está logado — exige a senha atual (não
 * basta a sessão) exatamente para o caso em que alguém deixou a sessão aberta
 * num computador compartilhado: sem saber a senha atual, não muda nada.
 */
export async function changeOwnPassword(pool: Pool, personId: string, currentPassword: string, newPassword: string): Promise<void> {
  const { rows } = await pool.query<PersonAuthRow>(
    'SELECT id, name, role, institution, email, registration_number, password_hash FROM people WHERE id = $1',
    [personId]
  );
  const row = rows[0];
  if (!row || !row.password_hash) {
    throw new Error('Pessoa não encontrada.');
  }
  const matches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!matches) {
    throw new Error('Senha atual incorreta.');
  }
  const newHash = await hashPassword(newPassword);
  await pool.query('UPDATE people SET password_hash = $1 WHERE id = $2', [newHash, personId]);
}

/**
 * Gera um link de "definir senha" para uma pessoa — só o Administrador que
 * chama isto (conferido pela rota, não aqui). Devolve o token em texto puro
 * UMA VEZ; a partir daqui, só o hash dele existe no banco. Entregar esse
 * token por fora do sistema (WhatsApp, e-mail) é responsabilidade de quem
 * gera o link.
 */
export async function createPasswordSetupToken(
  pool: Pool,
  personId: string,
  createdBy: string | null,
  ttlHours: number = DEFAULT_TOKEN_TTL_HOURS
): Promise<{ token: string; expiresAt: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO password_setup_tokens (person_id, token_hash, created_by, expires_at) VALUES ($1, $2, $3, $4)',
    [personId, tokenHash, createdBy, expiresAt]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Bootstrap do primeiro Administrador (login real, Fase 3): a única forma de criar
 * uma pessoa sem sessão — e só funciona uma vez, enquanto a tabela `people` estiver
 * vazia. A partir daí, toda pessoa nova é cadastrada por um Administrador já
 * autenticado (POST /api/people) e recebe a senha pelo fluxo normal de token.
 */
export async function createFirstAdmin(
  pool: Pool,
  person: { name: string; institution: string; email: string; registrationNumber?: string; password: string }
): Promise<UserProfile> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Trava consultiva (não há linha nenhuma para travar numa tabela vazia): garante
    // que duas requisições de bootstrap simultâneas não criem dois primeiros admins.
    await client.query('SELECT pg_advisory_xact_lock($1)', [BOOTSTRAP_ADVISORY_LOCK_KEY]);
    const { rows: existing } = await client.query('SELECT 1 FROM people LIMIT 1');
    if (existing.length > 0) {
      throw new Error('Já existe gente cadastrada — o bootstrap só funciona com o sistema vazio.');
    }
    const passwordHash = await hashPassword(person.password);
    const { rows } = await client.query<PersonAuthRow>(
      `INSERT INTO people (name, role, institution, email, registration_number, password_hash)
       VALUES ($1, 'administrador', $2, $3, $4, $5)
       RETURNING id, name, role, institution, email, registration_number, password_hash`,
      [person.name, person.institution, person.email, person.registrationNumber || null, passwordHash]
    );
    await client.query('COMMIT');
    return toUserProfile(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * "Esqueci a senha" (complemento à Fase 3): sem e-mail/SMS configurado, o
 * pedido não se resolve solitário — só fica visível para o Administrador
 * resolver gerando o link de acesso normal. Devolve sempre (sem lançar erro)
 * mesmo se o e-mail não existir, para não revelar quais e-mails estão
 * cadastrados — mesmo cuidado de `verifyLogin`.
 */
export async function requestPasswordReset(pool: Pool, email: string): Promise<void> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM people WHERE lower(email) = lower($1)', [email]);
  const person = rows[0];
  if (!person) return;
  const { rows: pending } = await pool.query(
    'SELECT id FROM password_reset_requests WHERE person_id = $1 AND resolved_at IS NULL',
    [person.id]
  );
  if (pending.length > 0) return; // já existe um pedido em aberto — não duplica
  await pool.query('INSERT INTO password_reset_requests (person_id) VALUES ($1)', [person.id]);
}

export interface PendingPasswordResetRequest {
  id: string;
  personId: string;
  personName: string;
  email: string;
  requestedAt: string;
}

// Só para o painel do Administrador (Configurações) — a rota reconfere a sessão.
export async function listPendingPasswordResetRequests(pool: Pool): Promise<PendingPasswordResetRequest[]> {
  const { rows } = await pool.query<{
    id: string;
    person_id: string;
    person_name: string;
    email: string;
    requested_at: string;
  }>(
    `SELECT r.id, r.person_id, p.name AS person_name, p.email, r.requested_at
     FROM password_reset_requests r
     JOIN people p ON p.id = r.person_id
     WHERE r.resolved_at IS NULL
     ORDER BY r.requested_at ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    personId: r.person_id,
    personName: r.person_name,
    email: r.email,
    requestedAt: r.requested_at
  }));
}

// Chamado depois de gerar um novo link de acesso para a pessoa — o pedido que
// motivou o link deixa de aparecer como pendente no painel do Administrador.
export async function resolvePendingPasswordResetRequests(pool: Pool, personId: string, resolvedBy: string | null): Promise<void> {
  await pool.query(
    'UPDATE password_reset_requests SET resolved_at = now(), resolved_by = $2 WHERE person_id = $1 AND resolved_at IS NULL',
    [personId, resolvedBy]
  );
}

/**
 * Consome um token de "definir senha": grava a nova senha (com hash) e marca
 * o token como usado, numa única transação — um token só funciona uma vez.
 */
export async function consumePasswordSetupToken(pool: Pool, token: string, newPassword: string): Promise<UserProfile> {
  const tokenHash = sha256Hex(token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string; person_id: string }>(
      `SELECT id, person_id FROM password_setup_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [tokenHash]
    );
    if (!rows[0]) {
      throw new Error('Link inválido, expirado ou já utilizado.');
    }
    const passwordHash = await hashPassword(newPassword);
    const updated = await client.query<PersonAuthRow>(
      `UPDATE people SET password_hash = $1 WHERE id = $2
       RETURNING id, name, role, institution, email, registration_number, password_hash`,
      [passwordHash, rows[0].person_id]
    );
    await client.query('UPDATE password_setup_tokens SET used_at = now() WHERE id = $1', [rows[0].id]);
    await client.query('COMMIT');
    return toUserProfile(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
