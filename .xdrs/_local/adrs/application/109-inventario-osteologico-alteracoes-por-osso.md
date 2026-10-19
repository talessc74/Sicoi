---
name: _local-adr-policy-109-inventario-osteologico-alteracoes-por-osso
description: Alterações ósseas vivem dentro de cada osso (botão de exclamação vermelho na própria linha), nunca mais num formulário único e solto no fim da seção com um dropdown "osso afetado". Use antes de mexer em OsteologicalInventoryViewer.tsx ou em OsteologicalAlteracaoRegiao.
apply-to: src/types/sgccco.ts (OsteologicalAlteracaoRegiao, OsteologicalSectionCabecaPescoco.alteracoes), src/components/OsteologicalInventoryViewer.tsx
valid-from: 2026-10-17
---

# _local-adr-policy-109: Alterações ósseas embutidas por elemento no Inventário Osteológico

## Context and Problem Statement

A primeira versão da Seção 1 (Cabeça e Pescoço) do Inventário Osteológico
tinha um bloco único "Alterações Ósseas Identificadas Nesta Região", fora
da lista dos 23 ossos, com um dropdown "Osso afetado" pra escolher a qual
elemento aquele registro se referia. Igual ao Inventário Odontológico
antes desta mesma rodada: difícil de rastrear o que já foi marcado em qual
osso sem abrir cada categoria.

## Decision Outcome

As alterações (`OsteologicalAlteracaoRegiao[]`, `osso` continua
identificando o elemento) são exibidas e editadas dentro da própria linha
do osso: um botão de exclamação (`!`) fica vermelho/aceso quando aquele
osso já tem alguma alteração marcada, e abre a lista das categorias
(mesmo vocabulário de `AlteracaoOsseaTipo`) só daquele elemento. O array
continua flat no nível da seção (`alteracoes`, filtrado por `osso` na
tela) — a mudança é só de apresentação, não de estrutura de dado.

### Details

- Mesma motivação e vocabulário de alterações (`lesao_ante_mortem`,
  `lesao_peri_mortem`, `alteracao_post_mortem`, `patologia`,
  `variacao_anatomica`, `alteracao`) já usado no Odontograma/Inventário
  Odontológico (policy-108) — manter os dois em paralelo se o vocabulário
  mudar num dos dois.
- Suporta múltiplos itens por categoria por osso (botão "+").
- Cobertura: `src/components/__tests__/OsteologicalInventoryViewer.test.tsx`.
