-- A migração 014 usou ON CONFLICT DO NOTHING: se já existisse alguém com
-- este e-mail (de um teste anterior, com outro papel ou já com senha), ela
-- não fazia nada — deixando a ativação de Administrador (claim-admin) sem
-- ninguém pra ativar, porque a condição exige role = 'administrador' E
-- password_hash IS NULL.
--
-- Esta migração força essa garantia: cria a pessoa se não existir, ou, se já
-- existir com este e-mail, garante papel administrador e zera a senha (para
-- que a ativação funcione do zero, com a senha que o próprio Tales vai
-- escolher na tela de ativação — nunca aqui).

INSERT INTO people (name, role, institution, email)
VALUES ('Tales', 'administrador', 'BB', 'talessc@me.com')
ON CONFLICT (lower(email)) DO UPDATE
SET role = 'administrador', password_hash = NULL;
