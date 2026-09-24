/**
 * Camada de leitura do Grafo de Conhecimento Forense persistido (graph_nodes/graph_edges).
 * Espelha os verbos de consulta do Graphify (explain / path / query) sobre nossos dados.
 */
import type { Pool } from 'pg';
import type { GraphNode, GraphEdge } from '../src/types/sgccco';

interface NodeRow {
  id: string;
  nic: string | null;
  node_type: string;
  label: string;
  properties: Record<string, any>;
}

interface EdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  relation: string;
  confidence: 'EXTRACTED' | 'INFERRED';
  provenance: GraphEdge['provenance'];
}

function toGraphNode(row: NodeRow): GraphNode {
  return { id: row.id, type: row.node_type as GraphNode['type'], label: row.label, properties: row.properties };
}

function toGraphEdge(row: EdgeRow): GraphEdge {
  return {
    id: row.id,
    source: row.source_id,
    target: row.target_id,
    relation: row.relation as GraphEdge['relation'],
    confidence: row.confidence,
    provenance: row.provenance
  };
}

/** Grafo completo, ou escopado a um NIC (nós do conjunto + nós de vocabulário compartilhado que ele referencia). */
export async function getGraph(pool: Pool, nic?: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  if (!nic) {
    const [{ rows: nodeRows }, { rows: edgeRows }] = await Promise.all([
      pool.query<NodeRow>('SELECT id, nic, node_type, label, properties FROM graph_nodes'),
      pool.query<EdgeRow>('SELECT id, source_id, target_id, relation, confidence, provenance FROM graph_edges')
    ]);
    return { nodes: nodeRows.map(toGraphNode), edges: edgeRows.map(toGraphEdge) };
  }

  const { rows: edgeRows } = await pool.query<EdgeRow>('SELECT id, source_id, target_id, relation, confidence, provenance FROM graph_edges WHERE nic = $1', [nic]);
  const nodeIds = new Set<string>();
  edgeRows.forEach((e) => {
    nodeIds.add(e.source_id);
    nodeIds.add(e.target_id);
  });
  nodeIds.add(nic);

  const { rows: nodeRows } = await pool.query<NodeRow>('SELECT id, nic, node_type, label, properties FROM graph_nodes WHERE id = ANY($1::text[])', [
    Array.from(nodeIds)
  ]);
  return { nodes: nodeRows.map(toGraphNode), edges: edgeRows.map(toGraphEdge) };
}

/** "explain": o nó + todas as arestas de entrada/saída, cada uma com relation e confidence. */
export async function getNodeWithEdges(
  pool: Pool,
  nodeId: string
): Promise<{ node: GraphNode; outgoing: GraphEdge[]; incoming: GraphEdge[] } | null> {
  const { rows: nodeRows } = await pool.query<NodeRow>('SELECT id, nic, node_type, label, properties FROM graph_nodes WHERE id = $1', [nodeId]);
  if (nodeRows.length === 0) return null;

  const { rows: outRows } = await pool.query<EdgeRow>(
    'SELECT id, source_id, target_id, relation, confidence, provenance FROM graph_edges WHERE source_id = $1',
    [nodeId]
  );
  const { rows: inRows } = await pool.query<EdgeRow>(
    'SELECT id, source_id, target_id, relation, confidence, provenance FROM graph_edges WHERE target_id = $1',
    [nodeId]
  );

  return {
    node: toGraphNode(nodeRows[0]),
    outgoing: outRows.map(toGraphEdge),
    incoming: inRows.map(toGraphEdge)
  };
}

/**
 * "path": caminho mais curto entre dois nós, via BFS não-direcionado sobre graph_edges
 * carregado em memória — a escala do acervo não justifica uma CTE recursiva.
 */
export async function findPath(pool: Pool, fromId: string, toId: string): Promise<{ nodeId: string; viaRelation: string | null }[] | null> {
  if (fromId === toId) return [{ nodeId: fromId, viaRelation: null }];

  const { rows: edgeRows } = await pool.query<EdgeRow>('SELECT id, source_id, target_id, relation, confidence, provenance FROM graph_edges');
  const adjacency = new Map<string, { neighbor: string; relation: string }[]>();
  const addEdge = (a: string, b: string, relation: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push({ neighbor: b, relation });
  };
  edgeRows.forEach((e) => {
    addEdge(e.source_id, e.target_id, e.relation);
    addEdge(e.target_id, e.source_id, e.relation);
  });

  const visited = new Set<string>([fromId]);
  const queue: string[] = [fromId];
  const cameFrom = new Map<string, { from: string; relation: string }>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const { neighbor, relation } of adjacency.get(current) || []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      cameFrom.set(neighbor, { from: current, relation });
      queue.push(neighbor);
    }
  }

  if (!visited.has(toId)) return null;

  // Reconstrói a cadeia de nodeIds do destino até a origem, depois inverte.
  const nodeIds: string[] = [toId];
  let cursor = toId;
  while (cursor !== fromId) {
    cursor = cameFrom.get(cursor)!.from;
    nodeIds.push(cursor);
  }
  nodeIds.reverse();

  // viaRelation em cada passo descreve o elo usado para CHEGAR a esse nó (null na origem).
  return nodeIds.map((nodeId, idx) => ({
    nodeId,
    viaRelation: idx === 0 ? null : cameFrom.get(nodeIds[idx])!.relation
  }));
}

/** "query": nós cujo label ou qualquer valor em properties bate com o texto — busca simples, não NLU. */
export async function searchNodes(pool: Pool, query: string): Promise<GraphNode[]> {
  const { rows } = await pool.query<NodeRow>(
    `SELECT id, nic, node_type, label, properties FROM graph_nodes
     WHERE label ILIKE $1 OR properties::text ILIKE $1
     ORDER BY label
     LIMIT 100`,
    [`%${query}%`]
  );
  return rows.map(toGraphNode);
}
