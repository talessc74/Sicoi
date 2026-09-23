/**
 * Runner de migração manual e versionado.
 * Aplica, em ordem de nome de arquivo, cada .sql em db/migrations/ ainda não registrado
 * na tabela schema_migrations. Idempotente: rodar de novo não reaplica o que já subiu.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(pool: Pool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      newlyApplied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Falha ao aplicar migração ${file}: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}
