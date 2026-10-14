-- Autorizações de pesquisa (Fase 7, §13 — ABAC). Até aqui viviam só em
-- estado React no navegador (App.tsx, seedadas de MOCK_RESEARCH_AUTHORIZATIONS)
-- e se perdiam a cada recarregamento — a tela de "Gestão ABAC" listava, mas
-- nenhum botão de criar/editar/revogar chegava a gravar nada.
--
-- Mesmo padrão de `collections.full_state`: full_state é a fonte de verdade
-- do objeto ResearchAuthorization inteiro; id/status/principal_investigator
-- ficam também em coluna própria só para filtro e para o enforcement de ABAC
-- no servidor (Fase 7 precisa listar por pesquisador sem carregar tudo).
CREATE TABLE IF NOT EXISTS research_authorizations (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  principal_investigator TEXT NOT NULL,
  institution TEXT NOT NULL,
  full_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
