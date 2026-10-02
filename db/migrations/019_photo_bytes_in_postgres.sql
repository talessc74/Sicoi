-- Correção de rumo da 018 (mesma semana — nenhum código ainda lia/escrevia
-- aquelas colunas, então é seguro ajustar): a ideia original era guardar o
-- arquivo da foto no Cloudflare R2, mas o Tales levantou uma preocupação
-- válida de governança — ele é contribuinte do projeto, não o dono
-- institucional, e não queria que a infraestrutura de armazenamento ficasse
-- atrelada à conta pessoal dele no Cloudflare (mesma lógica de por que o
-- GitHub e o Render já são de quem é dona do projeto de fato).
--
-- Solução mais simples: guardar o arquivo direto no Postgres que já está
-- configurado desde o início do projeto — nenhuma conta nova, nenhuma
-- decisão de propriedade a resolver. Viável no volume estimado (~500
-- conjuntos × poucas fotos cada); se um dia crescer muito, migra-se para
-- armazenamento externo depois, sem perder nada (storage_key nunca chegou a
-- ser usado por código nenhum — seguro remover).

ALTER TABLE phase1_photos
  DROP COLUMN IF EXISTS storage_key,
  ADD COLUMN IF NOT EXISTS data BYTEA;

ALTER TABLE phase2_photos
  DROP COLUMN IF EXISTS storage_key,
  ADD COLUMN IF NOT EXISTS data BYTEA;
