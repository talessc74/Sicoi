---
name: _local-adr-policy-121-grafo-zoom-pinca-e-botoes
description: 'O Grafo de Conhecimento tem zoom de verdade: pinça do trackpad (chega como wheel com ctrlKey=true) e botões +/−/100% no canto do canvas. O listener de wheel é anexado por callback ref (não useEffect com deps vazias) porque o contêiner do grafo some e volta (carregamento, "Atualizar"). Zoom!=1 ativa o mesmo modo de canvas em pixels reais + rolável que graphExceedsFrame já usa. Use antes de mexer em zoom, useScrollableCanvas, attachGraphScrollNode ou nas larguras/alturas do SVG.'
apply-to: src/components/KnowledgeGraphViewer.tsx, src/components/__tests__/KnowledgeGraphViewer.test.tsx
valid-from: 2026-10-22
---

# _local-adr-policy-121: Zoom do Grafo — pinça do trackpad e botões

## Context and Problem Statement

O Tales perguntou como dar zoom no Grafo — no Mac, o gesto de pinça no
trackpad não fazia nada. Investigando: o grafo nunca teve nenhum
tratamento de zoom. Sem interceptação, o gesto de pinça do trackpad
chega ao navegador como um evento `wheel` com `ctrlKey: true` (é assim
que Mac/Windows sinalizam pinça pra quem não usa touch nativo) — e sem
`preventDefault`, ou o navegador tentaria aplicar zoom na PÁGINA
inteira (fora do controle do app), ou simplesmente nada visível
acontecia, dependendo do navegador/contexto.

## Decision Outcome (mesa: Compass · Empiricus · PolarBear)

**Zoom real do grafo, com dois caminhos pro mesmo estado (`zoom`,
0.3–3×):** pinça/ctrl+scroll no canvas, e três botões no canto inferior
esquerdo do canvas (`ZoomOut` / `{percentual}%` / `ZoomIn`) — o
percentual também funciona como botão de reset pra 100%. Os botões
existem porque pinça não é universal (mouse comum, trackpads sem
suporte de precisão, preferência de quem não gosta de gestos) —
depender só do gesto excluiria quem não consegue usá-lo (Compass,
PolarBear: toda interação por gesto precisa de um equivalente clicável).

### Detalhes técnicos

- `useScrollableCanvas = graphExceedsFrame || zoom !== 1`: zoom aplicado
  ativa o mesmo modo de canvas em pixels reais + contêiner `overflow-auto`
  que `graphExceedsFrame` (grafo maior que o quadro-base) já usava — dar
  zoom também é, por definição, fazer o conteúdo não caber mais inteiro
  na área visível. `width`/`height` do `<svg>` passam a ser
  `graphWidth * zoom` / `graphHeight * zoom`; o `viewBox` nunca muda —
  só o tamanho renderizado em pixels CSS, que é exatamente o que "zoom"
  significa aqui.
- **O listener de `wheel` é anexado por *callback ref*
  (`attachGraphScrollNode`), não por `useEffect` com array de
  dependências vazio.** Esse foi o bug real encontrado ao testar: o
  contêiner do canvas só existe quando `!isLoadingGraph && !loadError`
  — ele desmonta durante o carregamento inicial e durante um
  "Atualizar" manual, e remonta depois. Um `useEffect(() => {...}, [])`
  só roda uma vez, na primeira montagem do COMPONENTE — na primeira
  vez que esse efeito rodou, o canvas ainda nem existia (`ref.current`
  era `null`), então o listener nunca chegava a ser anexado de verdade.
  `attachGraphScrollNode` (passado como `ref={...}` no próprio `<div>`)
  resolve isto corretamente: roda toda vez que ESTE nó específico monta
  ou desmonta, sempre que ele exista.
- `handleWheel` ignora qualquer `wheel` sem `ctrlKey` (scroll normal, incl.
  o gesto de dois dedos) — nunca interfere na rolagem comum, só na pinça.
  `e.preventDefault()` só roda dentro do `if (ctrlKey)`, então o scroll
  comum nunca é bloqueado.
- Fator de zoom por evento: `Math.exp(-deltaY * 0.01)` — multiplicativo,
  então a sensação de "dobrar"/"reduzir à metade" é consistente em
  qualquer nível de zoom atual (não aditivo, que ficaria desproporcional
  perto dos limites).
- Zoom reseta pra 1 ao trocar de modo (Foco ↔ Global) — trocar de modo já
  é trocar de cena inteira; carregar um zoom de uma visualização pra
  outra não faz sentido.
- A centralização de câmera por seleção (`_local-adr-policy-120`) agora
  multiplica a posição do nó por `zoom` antes de calcular o scroll alvo
  — zoom participa da conta de "onde está o nó em pixels reais", mas
  continua fora da lista de dependências do efeito (só reage a
  `selectedNodeId`), pelos mesmos motivos documentados na 120: a câmera
  só se move em resposta a uma seleção explícita, nunca sozinha.

## References

- Arquivos: `src/components/KnowledgeGraphViewer.tsx`
- Testes: `src/components/__tests__/KnowledgeGraphViewer.test.tsx`
  (ctrl+wheel muda o zoom e cancela o evento nativo; wheel sem ctrlKey
  não mexe no zoom; os três botões de zoom funcionam)
- Policies relacionadas: `_local-adr-policy-120` (o modo de canvas
  rolável que o zoom agora também ativa; a centralização de câmera que
  passou a considerar o zoom)
- Mesa: Compass (todo gesto precisa de um botão equivalente), Empiricus
  (zoom multiplicativo é mais previsível que aditivo perto dos limites),
  PolarBear (zoom nunca pode depender só de um gesto que nem todo mundo
  consegue fazer)
