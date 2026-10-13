-- Acesso de Administrador somado ao papel principal (pedido da Nicole,
-- out/2026): a mesma pessoa pode ser Curadora da coleção e também
-- Administradora do sistema, com uma conta só (um e-mail, uma senha).
--
-- `role` continua sendo o papel principal — o que aparece nas assinaturas e
-- no histórico. `admin_access` só libera, além dele, as funções de
-- Administrador (cadastro de pessoas, links de acesso, Zona de Risco).
-- Quem já tem role = 'administrador' não precisa desta marca.
--
-- Default false: ninguém ganha acesso novo com esta migração; a marca só é
-- ligada por um Administrador, pela tela de pessoas.

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS admin_access BOOLEAN NOT NULL DEFAULT false;
