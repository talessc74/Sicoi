-- Remove a matrícula/registro profissional (pedido do Tales, set/2026): depois
-- de trocar o identificador de login para e-mail (migrations/012), o campo
-- matrícula ficou só informativo, opcional — e a decisão agora é que ele
-- nunca vai ser usado de verdade. Em vez de manter uma coluna morta no
-- schema, remove ela e o índice único que a acompanhava.

DROP INDEX IF EXISTS people_registration_number_key;

ALTER TABLE people
  DROP COLUMN IF EXISTS registration_number;
