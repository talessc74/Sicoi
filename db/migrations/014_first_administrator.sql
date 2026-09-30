-- Cria a conta do primeiro Administrador (pedido do Tales, set/2026), sem
-- apagar as pessoas fictícias de teste já cadastradas — elas continuam
-- existindo até serem limpas com calma, depois, pelo próprio Administrador.
--
-- password_hash fica NULL de propósito: a senha nunca é definida aqui — só
-- pelo próprio Tales, na tela de ativação de Administrador pré-existente
-- (POST /api/auth/claim-admin), que exige o código ADMIN_BOOTSTRAP_SECRET
-- configurado manualmente no ambiente (nunca neste arquivo).
--
-- ON CONFLICT DO NOTHING: protege contra reaplicar isto sobre um e-mail que já
-- exista (ex.: se esta pessoa já tiver sido cadastrada por outro caminho).

INSERT INTO people (name, role, institution, email)
VALUES ('Tales', 'administrador', 'BB', 'talessc@me.com')
ON CONFLICT DO NOTHING;
