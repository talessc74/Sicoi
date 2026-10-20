---
name: _local-adr-policy-104-navegacao-sincronizada-com-url
description: activeTab/activePhase e selectedNic ficam sincronizados com a URL real (?nic=..., history.pushState/popstate) e com localStorage — o botão/gesto de "voltar" do navegador ou do iPad/celular funciona, e dar refresh ou reabrir o site nunca mais reinicia a sessão de volta para COI-032 / Fase 1. Use antes de adicionar uma aba/tela nova ou mexer no fluxo de navegação.
apply-to: src/App.tsx (VALID_TABS, pathForNavState, fullUrlForNavState, parseNavState, loadAppData, sincronização history/localStorage)
valid-from: 2026-10-07
---

# _local-adr-policy-104: Navegação sincronizada com a URL e persistência de sessão, sem roteador

## Context and Problem Statement

O SIGCOI é uma SPA sem dependência de biblioteca externa de roteamento
(`react-router`). A navegação baseada em histórico de navegador já havia
sido introduzida para permitir o uso do botão "voltar" nativo e gestos de
deslizar em telas touch.

Entretanto, uma falha crítica de usabilidade persistia ao recarregar a
página (`F5`/refresh) ou ao fechar e reabrir o navegador (especialmente no
Safari do iPad):

1. **Sobrescrita indevida por `loadAppData`**: No carregamento inicial, a
   função assíncrona `loadAppData` executava `setSelectedNic(loadedCollections[0]?.nic)`
   e `setActivePhase(loadedCollections[0]?.currentPhase || 1)`. Como o
   primeiro conjunto retornado do banco era `COI-032` (na Fase 1), qualquer
   recarregamento na Fase 4 ou em outro conjunto era imediatamente clobberado
   e forçado de volta para `COI-032` / Fase 1.
2. **Ausência de persistência do NIC e do estado**: O conjunto selecionado
   não constava na URL nem em `localStorage`, perdendo-se completamente a cada
   refresh ou nova aba.

## Decision Outcome

1. **Parâmetro de URL `?nic=...`**: Nas visualizações operacionais
   (`fases`, `auditoria`, `grafo`, `estantes`, `pesquisa`), o NIC selecionado é
   anexado à URL como query parameter (ex.: `/fases/4?nic=COI-032`).
2. **Persistência de Sessão em `localStorage`**:
   - `sigcoi_active_tab`: preserva a aba ativa.
   - `sigcoi_active_phase`: preserva a fase de curadoria ativa.
   - `sigcoi_selected_nic`: preserva a coleção selecionada.
3. **Inicialização Direta e Imunidade ao Clobbering**:
   - `parseNavState` avalia a URL canônica com prioridade e usa `localStorage`
     como fallback ao carregar a raiz `/`.
   - `loadAppData` **nunca mais sobrescreve** `activePhase` se a rota já
     especificou uma fase válida (`/fases/X`), e seleciona o NIC respeitando a
     prioridade: estado atual > parâmetro `?nic=` > `localStorage` > primeiro conjunto.
4. **Popstate / Gestos Touch**:
   - Mantida compatibilidade com botões nativos de voltar/avançar e gestos do Safari.
5. **Link de ativação / Token**:
   - O fluxo isolado de `?token=...` permanece protegido e independente.

## References

- Arquivos: `src/App.tsx`, `src/components/__tests__/navigationState.test.ts`
- Políticas correlatas: `_local-adr-policy-108-inventario-odontologico-denticao`
