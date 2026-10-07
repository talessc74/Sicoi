---
name: _local-adr-policy-104-navegacao-sincronizada-com-url
description: activeTab/activePhase ficam sincronizados com a URL real (history.pushState/popstate), sem adotar um roteador — o botão/gesto de "voltar" do navegador ou do celular volta uma tela dentro do app em vez de sair do site. Use antes de adicionar uma aba/tela nova, ou antes de considerar adotar react-router.
apply-to: src/App.tsx (VALID_TABS, pathForNavState, parseNavStateFromPath, os dois useEffect de sincronização com o histórico)
valid-from: 2026-10-07
---

# _local-adr-policy-104: Navegação sincronizada com a URL, sem roteador

## Context and Problem Statement

O SIGCOI é uma SPA sem nenhum roteador (`react-router` ou equivalente) —
`activeTab`/`activePhase` são só estado em memória (`useState`), e a URL
nunca muda ao trocar de aba ou de fase. Isso já estava documentado no
próprio código (`src/App.tsx`, comentário acima de `passwordSetupToken`:
"Sem roteador nesta SPA").

Revisão pedida pelo Tales ("reveja o site se as telas possuem botão
voltar, e voltar para a tela inicial") encontrou o problema real: como a
URL nunca muda, o botão/gesto físico de "voltar" do navegador ou do
celular **não tem efeito nenhum dentro do app** — ele sai do SIGCOI
inteiro (volta pra página anterior no histórico do navegador, fora do
site), em vez de voltar uma tela. Os únicos "voltar" que funcionavam
eram afordances manuais específicas (o link "Início" sempre visível no
cabeçalho fixo, "Voltar ao login" na tela de recuperação de senha, os
cards clicáveis da faixa de progresso das fases) — nenhum ligado ao
histórico real do navegador.

## Decision Outcome

`activeTab`/`activePhase` passam a ser sincronizados com `window.location`
via `history.pushState`/`popstate` — sem adicionar `react-router` nem
qualquer outra dependência de roteamento. Cada aba tem um caminho fixo
(`/`, `/documentos`, `/grafo`, `/auditoria`, `/pesquisa`, `/estantes`,
`/configuracoes`, `/ajuda`), e a aba "Fases" inclui o número da fase
(`/fases/4`).

### Details

- `VALID_TABS`/`isNavigableTab`/`pathForNavState`/`parseNavStateFromPath`
  (funções puras, fora do componente) traduzem entre o par
  `(activeTab, activePhase)` e um caminho de URL, nos dois sentidos.
- Dois `useEffect` em `App.tsx`: um roda uma vez na montagem (restaura o
  estado inicial a partir de `window.location.pathname` — útil também
  pra recarregar a página direto numa URL tipo `/fases/4` — e registra o
  listener de `popstate`); outro roda a cada mudança de
  `activeTab`/`activePhase` e empilha uma entrada nova no histórico via
  `pushState`, só quando a mudança não veio de um `popstate` (controlado
  por `skipNextNavPushRef`, pra não entrar num loop de empilhar
  "avançar" de volta a cada "voltar").
- Nenhum componente de tela foi alterado — a sincronização é só em
  `App.tsx`, lendo e escrevendo os mesmos `setActiveTab`/`setActivePhase`
  que já existiam em todo o resto do código.
- `server.ts` já servia `index.html` pra qualquer caminho (`app.get('*',
  ...)` em produção, `appType: 'spa'` do Vite em desenvolvimento) — então
  uma URL como `/grafo` ou `/fases/4` já funcionava tanto num "voltar"
  quanto num recarregamento direto da página, sem precisar mudar o
  servidor.
- O fluxo de "definir senha" (link de uso único, `?token=...` na query
  string) continua isolado — a restauração de estado a partir do
  caminho é pulada nesse caso, porque esse fluxo não usa
  `activeTab`/`activePhase` de verdade.
- Validado com Playwright contra um servidor local real: clicar em
  Início → Documentos → Ferramentas/Grafo → Auditoria e depois apertar
  "voltar" três vezes devolve exatamente Grafo → Documentos → Início
  (confirmado pela URL e pelo conteúdo real da tela, não só pela URL);
  "avançar" depois disso volta pra Documentos. Recarregar a página
  direto em `/grafo` ou em `/fases/1` abre a tela certa sem precisar
  passar pela Início primeiro. Suíte completa (272 testes) e
  `tsc --noEmit` também limpos.

## References

- Arquivos: `src/App.tsx`
- Pendência explícita, não decidida aqui: adotar um roteador de verdade
  (`react-router` ou equivalente) se a navegação crescer o suficiente
  pra justificar (rotas aninhadas, parâmetros de URL pra NIC selecionado,
  etc.) — a solução aqui é deliberadamente mínima, resolvendo só o
  problema do botão "voltar", não uma reescrita de roteamento.
