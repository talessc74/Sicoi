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
  admin_access: boolean;
  legal_origin_access: boolean;
  curation_access: boolean;
  phase_signing_access: boolean;
  export_access: boolean;
}

const PERSON_COLUMNS =
  'id, name, role, institution, email, admin_access, legal_origin_access, curation_access, phase_signing_access, export_access';

function toUserProfile(row: PersonRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role as UserProfile['role'],
    institution: row.institution,
    email: row.email,
    adminAccess: row.admin_access === true,
    legalOriginAccess: row.legal_origin_access === true,
    curationAccess: row.curation_access === true,
    phaseSigningAccess: row.phase_signing_access === true,
    exportAccess: row.export_access === true
  };
}

export async function listPeople(pool: Pool): Promise<UserProfile[]> {
  const { rows } = await pool.query<PersonRow>(
    `SELECT ${PERSON_COLUMNS} FROM people ORDER BY created_at ASC`
  );
  return rows.map(toUserProfile);
}

// Usado pelo bootstrap do primeiro Administrador (login real, Fase 3): só é permitido
// criar a primeira pessoa sem sessão quando a tabela está vazia.
export async function countPeople(pool: Pool): Promise<number> {
  const { rows } = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM people');
  return parseInt(rows[0].count, 10);
}

export interface PersonAccessFields {
  adminAccess?: boolean;
  legalOriginAccess?: boolean;
  curationAccess?: boolean;
  phaseSigningAccess?: boolean;
  exportAccess?: boolean;
}

export async function createPerson(
  pool: Pool,
  person: { name: string; role: string; institution: string; email: string } & PersonAccessFields
): Promise<UserProfile> {
  const { rows } = await pool.query<PersonRow>(
    `INSERT INTO people (name, role, institution, email, admin_access, legal_origin_access, curation_access, phase_signing_access, export_access)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${PERSON_COLUMNS}`,
    [
      person.name,
      person.role,
      person.institution,
      person.email,
      person.adminAccess === true,
      person.legalOriginAccess === true,
      person.curationAccess === true,
      person.phaseSigningAccess === true,
      person.exportAccess === true
    ]
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
  person: { name: string; role: string; institution: string; email: string } & PersonAccessFields
): Promise<UserProfile | null> {
  const { rows } = await pool.query<PersonRow>(
    `UPDATE people SET name = $1, role = $2, institution = $3, email = $4, admin_access = $5,
       legal_origin_access = $6, curation_access = $7, phase_signing_access = $8, export_access = $9
     WHERE id = $10
     RETURNING ${PERSON_COLUMNS}`,
    [
      person.name,
      person.role,
      person.institution,
      person.email,
      person.adminAccess === true,
      person.legalOriginAccess === true,
      person.curationAccess === true,
      person.phaseSigningAccess === true,
      person.exportAccess === true,
      id
    ]
  );
  return rows[0] ? toUserProfile(rows[0]) : null;
}

export async function getPerson(pool: Pool, id: string): Promise<UserProfile | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await pool.query<PersonRow>(
    `SELECT ${PERSON_COLUMNS} FROM people WHERE id = $1`,
    [id]
  );
  return rows[0] ? toUserProfile(rows[0]) : null;
}

export async function deletePerson(pool: Pool, id: string): Promise<void> {
  await pool.query('DELETE FROM people WHERE id = $1', [id]);
}
