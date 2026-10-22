---
name: _local-adr-policy-119-grafo-tela-cheia
description: 'O Grafo de Conhecimento tem um botão de tela cheia (Maximize2/Minimize2 no cabeçalho) que cobre a viewport inteira — tenta a Fullscreen API nativa do navegador quando disponível, mas nunca depende só dela: um overlay CSS (fixed inset-0) garante a mesma experiência mesmo onde a API é recusada ou não existe. Use antes de alterar o layout do cabeçalho do grafo ou a estrutura de altura do SVG/painel lateral.'
apply-to: src/components/KnowledgeGraphViewer.tsx, src/components/__tests__/KnowledgeGraphViewer.test.tsx
valid-from: 2026-10-22
---

# _local-adr-policy-119: Tela cheia no Grafo de Conhecimento

## Context and Problem Statement

O Tales pediu, no meio do trabalho da `_local-adr-policy-118`: poder ver
o Grafo de Conhecimento em tela cheia. Hoje o grafo vive num cartão de
altura fixa (~520px) dentro da página — pouco espaço pra uma rede com
dezenas de nós no modo Global, ainda mais depois da reorganização viva
por seleção (118), que só faz sentido com espaço de sobra pra ver pra
onde os nós se afastam.

## Decision Outcome

**Botão de tela cheia no cabeçalho, com dois mecanismos em camadas: a
Fullscreen API nativa quando disponível, e um overlay CSS que funciona
de qualquer forma.** Nunca depender só da API nativa — ela é recusada ou
ausente em certos contextos (ex.: Safari no iPad, webviews embutidas),
e o SIGCOI já teve um caso real de feature que parecia quebrada só por
causa de uma particularidade de navegador (`_local-edr-policy-105`
nasceu de um caso parecido, embora de outra causa).

### Details

- `isFullscreen` (estado) + `fullscreenContainerRef` no contêiner raiz
  do componente. `toggleFullscreen` chama `requestFullscreen()` nesse
  elemento quando o método existe (`?.requestFullscreen?.()`, nunca
  assume suporte) e, ao sair, `document.exitFullscreen()` se havia uma
  tela cheia nativa ativa.
- Um listener de `fullscreenchange` no `document` mantém `isFullscreen`
  sincronizado se a pessoa sair da tela cheia nativa por outro caminho
  (tecla Esc, gesto do sistema) — o estado nunca fica "preso" achando
  que ainda está em tela cheia.
- Em `isFullscreen`, o contêiner raiz vira `fixed inset-0 z-50` (cobre a
  viewport mesmo sem a Fullscreen API ter sido concedida) e a cadeia de
  altura que antes era fixa em `520px` (grade SVG+painel, contêiner do
  SVG, o próprio `<svg height=...>`, painel lateral) passa a usar
  `flex-1`/`h-full`/`max-h-none` — cresce pra preencher o espaço
  disponível de verdade, não só um retângulo maior com a mesma área
  útil de antes.
- Ícone e título trocam com o estado (`Maximize2`/"Ver o grafo em tela
  cheia" ↔ `Minimize2`/"Sair da tela cheia") — nunca um ícone estático
  que não comunica qual ação o clique vai fazer (Compass: todo estado
  precisa de um signifier correspondente).

## References

- Arquivos: `src/components/KnowledgeGraphViewer.tsx`
- Testes: `src/components/__tests__/KnowledgeGraphViewer.test.tsx`
  (alterna tela cheia e volta, trocando ícone/título e a classe do
  contêiner)
- Policy relacionada: `_local-adr-policy-118` (pedido no mesmo fluxo de
  trabalho, mesma tela, concern independente — algoritmo de layout vs.
  modo de exibição)
