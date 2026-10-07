---
name: _local-adr-policy-203-leitura-publica-de-conjuntos-e-grafo
description: Leitura de conjuntos, histórico e grafo de conhecimento exige sessão autenticada — nenhuma dessas rotas é pública. Use antes de adicionar ou revisar qualquer rota GET que devolva dado de conjunto osteológico, custódia, assinatura ou grafo.
apply-to: server.ts (rotas GET /api/collections, /api/collections/:nic, /api/collections/:nic/history, /api/graph, /api/graph/node/:id, /api/graph/path, /api/graph/search)
valid-from: 2026-10-07
---

# _local-adr-policy-203: Leitura de conjuntos e grafo exige sessão

## Context and Problem Statement

A revisão geral do projeto (Argus + todas as galeras, 06-07/10/2026)
encontrou que `GET /api/collections`, `GET /api/collections/:nic`,
`GET /api/collections/:nic/history` e as quatro rotas de
`/api/graph*` nunca tiveram `requireAuth` — eram as únicas rotas de
leitura do sistema sem exigir sessão, ao lado de `POST`/`PUT` nos
mesmos conjuntos, que já exigiam.

Isso deixava público, sem login, pra qualquer pessoa com a URL do
servidor: a lista completa de NICs cadastrados, o perfil biológico
estimado de cada indivíduo (sexo, idade, estatura) via grafo, as
patologias e exames associados, e o histórico de custódia e assinatura
de cada conjunto — incluindo nome de quem assinou cada fase e quem
carregou/recebeu cada transporte. Diferente das rotas de IA já
conhecidas como públicas (`/api/chat`, `/api/pop-step`,
`/api/transcribe`, ver `_local-adr-policy-103`), que respondem com
texto gerado e não vazam dado de conjunto nenhum, estas sete rotas
devolviam dado forense real.

Question para o Tales: isso era intencional (coleção de referência
acadêmica, consulta pública por natureza) ou precisa de proteção?
Resposta: **não pode ser público — precisa de proteção.**

## Decision Outcome

As sete rotas passam a exigir sessão autenticada (`requireAuth`), igual
ao padrão já usado em `POST /api/collections`, `PUT
/api/collections/:nic` e `POST /api/collections/:nic/photos`. Mesmo
papel de sempre: qualquer pessoa logada (técnico, curador,
administrador) pode ler — não há distinção de papel pra leitura, só
pra escrita e pra Zona de Risco (`_local-adr-policy-201`).

### Details

- Rotas alteradas: `GET /api/collections`, `GET /api/collections/:nic`,
  `GET /api/collections/:nic/history`, `GET /api/graph`, `GET
  /api/graph/node/:id`, `GET /api/graph/path`, `GET /api/graph/search`.
- Nenhuma rota pública alternativa foi criada (ex.: um "modo QR" com
  dado resumido) — `publicQrActive` (Fase 6) hoje é só um campo de
  dado, sem rota própria associada; se um fluxo de consulta pública por
  QR code for decidido no futuro, precisa de sua própria policy,
  desenhada pra expor só o estritamente necessário por conjunto, nunca
  reabrindo a lista completa ou o grafo inteiro.
- Frontend não precisou de nenhuma mudança: todo `fetch` existente
  (`src/services/collectionsService.ts`,
  `src/components/KnowledgeGraphViewer.tsx`) já é same-origin e já
  depende do cookie de sessão por padrão — o mesmo motivo por que
  `POST`/`PUT` nos mesmos arquivos já funcionavam sem alteração de
  cliente.
- Validado com a suíte completa (238 testes, sem nenhum teste HTTP
  dependente do comportamento antigo) e manualmente: as sete rotas
  devolvem 401 sem sessão e 200 com sessão válida, contra um servidor
  local real.

## References

- Arquivos: `server.ts`
- Policy relacionada: `_local-adr-policy-202` (sessão no servidor como
  única fonte de identidade — mesma máquina de autenticação reutilizada
  aqui), `_local-adr-policy-103` (rotas de IA públicas existentes, que
  permanecem fora do escopo desta policy)
- Pendência explícita, não decidida aqui: se/quando um fluxo de consulta
  pública por QR code (`publicQrActive`) for implementado, precisa de
  policy própria.
