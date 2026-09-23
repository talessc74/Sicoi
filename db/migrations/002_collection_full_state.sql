-- Guarda o objeto OsteologicalCollection completo (fases 3-7 ainda não têm tabelas
-- normalizadas próprias — fora do escopo deste plano de implementação, que cobre só
-- Fase 1/2). full_state é a fonte de verdade para load/save do app inteiro;
-- phase1_forms/phase2_forms/photos/signatures/custody_chain continuam como o
-- armazenamento granular e auditável das Fases 1-2, derivado do mesmo save.
ALTER TABLE collections ADD COLUMN IF NOT EXISTS full_state JSONB;
