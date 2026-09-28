---
name: _local-adr-policy-202-login-real-sessao-servidor
description: A partir de agora, "ser alguém" no sistema é provar matrícula + senha e receber uma sessão assinada pelo servidor (cookie httpOnly) — nunca o navegador declarando um actorId. Use antes de adicionar qualquer rota nova que precise saber quem está agindo, ou antes de migrar uma rota existente do modelo antigo (Fase 2).
apply-to: db/authRepo.ts, server.ts (middleware de sessão, requireAuth/requireSessionRole, rotas /api/auth/*), db/migrations/009_auth.sql
valid-from: 2026-09-28
---

# _local-adr-policy-202: Login real — sessão no servidor como única fonte de identidade

## Context and Problem Statement

A auditoria de segurança (§ Segurança, set/2026) encontrou a falha mais
grave do sistema até aqui: nada autenticava quem estava operando.
`resolveActor`/`requireAdmin` em `server.ts` liam um `actorId` que o
próprio navegador informava no corpo da requisição, buscavam a pessoa
correspondente em `people` e confiavam no papel encontrado — sem senha,
sem sessão, sem prova nenhuma. Como `GET /api/people` também era público
e expunha o UUID de todas as pessoas cadastradas, incluindo
administradores, bastava saber (ou adivinhar) um UUID para agir como
qualquer papel, inclusive excluir dados pela Zona de Risco
(`_local-adr-policy-201`).

Question: como provar de verdade quem está operando, sem quebrar o fluxo
de trabalho de ~30 pessoas já cadastradas, e sem reabrir a discussão já
resolvida sobre histórico protegido e exclusão reversível?

## Decision Outcome

**A identidade de quem está agindo passa a vir exclusivamente de uma
sessão criada no login — nunca de um campo que o cliente envia.**

1. `people` ganha `password_hash` (bcrypt, custo 12) — nulo até a pessoa
   definir a senha pela primeira vez — e `registration_number` passa a
   ser único: é o identificador de login (matrícula + senha).
2. `password_setup_tokens`: o Administrador gera, por pessoa, um link de
   "definir senha" de uso único e com validade (token de alta entropia,
   entregue por fora do sistema — WhatsApp, e-mail). Só o hash SHA-256 do
   token é gravado; o token em si só existe uma vez, na resposta da
   geração.
3. Sessão de login (`express-session` + `connect-pg-simple`, tabela
   `session`, cookie httpOnly/secure em produção/sameSite=lax, 12h
   rolling) guarda só o `personId`. Nome e papel são buscados no banco a
   cada requisição — nunca confiados do cookie ou do cliente.
4. `POST /api/auth/login` confere matrícula + senha (bcrypt.compare) e
   cria a sessão; um freio simples em memória trava 5 tentativas falhas
   seguidas da mesma matrícula por 15 minutos. `POST /api/auth/logout`
   destrói a sessão. `GET /api/auth/me` devolve quem está logado a partir
   da sessão. `POST /api/auth/setup-links` (só Administrador autenticado)
   gera o link de definição de senha; `POST /api/auth/setup-password`
   (pública — o token é a própria prova) consome o link e grava a senha.
5. `requireAuth`/`requireSessionRole` leem `req.session.personId` — nunca
   `req.body.actorId` ou `req.query.actorId`.

### Details

- **Fase 1 (esta policy) é aditiva**: as rotas antigas
  (`resolveActor`/`requireAdmin`, baseadas em `actorId`) continuam
  existindo sem alteração. Migrar cada rota existente para exigir sessão
  é a Fase 2, deliberadamente separada para manter o diff desta fase
  revisável.
- Senha (escolhida por humano, baixa entropia) usa bcrypt — hash
  não-determinístico, salgado, caro de força-bruta. Token de definição de
  senha (gerado pelo sistema, alta entropia) usa SHA-256 — determinístico
  de propósito, para permitir busca por igualdade; seguro porque a
  entropia do token, não o algoritmo de hash, é a defesa.
- `SESSION_SECRET` segue a mesma regra de `DATABASE_URL`: sem valor
  default em produção — o servidor falha ao subir se não estiver
  configurada.
- Cobertura: `db/__tests__/authRepo.test.ts` (13 testes) — login correto
  e incorreto, matrícula sem senha ainda, matrícula inexistente, ciclo
  completo de token de definição de senha (sucesso, token inexistente,
  já usado, expirado). As rotas HTTP em si foram validadas manualmente
  (login → /me → setup-links → logout → /me) em vez de teste de
  integração automatizado — mesma lacuna já registrada para as rotas de
  admin em `_local-adr-policy-201`.

## References

- Arquivos: `db/migrations/009_auth.sql`, `db/authRepo.ts`, `server.ts`
- Testes: `db/__tests__/authRepo.test.ts`
- Policy relacionada: `_local-adr-policy-201` (a Zona de Risco é
  exatamente o tipo de ação que mais precisava desta prova de identidade)
- Fases seguintes (não cobertas aqui): Fase 2 — migrar rotas existentes
  de `actorId` para sessão; Fase 3 — telas de login/logout reais e
  "definir senha", removendo o troca-de-perfil de um clique; Fase 5 —
  CSRF, rate-limit persistente, ajuste fino de expiração de sessão.
