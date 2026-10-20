---
name: _local-adr-policy-114-dupla-assinatura-fases-4-e-5
description: Fases 4 (Montagem e Inventário & NMI) e 5 (Alterações Ósseas & Marcação) operam com dupla assinatura sequencial — separando a conclusão operacional/física (Técnico ou Curador) da consolidação pericial e científica (exclusiva do Curador Antropólogo). Use antes de alterar os gates de trava, assinaturas ou permissões das Fases 4 e 5.
apply-to: src/components/Phase4Curadoria.tsx, src/components/Phase5Patologias.tsx, src/utils/permissions.ts (canSignAsTechnician), src/types/sgccco.ts (PhaseSignature), db/historyGuard.ts
valid-from: 2026-10-12
---

# _local-adr-policy-114: Dupla assinatura técnica e científica nas Fases 4 e 5

## Context and Problem Statement

No fluxo de curadoria e pesquisa da COI-INC (Portaria DITEC/PF nº 1415/2024 e POP-02), as Fases 4 e 5 reúnem tanto atividades laboratoriais materiais quanto diagnósticos periciais de alta responsabilidade técnico-científica:

1. Na **Fase 4 (Montagem e Inventário & NMI)**: a montagem física do esqueleto em posição anatômica e o registro fotográfico da bancada são tarefas práticas de laboratório, frequentemente conduzidas pelo Técnico de Criminalística. Contudo, a validação do Perfil Biológico (sexo, idade, ancestralidade, estatura), a segregação de indivíduos e o fechamento do Inventário Osteológico e Odontológico são atribuições do Perito / Curador Antropólogo.
2. Na **Fase 5 (Alterações Ósseas & Marcação)**: a aplicação física de resina e tinta indelével (marcação do número COI nos ossos) e o acondicionamento em embalagens inertes são ações físicas de conservação. Já o laudo de patologias, traumas ósseos e anomalias congênitas possui natureza pericial terminativa.

Modelar essas fases com assinatura única forçaria uma escolha inadequada: ou o Técnico ficaria impedido de assinar o trabalho que executou fisicamente na bancada, ou um papel operacional teria autoridade para fechar sozinho a análise pericial da coleção.

## Decision Outcome

**As Fases 4 e 5 operam formalmente com duas assinaturas distintas e encadeadas:**

### 1. Fase 4 — Montagem e Inventário & NMI

* **Assinatura de Montagem (Técnico ou Curador)**:
  * Papel: Autorizada para quem tem `canSignAsTechnician` (Técnicos e Curadores, ou pessoa com `phaseSigningAccess: true`).
  * Requisitos de trava: Pelo menos um indivíduo cadastrado no NMI e a foto do esqueleto montado aprovada em bancada.
  * Efeito: Lacre da montagem física e liberação para o fechamento dos inventários detalhados.
* **Assinatura de Inventário (Curador Antropólogo)**:
  * Papel: **Privativa do Curador** (`currentUser.role === 'curador'`), sem possibilidade de override por pessoa via ABAC (conforme `_local-adr-policy-204`).
  * Requisitos de trava: A Assinatura de Montagem deve estar previamente realizada e travada.
  * Efeito: Lacre definitivo da Fase 4 e avanço da coleção para a Fase 5.

### 2. Fase 5 — Alterações Ósseas & Marcação

* **Assinatura Física / Marcação Óssea (Técnico ou Curador)**:
  * Papel: Autorizada para Técnico ou Curador (`canSignAsTechnician`).
  * Requisitos de trava: Checklist da Fase 5 concluído (marcação física dos elementos ósseos e embalagem inerte finalizadas).
* **Assinatura Científica / Laudo Pericial (Curador Antropólogo)**:
  * Papel: **Privativa do Curador** (`currentUser.role === 'curador'`).
  * Requisitos de trava: Revisão das patologias ósseas concluída e exames complementares anexados.
  * Efeito: Lacre integral da Fase 5, liberando a transferência física para o Armazenamento Definitivo (Fase 6).

### 3. Registro do Pesquisador Externo

* Pesquisadores com autorização ativa podem emitir registros de conferência nas fases técnicas, mas tais registros atuam como notas de estudo e **nunca suprem nem substituem** as assinaturas oficiais do Técnico ou do Curador.

## References

- Arquivos: `src/components/Phase4Curadoria.tsx`, `src/components/Phase5Patologias.tsx`, `src/utils/permissions.ts`
- Policies correlatas: `_local-adr-policy-101` (histórico protegido), `_local-adr-policy-204` (ABAC por pessoa)
