-- Primeiro passo da captura real de fotos (Fase 1 e 2 — pedido do Tales,
-- out/2026, ver _local-adr-policy-203): até aqui, "registrar foto" gravava
-- sempre a mesma URL fixa de um banco de imagens (placeholder), e o campo
-- sha256_hash era calculado sobre um texto (url|categoria|nic|usuário), não
-- sobre bytes reais.
--
-- Esta migração é só o esqueleto do schema — nenhum código lê ou escreve
-- estas colunas ainda. storage_key é a chave do objeto no Cloudflare R2 (uma
-- rota de upload futura vai gravar aqui); url permanece só para os
-- registros antigos/fictícios que já existem, sem receber mais nada daqui
-- em diante. mimetype/size_bytes/width/height nullable de propósito: só
-- preenchidos por uploads reais, nunca pelos registros fictícios de teste.

ALTER TABLE phase1_photos
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS mimetype TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER;

ALTER TABLE phase2_photos
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS mimetype TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER;
