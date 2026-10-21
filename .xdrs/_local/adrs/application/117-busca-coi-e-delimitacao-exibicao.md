---
name: _local-adr-policy-117-busca-coi-e-delimitacao-exibicao
description: Busca rápida de COI no cabeçalho superior (substituindo busca de POPs, que permanece restrita à aba Documentos) e controle de escalabilidade com delimitação máxima de COIs exibidos na faixa superior (máx 10 com seletor dropdown para os demais) e na tabela da página inicial (paginação com 15 por página e filtro dinâmico).
apply-to: src/components/Header.tsx, src/App.tsx, src/components/HomeDashboard.tsx
valid-from: 2026-10-21
---

# _local-adr-policy-117: Busca rápida de COI no cabeçalho e delimitação de exibição de conjuntos

## Context and Problem Statement

Durante o uso operacional por técnicos e pesquisadores (out/2026), dois
pontos de usabilidade e escalabilidade foram reportados:

1. **Lupa no topo redirecionava para POPs/documentos**: A caixa de busca presente
   no cabeçalho superior pesquisava trechos dos manuais normativos e redirecionava
   para a aba "Documentos". No dia a dia do laboratório, o operador necessita
   localizar e saltar diretamente para um conjunto osteológico específico (ex: `COI-146`,
   `146`), e a busca por manual causava desvio indesejado do fluxo de trabalho.
2. **Exibição ilimitada de COIs**: Tanto na faixa horizontal superior (*Quick NIC Ribbon*)
   quanto na tabela de acervo da página inicial (*HomeDashboard*), todos os conjuntos
   eram renderizados sem qualquer limite de paginação ou corte. Conforme o acervo
   cresce para centenas ou milhares de caixas, a interface estouraria horizontal
   e verticalmente ("chegando ao infinito").

## Decision Outcome

**Reorientação da busca global do cabeçalho exclusivamente para localização de COI
e introdução de barreiras de paginação e corte de exibição na faixa de navegação
e na tabela do acervo.**

### 1. Campo "Buscar COI..." no Cabeçalho Superior (`Header.tsx`)
- A lupa e campo de busca do topo foram reconfigurados para buscar conjuntos (`COI-XXX`).
- Suporta digitação de número puro (ex: `146`) ou código formatado (`COI-146`).
- Apresenta menu suspenso de sugestões (*dropdown*) com indicador de fase atual de
  cada conjunto correspondente.
- A seleção de um resultado salta instantaneamente para o conjunto e abre sua fase ativa.
- A busca por manuais normativos e POPs permanece integralmente funcional, porém
  localizada exclusivamente dentro da aba **Documentos** (`DocumentSearchViewer.tsx`).
- Em dispositivos móveis, um botão compacto de busca abre gaveta dedicada de pesquisa.

### 2. Delimitação da Faixa Superior de COIs (`App.tsx`)
- A barra horizontal de acesso rápido aos conjuntos (*Quick NIC Selector Ribbon*) agora
  exibe no máximo **10 botões de conjuntos rápidos**.
- O conjunto atualmente selecionado (`selectedNic`) tem exibição garantida na lista
  visível, mesmo quando for um registro mais antigo.
- Os conjuntos excedentes são agrupados em um seletor compacto `<select>` (`+ X outros...`),
  permitindo alternar para qualquer conjunto sem expandir indefinidamente a barra.

### 3. Delimitação e Paginação da Tabela do Acervo (`HomeDashboard.tsx`)
- A tabela principal da página inicial recebeu um campo de busca rápida dedicado
  ("Filtrar por COI...").
- A exibição foi limitada a **15 conjuntos por página** (`PAGE_SIZE = 15`), com rodapé
  de paginação trazendo o total de conjuntos filtrados e controles "← Anterior" / "Próxima →",
  prevenindo sobrecarga de renderização no DOM e rolagem infinita.

## References

- Arquivos: `src/components/Header.tsx`, `src/App.tsx`, `src/components/HomeDashboard.tsx`
- Documentos relacionados: `_local-bdr-policy-501` (padrão COI-XXX), `_local-adr-policy-104` (navegação sincronizada)
