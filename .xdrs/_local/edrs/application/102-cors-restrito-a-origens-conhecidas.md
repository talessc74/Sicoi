---
name: _local-edr-policy-102-cors-restrito-a-origens-conhecidas
description: O servidor só devolve Access-Control-Allow-Origin para APP_URL (produção) e localhost/127.0.0.1 (dev) — nunca mais '*'. Use ao revisar qualquer middleware de CORS ou ao decidir se uma rota nova precisa de cabeçalho CORS.
apply-to: server.ts (middleware de CORS, topo do arquivo)
valid-from: 2026-09-27
---

# _local-edr-policy-102: CORS restrito a origens conhecidas

## Context and Problem Statement

Uma deliberação da Galera de Segurança (Sentinel) sobre proteção de dados,
pedida pelo Tales antes de o sistema receber dados reais, encontrou
`Access-Control-Allow-Origin: '*'` em toda rota da API — herdado de quando
este app rodava embutido num iframe do AI Studio, num domínio diferente do
seu. Hoje o Express serve o front-end (`dist/`) e a API no mesmo domínio;
uma requisição do próprio site nunca precisa desse cabeçalho, porque não é
cross-origin. O `'*'` só abria a porta para qualquer site de terceiros ler
a resposta das rotas da API a partir do navegador de quem tivesse o SIGCOI
aberto.

Question: como fechar isso sem quebrar o desenvolvimento local (Vite em
porta separada da API)?

## Decision Outcome

**Só ecoar `Access-Control-Allow-Origin` para origens conhecidas —
`APP_URL` (se configurado) e qualquer `localhost`/`127.0.0.1` fora de
produção — e não emitir o cabeçalho para nenhuma outra origem.**

Isso não afeta quem usa o site normalmente (mesma origem, cabeçalho CORS
irrelevante) nem o dev local. Fecha só o acesso cross-origin de terceiros.

### Details

- Verificado manualmente com `curl -H "Origin: ..."` contra o servidor de
  dev: origem de terceiro não recebe o cabeçalho; `localhost` recebe.
- Sem teste automatizado de integração HTTP para isto (mesma lacuna já
  registrada em `_local-adr-policy-201`) — a verificação foi manual.
- `APP_URL` está declarada em `.env.example`/`render.yaml` mas não é lida
  em nenhum outro lugar do código hoje; se ficar sem valor em produção, o
  efeito prático é o mesmo de antes de um jeito seguro (nenhuma origem
  cross-origin nova é liberada, só a mesma origem que já funcionava).

## References

- Arquivo: `server.ts` (middleware de CORS)
- PR: nicoledamascena-art/SIGCOI (exclusão administrativa + achados de segurança, set/2026)
