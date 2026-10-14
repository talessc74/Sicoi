---
name: _local-adr-policy-105-fase-0-recebimento
description: Fase 0 (Recebimento) transcreve os dados da Declaração de Óbito antes da Fase 1 — manual ou por foto com extração real via Gemini — com assinatura única do Técnico, nunca o padrão de assinatura dupla de Fase 4/5. Use antes de alterar o fluxo de fases, o modelo de assinatura, ou qualquer extração por IA a partir de imagem.
apply-to: src/types/sgccco.ts (Phase0Data, Phase0ChildRecord, PhaseNumber), src/data/phaseDefaults.ts (createEmptyPhase0Data), src/components/Phase0Recebimento.tsx, src/services/geminiService.ts (extractDeathCertificateFields), server.ts (rota /api/phase0/extract-death-certificate), db/historyGuard.ts (SIGNABLE_PHASES), src/components/PhaseProgressRibbon.tsx, src/components/AuditTimelineView.tsx, src/components/HomeDashboard.tsx, src/App.tsx
valid-from: 2026-10-14
---

# _local-adr-policy-105: Fase 0 — Recebimento

## Context and Problem Statement

O processo real da COI-INC começa antes da Fase 1 (Recebimento & A.1): a
Declaração de Óbito (D.O.) chega em papel ou foto, e os dados pessoais e do
óbito precisam ser transcritos por alguém antes de qualquer trabalho
osteológico começar. Até esta decisão, o sistema não tinha lugar nenhum
para esse passo — a Fase 1 começava já assumindo que esses dados existiam.

Question: como abrir uma fase nova, responsabilidade do Técnico, com
preenchimento manual ou por foto da D.O. (extração automática, confirmada
por humano antes de liberar a Fase 1), sem repetir o padrão de assinatura
dupla já usado em Fase 4/5 — e sem quebrar o `currentPhase`/`signatures` já
existentes para qualquer conjunto anterior a esta decisão?

## Decision Outcome

**Fase 0 é uma fase de assinatura única (como Fase 1/2/3), nunca dupla
(como Fase 4/5) — e nunca embute um objeto de assinatura dentro da própria
`phase0`.** `PhaseNumber` ganha `0`; `OsteologicalCollection.phase0?` é
opcional, de forma que conjuntos criados antes desta decisão (sem
`phase0`) continuam válidos e pulam direto para a Fase 1.

### Details

- **Campos da D.O.** (`Phase0Data`): identificação (nome, sexo, cor,
  nacionalidade, naturalidade — cidade/UF separados, com `BrazilianUf`
  fechado nos 27 estados —, nascimento, idade preenchida manualmente pelo
  Técnico — nunca calculada —, estado civil, profissão, CPF, RG), filiação
  (pai/mãe: nome, falecido(a), natural, estado civil, profissão), cônjuge,
  dados do óbito (local, cidade/UF, data, hora, médico/CRM, causa da
  morte), destino (cemitério, data de inumação/exumação), e `filhos:
  Phase0ChildRecord[]` — lista estruturada (id/nome/idade), não um campo de
  texto livre. Todo campo é opcional: a D.O. real frequentemente chega
  incompleta.
- **Duas formas de preenchimento**: manual, ou por foto/PDF da D.O. via
  `POST /api/phase0/extract-death-certificate` (Gemini, `requireAuth`,
  limite de ~15MB decodificados). A imagem nunca é armazenada — só usada
  na chamada. O Técnico sempre revisa e confirma cada campo no formulário
  antes de assinar; a extração nunca assina por conta própria.
  `researcherConfirmation` registra essa confirmação.
- **Assinatura única, sem campo embutido** — diferente de propósito do
  padrão de Fase 4/5: `handleSignPhase` em `Phase0Recebimento.tsx` grava
  `updated.phase0 = p0` sem nenhum campo de assinatura dentro dele; o
  registro de quem assinou vive só no array `signatures` de nível
  superior, exatamente como Fase 1/2/3. `SIGNABLE_PHASES` em
  `db/historyGuard.ts` passou a incluir `0`, protegendo uma Fase 0
  assinada contra edição silenciosa como as demais fases.
- **Bug real encontrado e corrigido no mesmo dia** (`_local-adr-policy-203`
  documenta o mesmo tipo de cuidado com verificação server-side): a
  primeira versão desta fase copiou o padrão de Fase 4/5 por engano —
  calculava o hash da assinatura **antes** de embutir um
  `technicianReceivalSign` em `phase0`, mas salvava `phase0` **com** esse
  campo já embutido. Como o servidor recalcula o hash sobre o que recebeu
  (exatamente como chegou), o hash nunca batia — "Assinatura inválida...
  hash não confere" para todo mundo que tentasse assinar a Fase 0.
  Corrigido removendo o campo embutido por completo (Fase 0 não precisa
  dele, só Fase 4/5 precisam, porque só nelas o hash final é calculado
  **depois** de embutir as duas assinaturas parciais). Coberto por um
  teste de integração real em `db/__tests__/protectedHistory.test.ts`.
- **Acesso**: `isPhaseAccessible` em `PhaseProgressRibbon.tsx` — Fase 0
  sempre acessível; Fase 1 acessível se não existir `phase0` (conjunto
  legado) ou se a Fase 0 já estiver assinada. `AuditTimelineView.tsx` e
  `HomeDashboard.tsx` passam a cobrir Fase 0 a Fase 7 (antes, 1 a 7).

## References

- Arquivos: `src/types/sgccco.ts`, `src/data/phaseDefaults.ts`,
  `src/components/Phase0Recebimento.tsx`, `src/services/geminiService.ts`,
  `server.ts`, `db/historyGuard.ts`, `src/components/PhaseProgressRibbon.tsx`,
  `src/components/AuditTimelineView.tsx`, `src/components/HomeDashboard.tsx`
- Testes: `src/components/__tests__/Phase0Recebimento.test.tsx`,
  `db/__tests__/protectedHistory.test.ts` (regressão do bug de hash)
- Policy relacionada: `_local-adr-policy-202` (mesmo cuidado de nunca
  deixar o cliente decidir o que conta como prova de identidade/assinatura)
