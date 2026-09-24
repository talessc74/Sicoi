import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { runMigrations } from '../migrate';
import { getGraph, getNodeWithEdges, findPath, searchNodes } from '../graphRepo';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://sgcccco_app:sgcccco_dev_local@localhost:5432/sgcccco_test';

const pool = new Pool({ connectionString: TEST_DATABASE_URL });

beforeAll(async () => {
  await runMigrations(pool);
});

beforeEach(async () => {
  await pool.query(`DELETE FROM graph_edges; DELETE FROM graph_nodes; DELETE FROM collections;`);
  await pool.query(`INSERT INTO collections (nic, created_by_technician) VALUES ('NIC-R-0001', 'Técnico')`);

  // Grafo fixo pequeno: A - B - C (mais um nó D isolado)
  await pool.query(
    `INSERT INTO graph_nodes (id, nic, node_type, label, properties) VALUES
      ('A', 'NIC-R-0001', 'nic', 'Nó A', '{"gender": "feminino"}'),
      ('B', 'NIC-R-0001', 'caixa', 'Nó B (Caixa CX-01)', '{"boxCode": "CX-01"}'),
      ('C', 'NIC-R-0001', 'localizacao', 'Nó C', '{"facility": "Galpão Norte"}'),
      ('D', 'NIC-R-0001', 'exame', 'Nó D isolado', '{}')`
  );
  await pool.query(
    `INSERT INTO graph_edges (id, nic, source_id, target_id, relation, confidence, provenance) VALUES
      ('e-ab', 'NIC-R-0001', 'A', 'B', 'contem_caixa', 'EXTRACTED', '{}'),
      ('e-bc', 'NIC-R-0001', 'B', 'C', 'armazenado_em', 'EXTRACTED', '{}')`
  );
});

afterAll(async () => {
  await pool.end();
});

describe('graphRepo', () => {
  it('getGraph sem NIC devolve todos os nós e arestas', async () => {
    const { nodes, edges } = await getGraph(pool);
    expect(nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(edges).toHaveLength(2);
  });

  it('getGraph com NIC escopa aos nós conectados por arestas daquele conjunto', async () => {
    const { nodes } = await getGraph(pool, 'NIC-R-0001');
    const ids = nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['A', 'B', 'C']); // D é isolado, sem aresta — fora do escopo
  });

  it('getNodeWithEdges (explain) devolve o nó e suas arestas de entrada/saída', async () => {
    const result = await getNodeWithEdges(pool, 'B');
    expect(result?.node.properties.boxCode).toBe('CX-01');
    expect(result?.incoming).toHaveLength(1);
    expect(result?.incoming[0].relation).toBe('contem_caixa');
    expect(result?.outgoing).toHaveLength(1);
    expect(result?.outgoing[0].relation).toBe('armazenado_em');
  });

  it('getNodeWithEdges devolve null para nó inexistente', async () => {
    const result = await getNodeWithEdges(pool, 'NAO-EXISTE');
    expect(result).toBeNull();
  });

  it('findPath acha o caminho mais curto A -> C passando por B', async () => {
    const path = await findPath(pool, 'A', 'C');
    expect(path?.map((s) => s.nodeId)).toEqual(['A', 'B', 'C']);
    expect(path?.[1].viaRelation).toBe('contem_caixa');
    expect(path?.[2].viaRelation).toBe('armazenado_em');
  });

  it('findPath devolve null quando não há caminho', async () => {
    const path = await findPath(pool, 'A', 'D');
    expect(path).toBeNull();
  });

  it('searchNodes acha por label', async () => {
    const nodes = await searchNodes(pool, 'Caixa CX-01');
    expect(nodes.map((n) => n.id)).toContain('B');
  });

  it('searchNodes acha por valor de propriedade', async () => {
    const nodes = await searchNodes(pool, 'Galpão Norte');
    expect(nodes.map((n) => n.id)).toContain('C');
  });
});
