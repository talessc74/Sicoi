-- Exclusão administrativa reversível (pedido do Tales, set/2026).
--
-- Nada é apagado fisicamente por esta funcionalidade — "excluir" marca a
-- linha como excluída (deleted_at/deleted_by/deleted_reason) e a esconde
-- das listas ativas; "desfazer" limpa essas colunas. Isso não entra em
-- conflito com o histórico protegido (migração 007): os gatilhos ali só
-- bloqueiam DELETE/UPDATE indevido em signatures/custody_chain/change_log,
-- e esta migração nunca toca nessas três tabelas — só UPDATE em
-- `collections`, que nunca teve essa trava.
--
-- admin_actions é a trilha própria disso: por que não junto do change_log?
-- Porque change_log é por NIC (some se o conjunto for excluído/restaurado
-- várias vezes e um dia realmente apagado por fora da aplicação) e este
-- log precisa sobreviver a qualquer exclusão — por isso não referencia
-- collections(nic) com FK.

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

CREATE TABLE IF NOT EXISTS admin_actions (
  id BIGSERIAL PRIMARY KEY,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  kind TEXT NOT NULL CHECK (kind IN (
    'excluir_caixa', 'restaurar_caixa',
    'excluir_conjunto', 'restaurar_conjunto',
    'excluir_tudo', 'restaurar_tudo'
  )),
  nic TEXT,
  box_id TEXT,
  reason TEXT,
  affected_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS admin_actions_performed_at_idx ON admin_actions (performed_at DESC);
