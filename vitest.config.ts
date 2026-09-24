import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'dist-server'],
    testTimeout: 15000,
    // Os testes de db/ compartilham um único banco Postgres de teste (sgcccco_test).
    // schema.test.ts derruba e recria as tabelas (DROP TABLE CASCADE) para provar que
    // a migração é idempotente — se outro arquivo de teste estiver inserindo dados no
    // mesmo banco em paralelo nesse instante, a corrida derruba dados de baixo dele.
    // Rodar os arquivos de teste em sequência elimina essa corrida sem enfraquecer
    // nenhuma asserção.
    fileParallelism: false,
  },
});
