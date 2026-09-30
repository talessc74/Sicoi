-- A migração 013 removeu registration_number de vez — mas ela já tinha
-- rodado com sucesso em produção antes de decidirmos reverter o código pra
-- versão anterior ao login real (que ainda lê/escreve essa coluna em toda
-- consulta de pessoas). Sem ela de volta, o código revertido quebra em
-- qualquer ação que toque na tabela people.
--
-- Nullable, sem tentar recuperar o dado antigo (esse dado já foi perdido
-- quando a 013 rodou) — só existe pra não travar o código revertido.

ALTER TABLE people ADD COLUMN IF NOT EXISTS registration_number TEXT;
