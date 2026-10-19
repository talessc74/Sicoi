---
name: _local-adr-policy-107-coi-recusa-duplicar-nic
description: createCollection distingue retentativa da própria criação (mesmo id gerado no navegador) de uma tentativa real de duplicar um NIC já existente (id diferente) — só a primeira é idempotente. Use antes de alterar createCollection ou qualquer rota que crie um conjunto.
apply-to: db/collectionsRepo.ts (createCollection), server.ts (POST /api/collections), src/utils/errorMessages.ts (CONJUNTO_JA_EXISTE), src/App.tsx (createCollectionWithNic), src/components/NewCollectionModal.tsx
valid-from: 2026-10-17
---

# _local-adr-policy-107: Criar um COI recusa duplicar um NIC já existente

## Context and Problem Statement

Bug relatado pelo Tales (out/2026): a partir do COI-002, criar um conjunto
com um NIC que já existia no acervo não dava erro — o sistema devolvia
silenciosamente o conjunto antigo, como se a criação tivesse funcionado.
A causa era a idempotência de `createCollection` (`ON CONFLICT (nic) DO
NOTHING` + sempre devolver a linha atual), pensada só pra proteger contra
retentativa de rede/StrictMode do React, sem conseguir distinguir isso de
uma tentativa real de duplicar um NIC alheio.

## Decision Outcome

`createCollection` compara o `collection.id` (gerado uma vez no navegador
por tentativa de criação) com o `id` já salvo na linha existente:

1. **Mesmo id** → retentativa da própria tentativa. Continua idempotente:
   não sobrescreve, devolve o que já está no banco.
2. **Id diferente** → tentativa real de duplicar um NIC que já pertence a
   outro conjunto. Lança erro com `code: 'CONJUNTO_JA_EXISTE'` (HTTP 409 em
   `POST /api/collections`), nunca um sucesso silencioso.

### Details

- `CONJUNTO_JA_EXISTE` traduzido no cliente: "Este conjunto (COI) já existe
  no acervo. Verifique o número antes de criar um novo."
- Cobertura: `db/__tests__/collectionsRepo.test.ts` — um teste para cada
  caminho (retentativa idempotente vs. duplicata recusada).
- `createCollectionWithNic` (App.tsx) já gerava um `id` novo por tentativa
  (`col-${Date.now()}`) — a mudança é só na distinção do servidor, nenhuma
  mudança no cliente foi necessária.
