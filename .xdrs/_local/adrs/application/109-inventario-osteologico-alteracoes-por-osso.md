---
name: _local-adr-policy-109-inventario-osteologico-alteracoes-por-osso
description: Alterações ósseas vivem dentro de cada osso em gaveta expansível acionada tanto pelo clique no corpo/nome do osso quanto pelo botão ! (com indicador chevron, stopPropagation e exclusão mútua se Ausente), nunca mais num formulário único e solto no fim da seção com dropdown. Use antes de mexer em OsteologicalInventoryViewer.tsx ou em OsteologicalAlteracaoRegiao.
apply-to: src/types/sgccco.ts (OsteologicalAlteracaoRegiao), src/components/OsteologicalInventoryViewer.tsx
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

Posteriormente (2026-10-19), ao testar a gaveta expansível, os técnicos
relataram que clicar no nome ou na linha do osso (ex: "Frontal") apenas
focava a linha com borda azul, sem abrir a gaveta de opções — passando a
impressão de que as opções haviam sumido, pois a expansão estava restrita
exclusivamente ao pequeno botão `!`.

## Decision Outcome

As alterações (`OsteologicalAlteracaoRegiao[]`, `osso` continua
identificando o elemento) são exibidas e editadas dentro da própria linha
do osso como uma gaveta expansível:
1. **Acionamento duplo:** clicar em qualquer parte da linha do osso (nome,
   número ou área neutra) ou no botão `!` expande/recolhe a gaveta.
2. **Affordance visual:** ícone `ChevronDown` rotaciona suavemente indicando
   o estado de expansão.
3. **Isolamento de eventos:** os seletores rápidos de presença (`P`, `F`, `I`,
   `A`) e o interior da gaveta usam `e.stopPropagation()` para que cliques em
   códigos, checkboxes ou campos de texto não colidam com a abertura/fechamento.
4. **Exclusão mútua (`Ausente × Alteração`):** elementos com presença `A` não
   abrem gaveta de alteração nem admitem registro patológico (pedido do Tales,
   out/2026).
5. **Universalidade:** com a reestruturação da `_local-adr-policy-113`, este
   mesmo padrão e gaveta operam em todas as 7 seções através do componente
   unificado `SimpleBoneRows`.

### Details

- Mesma motivação e vocabulário de alterações (`lesao_ante_mortem`,
  `lesao_peri_mortem`, `alteracao_post_mortem`, `patologia`,
  `variacao_anatomica`, `alteracao`) já usado no Odontograma/Inventário
  Odontológico (policy-108) — manter os dois em paralelo se o vocabulário
  mudar num dos dois.
- Suporta múltiplos itens por categoria por osso (botão "+").
- O array continua flat no nível da seção (`alteracoes`, filtrado por `osso` na
  tela) — a mudança é só de apresentação, não de estrutura de dado.
- Cobertura: `src/components/__tests__/OsteologicalInventoryViewer.test.tsx`.
