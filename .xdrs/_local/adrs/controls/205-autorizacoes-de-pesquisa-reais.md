---
name: _local-adr-policy-205-autorizacoes-de-pesquisa-reais
description: Autorizações de pesquisa (Fase 7, §13) persistem de verdade em Postgres — escopo por NIC/variáveis/validade, aprovação de CEP, revogação nunca é delete. Substitui o estado só em memória (MOCK_RESEARCH_AUTHORIZATIONS) que se perdia a cada recarregamento. Use antes de alterar o modelo de autorização de pesquisa ou de confundi-lo com exportAccess (§13, ABAC).
apply-to: db/authorizationsRepo.ts, db/migrations/024_research_authorizations.sql, server.ts (rotas /api/research-authorizations), src/services/authorizationsService.ts, src/components/Phase7ConsultaPesquisa.tsx, src/App.tsx
valid-from: 2026-10-14
---

# _local-adr-policy-205: Autorizações de pesquisa reais (Fase 7, §13)

## Context and Problem Statement

A aba "Gestão ABAC de Autorizações" em `Phase7ConsultaPesquisa.tsx` já
existia, mas só listava `MOCK_RESEARCH_AUTHORIZATIONS` — nenhum botão de
criar, editar ou revogar chegava a gravar nada; tudo se perdia a cada
recarregamento da página. Autorização de pesquisa real precisa de
escopo (quais conjuntos, quais variáveis), validade, aprovação de
comitê de ética (CEP), e um jeito de revogar sem apagar o histórico de
quem já teve acesso.

## Decision Outcome

**Autorizações passam a ser registros reais em Postgres**, com escopo
granular por projeto — não um booleano único como o `exportAccess` do
ABAC por pessoa (`_local-adr-policy-204`), que decide só "esta pessoa
pode exportar dado científico, sim ou não". Aqui a pergunta é "este
projeto de pesquisa específico, com este CEP e esta validade, pode
acessar estes conjuntos" — uma camada complementar, não redundante.

### Details

- `db/authorizationsRepo.ts`: CRUD completo (id, título, pesquisador
  principal, e-mail, instituição, número de aprovação do CEP, status,
  validade de/até, escopo — NICs permitidos, variáveis permitidas,
  formatos de exportação permitidos) + `validateAuthorizationBody` +
  `visibleAuthorizationsFor`, que restringe o Pesquisador a ver só a
  própria autorização (por e-mail) — nunca a lista inteira de outros
  projetos.
- **Migração** `db/migrations/024_research_authorizations.sql` —
  renumerada de `020` para `024` no momento de integrar com a `main`:
  os números `020`-`023` já estavam ocupados por outras decisões
  (acesso de Administrador, fotos Fase 1/Fase 4, ABAC por pessoa)
  aplicadas depois que este número foi escolhido originalmente.
- **Rotas**: `GET /api/research-authorizations` (`requireAuth` — o
  Pesquisador precisa ver as próprias autorizações pra filtrar a
  consulta), `POST`/`PUT` (`requireAdminSession` — o servidor reconfere).
  `PUT` também é o caminho de revogação: `status: 'revogada'`, **nunca**
  um DELETE — mesmo espírito de `_local-adr-policy-201` (toda exclusão é
  reversível e com trilha de quem mudou e quando).
- **Interface**: formulário "Nova Autorização" e botão "Revogar",
  restritos ao Administrador — o servidor reconfere
  (`requireAdminSession`), a interface só evita o clique que já seria
  recusado.
- Erros do servidor seguem o tradutor de erros (`_local-edr-policy-103`):
  códigos `AUTORIZACAO_CAMPOS_INVALIDOS`, `AUTORIZACAO_ID_DUPLICADO`,
  `AUTORIZACAO_NAO_ENCONTRADA`, `AUTORIZACAO_ERRO_INTERNO`.

## References

- Arquivos: `db/authorizationsRepo.ts`,
  `db/migrations/024_research_authorizations.sql`, `server.ts`,
  `src/services/authorizationsService.ts`,
  `src/components/Phase7ConsultaPesquisa.tsx`, `src/App.tsx`
- Testes: `db/__tests__/authorizationsRepo.test.ts`,
  `src/components/__tests__/Phase7ConsultaPesquisa.test.tsx`
- Policy relacionada: `_local-adr-policy-204` (ABAC por pessoa —
  `exportAccess` é o booleano único por pessoa; esta policy é o escopo
  granular por projeto, as duas convivem sem se sobrepor),
  `_local-adr-policy-201` (revogação como padrão de exclusão reversível)
