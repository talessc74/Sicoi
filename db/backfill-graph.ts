/**
 * Popula graph_nodes/graph_edges para conjuntos já existentes no banco (criados antes
 * do grafo persistido existir). Idempotente — rodar de novo apenas resincroniza.
 * Uso: npm run db:backfill-graph
 */
import 'dotenv/config';
import { getPool, closePool } from './pool';
import { listCollections } from './collectionsRepo';
import { syncGraphForCollection } from './graphSync';

async function main() {
  const pool = getPool();
  const collections = await listCollections(pool);
  console.log(`Sincronizando o grafo de ${collections.length} conjunto(s)...`);

  for (const collection of collections) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await syncGraphForCollection(client, collection);
      await client.query('COMMIT');
      console.log(`  OK  ${collection.nic}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FALHOU  ${collection.nic}:`, (err as Error).message);
    } finally {
      client.release();
    }
  }

  await closePool();
  console.log('Backfill do grafo concluído.');
}

main().catch((err) => {
  console.error('Falha no backfill do grafo:', err);
  process.exit(1);
});
