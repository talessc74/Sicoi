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
   passa a gerar as 32 posições permanentes (quadrantes 1-4) e as 20
   decíduas (quadrantes 5-8) de uma vez — qual conjunto é editável depende
   só da dentição escolhida, nunca da presença do registro.
2. **Dentição mista — par de quadrante** (`denticaoQuadrantePares`, chave
   1-4): cada par anatômico (1↔5 sup. direito, 2↔6 sup. esquerdo, 3↔7 inf.
   esquerdo, 4↔8 inf. direito) guarda qual lado (`'permanente'` ou
   `'decidua'`) está em uso agora. O lado inativo do par fica
   desabilitado na tela — nunca registra as duas dentições ao mesmo tempo
   pra mesma posição anatômica.
3. **Edêntulo em lote**: botões "ante-mortem"/"post-mortem" por arcada
   (maxila/mandíbula), restritos aos dentes editáveis no momento (respeita
   o lado ativo do par em dentição mista). O botão reflete se a arcada
   inteira já está naquela condição — editar um dente manualmente já tira
   a marcação, sem precisar de campo extra.
4. **Dentes supranumerários** (`supernumeraryTeeth`): lista livre de
   descrição de posição, já que não ocupam uma posição FDI padrão.

### Details

- Pendente nesta sequência (não decidido ainda): o modelo de condição do
  dente em dois estágios (Estágio 1 obrigatório + Estágio 2 com múltiplas
  condições clínicas) depende da lista exata das 17 opções do Estágio 2 —
  ainda não confirmada com a curadoria.
- Cobertura: suíte geral (`npx vitest run`); sem teste dedicado a
  `OdontogramViewer.tsx` ainda.
