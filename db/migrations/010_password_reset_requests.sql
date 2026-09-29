-- Tela "Esqueci a senha" (login real, complemento à Fase 3 — _local-adr-policy-202).
--
-- Sem e-mail/SMS configurado no sistema, o pedido não pode ser resolvido
-- automaticamente: a pessoa avisa que perdeu o acesso, o pedido fica visível
-- para o Administrador em Configurações, e ele resolve gerando o link de
-- acesso normal (POST /api/auth/setup-links) — que passa a marcar o pedido
-- como resolvido.

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS password_reset_requests_person_idx
  ON password_reset_requests (person_id);

-- Consulta mais comum: pedidos pendentes, mais antigos primeiro.
CREATE INDEX IF NOT EXISTS password_reset_requests_pending_idx
  ON password_reset_requests (requested_at)
  WHERE resolved_at IS NULL;
