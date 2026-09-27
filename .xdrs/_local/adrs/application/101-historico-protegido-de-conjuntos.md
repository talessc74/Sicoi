---
name: _local-adr-policy-101-historico-protegido-de-conjuntos
description: O servidor é a fonte de verdade do histórico de um conjunto osteológico — assinaturas gravadas nunca são reescritas pelo cliente, toda alteração de campo vira entrada no registro de alterações (change_log) encadeada por hash, e uma assinatura nova guarda a cópia exata do conteúdo assinado. Use ao tocar em db/historyGuard.ts, no fluxo de assinatura/reabertura de fase, ou em qualquer lugar que grave ou leia o histórico de um conjunto.
apply-to: db/historyGuard.ts, db/collectionsRepo.ts, src/services/auditService.ts, src/utils/historyDiff.ts, src/utils/historyVerification.ts
valid-from: 2026-09-27
---

# _local-adr-policy-101: Histórico protegido de conjuntos

## Context and Problem Statement

O SIGCOI grava conjuntos osteológicos inteiros a cada mudança — o navegador
envia o objeto completo, não um diff. Isso cria um risco estrutural: nada
impede, por bug ou por adulteração deliberada, que uma requisição chegue
com uma assinatura já gravada removida, alterada, ou com uma fase travada
reescrita sem reabertura formal. Sem uma regra explícita no servidor, a
integridade da cadeia de custódia dependeria só do cliente se comportar.

Question: quem é a fonte de verdade do histórico de um conjunto — o que o
navegador manda, ou o que já está gravado?

## Decision Outcome

**O servidor é sempre a fonte de verdade do histórico já gravado. O
cliente propõe; o servidor decide o que persiste.**

A cada gravação (`db/historyGuard.ts`), o servidor:

1. **Recusa remover ou alterar uma assinatura já gravada** — comparando a
   lista recebida contra a lista armazenada por identidade
   (fase + data + hash). Se uma assinatura salva não aparece na lista
   recebida, ou aparece com outro signatário, a gravação inteira é
   rejeitada (`HistoryViolationError`).
2. **Confere o hash de toda assinatura nova** contra o conteúdo da fase
   exatamente como veio na requisição, e só então aceita — e guarda essa
   cópia exata (`dataSnapshotJson`) para conferência futura, mesmo que o
   formulário mude depois.
3. **Nunca reconfere o hash de uma assinatura já gravada** contra o estado
   atual do banco — só a compara por identidade contra o que já tinha.
   Isso existe porque o Postgres devolve as chaves de um JSON em outra
   ordem da que o navegador usou para calcular o hash original; reconferir
   geraria falsos positivos de "Assinatura inválida" nete todo carregamento.
4. **Reabertura de fase travada exige justificativa técnica** — sem isso,
   qualquer edição em campo de fase já assinada é rejeitada.
5. **Toda diferença de campo vira uma entrada no registro de alterações**
   (`change_log`), calculada por `diffValues`/`canonicalJson`
   (`src/utils/historyDiff.ts`) comparando a versão anterior com a
   recebida — quem mudou, quando, valor antes e depois.
6. **O registro de alterações é encadeado por hash** — cada entrada inclui
   o hash da anterior, então uma entrada adulterada quebra a corrente e
   fica detectável.
7. **Dados restritos de procedência**: o registro de alterações guarda que
   o campo mudou e quem mudou, mas não os valores em si.

### Details

- Garantias também reforçadas por gatilhos no próprio Postgres — a
  proteção não depende só da camada de aplicação.
- `src/utils/historyVerification.ts` reconfere no navegador, a partir da
  cópia guardada, o lacre de cada assinatura — é a mesma lógica de geração
  de payload usada no servidor (`src/services/auditService.ts`), não uma
  segunda implementação.
- Assinaturas emitidas antes desta decisão não têm `dataSnapshotJson` e
  aparecem como "sem cópia" na reconferência — não são tratadas como
  inválidas, só como não-reconferíveis.

## References

- Arquivos: `db/historyGuard.ts`, `db/collectionsRepo.ts`,
  `src/services/auditService.ts`, `src/utils/historyDiff.ts`,
  `src/utils/historyVerification.ts`
- Testes: `db/__tests__/protectedHistory.test.ts`
- Commits: a64c0cc, 271a9da, 844ee7f (nicoledamascena-art/SIGCOI, 2026-09-25)
