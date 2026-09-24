-- Cadastro de pessoas (papéis de acesso) — substitui a lista fixa de usuários
-- fictícios (MOCK_USERS) por um registro real e persistido. Sem login/senha
-- ainda (RBAC real continua pendente) — é um cadastro de "quem está operando",
-- usado para assinar fases e identificar responsáveis na cadeia de custódia.

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tecnico', 'curador', 'administrador', 'pesquisador', 'estudante')),
  institution TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
