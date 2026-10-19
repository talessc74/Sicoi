---
name: _local-edr-policy-104-pendencias-centralizadas
description: 'O que falta preencher numa fase vem de uma única função compartilhada (utils/collectionPendencies.ts), nunca duplicada tela a tela. Use antes de adicionar um campo obrigatório novo em qualquer fase, ou qualquer lista de pendências.'
apply-to: src/utils/collectionPendencies.ts, src/data/phase1Options.ts, src/components/PendenciesModal.tsx, src/components/HomeDashboard.tsx, src/components/Phase1Recebimento.tsx, src/components/Phase2Limpeza.tsx
valid-from: 2026-10-17
---

# _local-edr-policy-104: Pendências por conjunto — uma função, reaproveitada em toda tela

## Context and Problem Statement

O painel inicial tinha uma etiqueta genérica "Pendente: NMI" por
conjunto, sem dizer o que exatamente faltava nem em qual fase. Ao mesmo
tempo, cada tela de fase (Fase 1, Fase 2) tinha sua própria lógica
local de "o que falta preencher" — duplicada, arriscando divergir da
regra real de obrigatoriedade de cada campo com o tempo.

## Decision Outcome

`utils/collectionPendencies.ts` concentra a regra de pendência por fase
(`phase1MissingFields`, `phase2MissingFields` e as equivalentes para as
demais fases) — nenhuma tela decide por conta própria o que falta. O
painel inicial troca a etiqueta "Pendente: NMI" por um link "N
pendências" que abre `PendenciesModal.tsx`: a lista completa de tudo o
que falta em cada fase ainda não assinada, com atalho "Ir para a Fase X"
por item. O NMI só entra na lista a partir da Fase 4, junto com o resto
do que falta nela — não é mais tratado como um caso especial separado.

### Details

- As opções de campo do Formulário A.1 (antes só dentro de
  `Phase1Recebimento.tsx`) saem para `src/data/phase1Options.ts`, pra
  serem a mesma fonte usada tanto pelo formulário quanto pelo cálculo de
  pendências — nunca duas listas de opções que podem divergir.
- Cobertura: `src/utils/__tests__/collectionPendencies.test.ts`.

## References

- Arquivos: `src/utils/collectionPendencies.ts`, `src/data/phase1Options.ts`,
  `src/components/PendenciesModal.tsx`, `src/components/HomeDashboard.tsx`
- Testes: `src/utils/__tests__/collectionPendencies.test.ts`
