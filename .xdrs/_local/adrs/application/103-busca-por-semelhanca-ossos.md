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

### Round 3 — IA explica a semelhança sobre os candidatos reais (06/10/2026)

Quando a busca usa `freeText`, depois de encontrar os candidatos reais
(Round 1), o Gemini é chamado de novo pra comparar cada um (até 20, limite
de custo/tamanho de prompt) com a descrição do usuário, devolvendo
`{ elementId, similarityScore, explanation, confidence }` por candidato —
`responseSchema` do tipo `ARRAY`, igual ao padrão já usado em `/api/pop-step`,
agora numa lista em vez de um objeto único.

A validação da resposta (`parseBoneSimilarityExplanations`, movida pra
`db/boneSimilarity.ts` pra ficar testável sem IA nem banco) descarta todo
`elementId` que não esteja entre os candidatos reais passados no prompt —
o modelo não tem como inventar um osso que não existe e tê-lo aceito pelo
servidor. Também descarta tipo errado em qualquer campo e qualquer
`confidence` fora do vocabulário fechado (`alta`/`media`/`baixa`), e limita
`similarityScore` a `[0, 1]` mesmo se o modelo devolver fora da faixa.

**Falha na explicação nunca derruba a busca**: se o Gemini falhar ao
explicar, a rota devolve os candidatos reais sem `similarity` e um
`explanationError` — quem está comparando ossos continua vendo o resultado
determinístico, só sem o comentário da IA. Testado manualmente (chave
inválida de propósito) e também pelos 6 testes novos de
`parseBoneSimilarityExplanations` (elementId inventado descartado, tipo
errado descartado, confidence fora do vocabulário descartada, score fora de
`[0,1]` recortado, resposta que não é lista tratada como vazia).

Limitação honesta, igual à Round 2: sem chave Gemini real neste ambiente, o
caminho de sucesso (qualidade da explicação de verdade) não foi validado
ponta a ponta — só a parte determinística e a validação defensiva da
resposta.

### Round 4 — frontend: 4º painel no grafo existente (06/10/2026)

`src/components/KnowledgeGraphViewer.tsx` ganhou o painel "Busca por
Semelhança (osso em mãos)": uma descrição livre (textarea), botão de busca,
e lista de candidatos reais — reaproveitando o mesmo componente que já
desenha o grafo persistido, sem tela nova.

O resultado da busca nunca é gravado em `graph_nodes`/`graph_edges` — vira
um `boneOverlay` calculado em memória (`useMemo`, dependente só de
`boneSearchResult`), com posição própria (canto inferior direito do SVG,
longe do centro do grafo persistido) pra não competir visualmente com o
grafo do conjunto selecionado. `GraphNodeType` ganhou `'osso_consultado'`
(só o nó temporário) e `GraphEdgeRelation` ganhou `'similar_a'`
(`confidence: 'INFERRED'` sempre) — a primeira vez que o sistema gera uma
aresta `INFERRED` de verdade; o traço pontilhado já existia desde a primeira
versão do grafo, só nunca tinha sido usado.

Os candidatos reais reaproveitam o tipo `'elemento'` já existente (mesma cor,
mesmo ID — `ELEM-{nic}-{anatomicalCode}`, igual ao que `graphSync.ts` já usa
pros elementos persistidos), então um candidato que já esteja no grafo
oficial aparece com a mesma identidade visual nos dois lugares.

Verificado com Playwright de ponta a ponta, duas vezes:
1. **Caminho real** (chave Gemini inválida de propósito, mesma limitação das
   Rounds 2-3): confirma que o erro aparece formatado na tela, sem travar a
   aplicação, com o botão "Limpar busca" disponível.
2. **Caminho de sucesso** (resposta da rota interceptada/mockada só pra esta
   verificação visual — não é uma IA de verdade respondendo): confirma o nó
   "Osso consultado" (rosa) desenhado isolado do grafo principal, ligado por
   aresta pontilhada rosa ao candidato real, e a lista lateral mostrando
   "87% parecido (confiança alta) — [explicação]".

## References

- Arquivos: `db/boneSimilarity.ts`, `db/__tests__/boneSimilarity.test.ts`,
  `server.ts`, `src/components/KnowledgeGraphViewer.tsx` (a partir do PR de
  frontend), `src/services/geminiService.ts` (a partir do PR de extração por IA)
- Policy relacionada: `_local-adr-policy-301` (mesma disciplina de nunca deixar
  IA decidir identificação sem dado real verificável por trás)
- Pendência registrada: bug em `db/graphSync.ts` (ID fixo `IND-01` para o nó
  pai de elemento ósseo) — próximo PR a corrigir, fora desta entrega.
