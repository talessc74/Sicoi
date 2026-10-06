---
name: _local-adr-policy-103-busca-por-semelhanca-ossos
description: Busca inteligente por semelhança entre um osso em mãos (fora do acervo) e os elementos ósseos já cadastrados nos conjuntos — recuperação real no Postgres primeiro, explicação por IA depois, nunca o inverso. Use antes de tocar em qualquer rota/componente de comparação de ossos, grafo de conhecimento, ou nova integração com Gemini.
apply-to: db/boneSimilarity.ts, server.ts (rota /api/bone-similarity/search), src/components/KnowledgeGraphViewer.tsx, src/services/geminiService.ts, src/types/sgccco.ts (GraphNodeType, GraphEdgeRelation)
valid-from: 2026-10-06
---

# _local-adr-policy-103: Busca por semelhança entre ossos

## Context and Problem Statement

O Tales quer, a partir de um osso em mãos fora do acervo (ex.: achado isolado),
escrever uma descrição livre ("fêmur de 37cm, características femininas,
achado na região Norte") e ver o sistema apontar e explicar semelhanças com
elementos ósseos já cadastrados nos ~500 conjuntos — não um filtro rígido
estilo planilha, mas algo que raciocina sobre os dados reais do acervo.

Avaliamos e descartamos trazer o Graphify (ferramenta de terceiros) para
isso — ele mapeia repositórios de código e documentos, não dados
operacionais de uma aplicação, e não tem processo vivo ligado ao Postgres de
produção. A pergunta certa não era "que ferramenta de grafo usar", era "como
combinar busca determinística com explicação por IA sem o modelo inventar
conexão que não existe" — risco real para um sistema que já decidiu, em
`_local-adr-policy-301`, nunca deixar uma identificação forense depender de
inferência não verificável.

## Decision Outcome

**RAG determinístico**: a busca sempre recupera candidatos reais no Postgres
primeiro (filtro estruturado — tipo de osso, lado, sexo/idade/estatura já
estimados na Fase 4), e só depois de ter candidatos reais em mãos é que uma
camada de IA (Gemini, já integrado ao projeto) pode comentar/explicar a
semelhança. O modelo nunca recebe a tarefa de "encontrar" candidatos — só de
"comparar" os que a busca estruturada já trouxe.

### Details

- **v1 usa só o que já existe no schema** — `SkeletalElement` (código
  anatômico, lado, presença, preservação) e `IndividualHypothesis.biologicalProfile`
  (sexo/idade/estatura estimados). Nenhum campo novo no banco. Medida numérica
  exata do osso e região geográfica de origem ficam para uma decisão de schema
  futura, separada desta.
- **Busca estruturada**: `db/boneSimilarity.ts`, `findSimilarSkeletalElements` —
  varre `collections.full_state` (não excluídas) em memória, filtro por
  `boneNameQuery` (substring contra `namePt`, sem acento/caixa — mais natural
  pra texto livre que o código anatômico), `side`, `sexEstimate`,
  `ageCategory`. Nenhuma IA nesta camada; 100% determinístico e testável.
- **Rota**: `POST /api/bone-similarity/search`, `requireAuth` + CSRF normal —
  diferente das rotas de IA já existentes no projeto (`/api/chat`,
  `/api/pop-step`, `/api/transcribe`), que são públicas (gap de segurança
  pré-existente, fora do escopo desta policy, não corrigido aqui). A rota nova
  não repete esse padrão.
- **Investigação, não gravação**: a busca não escreve nada em nenhum
  conjunto — uma sugestão incorreta da IA aparece só na tela de quem está
  explorando, nunca contamina o registro oficial assinado.
- **Visualização**: reaproveita o `KnowledgeGraphViewer.tsx` já existente — um
  nó temporário (o osso descrito, nunca persistido em `graph_nodes`) ligado
  por arestas `relation: 'similar_a'`, `confidence: 'INFERRED'` aos elementos
  reais encontrados. `INFERRED` já existe no tipo e já tem suporte visual
  (traço pontilhado) desde a primeira versão do grafo, mas nunca tinha sido
  gerado por código nenhum — esta é a primeira vez, e o rótulo visual existente
  já comunica "isto é sugestão, não fato", sem precisar inventar UI nova.

### Achado registrado durante a implementação (fora do escopo desta policy)

`db/graphSync.ts` liga todo elemento ósseo ao nó do indivíduo via um ID fixo
(`` `${nic}-IND-01` ``), não ao `id`/`code` real do indivíduo associado — um
conjunto com um indivíduo de código diferente de "IND-01" gera uma aresta
apontando para um nó inexistente (falha de chave estrangeira). Encontrado
pelos testes desta policy, não corrigido aqui (fora de escopo — ver
`_local-adr-policy-202`/disciplina de diff mínimo). Pendência registrada para
PR futuro.

### Round 2 — extração do critério por IA implementada (06/10/2026)

`POST /api/bone-similarity/search` passou a aceitar `{ freeText }` além de
`{ criteria }`: quando `freeText` é dado, o servidor extrai o critério via
Gemini (`responseSchema` com `enum` nos mesmos vocabulários fechados de
`SKELETAL_SIDES`/`SEX_ESTIMATES`/`AGE_CATEGORIES` — o modelo não consegue
devolver um valor que o resto do sistema não entenda) e então chama a mesma
`findSimilarSkeletalElements` da Round 1, sem duplicar a validação (função
`parseBoneSimilarityCriteria` compartilhada pelos dois caminhos). A resposta
agora inclui o `criteria` usado, pra quem chamou ver o que foi interpretado.

Tratamento de erro do Gemini alinhado ao `/api/pop-step` já existente: 401
só para falha de autenticação de verdade, 502 para qualquer outra falha do
serviço externo — nunca 500 genérico (confirmado manualmente: uma chave
inválida de propósito gerou 502, não 500, depois do ajuste). Não foi
possível testar o caminho de sucesso ponta a ponta neste ambiente de
desenvolvimento por falta de uma chave Gemini real — a parte determinística
(schema, parsing, validação) está cobrada pelos testes automatizados; a
extração de verdade (qualidade da interpretação do texto livre) só se
confirma com uso real.

## References

- Arquivos: `db/boneSimilarity.ts`, `db/__tests__/boneSimilarity.test.ts`,
  `server.ts`, `src/components/KnowledgeGraphViewer.tsx` (a partir do PR de
  frontend), `src/services/geminiService.ts` (a partir do PR de extração por IA)
- Policy relacionada: `_local-adr-policy-301` (mesma disciplina de nunca deixar
  IA decidir identificação sem dado real verificável por trás)
- Pendência registrada: bug em `db/graphSync.ts` (ID fixo `IND-01` para o nó
  pai de elemento ósseo) — próximo PR a corrigir, fora desta entrega.
