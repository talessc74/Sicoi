---
name: _local-adr-policy-118-grafo-reorganizacao-viva-por-selecao
description: 'No Grafo de Conhecimento (modo Global/cross-COI), selecionar um nó reorganiza o resto do universo visível ao redor dele por grau de separação (BFS) — vizinho direto fica perto, 2 graus numa faixa intermediária, quem não tem caminho nenhum até lá vai pra borda. Hubs ontológicos e o próprio nó selecionado nunca se movem. Use antes de alterar computeGraphLayout, a seleção de nó ou a simulação de forças do grafo.'
apply-to: src/utils/graphLayout.ts, src/utils/__tests__/graphLayout.test.ts, src/components/KnowledgeGraphViewer.tsx, src/components/__tests__/KnowledgeGraphViewer.test.tsx
valid-from: 2026-10-22
---

# _local-adr-policy-118: Reorganização viva do Grafo por seleção (Grau de Interesse)

## Context and Problem Statement

O Tales pediu "atenção especial da Galera de UX" pra uma lacuna no Grafo de
Conhecimento (modo Global/cross-COI, `_local-adr-policy-116`): selecionar um
nó hoje só destaca as arestas ligadas a ele (`selectedNodeId` não entra em
`computeGraphLayout` nem no `useMemo` que o chama) — o layout inteiro é
calculado uma vez só, antes de qualquer seleção. Pediu algo "vivo": ao
selecionar um ponto, o universo de pontos se reorganiza ao redor dele.

## Decision Outcome (mesa: Compass · Empiricus · PolarBear · Few)

**Grau de Interesse (degree-of-interest layout)**: o nó selecionado vira
âncora fixa temporária — exatamente onde já estava, nunca teleporta — e
todo outro nó não-hub mira uma distância-alvo até ele que cresce com o
grau de separação (BFS não-direcionado sobre as arestas visíveis): perto
quem está a 1 grau, numa faixa intermediária quem está a 2, na borda quem
não tem caminho nenhum até lá. Os hubs ontológicos (sexo, faixa etária,
patologia — já fixos desde a 116) continuam fixos, sem exceção: perder essa
âncora estrutural a cada clique destruiria o wayfinding que o layout por
hubs existe pra garantir (PolarBear). A força de Grau de Interesse substitui
a gravidade central enquanto há seleção — as duas juntas puxariam em
direções diferentes sempre que o nó selecionado não estiver no centro do
canvas.

### Details

- `computeHopDistances(nodes, edges, sourceId)`: BFS não-direcionado, novo
  e exportado — nó sem caminho até a origem fica fora do mapa retornado.
- `ComputeLayoutOptions` ganha `selectedNodeId` e `previousPositions`.
  `previousPositions` existe pra uma etapa seguinte (ainda não implementada
  nesta policy): animar a transição em vez de recalcular do zero a cada
  seleção — a simulação já aceita começar de onde cada nó estava, condição
  necessária pra depois interpolar visualmente com a lib `motion` (já é
  dependência do projeto, ainda não usada em lugar nenhum).
- Distância-alvo por grau: 90px (1 grau) + 130px por grau adicional, até um
  teto de 380px pra quem não tem caminho até o nó selecionado.
- Só afeta o modo `'global'` — o modo `'focus'` (1 COI, radial) não tem a
  pergunta "o que se conecta a isto" que justifica reorganizar (Empiricus:
  reorganizar sem esse ganho é custo cognitivo sem contrapartida).
- **Etapa 2 (feita)**: `KnowledgeGraphViewer.tsx` liga `selectedNodeId` (só
  no modo `'global'`) e `previousPositions` (via um ref que guarda a última
  posição calculada de cada nó, atualizado a cada `useMemo` de layout) no
  `computeGraphLayout`. Opacidade por grau de separação implementada —
  `getSelectionOpacity`: âncora selecionada e hubs sempre 1, vizinho direto
  1, 2 graus 0.65, resto (incl. sem caminho até a seleção) 0.4/0.3. Aplicada
  ao `<g>` de cada nó e, como o mínimo das duas pontas, a cada aresta —
  esmaece, nunca esconde. Transição de opacidade via `transition-opacity`
  (CSS puro; a transição de posição com `motion` continua pendente).
- **Ainda pendente**: animar a transição de posição com `motion` (etapa 3)
  e o botão "Voltar ao layout automático" + proteção do `manualPositions`
  contra a reorganização descartar um arranjo manual sem aviso (etapa 4).

## References

- Arquivos: `src/utils/graphLayout.ts`
- Testes: `src/utils/__tests__/graphLayout.test.ts` (grau de separação,
  distância crescente por grau, nó selecionado fixo, hub nunca se move,
  `selectedNodeId` inexistente não quebra o layout padrão);
  `src/components/__tests__/KnowledgeGraphViewer.test.tsx` (selecionar um
  nó esmaece quem está a 2+ graus, mantém vizinho direto e hub no claro)
- Policies relacionadas: `_local-adr-policy-116` (grafo cross-COI e seus
  hubs, a base sobre a qual esta policy se apoia)
- Mesa: Compass (affordance — o nó clicado nunca teleporta), Empiricus
  (só reorganizar quando há ganho real de foco+contexto, não por padrão),
  PolarBear (hubs nunca perdem a âncora — wayfinding antes de estética),
  Few (a distância visual pós-seleção tem que refletir grau de separação
  real, não ficar só bonita)
