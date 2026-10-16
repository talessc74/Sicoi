---
name: _local-adr-policy-207-dados-restritos-saem-so-para-quem-pode-ver
description: Dados da Declaração de Óbito (Fase 0) e de procedência (legalOrigin) só saem do servidor para quem pode vê-los — a tela esconder não basta. Use antes de criar qualquer rota que devolva um conjunto, o histórico ou parte deles, ou que receba um conjunto para salvar.
apply-to: db/collectionRedaction.ts, server.ts (GET/POST/PUT /api/collections*, /api/collections/:nic/history, upload de foto, /api/phase0/extract-death-certificate), src/utils/permissions.ts (canViewPhase0Identity, canViewLegalOrigin), src/components/Phase0Recebimento.tsx, src/types/sgccco.ts (Phase0Data.redacted)
valid-from: 2026-10-16
---

# _local-adr-policy-207: Dados restritos saem do servidor só para quem pode vê-los

## Context and Problem Statement

A Fase 0 (Identificação e DO) guarda nome, CPF, RG, filiação e causa da
morte, e `legalOrigin` guarda cemitério, jazigo e declaração de óbito. A
restrição existia só na tela: o servidor devolvia o conjunto inteiro a
qualquer pessoa logada, e as ferramentas do navegador mostravam tudo a
Pesquisador e Estudante. A foto da DO também podia ser enviada à IA por
qualquer papel.

## Decision Outcome

1. **Fase 0:** Técnico, Curador e Administrador (incl. `admin_access`) —
   `canViewPhase0Identity`. Decisão da curadoria (out/2026): são os mesmos
   que podem usar a leitura da DO pela IA (`/api/phase0/extract-death-certificate`
   devolve 403 aos demais).
2. **Origem legal:** Curador e Administrador, ajustável por pessoa —
   `canViewLegalOrigin` (sem mudança de regra, só passa a valer no servidor).
3. **Saída:** toda rota que devolve conjunto passa por
   `redactCollectionForViewer`: quem não pode ver recebe `phase0 =
   { filhos: [], redacted: true }`, `legalOrigin = {}` e a assinatura da
   Fase 0 sem `dataSnapshotJson` (a cópia assinada é a própria DO). O
   histórico (`redactHistoryForViewer`) tira os valores das entradas
   `phase0.*`; a corrente de hashes é conferida antes, sobre os valores reais.
4. **Entrada:** antes de salvar, `restoreHiddenFields` devolve a Fase 0 e a
   origem guardadas — quem não vê não apaga nem altera, e as fases
   assinadas continuam batendo com a cópia assinada. Assinatura nova da
   Fase 0 vinda de quem não vê é recusada (403).

### Details

- Muda a decisão anterior de acesso (out/2026) em que o Pesquisador tinha,
  na Fase 0, o mesmo acesso de preenchimento do Técnico: agora a Fase 0
  aparece para ele como "acesso restrito".
- Cobertura: `db/__tests__/collectionRedaction.test.ts`,
  `db/__tests__/collectionsRepo.test.ts` (salvar a partir da versão sem
  dados restritos) e `src/components/__tests__/Phase0Recebimento.test.tsx`.
