---
name: _local-adr-policy-106-busca-referencia-entre-individuos
description: O modal "Buscar Referência" da Fase 4 (§15) compara, de forma determinística e sem IA, o perfil biológico de um indivíduo com os de outros indivíduos já cadastrados em outros conjuntos do acervo — nunca o próprio conjunto, nunca um "indeterminado" como falso-positivo. Use antes de alterar a busca de referência da Fase 4, ou antes de confundi-la com a busca por semelhança entre ossos.
apply-to: db/individualReferenceSearch.ts, server.ts (rota /api/phase4/individuals/reference-search), src/services/collectionsService.ts (searchIndividualReferences), src/components/Phase4Curadoria.tsx (handleSearchReference)
valid-from: 2026-10-14
---

# _local-adr-policy-106: Busca de referência real entre indivíduos (Fase 4, §15)

## Context and Problem Statement

O modal "Buscar Referência" da Fase 4 mostrava texto fixo — citações
bibliográficas e um "caso do grafo" hardcoded, iguais para qualquer
indivíduo, nunca consultando o acervo de verdade. A pergunta de quem
cuida é real: "encontro outro caso parecido com este na coleção?" —
e a resposta até aqui era sempre a mesma, decorativa.

## Decision Outcome

**Busca determinística, sem IA**: compara o perfil biológico já estimado
do indivíduo (sexo e idade, cada um com seu `methodCode`) com os demais
indivíduos cadastrados em **outros** conjuntos do acervo, exigindo o
mesmo método de estimativa dos dois lados para considerar o caso
relevante — método diferente não é comparável, mesmo valor estimado.

### Details

- `db/individualReferenceSearch.ts`: varre `collections.full_state` (não
  excluídos) em memória — mesmo padrão de `db/boneSimilarity.ts`
  (`_local-adr-policy-103`) — sem gravar nada, sem chamar nenhum modelo de
  IA. Puramente determinístico e testável.
- **Nunca inclui o próprio conjunto** nos resultados — comparar um
  indivíduo com ele mesmo (ou com outro do mesmo conjunto) não é
  "referência externa".
- **"Indeterminado" nunca é tratado como match** — um perfil biológico
  sem estimativa (`sexEstimate`/`ageCategory` ausente ou `indeterminado`)
  não gera falso-positivo de "caso parecido"; achado e corrigido numa
  rodada de revisão antes de mesclar.
- Limite de 20 resultados por busca.
- **Rota**: `POST /api/phase4/individuals/reference-search`,
  `requireAuth` — deriva o critério a partir do indivíduo já persistido
  no banco (`nic` + `individualId`), nunca de um perfil biológico que o
  cliente mande solto no corpo da requisição.
- **Não é a mesma coisa que a busca por semelhança entre ossos**
  (`_local-adr-policy-103`): aquela compara **elementos ósseos**
  (`SkeletalElement`), usa IA para extrair critério de texto livre e
  explicar a semelhança, e vive no Grafo de Conhecimento. Esta compara
  **indivíduos** (perfil biológico completo), nunca usa IA, e vive só no
  modal de Curadoria da Fase 4. São features-irmãs do mesmo princípio —
  recuperação determinística primeiro —, não uma substituindo a outra.

## References

- Arquivos: `db/individualReferenceSearch.ts`, `server.ts`,
  `src/services/collectionsService.ts`, `src/components/Phase4Curadoria.tsx`
- Testes: `db/__tests__/individualReferenceSearch.test.ts` (match por
  sexo+método, não-match quando o método difere, nunca inclui o próprio
  indivíduo, limite de 20 resultados)
- Policy relacionada: `_local-adr-policy-103` (mesmo princípio de
  recuperação determinística antes de qualquer camada de IA — aqui sem
  camada de IA nenhuma)
