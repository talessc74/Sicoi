/**
 * Cadastro de pessoas (papéis de acesso). Sem login/senha ainda — é o registro de
 * quem está operando o sistema, usado para assinar fases e identificar
 * responsáveis. Substitui a lista fixa de usuários fictícios (MOCK_USERS).
 */
import type { Pool } from 'pg';
import type { UserProfile } from '../src/types/sgccco';

interface PersonRow {
  id: string;
  name: string;
  role: string;
  institution: string;
  registration_number: string;
}

function toUserProfile(row: PersonRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role as UserProfile['role'],
    institution: row.institution,
    registrationNumber: row.registration_number
  };
}

export async function listPeople(pool: Pool): Promise<UserProfile[]> {
  const { rows } = await pool.query<PersonRow>('SELECT id, name, role, institution, registration_number FROM people ORDER BY created_at ASC');
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
  person: { name: string; role: string; institution: string; registrationNumber: string }
): Promise<UserProfile> {
  const { rows } = await pool.query<PersonRow>(
    `INSERT INTO people (name, role, institution, registration_number) VALUES ($1, $2, $3, $4)
     RETURNING id, name, role, institution, registration_number`,
    [person.name, person.role, person.institution, person.registrationNumber]
  );
  return toUserProfile(rows[0]);
}

export async function getPerson(pool: Pool, id: string): Promise<UserProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await pool.query<PersonRow>(
    'SELECT id, name, role, institution, registration_number FROM people WHERE id = $1',
    [id]
  );
  return rows[0] ? toUserProfile(rows[0]) : null;
}

export async function deletePerson(pool: Pool, id: string): Promise<void> {
  await pool.query('DELETE FROM people WHERE id = $1', [id]);
}
