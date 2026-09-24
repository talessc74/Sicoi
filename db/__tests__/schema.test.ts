import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

async function resetSchema() {
  await pool.query(`
    DROP TABLE IF EXISTS pop_step_audit, custody_chain, signatures, phase2_photos, phase1_photos,
      phase2_forms, phase1_forms, collections, schema_migrations CASCADE;
  `);
}

beforeAll(async () => {
  await resetSchema();
});

afterAll(async () => {
  await pool.end();
});

describe('schema de persistência', () => {
  it('aplica as migrações sem erro e é idempotente ao rodar de novo', async () => {
    const first = await runMigrations(pool);
    expect(first).toContain('001_init.sql');

    const second = await runMigrations(pool);
    expect(second).toEqual([]); // nada novo a aplicar
  });

  it('recusa phase1_forms.nic sem collection correspondente (integridade referencial)', async () => {
    await expect(
      pool.query(
        `INSERT INTO phase1_forms (nic, equipe_envolvida_limpeza) VALUES ('NIC-INEXISTENTE', 'Equipe A')`
      )
    ).rejects.toThrow();
  });

  it('permite criar um conjunto e seu formulário A.1, e recupera os campos gravados', async () => {
    await pool.query(
      `INSERT INTO collections (nic, current_phase, created_by_technician) VALUES ($1, 1, $2)`,
      ['NIC-TEST-0001', 'Técnico de Teste']
    );

    await pool.query(
      `INSERT INTO phase1_forms (nic, equipe_envolvida_limpeza, tipo_material, estado_preservacao, field_metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'NIC-TEST-0001',
        'Equipe A',
        ['ossos', 'dentes'],
        ['preservado_integro', 'seco'],
        JSON.stringify({ equipe_envolvida_limpeza: { isAiSuggested: true, transcriptSnippet: 'equipe A e B' } }),
      ]
    );

    const { rows } = await pool.query('SELECT * FROM phase1_forms WHERE nic = $1', ['NIC-TEST-0001']);
    expect(rows).toHaveLength(1);
    expect(rows[0].tipo_material).toEqual(['ossos', 'dentes']);
    expect(rows[0].field_metadata.equipe_envolvida_limpeza.isAiSuggested).toBe(true);
  });

  it('rejeita tipo_limpeza fora do vocabulário controlado', async () => {
    await pool.query(`INSERT INTO collections (nic, created_by_technician) VALUES ($1, $2)`, [
      'NIC-TEST-0002',
      'Técnico',
    ]);
    await expect(
      pool.query(`INSERT INTO phase1_forms (nic, tipo_limpeza) VALUES ($1, 'a_jato_de_areia')`, ['NIC-TEST-0002'])
    ).rejects.toThrow();
  });

  it('mantém assinaturas antigas ao reabrir fase — append-only, nunca apaga', async () => {
    await pool.query(`INSERT INTO collections (nic, created_by_technician) VALUES ($1, $2)`, [
      'NIC-TEST-0003',
      'Técnico',
    ]);
    await pool.query(
      `INSERT INTO signatures (nic, phase_number, signed_by, signed_by_name, signed_by_role, sha256_hash, status)
       VALUES ($1, 1, 'user-1', 'Técnico X', 'tecnico', 'hash-original', 'locked')`,
      ['NIC-TEST-0003']
    );

    // Reabertura: a assinatura antiga é marcada como superseded, nunca deletada
    await pool.query(
      `UPDATE signatures SET status = 'superseded' WHERE nic = $1 AND phase_number = 1 AND status = 'locked'`,
      ['NIC-TEST-0003']
    );
    await pool.query(
      `INSERT INTO signatures (nic, phase_number, signed_by, signed_by_name, signed_by_role, sha256_hash, status, reopen_justification)
       VALUES ($1, 1, 'user-2', 'Curadora Y', 'curador', 'hash-novo', 'locked', 'Correção de NMI após revisão')`,
      ['NIC-TEST-0003']
    );

    const { rows } = await pool.query(
      'SELECT status, sha256_hash FROM signatures WHERE nic = $1 AND phase_number = 1 ORDER BY signed_at',
      ['NIC-TEST-0003']
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe('superseded');
    expect(rows[1].status).toBe('locked');
  });
});
