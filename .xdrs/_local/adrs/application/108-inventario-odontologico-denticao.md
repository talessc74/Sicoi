---
name: _local-adr-policy-108-inventario-odontologico-denticao
description: Odontograma renomeado para Inventário Odontológico. Dentição permanente/mista/decídua por indivíduo; na mista, cada par de quadrante anatômico (1↔5, 2↔6, 3↔7, 4↔8) tem lado ativo único — nunca os dois registrados ao mesmo tempo pra mesma posição. Use antes de mexer em ToothRecord, OdontogramViewer.tsx ou na aba Odontológico de Phase4Curadoria.tsx.
apply-to: src/types/sgccco.ts (ToothRecord, IndividualHypothesis.denticao/denticaoQuadrantePares/supernumeraryTeeth), src/components/OdontogramViewer.tsx, src/components/Phase4Curadoria.tsx, src/data/mockData.ts (generateInitialOdontogram)
valid-from: 2026-10-17
---

# _local-adr-policy-108: Inventário Odontológico — dentição por par de quadrante

## Context and Problem Statement

A lista de correções da equipe pediu: renomear "Odontograma" para
"Inventário Odontológico"; suportar dentição permanente, mista e decídua
(hoje só existiam as 32 posições permanentes); marcação em lote de
edêntulo; e registro de dentes supranumerários, que não ocupam uma posição
FDI padrão.

## Decision Outcome

1. **Dentição por indivíduo** (`IndividualHypothesis.denticao`):
   `'permanente'` (padrão) | `'mista'` | `'decidua'`. `generateInitialOdontogram`
   gera as 32 posições permanentes (quadrantes 1-4) e as 20 decíduas (quadrantes 5-8)
   inicializadas com `presence: 'articulado'` e `clinicalConditions: ['higido']`.
2. **Dentição mista — pareamento elemento a elemento**:
   - Maxila: abaixo de 15..11 aparecem 55..51; abaixo de 21..25 aparecem 61..65.
   - Mandíbula: acima de 45..41 aparecem 85..81; acima de 31..35 aparecem 71..75.
   - Molares permanentes (18..16, 26..28, 48..46, 36..38) permanecem ativos.
   - Clicar num dente decíduo (dezenas 50-80) o ativa e desabilita automaticamente
     o par permanente correspondente (dezenas 10-40). Clicar no permanente
     reabilita o permanente e desativa o decíduo correspondente.
3. **Marcação em dois estágios por unidade**:
   - **Estágio 1 (Presença — Seleção Única Obrigatória)**:
     `Articulado`, `Desarticulado`, `Ausente ante-mortem`, `Ausente post-mortem`.
     Se ausente (ante ou post-mortem), aceita exclusivamente essa condição e
     não exibe o Estágio 2.
   - **Estágio 2 (Características Clínicas — Múltipla Seleção de 17 opções)**:
     Aparece apenas quando marcado como `Articulado` ou `Desarticulado`.
     Opções: Parcialmente irrompido, Não irrompido, Hígido, Cariado, Mancha,
     Resto radicular, Fratura, Com material restaurador, Com material protético,
     Implante, Aparelho ortodôntico/ortopédico, Tártaro, Erosão, Abrasão,
     Abfração, Giroversão, Apinhamento.
   - **Legenda na unidade**:
     - `AAM` para ausente ante-mortem; `APM` para ausente post-mortem.
     - Se articulado/desarticulado com 1 opção: sigla de 3 letras (`HIG`, `CAR`, `FRA`, etc.).
     - Se articulado/desarticulado com mais de 1 opção: a legenda de letras é
       substituída pela contagem numérica de características marcadas (`"2"`, `"3"`, `"4"`, ...).
     - Se nenhuma opção clínica selecionada: `ART` ou `DES`.
4. **Edêntulo em lote dinâmico por arcada**:
   - Botões "Edêntulo ante-mortem (Alvéolos fechados)" e "Edêntulo post-mortem (Alvéolos abertos)"
     ao lado de cada arcada (Maxila e Mandíbula).
   - O estado marcado reflete se todos os dentes ativos da arcada estão ausentes.
   - Alterar manualmente qualquer dente para `Articulado` ou `Desarticulado`
     desmarca a opção "Edêntulo" daquela arcada, mantendo todos os demais dentes como ausentes.
5. **Dentes supranumerários por arcada**:
   - Ao clicar em "Dente supranumerário", expande o campo "Descreva a posição".
   - Suporta múltiplos dentes supranumerários por arcada com remoção individual.

### Details

- Cobertura: Testes unitários de regras de negócio em `src/components/__tests__/odontogramLogic.test.ts` (15 testes cobrindo pareamento anatômico, metadados, conversão reversa e normalização de legados).
