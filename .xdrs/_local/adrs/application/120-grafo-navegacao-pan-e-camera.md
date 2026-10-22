---
name: _local-adr-policy-120-grafo-navegacao-pan-e-camera
description: 'O Grafo de Conhecimento (sobretudo a Rede Interconectada, com centenas/milhares de nós espalhados bem além do quadro base) tem duas navegações novas: arrastar o fundo do grafo (não um nó) pan-eia a câmera rolando o contêiner, e selecionar qualquer nó centraliza a câmera nele automaticamente (scrollTo suave), em vez de depender só da barra de rolagem nativa. Use antes de mexer em graphScrollRef, handleBackgroundMouseDown, ou no useEffect de centralização por selectedNodeId.'
apply-to: src/components/KnowledgeGraphViewer.tsx, src/components/__tests__/KnowledgeGraphViewer.test.tsx
valid-from: 2026-10-22
---

# _local-adr-policy-120: Navegação no Grafo grande — arrastar o fundo pan-eia, selecionar centraliza

## Context and Problem Statement

O Tales testou o Grafo com a Rede Interconectada real (todos os COIs,
"Todos os Nós (1205)" no filtro) e achou dois problemas que só aparecem
nessa escala — bem diferentes dos testes com poucos nós fixos que
validaram as policies 118/119:

1. **Não dava pra arrastar o fundo do grafo pra rolar pros lados** — só
   a barra de rolagem nativa do navegador, que é lenta e pouco natural
   pra navegar um canvas enorme. ("Não estou falando em clicar em nós e
   arrastar. Mas o gráfico inteiro.")
2. **Clicar num nó não centralizava a câmera nele** — o nó selecionado
   podia estar fora da área visível, e nada movia a tela até ele; a
   pessoa tinha que procurar manualmente na barra de rolagem.

Causa técnica: com ~1200 nós, `computeGraphLayout` (modo Global) quase
sempre produz um `graphBounds` bem maior que o quadro-base
(`BASE_GRAPH_BOUNDS`, 840×600) — isso ativa `graphExceedsFrame`, que já
existia pra cobrir o caso de um nó arrastado manualmente pra fora do
quadro, mas nessa escala vira o modo normal de operação, não exceção.
Nesse modo o `<svg>` é renderizado em pixels fixos
(`width={graphWidth}`) dentro de um contêiner `overflow-auto` — ou
seja, **já era scrollável**, só faltava uma forma de rolar que não
fosse a barra nativa, e uma forma de chegar ao nó clicado.

## Decision Outcome

**Duas adições sobre o contêiner scrollável que já existia, nenhuma
mexendo nas coordenadas internas do layout:**

### 1. Arrastar o fundo pan-eia (`handleBackgroundMouseDown`)

O próprio contêiner `overflow-auto` (`graphScrollRef`) ganha
`onMouseDown`. Como cada nó já chama `e.stopPropagation()` no seu
próprio `mousedown` (desde o arraste de nó original), esse handler só
dispara mesmo quando o clique começa no fundo — nenhuma lógica extra
pra distinguir "clicou num nó" de "clicou no vazio". Ao arrastar,
`scrollLeft`/`scrollTop` do contêiner são atualizados pelo delta
inverso do mouse (igual a arrastar um mapa). Cursor `grab`/`grabbing`
dá o signifier (Compass).

### 2. Selecionar um nó centraliza a câmera (scrollTo suave)

Um `useEffect` dependente só de `selectedNodeId` (de propósito — ver
abaixo) chama `container.scrollTo({ left, top, behavior: 'smooth' })`
pra trazer o nó pro centro do contêiner, usando a posição já resolvida
em `getNodeCoords` no momento da seleção.

- **Dependência só de `selectedNodeId`, nunca de `displayNodes`/
  `graphBounds`**: o layout por grau de interesse da
  `_local-adr-policy-118` resolve a posição de uma vez só dentro de
  `computeGraphLayout` (não anima quadro a quadro), então perseguir o
  nó depois não teria efeito — e incluir essas dependências faria a
  câmera pular sozinha toda vez que o layout mudasse por outro motivo
  (filtro, busca, arraste de outro nó), sem a pessoa ter clicado em
  nada. Isso seria pior que o problema original (Empiricus: a câmera só
  se move em resposta direta a uma ação da pessoa).
- Funciona exatamente quando precisa e é inofensivo quando não: no
  modo "cabe na tela" (`!graphExceedsFrame`), o contêiner não tem nada
  pra rolar (`scrollWidth === clientWidth`), então o `scrollTo` e o pan
  do fundo viram no-op — nenhuma condicional extra foi necessária pra
  isso.
- Já considera o painel aberto (`_local-adr-policy-119`): como o efeito
  roda depois do commit, `container.clientWidth` já reflete o espaço
  realmente visível, gaveta aberta ou não.

## References

- Arquivos: `src/components/KnowledgeGraphViewer.tsx`
- Testes: `src/components/__tests__/KnowledgeGraphViewer.test.tsx`
  (arrastar o fundo rola o contêiner na direção oposta ao movimento;
  selecionar um nó chama `scrollTo` com `behavior: 'smooth'`)
- Policies relacionadas: `_local-adr-policy-118` (a âncora de seleção
  cuja posição esta policy centraliza na câmera, sem alterá-la),
  `_local-adr-policy-119` (a gaveta cujo espaço este efeito já respeita
  ao centralizar)
- Mesa: Compass (cursor grab/grabbing como signifier do pan), Empiricus
  (a câmera só se move em resposta a uma ação explícita da pessoa, nunca
  sozinha), PolarBear (navegar um grafo de milhares de nós não pode
  depender só da barra de rolagem nativa), Scout (reaproveitar o
  contêiner `overflow-auto` e o `stopPropagation` que o arraste de nó já
  garantia, em vez de uma lib de pan/zoom nova)
