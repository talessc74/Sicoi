/**
 * Pool de conexão Postgres compartilhado pelo servidor e pelos scripts de migração.
 * A URL de conexão nunca tem um default de produção embutido — falha alto se ausente,
 * em vez de silenciosamente conectar em algum banco errado.
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL não configurada. Defina no .env (ver .env.example) apontando para o Postgres local.'
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
