-- Fotografia oficial de Montagem Completa (Fase 4, §11/§15) — até aqui,
-- "Aprovar Fotografia Oficial" gravava sempre a mesma URL fixa de um banco de
-- imagens de terceiros, nunca pedindo (nem guardando) uma foto real
-- (_local-adr-policy-301, mesmo problema já corrigido na Fase 1/2). Esta
-- tabela guarda os bytes reais, no mesmo padrão de phase1_photos/
-- phase2_photos (migrações 001, 018, 019).

CREATE TABLE IF NOT EXISTS phase4_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  sha256_hash TEXT NOT NULL,
  author TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mimetype TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  data BYTEA
);
