/**
 * CLI para aplicar migrações pendentes contra DATABASE_URL (ver .env).
 * Uso: npm run db:migrate
 */
import 'dotenv/config';
import { getPool, closePool } from './pool';
import { runMigrations } from './migrate';

async function main() {
  const pool = getPool();
  const applied = await runMigrations(pool);
  if (applied.length === 0) {
    console.log('Nenhuma migração pendente. Schema já está atualizado.');
  } else {
    console.log(`Migrações aplicadas: ${applied.join(', ')}`);
  }
  await closePool();
}

main().catch((err) => {
  console.error('Falha ao migrar:', err);
  process.exit(1);
});
