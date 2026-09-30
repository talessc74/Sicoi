-- A tentativa de ativação anterior aparentemente recebeu um 502 do proxy do
-- Render (instância gratuita acordando devagar), mas o servidor pode ter
-- processado a escrita antes da conexão cair — deixando password_hash
-- preenchido sem que o Administrador tenha visto a confirmação nem saiba
-- qual senha foi salva. Reseta para NULL, permitindo ativar de novo do zero,
-- com uma senha que o próprio Tales vai escolher e confirmar desta vez.

UPDATE people
SET password_hash = NULL
WHERE lower(email) = lower('talessc@me.com') AND role = 'administrador';
