---
name: _local-adr-policy-119-grafo-tela-cheia
description: 'O Grafo de Conhecimento tem um botão de tela cheia (Maximize2/Minimize2 no cabeçalho) que cobre a viewport inteira — tenta a Fullscreen API nativa do navegador quando disponível, mas nunca depende só dela: um overlay CSS (fixed inset-0) garante a mesma experiência mesmo onde a API é recusada ou não existe. Em tela cheia, o grafo é o protagonista: o painel lateral (Explicar/Caminho/Busca) vira uma gaveta (PanelRightOpen/Close) recolhida por padrão que ENCOLHE o grafo ao abrir (flex-1 + w-0/w-[24rem]) em vez de cobri-lo por cima — nenhum nó pode ficar escondido atrás da UI. Use antes de alterar o layout do cabeçalho do grafo ou a estrutura flex/largura do SVG/painel lateral.'
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

## Correção 1: o painel lateral virou gaveta sobreposta (mesmo dia)

> **[SUPERADA pela Correção 2, mesmo dia]** — o modelo "gaveta sobreposta"
> abaixo escondia o nó selecionado atrás do painel sempre que ele caía na
> área que a gaveta cobre. Ver Correção 2.

A primeira versão desta policy entrou em `main` mantendo a grade de
4 colunas também em tela cheia (SVG em 3, painel em 1) — o Tales
testou e voltou: "o que precisa ir para tela cheia é o grafo, a
imagem... e os filtros em algum lugar que a galera de UX consegue
pensar melhor que eu". Na prática, o painel (Explicar Nó, Caminho
entre nós, Buscar em toda a base, Busca por Semelhança) continuava
ocupando 1/4 da largura o tempo inteiro, competindo com o próprio
grafo pelo espaço que a tela cheia deveria estar dando a ele.

### Decisão (mesa: Compass · Empiricus · PolarBear · Few)

**O painel lateral vira uma gaveta sobreposta em tela cheia, recolhida
por padrão** — o grafo ocupa a largura inteira da tela
(`absolute inset-0` em vez de `lg:col-span-3`), e o painel desliza por
cima dele (`absolute inset-y-0 right-0`, `translate-x-full` ↔
`translate-x-0`), nunca mais dividindo a largura disponível. Fora da
tela cheia nada muda — a grade de 4 colunas original continua intacta,
porque ali o painel nunca foi o problema.

- **Recolhida por padrão ao entrar em tela cheia** (Empiricus: o
  primeiro instante em tela cheia é exatamente quando a pessoa quer
  ver o grafo inteiro, não o painel).
- **Abre sozinha ao selecionar um nó** — `selectNode` força
  `isSidePanelOpen = true` quando `isFullscreen`, porque clicar num nó
  *é* pedir a explicação que o painel mostra; esperar que a pessoa
  ache o botão depois de já ter perguntado seria fricção sem motivo
  (Empiricus, Compass: a resposta aparece onde e quando a pergunta foi
  feita).
- **Três formas de fechar, todas óbvias** (PolarBear: nenhuma trava
  sem saída): o próprio botão do cabeçalho
  (`PanelRightOpen`/`PanelRightClose`, ao lado do botão de tela
  cheia), um `X` no canto da gaveta, e clicar fora dela — no grafo —
  via um *scrim* semitransparente (`bg-black/20`,
  `data-testid="graph-panel-scrim"`) que cobre o grafo enquanto a
  gaveta está aberta.
- Zonas empilhadas (`z-10` scrim, `z-20` gaveta) garantem que o clique
  dentro da gaveta nunca "vaza" pro scrim por baixo.
- `graphExceedsFrame` (quando um nó foi arrastado pra fora do quadro
  original) também passa a usar a altura cheia em tela cheia
  (`h-full overflow-auto`) em vez do teto fixo de 520px que só fazia
  sentido fora dela.

## Correção 2: a gaveta encolhe o grafo, nunca cobre por cima (mesmo dia)

O Tales testou a Correção 1 e achou o problema de fundo: ao clicar num
nó (COI-032/IND-01), a gaveta abriu sozinha (como previsto) — mas o nó
selecionado ficou "por trás do menu lateral que apareceu", porque o
grafo continuava desenhado com a largura inteira da tela e a gaveta só
sobrepunha visualmente por cima dele. Qualquer nó que caísse na faixa
direita coberta pela gaveta ficava invisível. Pedido do Tales: "ele
deveria se movimentar para o meio para continuar visível... UX e
código precisam conversar para fechar isso com inteligência,
tecnologia e UX em foco".

### Decisão (mesa: Compass · Empiricus · PolarBear · Few + Scout/Flux do lado de código)

**A gaveta deixa de sobrepor o grafo e passa a dividir o espaço com
ele de verdade** — o contêiner do grafo e o da gaveta viram irmãos
`flex` (`flex flex-1 min-h-0` no pai), o grafo é `flex-1 min-w-0`
(ocupa o que sobra) e a gaveta tem largura própria que anima entre
`w-0` (fechada) e `w-[24rem]` (aberta, 384px) — nunca mais `absolute`
nem `translate-x`, e o *scrim* de "clicar fora fecha" foi removido
(deixou de fazer sentido: não há mais nada "atrás" da gaveta pra
clicar através).

O ponto técnico central, e o motivo de não precisar de nenhuma lógica
nova de câmera/pan: o `<svg>` do grafo usa `width="100%"` com um
`viewBox` fixo e o `preserveAspectRatio` padrão do próprio SVG
(`xMidYMid meet`) — quando o contêiner encolhe (porque a gaveta abriu
e tomou os 24rem), o navegador **reescala e recentraliza o desenho
inteiro automaticamente** pra caber no espaço que sobrou. Nenhum nó
precisa ser reposicionado nas coordenadas internas do layout
(`computeGraphLayout` continua intocado, a âncora da seleção da
`_local-adr-policy-118` continua exatamente onde estava) — é a
*renderização* que se ajusta, não os dados. Resultado: o grafo todo
fica um pouco menor quando a gaveta abre, mas **nenhum nó, nunca,
fica escondido atrás de nada** — exatamente o "se movimentar para
continuar visível" que foi pedido, só que é o quadro inteiro que se
reorganiza visualmente, não um cálculo manual de pan por nó (Scout:
reaproveitar o comportamento nativo do SVG em vez de reinventar
matemática de câmera que já existe de graça).

- Fechar continua com duas formas óbvias (PolarBear): o botão do
  cabeçalho e o `X` no canto da própria gaveta.
- `overflow-x-hidden` na gaveta evita qualquer vazamento horizontal
  durante a animação de largura; `overflow-y-auto` mantém a rolagem
  vertical do conteúdo normalmente.

## References

- Arquivos: `src/components/KnowledgeGraphViewer.tsx`
- Testes: `src/components/__tests__/KnowledgeGraphViewer.test.tsx`
  (alterna tela cheia e volta trocando ícone/título; a gaveta começa
  recolhida — `w-0` — e alterna pelo botão do cabeçalho; selecionar um
  nó em tela cheia abre a gaveta sozinha e o contêiner do grafo
  continua presente e `flex-1`; fechar pelo X do próprio painel recolhe)
- Policy relacionada: `_local-adr-policy-118` (pedido no mesmo fluxo de
  trabalho, mesma tela, concern independente — algoritmo de layout vs.
  modo de exibição)
- Mesa (Correção 1): Compass (signifier + saída óbvia pra toda gaveta),
  Empiricus (recolhida por padrão; abre no momento certo, não antes),
  PolarBear (nunca travar sem saída visível), Few (o grafo é o dado
  principal da tela — o painel é apoio, não deve competir por espaço
  com ele)
- Mesa (Correção 2): os mesmos quatro + Scout (reaproveitar o
  comportamento nativo do SVG em vez de matemática de câmera manual) —
  nenhum nó pode ficar escondido atrás de UI, sob nenhuma circunstância
