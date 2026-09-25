-- Histórico protegido (pedido da curadoria, set/2026).
--
-- 1. signatures: guarda a cópia exata do conteúdo assinado e quem/quando reabriu;
--    deixa de ser apagada e regravada a cada salvamento.
-- 2. change_log: registro de cada alteração (campo, valor anterior, valor novo,
--    quem, quando), com hash encadeado por conjunto.
-- 3. Gatilhos no banco: signatures, custody_chain e change_log não aceitam
--    DELETE nem UPDATE fora das transições previstas. A única exceção é a
--    limpeza total do ambiente (wipeAllCollections), que liga
--    `sigcoi.allow_wipe` só dentro da própria transação.

ALTER TABLE signatures
  ADD COLUMN IF NOT EXISTS data_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS reopened_by TEXT,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;

-- Antes a tabela era regravada a cada salvamento; remove eventuais duplicatas
-- antes de exigir unicidade.
DELETE FROM signatures a
  USING signatures b
  WHERE a.ctid > b.ctid
    AND a.nic = b.nic
    AND a.phase_number = b.phase_number
    AND a.signed_at = b.signed_at
    AND a.sha256_hash = b.sha256_hash;

CREATE UNIQUE INDEX IF NOT EXISTS signatures_identity_idx
  ON signatures (nic, phase_number, signed_at, sha256_hash);

CREATE TABLE IF NOT EXISTS change_log (
  id BIGSERIAL PRIMARY KEY,
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('criacao', 'campo', 'assinatura', 'reabertura', 'custodia')),
  phase_number SMALLINT,
  path TEXT,
  old_value JSONB,
  new_value JSONB,
  note TEXT,
  prev_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS change_log_nic_idx ON change_log (nic, id);

CREATE OR REPLACE FUNCTION sigcoi_wipe_allowed() RETURNS boolean AS $$
  SELECT coalesce(current_setting('sigcoi.allow_wipe', true), '') = 'on'
$$ LANGUAGE sql STABLE;

-- change_log e custody_chain: só inserção.
CREATE OR REPLACE FUNCTION sigcoi_append_only() RETURNS trigger AS $$
BEGIN
  IF sigcoi_wipe_allowed() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Histórico protegido: a tabela % não aceita %.', TG_TABLE_NAME, TG_OP;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS change_log_append_only ON change_log;
CREATE TRIGGER change_log_append_only BEFORE UPDATE OR DELETE ON change_log
  FOR EACH ROW EXECUTE FUNCTION sigcoi_append_only();

DROP TRIGGER IF EXISTS custody_chain_append_only ON custody_chain;
CREATE TRIGGER custody_chain_append_only BEFORE UPDATE OR DELETE ON custody_chain
  FOR EACH ROW EXECUTE FUNCTION sigcoi_append_only();

-- signatures: não se apaga; a única mudança aceita é assinada → substituída,
-- com o registro da reabertura (que, uma vez gravado, não muda mais).
CREATE OR REPLACE FUNCTION sigcoi_protect_signatures() RETURNS trigger AS $$
BEGIN
  IF sigcoi_wipe_allowed() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Histórico protegido: assinaturas não podem ser apagadas.';
  END IF;
  IF NEW.nic IS DISTINCT FROM OLD.nic
     OR NEW.phase_number IS DISTINCT FROM OLD.phase_number
     OR NEW.signed_by IS DISTINCT FROM OLD.signed_by
     OR NEW.signed_by_name IS DISTINCT FROM OLD.signed_by_name
     OR NEW.signed_by_role IS DISTINCT FROM OLD.signed_by_role
     OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
     OR NEW.sha256_hash IS DISTINCT FROM OLD.sha256_hash
     OR (OLD.data_snapshot IS NOT NULL AND NEW.data_snapshot IS DISTINCT FROM OLD.data_snapshot) THEN
    RAISE EXCEPTION 'Histórico protegido: dados de uma assinatura não podem ser alterados.';
  END IF;
  IF OLD.status = 'superseded' AND NEW.status = 'locked' THEN
    RAISE EXCEPTION 'Histórico protegido: uma assinatura substituída não volta a valer.';
  END IF;
  IF (OLD.reopen_justification IS NOT NULL AND NEW.reopen_justification IS DISTINCT FROM OLD.reopen_justification)
     OR (OLD.reopened_by IS NOT NULL AND NEW.reopened_by IS DISTINCT FROM OLD.reopened_by)
     OR (OLD.reopened_at IS NOT NULL AND NEW.reopened_at IS DISTINCT FROM OLD.reopened_at) THEN
    RAISE EXCEPTION 'Histórico protegido: o registro da reabertura não pode ser alterado.';
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signatures_protected ON signatures;
CREATE TRIGGER signatures_protected BEFORE UPDATE OR DELETE ON signatures
  FOR EACH ROW EXECUTE FUNCTION sigcoi_protect_signatures();
