---
name: _local-adr-policy-201-exclusao-administrativa-reversivel
description: O Administrador pode excluir uma caixa, um conjunto ou todos os dados, mas "excluir" nunca é um DELETE físico — é uma marca reversível (deleted_at/deleted_by/deleted_reason), verificada e registrada no servidor, com trilha própria em admin_actions e restauração completa a qualquer momento. Use antes de adicionar qualquer ação destrutiva nova ao sistema.
apply-to: db/adminRepo.ts, server.ts (rotas /api/admin/*), src/components/AdminDangerZone.tsx, src/services/adminService.ts
valid-from: 2026-09-27
---

# _local-adr-policy-201: Exclusão administrativa reversível (Zona de Risco)

## Context and Problem Statement

O Tales pediu uma tela para o Administrador excluir uma caixa, um conjunto
selecionável ou todos os dados. Isso colidia de frente com uma decisão já
tomada e reforçada no banco (`_local-adr-policy-101`, migração
`007_protected_history.sql`): o histórico de um acervo forense não pode
ser apagado por quem acessa o site — `wipeAllCollections` existe só para
testes automatizados, sem rota HTTP nem botão, com um comentário explícito
dizendo isso.

Question: como dar ao Administrador um poder operacional real de excluir
dados sem reabrir a possibilidade de destruir prova forense de forma
irreversível?

## Decision Outcome

**"Excluir" nunca remove uma linha do banco — marca como excluída,
esconde da tela, e pode ser desfeito a qualquer momento.**

1. `collections` ganha `deleted_at`, `deleted_by`, `deleted_by_name`,
   `deleted_reason`. Uma caixa ganha os mesmos quatro campos dentro do
   próprio objeto, em `phase1.preliminaryBoxes[].deletedAt/...`.
2. "Excluir" é um `UPDATE` que preenche essas colunas; "Restaurar" é um
   `UPDATE` que as limpa. Nenhuma das duas toca em `signatures`,
   `custody_chain` ou `change_log` — as tabelas que a policy 101 protege
   com gatilhos no Postgres continuam absolutamente intocáveis.
3. Excluir uma caixa de uma Fase 1 já assinada usa a mesma reabertura
   protegida de qualquer outro campo (a justificativa da exclusão vira a
   justificativa da reabertura) — sem atalho, sem bypass do
   `historyGuard.ts`.
4. Uma tabela nova, `admin_actions`, sem FK para `collections`, grava
   toda exclusão e restauração — quem, quando, o quê, por quê. Sobrevive
   a qualquer uma das ações que ela mesma registra.
5. Toda rota `/api/admin/*` reconfere o papel Administrador no servidor
   (`requireAdmin`, a partir do cadastro em `people`) — nunca confia no
   papel que o navegador diz que o usuário ativo tem.
6. `listCollections` (a lista usada pelo dashboard) passa a excluir
   `deleted_at IS NOT NULL`; `saveCollection` recusa gravar um conjunto
   excluído sem antes restaurá-lo.

### Details

- O `wipeAllCollections` físico continua existindo exatamente como
  antes — sem rota, sem botão, só para os testes. Não foi ligado a este
  botão do Administrador, porque essa exclusão física não tem undo por
  definição.
- Cobertura: `db/__tests__/adminRepo.test.ts` (16 testes) — exclusão e
  restauração de caixa, conjunto e todos os dados, incluindo a reabertura
  automática de Fase 1 assinada e a recusa de editar um conjunto
  excluído. As rotas HTTP em si (`server.ts`) não têm teste de integração
  próprio — são wrappers finos sobre as funções testadas.

## References

- Arquivos: `db/migrations/008_admin_soft_delete.sql`, `db/adminRepo.ts`,
  `server.ts`, `src/components/AdminDangerZone.tsx`,
  `src/services/adminService.ts`
- Testes: `db/__tests__/adminRepo.test.ts`
- Policy relacionada: `_local-adr-policy-101` (histórico protegido —
  esta decisão convive com ela sem enfraquecê-la)
