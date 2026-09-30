-- Login real (Fase 1 — pedido do Tales, set/2026, aprovado com a Galera de
-- Segurança). Substitui o modelo anterior, em que "ser alguém" no sistema era
-- só o navegador declarar um UUID (ver _local-adr-policy-201 e a auditoria de
-- segurança que encontrou essa lacuna).
--
-- 1. people.password_hash: nunca a senha em si — sempre um hash bcrypt.
--    Nulo até a pessoa definir a senha pela primeira vez.
-- 2. password_setup_tokens: o Administrador gera um link de "definir senha"
--    por pessoa (token de uso único, com validade), entregue por fora do
--    sistema. Só o hash SHA-256 do token fica gravado — o token em si nunca é
--    persistido, só devolvido uma vez no momento da geração.
-- 3. session: schema do connect-pg-simple (guarda a sessão de quem está
--    logado) — criado aqui, não pela biblioteca, para ficar rastreado como
--    qualquer outra tabela do projeto.
--
-- O identificador único de login é definido só na migration 012 (e-mail);
-- matrícula nunca chegou a ser o identificador em produção de verdade.

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS password_setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS password_setup_tokens_person_idx
  ON password_setup_tokens (person_id);

-- Schema exigido pelo connect-pg-simple (armazenamento de sessão de login).
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE "session" ADD CONSTRAINT session_pkey PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
