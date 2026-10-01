/**
 * Cadastro de pessoas (papéis de acesso), feito pelo Administrador. Identidade
 * por e-mail (login real) — único campo que identifica a pessoa.
 */
import type { Pool } from 'pg';
import type { UserProfile } from '../src/types/sgccco';

interface PersonRow {
  id: string;
  name: string;
  role: string;
  institution: string;
  email: string;
}

function toUserProfile(row: PersonRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role as UserProfile['role'],
    institution: row.institution,
    email: row.email
  };
}

export async function listPeople(pool: Pool): Promise<UserProfile[]> {
  const { rows } = await pool.query<PersonRow>(
    'SELECT id, name, role, institution, email FROM people ORDER BY created_at ASC'
  );
  return rows.map(toUserProfile);
}

// Usado pelo bootstrap do primeiro Administrador (login real, Fase 3): só é permitido
// criar a primeira pessoa sem sessão quando a tabela está vazia.
export async function countPeople(pool: Pool): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM people');
  return parseInt(rows[0].count, 10);
}

export async function createPerson(
  pool: Pool,
  person: { name: string; role: string; institution: string; email: string }
): Promise<UserProfile> {
  const { rows } = await pool.query<PersonRow>(
    `INSERT INTO people (name, role, institution, email) VALUES ($1, $2, $3, $4)
     RETURNING id, name, role, institution, email`,
    [person.name, person.role, person.institution, person.email]
  );
  return toUserProfile(rows[0]);
}

// Edita uma pessoa já cadastrada — em especial, preencher o e-mail de quem
// ainda é só um registro antigo (de antes do login real, sem e-mail nenhum),
// transformando-a numa conta real sem precisar recriar do zero e perder o
// histórico (assinaturas, auditoria) ligado ao id dela.
export async function updatePerson(
  pool: Pool,
  id: string,
  person: { name: string; role: string; institution: string; email: string }
): Promise<UserProfile | null> {
  const { rows } = await pool.query<PersonRow>(
    `UPDATE people SET name = $1, role = $2, institution = $3, email = $4 WHERE id = $5
     RETURNING id, name, role, institution, email`,
    [person.name, person.role, person.institution, person.email, id]
  );
  return rows[0] ? toUserProfile(rows[0]) : null;
}

export async function getPerson(pool: Pool, id: string): Promise<UserProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await pool.query<PersonRow>(
    'SELECT id, name, role, institution, email FROM people WHERE id = $1',
    [id]
  );
  return rows[0] ? toUserProfile(rows[0]) : null;
}

export async function deletePerson(pool: Pool, id: string): Promise<void> {
  await pool.query('DELETE FROM people WHERE id = $1', [id]);
}
