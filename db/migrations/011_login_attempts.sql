-- Freio de força bruta no login, persistente (login real, complemento à Fase 3
-- — _local-adr-policy-202). Substitui o Map em memória, que resetava a cada
-- reinício do servidor e crescia sem limite se alguém tentasse muitas
-- matrículas inventadas.
--
-- Só existe uma linha por PESSOA REAL (person_id, com FK para people) — nunca
-- por matrícula digitada. Uma matrícula que não corresponde a ninguém nunca
-- grava linha aqui (não há conta real para travar), o que também limita o
-- tamanho da tabela ao número de pessoas cadastradas, não ao número de
-- tentativas de um atacante.

CREATE TABLE IF NOT EXISTS login_attempts (
  person_id UUID PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  failed_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
