-- Grafo de Conhecimento Forense persistido — tabelas próprias, sincronizadas a cada
-- gravação de conjunto (ver db/graphSync.ts). Substitui o cálculo client-side efêmero
-- que existia antes em src/services/graphEngine.ts.
--
-- `properties` carrega TODAS as chaves do registro de origem (ex.: todo campo do
-- Formulário A.1/A.2), não uma lista escolhida a dedo — assim, um campo novo que passe
-- a existir em qualquer fase aparece automaticamente no grafo na próxima gravação, sem
-- precisar de mudança de código aqui.

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  nic TEXT REFERENCES collections(nic) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  label TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_nic ON graph_nodes (nic);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes (node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_properties ON graph_nodes USING GIN (properties);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  nic TEXT REFERENCES collections(nic) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  -- Mesma semântica EXTRACTED/INFERRED do Graphify: EXTRACTED = relação direta e
  -- explícita no nosso banco; INFERRED = deduzida por uma análise posterior (fora
  -- do escopo desta primeira entrega — todas as arestas de hoje são EXTRACTED).
  confidence TEXT NOT NULL DEFAULT 'EXTRACTED' CHECK (confidence IN ('EXTRACTED', 'INFERRED')),
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_nic ON graph_edges (nic);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges (source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges (target_id);
