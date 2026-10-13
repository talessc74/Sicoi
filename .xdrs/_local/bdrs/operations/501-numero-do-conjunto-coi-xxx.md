---
name: _local-bdr-policy-501-numero-do-conjunto-coi-xxx
description: O número de cada conjunto (e da sua caixa) na COI-INC segue o formato COI-XXX — prefixo COI-, algarismos com zeros à esquerda até 3 dígitos, sem ano — e as telas falam em "COI"/"conjunto", não em "NIC". Use antes de criar, exibir, imprimir ou validar o identificador de um conjunto.
apply-to: src/utils/coiNumber.ts, src/components/NewCollectionModal.tsx, src/App.tsx (createCollectionWithNic), textos de interface e manuais (public/manuais/)
valid-from: 2026-10-13
---

# _local-bdr-policy-501: Número do conjunto no formato COI-XXX

## Context and Problem Statement

Os POPs da COI-INC chamam o identificador do conjunto de NIC (Número de
Identificação do Conjunto), e o sistema criava números no formato
NIC-AAAA-NÚMERO. A curadoria (Nicole, out/2026) decidiu padronizar o
cadastro da ossada e da caixa com o mesmo número usado na planilha de
controle da coleção, no formato COI-XXX.

## Decision Outcome

1. **Formato:** `COI-` + número inteiro positivo com zeros à esquerda até
   3 algarismos (1 → COI-001, 204 → COI-204, 1000 → COI-1000). Sem ano.
   Quem cadastra digita só o número; `formatCoiNumber` normaliza e recusa o
   que não for número.
2. **O mesmo número identifica o conjunto e a sua caixa** (boxCode da
   caixa criada junto com o conjunto).
3. **Telas e manuais dizem "COI" / "conjunto"**, não "NIC". O glossário
   registra que, nos POPs, esse número é chamado de NIC — a transcrição dos
   POPs (`src/data/normativeDocument.ts`) não é alterada.
4. **No código e no banco o campo continua sendo `nic`**, e o texto da
   assinatura (`generateSignaturePayload`, prefixo `|NIC:`) não muda — mudar
   invalidaria os hashes de assinaturas já gravadas.

### Details

- Conjuntos já criados no formato antigo continuam válidos e imutáveis; a
  regra vale para novos cadastros.
