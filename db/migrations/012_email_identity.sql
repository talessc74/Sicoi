-- Login por e-mail em vez de matrícula (pedido do Tales, set/2026): as
-- matrículas usadas até aqui eram todas fictícias, só para testar o site.
-- No cadastro real, feito pelo Administrador, nem toda pessoa tem matrícula
-- (pesquisadores externos, por exemplo, não têm) — mas e-mail, todo mundo
-- tem. E-mail passa a ser o identificador único de login; matrícula vira um
-- campo opcional, só informativo, para quem realmente tiver um registro
-- profissional.

ALTER TABLE people
  ALTER COLUMN registration_number DROP NOT NULL;

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Case-insensitive: "Nome@X.com" e "nome@x.com" são a mesma conta. Sem NOT
-- NULL aqui de propósito — a obrigatoriedade é conferida na aplicação
-- (db/peopleRepo.ts, db/authRepo.ts), não travada no schema, para a migração
-- não falhar se algum dado antigo (sempre de teste, nunca produção real)
-- ainda não tiver e-mail preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS people_email_key ON people (lower(email));
