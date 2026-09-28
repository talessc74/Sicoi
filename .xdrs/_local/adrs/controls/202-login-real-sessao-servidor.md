---
name: _local-adr-policy-202-login-real-sessao-servidor
description: "Ser alguém" no sistema é provar matrícula + senha e receber uma sessão assinada pelo servidor (cookie httpOnly) — nunca o navegador declarando um actorId, nem um seletor de perfil de um clique. Use antes de adicionar qualquer rota ou tela nova que precise saber quem está agindo, ou antes de mudar o fluxo de cadastro/gestão de contas.
apply-to: db/authRepo.ts, db/peopleRepo.ts, server.ts (middleware de sessão, csrfProtection, requireAuth/requireSessionRole, rotas /api/auth/* e /api/people), db/migrations/009_auth.sql, db/migrations/010_password_reset_requests.sql, db/migrations/011_login_attempts.sql, src/services/authService.ts, src/services/csrf.ts, src/services/collectionsService.ts, src/services/adminService.ts, src/services/peopleService.ts, src/services/geminiService.ts, src/components/LoginScreen.tsx, src/components/BootstrapAdminSetup.tsx, src/components/SetPasswordScreen.tsx, src/components/ForgotPasswordScreen.tsx, src/components/ChangePasswordModal.tsx, src/components/Header.tsx, src/components/SettingsView.tsx
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
   cria a sessão; um freio persistente em Postgres (`login_attempts`)
   trava 5 tentativas falhas seguidas da mesma matrícula por 15 minutos.
   `POST /api/auth/logout`
   destrói a sessão. `GET /api/auth/me` devolve quem está logado a partir
   da sessão. `POST /api/auth/setup-links` (só Administrador autenticado)
   gera o link de definição de senha; `POST /api/auth/setup-password`
   (pública — o token é a própria prova) consome o link e grava a senha.
5. `requireAuth`/`requireSessionRole` leem `req.session.personId` — nunca
   `req.body.actorId` ou `req.query.actorId`.

### Details

- **Fase 1 foi aditiva**: as rotas antigas (`resolveActor`/`requireAdmin`,
  baseadas em `actorId`) continuaram existindo sem alteração, para manter
  o diff revisável. **Fase 2 (concluída)** removeu esse modelo por
  completo: `resolveActor`/`requireAdmin` foram apagados; toda rota que
  grava dados (`POST`/`PUT /api/collections`, todo `/api/admin/*`) agora
  passa por `requireAuth` (e `requireSessionRole('administrador')` nas
  rotas administrativas), derivando o ator de `req.currentPerson` — nunca
  de `req.body.actorId`/`req.query.actorId`. Os serviços do front-end
  (`collectionsService.ts`, `adminService.ts`) e `AdminDangerZone.tsx`
  pararam de enviar `actorId`.
- **Fase 3 (concluída)**: `LoginScreen.tsx` (matrícula + senha),
  `BootstrapAdminSetup.tsx` (cadastro do 1º Administrador, só quando o
  banco está vazio — `POST /api/auth/bootstrap-admin`, protegido por trava
  consultiva no Postgres contra duas execuções simultâneas) e
  `SetPasswordScreen.tsx` (tela pública alcançada por `?token=...`, sem
  depender de sessão) substituem por completo o antigo troca-de-perfil de
  um clique em `Header.tsx`/`SettingsView.tsx`. `GET/POST/DELETE
  /api/people` exigem sessão de Administrador (`requireAdminSession`) — a
  única exceção continua sendo o bootstrap do primeiro Administrador.
  **Correção pós-revisão (mesmo dia)**: `GET /api/people` tinha ficado só
  com `requireAuth` (qualquer papel logado), não `requireAdminSession` —
  nome, papel, instituição e matrícula (o identificador de login) de
  todo mundo ficava visível para qualquer pessoa autenticada, inclusive
  Estudante e Pesquisador, quando só o Administrador usa essa lista.
  Corrigido para `requireAdminSession` como as outras duas; `App.tsx` só
  busca `/api/people` quando `currentUser.role === 'administrador'`
  (evita um 403 previsível para os demais papéis), e `SettingsView.tsx`
  esconde o painel "Pessoas Cadastradas" inteiro fora desse papel, não só
  os botões de ação. `SettingsView.tsx` ganha "Gerar link de acesso" por
  pessoa (mostra o link uma única vez, com botão copiar), documentado
  passo a passo em `public/manuais/manual-administrador-contas-v3.html`.
- **"Esqueci a senha" (concluído)**: `ForgotPasswordScreen.tsx`, alcançada
  por um link na `LoginScreen.tsx`. Sem e-mail/SMS configurado no sistema,
  não redefine nada por conta própria — só registra um pedido
  (`password_reset_requests`, migração `010_password_reset_requests.sql`)
  visível ao Administrador em `SettingsView.tsx` ("Pedidos de Redefinição
  de Senha"). `POST /api/auth/forgot-password` é pública e nunca revela se
  a matrícula existe (mesmo cuidado do login); não duplica pedido já
  pendente para a mesma pessoa. Gerar o link de acesso pela fila ou pela
  lista de pessoas resolve o pedido automaticamente
  (`resolvePendingPasswordResetRequests`).
- **Sem risco de implantação pendente**: com a Fase 3 pronta, esta branch
  já é segura para produção — o primeiro deploy encontrará o banco vazio
  (ou as ~30 pessoas já cadastradas, sem senha) e pedirá o cadastro do
  primeiro Administrador antes de liberar o resto do sistema; a partir
  daí, cada pessoa existente recebe seu link de definição de senha por
  fora do sistema.
- **"Trocar minha senha" (concluído)**: `ChangePasswordModal.tsx`,
  alcançado pelo menu do nome no `Header.tsx` — vale para qualquer papel
  logado, não só Administrador. `POST /api/auth/change-password`
  (`requireAuth`) exige a senha atual (`changeOwnPassword` em
  `authRepo.ts`, `bcrypt.compare` contra o hash gravado) mesmo com a
  sessão válida — justamente para o caso de sessão aberta num computador
  compartilhado; sem a senha atual certa, nada muda.
- **Limitação conhecida remanescente**: nem gerar um link novo, nem a
  pessoa trocar a própria senha, encerra sessões já abertas em outro
  computador/navegador com a senha antiga — a troca só se aplica ao
  próximo login. Isso é documentado no manual do Administrador como algo
  a considerar em caso de suspeita de acesso indevido (avisar a pessoa
  para também fechar sessões abertas, ou remover e recriar a conta em
  casos mais sérios).
- **Freio de força bruta, corrigido (mesmo dia)**: era um `Map` em
  memória em `server.ts` — resetava a cada reinício do servidor e
  crescia sem limite (uma entrada por matrícula tentada, real ou
  inventada). Passou para a tabela `login_attempts`
  (migração `011_login_attempts.sql`, funções em `authRepo.ts`):
  persiste entre reinícios, e só existe linha para matrícula que
  corresponde a uma pessoa real — sem conta, não há o que travar, e o
  tamanho da tabela fica limitado ao número de pessoas cadastradas.
  Os testes novos pegaram um bug real na primeira versão da lógica de
  "reiniciar contagem depois da trava expirar" (estava invertida, a
  trava nunca disparava) — corrigido antes de comitar.
- **CSRF, corrigido (mesmo dia)**: toda rota que muda estado com sessão
  autenticada (`POST`/`PUT`/`DELETE` — conjuntos, Zona de Risco,
  cadastro de pessoas, gerar link, trocar senha, chat/transcrição/passo
  do condutor por voz) agora exige o padrão *double-submit token*:
  `req.session.csrfToken` é gerado na criação da sessão (login,
  bootstrap do 1º Administrador) e devolvido no corpo da resposta uma
  vez; toda chamada mutante precisa devolvê-lo no cabeçalho
  `X-CSRF-Token` (`csrfProtection` em `server.ts`) — um site de
  terceiros não consegue ler essa resposta (bloqueado por CORS) para
  forjar o cabeçalho. Rotas sem sessão (login, bootstrap, esqueci a
  senha, definir senha) ficam de fora: cada uma já prova quem pode agir
  por senha ou por token de uso único, sem depender do cookie de sessão
  de outra pessoa. `GET /api/auth/me` também devolve o token, para
  quem recarrega a página sem passar pelo login de novo. Front-end:
  `src/services/csrf.ts` guarda o token em memória (nunca em
  localStorage/cookie legível por JS de outro site) e todo serviço que
  faz uma chamada mutante (`collectionsService.ts`, `adminService.ts`,
  `peopleService.ts`, `authService.ts`, `geminiService.ts`) o anexa.
- Senha (escolhida por humano, baixa entropia) usa bcrypt — hash
  não-determinístico, salgado, caro de força-bruta. Token de definição de
  senha (gerado pelo sistema, alta entropia) usa SHA-256 — determinístico
  de propósito, para permitir busca por igualdade; seguro porque a
  entropia do token, não o algoritmo de hash, é a defesa.
- `SESSION_SECRET` segue a mesma regra de `DATABASE_URL`: sem valor
  default em produção — o servidor falha ao subir se não estiver
  configurada.
- Cobertura: `db/__tests__/authRepo.test.ts` (21 testes, incluindo
  `createFirstAdmin`, o ciclo de `requestPasswordReset` e
  `changeOwnPassword`) e `db/__tests__/peopleRepo.test.ts`
  (`countPeople`) no backend; `LoginScreen.test.tsx`,
  `BootstrapAdminSetup.test.tsx`, `SetPasswordScreen.test.tsx`,
  `ForgotPasswordScreen.test.tsx` e `ChangePasswordModal.test.tsx` no
  front-end. As rotas HTTP em si foram validadas manualmente de ponta a
  ponta (bootstrap → cadastrar pessoa → esqueci a senha → fila do
  Administrador → gerar link → definir senha → login → trocar a própria
  senha → login com a senha nova → checar permissão por papel → logout)
  em vez de teste de integração HTTP automatizado — mesma lacuna já
  registrada para as rotas de admin em `_local-adr-policy-201`.

## References

- Arquivos: `db/migrations/009_auth.sql`,
  `db/migrations/010_password_reset_requests.sql`, `db/authRepo.ts`,
  `server.ts`, `src/services/authService.ts`,
  `src/components/LoginScreen.tsx`, `src/components/BootstrapAdminSetup.tsx`,
  `src/components/SetPasswordScreen.tsx`,
  `src/components/ForgotPasswordScreen.tsx`,
  `src/components/ChangePasswordModal.tsx`
- Testes: `db/__tests__/authRepo.test.ts`, `db/__tests__/peopleRepo.test.ts`,
  `src/components/__tests__/{LoginScreen,BootstrapAdminSetup,SetPasswordScreen,ForgotPasswordScreen,ChangePasswordModal}.test.tsx`
- Manual do usuário: `public/manuais/manual-administrador-contas-v3.html`
  (gestão de contas, com o passo a passo da fila de "esqueci a senha" e
  da troca de senha por conta própria) e
  `public/manuais/manual-sigcoi-completo-v6.html` (seção "Perfis de
  acesso" atualizada)
- Policy relacionada: `_local-adr-policy-201` (a Zona de Risco é
  exatamente o tipo de ação que mais precisava desta prova de identidade)
- Pendência seguinte (não coberta aqui): ajuste fino de expiração de
  sessão, encerrar sessões abertas em outros dispositivos ao trocar a
  senha ou redefinir por link.
