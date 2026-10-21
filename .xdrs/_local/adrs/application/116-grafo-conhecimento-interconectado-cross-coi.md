---
name: _local-adr-policy-116-grafo-conhecimento-interconectado-cross-coi
description: Grafo de Conhecimento Osteológico Multicêntrico e Interconectado (Cross-COI) — Hubs Ontológicos de Perfil Biológico (Sexo, Faixa Etária) e Patologias Compartilhadas no Postgres, persistência com nic = NULL para nós conceituais, visualização em camadas semânticas e algoritmo Spring-Embedder balanceado.
apply-to: db/graphSync.ts, db/graphRepo.ts, src/types/sgccco.ts, src/components/KnowledgeGraphViewer.tsx, src/utils/graphLayout.ts
valid-from: 2026-10-21
---

# _local-adr-policy-116: Grafo de Conhecimento Osteológico Interconectado (Cross-COI)

## Context and Problem Statement

Anteriormente, o Grafo de Conhecimento do SIGCOI (tabelas `graph_nodes` e `graph_edges`) funcionava de maneira estritamente univariada ou insular: cada conjunto osteológico (NIC/COI) mantinha apenas suas próprias ramificações isoladas (indivíduo, caixas, formulários, custódia, assinaturas).

Pesquisadores e peritos forenses necessitavam de uma visão analítica abrangente capaz de responder a perguntas comparativas populacionais e patológicas:
1. Quais conjuntos compartilham o mesmo perfil de sexo estimado ou faixa etária?
2. Quais conjuntos apresentam a mesma patologia ou formação óssea anômala (ex.: Artrose, Fraturas)?
3. Qual é o caminho de conexão que une dois laudos aparentemente distintos no acervo?

## Decision Outcome

Aprovada a arquitetura de **Grafo de Conhecimento Multicêntrico e Interconectado com Hubs Ontológicos**, com as seguintes premissas:

### 1. Hubs Ontológicos Compartilhados e Persistência
- Para evitar duplicação ou desconexão semântica, foram introduzidos nós conceituais com IDs canônicos padronizados:
  - Sexo Estimado: `HUB-SEX-FEMININO`, `HUB-SEX-MASCULINO`, `HUB-SEX-INDETERMINADO` (`conceito_biologico`).
  - Faixa Etária: `HUB-AGE-ADULTO_JOVEM`, `HUB-AGE-ADULTO_MEDIO`, `HUB-AGE-ADULTO_MADURO`, `HUB-AGE-IDOSO`, etc. (`conceito_biologico`).
  - Patologias/Lesões: `HUB-PATH-<SLUG_NORMALIZADO>` (ex.: `HUB-PATH-ARTROSE_SEVERA`) (`conceito_patologico`).
- **Persistência Segura (`nic = NULL`)**: Na sincronização via `syncGraphForCollection(client, collection)`, os nós que representam hubs compartilhados (`node.type.startsWith('conceito_') || node.type === 'metodo'`) são persistidos com `nic = NULL`. Dessa forma, quando um COI específico for recalculado, editado ou sofrer soft-delete (`DELETE FROM graph_nodes WHERE nic = $1`), os hubs e as pontes para os outros COIs não são apagados acidentalmente.

### 2. Layout Híbrido e Simulação Spring-Embedder (`src/utils/graphLayout.ts`)
- **Modo Foco (`focus`)**: Layout radial estável e determinístico, centralizado no COI consultado, preservando a experiência individual de laudo.
- **Modo Global (`global`)**: Layout multicêntrico de forças (Spring-Embedder com 35 iterações), onde os hubs conceituais atuam como âncoras de gravidade com repulsão por pares, atração por arestas e amortecimento suave.

### 3. Interface e Filtros Semânticos em Camadas (`KnowledgeGraphViewer.tsx`)
- Introduzido seletor de modo no cabeçalho: `🎯 Foco Individual` vs `🌐 Rede Interconectada (Todos os COIs)`.
- No modo Global, o usuário dispõe de alternadores dinâmicos de camadas:
  - Sexo Estimado (M/F).
  - Faixa Etária.
  - Patologias Compartilhadas.
  - "Ocultar Operacionais": oculta ruído procedimental (formulários A1/A2, assinaturas, eventos de custódia), mantendo o foco analítico puro em biologia e patologia.
- Destaque visual no SVG: nós de Hub possuem halo concêntrico tracejado, raio expandido e bordas contrastantes; arestas de correlação biológica possuem coloração semântica dedicada (`#38bdf8` para sexo, `#818cf8` para idade, `#fb7185` para patologias).
- Traçado de caminhos (*Pathfinding*): a ferramenta de caminho entre nós opera de forma cross-COI, revelando trajetos como `COI-033 -> IND-01 -> HUB-PATH-ARTROSE -> IND-01 -> COI-017`.
