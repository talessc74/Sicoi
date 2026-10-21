---
name: _local-adr-policy-113-inventario-osteologico-reestruturacao-pesquisadores
description: 'O Inventário Osteológico (Fase 4, §15) estrutura-se em 8 seções: Cabeça e Pescoço, Coluna Vertebral, Tórax, Membros Superiores, Ossos das Mãos, Membros Inferiores, Ossos dos Pés e Demais Informações. Coluna Vertebral lista vértebras (C1..C7, T1..T12, L1..L5) antes de Sacro e Cóccix; Tórax lista Esterno e Costelas (C1..C12) por lateralidade, ambos com P/F/I/A/! e caixas numéricas residuais (não identificadas e fragmentos). Atribuição automática de "Sem alteração", fechamento automático em acordeom de alterações, campo de observações e botão "Próxima seção" em todas as seções anatômicas. Use antes de alterar a estrutura, a persistência, o layout ou as ações do inventário osteológico.'
apply-to: src/components/OsteologicalInventoryViewer.tsx, src/types/sgccco.ts, src/components/Phase4Curadoria.tsx, src/components/__tests__/OsteologicalInventoryViewer.test.tsx, src/components/__tests__/osteologicalLogic.test.ts
valid-from: 2026-10-19
---

# _local-adr-policy-113: Inventário Osteológico — reestruturação a pedido dos pesquisadores e técnicos

## Context and Problem Statement

Os pesquisadores e a equipe técnica de curadoria trouxeram refinamentos
sucessivos sobre o Inventário Osteológico das seções originais (superando
a prancha visual de Cabeça e Pescoço da `_local-adr-policy-111` e a estrutura
da `_local-adr-policy-112`):

1. A contagem de "catalogados" (badge `X/Y` em cada seção) não contava
   vértebras, costelas nem estruturas complementares (cartilagens,
   ossículos) — só o que estava no registro `ossos` simples.
2. Cabeça e Pescoço: tirar a prancha visual (imagens + sub-abas por
   grupo de osso) e voltar a ser lista corrida, como as outras seções.
3. Membros Superiores: separar carpo/metacarpo (ossos das mãos) numa
   seção própria, tirando-os de Membro Superior Direito/Esquerdo.
4. Pelve & Bacia + Membro Inferior: unir numa seção só (Membros Inferiores).
   Tarso/metatarso saem dessa seção para seção própria ("Ossos dos Pés").

Subsequentemente, em 21/10/2026, novas solicitações dos técnicos laboratoriais
redefiniram o fluxo operacional de preenchimento e detalhamento pericial:
5. **Costelas em listagem por lateralidade**: Costelas (C1 a C12) listadas por
   lateralidade (Esquerda e Direita) com campos P/F/I/A/!. No final, duas caixas
   de resposta com opção de rolagem numérica intituladas: "quantidade de costelas
   não identificadas" e "quantidade de fragmentos".
6. **Coluna Vertebral com vértebras antes de Sacro/Cóccix e em 3 grupos**:
   Inversão de ordem (vértebras aparecem antes de Sacro e Cóccix). Vértebras
   separadas em 3 pontos: "vértebras cervicais" (C1..C7), "vértebras torácicas"
   (T1..T12) e "vértebras lombares" (L1..L5), todas com campos P/F/I/A/!. No final,
   duas caixas com rolagem numérica: "quantidade de vértebras não identificadas"
   e "quantidade de fragmentos".
7. **"Sem alterações" automático**: Em todas as opções de ossos, se não for
   marcada nenhuma alteração e o osso estiver presente (P, F ou I), deve ficar
   automaticamente badged como "Sem alteração", sem exigir clique manual.
8. **Acordeom de alterações**: Ao clicar em uma opção de outro osso, a caixa de
   alterações aberta fecha automaticamente.
9. **Remoção de "Mapeamento Geral" e Observações em TODAS as seções**:
   Remoção do detalhe "Mapeamento Geral da completude e associação por indivíduo"
   e adição de caixa de texto para observações ao final de TODAS as seções anatômicas.
10. **Botão "Próxima seção"**: Inclusão de botão ao final de cada seção direcionando
    para a seção anatômica subsequente.
11. **Renomeação**: "Ossos das mãos" e "Ossos dos pés".
12. **Seção 8 "Demais informações"**: Adição de 8ª seção após os pés com cabeçalho
    orientativo (tecidos mumificados, dentes desarticulados, etc.) e textarea amplo.

## Decision Outcome

**Inventário Osteológico consolidado em 8 seções, com lista corrida unificada
e elementos individualizados (inclusive Vértebras C1..L5 e Costelas C1..C12 D/E),
caixas numéricas residuais, rotulagem automática de integridade ("Sem alteração"),
gaveta em acordeom, observações por seção, navegação sequencial assistida e
seção final de notas complementares.**

### Details

- **Cabeça e Pescoço** (`cabecaPescoco`, 31 elementos catalogáveis): lista corrida
  de 23 ossos faciais/cranianos com `SimpleBoneRows` + estruturas complementares
  (cartilagens tireóidea e cricoide, ossículos martelo, bigorna e estribo D/E).
- **Coluna Vertebral** (`colunaVertebral`, 26 ossos catalogáveis):
  - 1. Vértebras cervicais (C1 a C7)
  - 2. Vértebras torácicas (T1 a T12)
  - 3. Vértebras lombares (L1 a L5)
  - 4. Sacro e Cóccix
  - Caixas numéricas de rolagem/stepper: `quantidadeNaoIdentificadas` e `quantidadeFragmentos`.
- **Tórax** (`torax`, 27 ossos catalogáveis):
  - 1. Esterno (Manúbrio, Corpo, Processo xifóide)
  - 2. Costelas por lateralidade: Costelas Esquerdas (C1 a C12) e Costelas Direitas (C1 a C12)
  - Caixas numéricas de rolagem/stepper: `quantidadeNaoIdentificadas` e `quantidadeFragmentos`.
- **Membros Superiores** (`membrosSuperiores`, 22 ossos): 11 ossos por lado em duas colunas,
  subdivididos em 4 grupos anatômicos (estilo vértebras):
  - 1. Cíngulo do membro superior (Clavícula e Escápula)
  - 2. Úmero (Epífise proximal, Diáfise e Epífise distal)
  - 3. Rádio (Epífise proximal, Diáfise e Epífise distal)
  - 4. Ulna (Epífise proximal, Diáfise e Epífise distal)
- **Ossos das Mãos** (`ossosMao`, 26 ossos): 13 ossos por lado em duas colunas,
  subdivididos em 2 grupos anatômicos:
  - 1. Carpo (Escafóide, Semilunar, Piramidal, Pisiforme, Trapézio, Trapezóide, Capitato e Hamato)
  - 2. Metacarpo (1º Metacarpal ao 5º Metacarpal)
  + contagem pooled única de falanges e sesamoides.
- **Membros Inferiores** (`pelveMembroInferior`, 26 ossos): 13 ossos por lado em duas colunas,
  subdivididos em 5 grupos anatômicos:
  - 1. Cíngulo do membro inferior (Ílio, Ísquio e Púbis)
  - 2. Fêmur (Epífise proximal, Diáfise e Epífise distal)
  - 3. Tíbia (Epífise proximal, Diáfise e Epífise distal)
  - 4. Fíbula (Epífise proximal, Diáfise e Epífise distal)
  - 5. Patela (ponto único isolado após a fíbula)
- **Ossos dos Pés** (`ossosPe`, 24 ossos): 12 ossos por lado em duas colunas,
  subdivididos em 2 grupos anatômicos:
  - 1. Tarso (Calcâneo, Tálus, Navicular, Cuboide, Cuneiforme Medial, Cuneiforme Intermédio e Cuneiforme Lateral)
  - 2. Metatarso (1º Metatarsal ao 5º Metatarsal)
  + contagem pooled única de falanges e sesamoides.
- **Demais Informações** (`demaisInformacoes`): Seção 8 com cabeçalho orientativo
  `(ex: tecidos mumificados, nº de dentes desarticulados [em XX] e demais informações relevantes não registradas em questões anteriores deste formulário)`
  e caixa de texto livre ampla (`textarea`).
- **"Sem alteração" automático**: Qualquer elemento ósseo com código `P`, `F` ou `I`
  sem alterações ativas assinaladas exibe automaticamente a badge verde `Sem alteração`.
- **Gaveta de alterações em acordeom**: O estado de expansão `expandedBonesBySection`
  mantém no máximo um osso aberto por seção, fechando automaticamente ao clicar em
  qualquer opção de outro osso.
- **Observações por Seção e Botão Próxima Seção**: Todas as seções 1 a 7 contam com
  textarea dedicado para `sectionData.observacoes` e botão de salto direto para a
  seção anatômica conseguinte.
- **Visualização bilateral em 2 colunas e ergonomia visual de tela**:
  Nas seções apendiculares bilaterais e no Tórax (Costelas), a interface organiza os
  elementos em duas colunas: a coluna do **Lado Esquerdo** fica posicionada à esquerda
  da tela e a do **Lado Direito** fica posicionada à direita da tela, eliminando
  incongruências espaciais e fadiga visual de catalogação.
- **Ações rápidas de preenchimento em lote completas (P, F, I, A)**:
  A barra de ações de cada seção oferece botões dedicados de marcação em lote para todos
  os estados de presença: "Marcar Todos P", "Marcar Todos F", "Marcar Todos I",
  "Marcar Todos A" e "Limpar", com atalhos compactos por coluna.

## References

- Arquivos: `src/components/OsteologicalInventoryViewer.tsx`,
  `src/types/sgccco.ts`, `src/components/Phase4Curadoria.tsx`
- Testes: `src/components/__tests__/OsteologicalInventoryViewer.test.tsx`,
  `src/components/__tests__/osteologicalLogic.test.ts`
- Policies superadas por este documento: `_local-adr-policy-111`
  (prancha visual de 4 pranchas), `_local-adr-policy-112` (estrutura
  anterior das Seções 2-8)
- Policies relacionadas, ainda válidas: `_local-adr-policy-109`
  (alterações ósseas por osso com botão `!`), `_local-edr-policy-105`
  (testes de ações em lote e estado compartilhado entre seções)
