---
name: _local-adr-policy-202-login-real-sessao-servidor
description: "Ser alguém" no sistema é provar e-mail + senha e receber uma sessão assinada pelo servidor (cookie httpOnly) — nunca o navegador declarando um actorId, nem um seletor de perfil de um clique. Use antes de adicionar qualquer rota ou tela nova que precise saber quem está agindo, ou antes de mudar o fluxo de cadastro/gestão de contas.
apply-to: db/authRepo.ts, db/peopleRepo.ts, server.ts (middleware de sessão, trust proxy, csrfProtection, requireAuth/requireSessionRole, rotas /api/auth/* e /api/people), db/migrations/009_auth.sql, db/migrations/010_password_reset_requests.sql, db/migrations/011_login_attempts.sql, db/migrations/012_email_identity.sql, db/migrations/013_remove_registration_number.sql, db/migrations/014_first_administrator.sql, db/migrations/015_ensure_first_administrator.sql, db/migrations/016_restore_registration_number_for_revert.sql, db/migrations/017_reset_pending_administrator.sql, db/migrations/020_admin_access.sql, src/utils/permissions.ts, src/services/authService.ts, src/services/csrf.ts, src/services/collectionsService.ts, src/services/adminService.ts, src/services/peopleService.ts, src/services/geminiService.ts, src/components/LoginScreen.tsx, src/components/BootstrapAdminSetup.tsx, src/components/ClaimAdminScreen.tsx, src/components/SetPasswordScreen.tsx, src/components/ForgotPasswordScreen.tsx, src/components/ChangePasswordModal.tsx, src/components/Header.tsx, src/components/SettingsView.tsx, src/App.tsx
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
- **Risco de implantação encontrado e corrigido (mesmo dia)**: a afirmação
  original aqui ("o primeiro deploy encontrará o banco vazio... e pedirá o
  cadastro do primeiro Administrador") estava **errada** para o caso real —
  `BootstrapAdminSetup`/`POST /api/auth/bootstrap-admin` só disparam
  quando `countPeople() === 0`. A produção real da COI-INC já tem ~30
  pessoas cadastradas (do modelo antigo, sem senha nenhuma), então o
  banco **nunca** está vazio — a tela de bootstrap nunca apareceria, e
  ninguém, nem quem já era Administrador, conseguiria logar. Corrigido
  com um caminho separado: **ativação** (não criação) de um Administrador
  que já existia. Ver `hasUnactivatedAdministrator`/
  `claimAdministratorAccount` em `authRepo.ts`.
- **Ativação de Administrador migrado (concluído)**: `ClaimAdminScreen.tsx`,
  alcançada automaticamente quando `GET /api/auth/bootstrap-status` devolve
  `needsAdminClaim: true` — banco não vazio, existe pelo menos um
  `administrador` com `password_hash IS NULL`, e a variável de ambiente
  `ADMIN_BOOTSTRAP_SECRET` está configurada (opcional; sem ela, a rota
  `POST /api/auth/claim-admin` fica indisponível — 404, seguro por
  padrão). A pessoa informa a própria matrícula (já cadastrada de antes),
  o código de ativação, e a senha nova; o servidor confere o código em
  tempo constante (`crypto.timingSafeEqual`) antes de tudo, e só ativa se
  a matrícula corresponder a um Administrador ainda sem senha — nunca
  cria pessoa nova. Mensagem de erro genérica (mesmo cuidado de
  `verifyLogin`): não distingue matrícula inexistente, papel diferente ou
  já ativada. `GET /api/auth/bootstrap-status` agora devolve
  `{ needsBootstrap, needsAdminClaim }`; `App.tsx` decide entre
  `BootstrapAdminSetup` (banco vazio), `ClaimAdminScreen` (banco com
  Administrador migrado pendente) e `LoginScreen` (nenhum dos dois).
  `ADMIN_BOOTSTRAP_SECRET` deve ser removida do ambiente depois que todos
  os Administradores migrados tiverem ativado a própria conta —
  documentado no manual do Administrador.
- **"Trocar minha senha" (concluído)**: `ChangePasswordModal.tsx`,
  alcançado pelo menu do nome no `Header.tsx` — vale para qualquer papel
  logado, não só Administrador. `POST /api/auth/change-password`
  (`requireAuth`) exige a senha atual (`changeOwnPassword` em
  `authRepo.ts`, `bcrypt.compare` contra o hash gravado) mesmo com a
  sessão válida — justamente para o caso de sessão aberta num computador
  compartilhado; sem a senha atual certa, nada muda.
- **Acesso de Administrador somado a outro papel (out/2026, pedido da
  Nicole)**: a Curadora da coleção também administra o sistema, com uma
  conta só. `people.admin_access` (migração `020_admin_access.sql`, default
  `false`) libera as funções de Administrador para quem tem outro papel
  principal; `role` continua sendo o que vai nas assinaturas e no histórico.
  `requireSessionRole('administrador')` passa a usar `hasAdminAccess`
  (`src/utils/permissions.ts`): `role === 'administrador'` **ou**
  `admin_access`. Lido do banco a cada requisição, como o papel — ligar ou
  desligar vale na próxima chamada, sem novo login. Só um Administrador liga
  ou desliga a marca (rotas `/api/people` seguem `requireAdminSession`), e o
  servidor recusa (400) quem tenta salvar o próprio cadastro sem acesso de
  Administrador, para o sistema não ficar sem ninguém que administre.
  Ativação de Administrador migrado (`claim-admin`) segue só para
  `role = 'administrador'`.
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
- Cobertura: `db/__tests__/authRepo.test.ts` (32 testes, incluindo
  `createFirstAdmin`, o ciclo de `requestPasswordReset`,
  `changeOwnPassword`, `hasUnactivatedAdministrator` e
  `claimAdministratorAccount`) e `db/__tests__/peopleRepo.test.ts`
  (`countPeople`) no backend; `LoginScreen.test.tsx`,
  `BootstrapAdminSetup.test.tsx`, `ClaimAdminScreen.test.tsx`,
  `SetPasswordScreen.test.tsx`, `ForgotPasswordScreen.test.tsx` e
  `ChangePasswordModal.test.tsx` no front-end. As rotas HTTP em si foram
  validadas manualmente de ponta a ponta — incluindo, especificamente
  para a ativação, o cenário real (banco pré-populado com dois
  Administradores e um Técnico, nenhum com senha: código errado → 403,
  matrícula de quem não é Administrador → 400, ativação certa → 200,
  `bootstrap-status` continua `needsAdminClaim: true` enquanto sobrar
  alguém, vira `false` só depois que todos ativaram) — em vez de teste
  de integração HTTP automatizado, mesma lacuna já registrada para as
  rotas de admin em `_local-adr-policy-201`.

- **Identificador de login trocado de matrícula para e-mail (set/2026,
  concluído)**: as ~30 pessoas cadastradas em produção até aqui são todas
  dados fictícios de teste (matrículas inventadas, só para operar o
  sistema durante o desenvolvimento) — serão apagadas antes do lançamento
  real. No cadastro real, feito pelo Administrador, **e-mail passa a ser o
  identificador único de login, obrigatório**; `registration_number`
  (matrícula/registro profissional) vira **opcional**, porque nem toda
  pessoa com acesso ao sistema tem uma — pesquisadores externos, por
  exemplo, não têm, enquanto técnicos e curadores com registro
  profissional real continuam podendo cadastrá-lo, como informação
  complementar. `db/migrations/012_email_identity.sql` adiciona `email`
  (índice único case-insensitive, `lower(email)`) e remove o `NOT NULL` de
  `registration_number`; a obrigatoriedade de `email` é conferida na
  aplicação (`peopleRepo.createPerson`, rotas de `server.ts`), não travada
  no schema. Todas as funções de `authRepo.ts` que antes recebiam
  `registrationNumber` como chave de busca (`verifyLogin`, `isLoginLocked`,
  `recordFailedLogin`, `clearLoginAttempts`, `claimAdministratorAccount`,
  `requestPasswordReset`) passam a receber `email`, sempre comparado
  case-insensitive (`lower(email) = lower($1)`); `createFirstAdmin` exige
  `email` e aceita `registrationNumber` opcional. Rotas afetadas:
  `POST /api/auth/login`, `/bootstrap-admin`, `/claim-admin`,
  `/forgot-password` e `POST /api/people` — todas trocam o campo
  obrigatório de `registrationNumber` para `email` (com validação simples
  de formato), mantendo as mesmas garantias de segurança já documentadas
  acima (mensagens de erro genéricas que não revelam se o e-mail existe,
  mesmo freio de força bruta, mesmo CSRF). Telas atualizadas:
  `LoginScreen.tsx`, `BootstrapAdminSetup.tsx`, `ClaimAdminScreen.tsx`,
  `ForgotPasswordScreen.tsx`, `SettingsView.tsx` (cadastro de pessoa e
  lista, com matrícula exibida só quando presente) e `Header.tsx` (menu do
  usuário mostra e-mail em vez de matrícula). Cadastro continua
  exclusivamente pelo Administrador (nada mudou nisso) — a diferença é só
  qual campo identifica a pessoa. Não há envio automático de e-mail: a
  entrega do link de definição de senha continua manual, por fora do
  sistema, como já era.
- **Ação operacional pendente (fora do código)**: antes do lançamento
  real, apagar todas as ~30 pessoas fictícias hoje cadastradas
  (`DELETE FROM people` ou equivalente) — o cadastro real recomeça pelo
  bootstrap do primeiro Administrador (`BootstrapAdminSetup`, banco
  vazio), agora já pedindo e-mail. `ClaimAdminScreen`/
  `ADMIN_BOOTSTRAP_SECRET` seguem existindo no código como capacidade
  reservada para uma futura migração de dados pré-existentes, mas não são
  necessários para este dataset específico, que será descartado.
- **Matrícula/registro profissional removida por completo (set/2026,
  concluído)**: decisão do Tales, na mesma revisão de segurança pré-merge
  — o campo nunca vai ser usado de verdade, então em vez de manter uma
  coluna opcional morta no schema, foi removida. `registrationNumber`
  desapareceu de `UserProfile`, de `peopleRepo.ts`/`authRepo.ts` (SELECT,
  INSERT, RETURNING), das rotas `POST /api/auth/bootstrap-admin` e
  `POST /api/people`, dos serviços do front-end e das telas
  `BootstrapAdminSetup.tsx` e `SettingsView.tsx` (campo do formulário e
  coluna da lista de pessoas). `db/migrations/013_remove_registration_number.sql`
  remove a coluna `registration_number` e o índice único que a
  acompanhava (`people_registration_number_key`, de
  `migrations/009_auth.sql`) — e-mail passa a ser o único campo que
  identifica uma pessoa, ponto. Consequência limpa: o tratamento especial
  em `POST /api/people` que distinguia qual dos dois índices únicos tinha
  sido violado (introduzido numa revisão anterior desta mesma noite,
  ver commit `aa4afd5`) ficou sem função e foi removido — só existe mais
  o índice único de `email`.
- **Achado da revisão de "guarda de dados" (mesma noite, sem correção de
  código — investigação confirmou que já estava certo)**: `email` só é
  lido/gravado na tabela `people`, nunca copiado para `login_attempts`,
  `password_reset_requests`, `password_setup_tokens`, `signatures`,
  `change_log` ou `admin_actions` — essas três últimas guardam nome/papel/
  id da pessoa como texto copiado no momento da assinatura/ação, sem
  chave estrangeira para `people`, o que torna estruturalmente impossível
  uma remoção de pessoa apagar o histórico dela por engano. Testado ao
  vivo: criar uma pessoa com token de senha, pedido de redefinição e
  tentativas de login pendentes, depois remover a pessoa — as três somem
  (CASCADE), sem órfãos.

- **Episódio de lançamento em produção e correções subsequentes
  (30/09–01/10/2026)**: o merge do login real para `main` expôs, em
  sequência, uma cadeia de problemas que só apareciam em produção — nenhum
  deles tinha sido pego pelos testes automatizados nem pela simulação
  local até então, porque exigiam o ambiente real do Render (proxy
  reverso, HTTPS na borda, instância que "dorme" no plano gratuito, banco
  já populado com dados fictícios de teste). Nenhum envolveu alterar a
  decisão central desta policy (sessão no servidor como única fonte de
  identidade) — só a tornaram viável de implantar de verdade.
  1. `SESSION_SECRET` ausente em produção: o próprio `server.ts` recusa
     subir sem ela (comportamento correto, documentado acima) — a
     variável nunca tinha sido configurada no Render porque o deploy
     anterior ao login real não a exigia. Corrigido configurando a
     variável; nenhuma mudança de código.
  2. `db/migrations/009_auth.sql` tentava criar um índice único em
     `registration_number` — e as pessoas fictícias de teste já
     cadastradas em produção tinham esse campo duplicado, travando a
     migração (e o boot) com `could not create unique index`. Esse
     índice ficaria obsoleto duas migrações depois mesmo (`013` remove a
     coluna) e nunca tinha aplicado com sucesso em nenhum ambiente, então
     foi seguro removê-lo da migração em vez de exigir resolver a
     duplicidade dos dados de teste manualmente.
  3. **Bootstrap do primeiro Administrador sem apagar dados fictícios**:
     em vez de `DELETE FROM people` (destrutivo, e bloqueado pelo próprio
     classificador de segurança do ambiente de desenvolvimento usado,
     por padrão de "exclusão em massa"), `db/migrations/014_first_administrator.sql`
     insere o Administrador real com `ON CONFLICT DO NOTHING` —
     convivendo com as pessoas fictícias, sem apagá-las. Isso revelou um
     segundo problema: se o e-mail já existisse de um teste anterior
     (outro papel, ou já com senha), o `DO NOTHING` deixava a pessoa como
     estava, e a ativação (`hasUnactivatedAdministrator`) nunca
     encontrava ninguém elegível. `db/migrations/015_ensure_first_administrator.sql`
     corrigiu para `ON CONFLICT (lower(email)) DO UPDATE`, garantindo
     papel `administrador` e `password_hash = NULL` de qualquer forma —
     cria se não existir, corrige se já existir com outro estado.
  4. **Cookie de sessão `Secure` atrás de proxy reverso**: faltava
     `app.set('trust proxy', 1)` em produção. O Render termina HTTPS na
     borda e encaminha para o processo por HTTP simples — sem essa
     configuração, o Express não sabe que a conexão original era segura,
     o que deixa o cookie de sessão (`cookie.secure = true` em produção)
     sujeito a comportamento inconsistente atrás do proxy. Corrigido com
     `app.set('trust proxy', 1)` logo na criação do `app`, antes de
     qualquer middleware. Validado com um proxy HTTPS local (certificado
     autoassinado, injetando `X-Forwarded-Proto`) reproduzindo a borda do
     Render — não dava para confiar só em testar via HTTP puro, que
     mascara exatamente este tipo de falha.
  5. **CSRF bloqueando rotas públicas quando havia sessão de outra conta
     no mesmo navegador**: `csrfProtection` só pulava a checagem quando
     não existia sessão nenhuma (`!req.session.personId`). Um
     Administrador testando o próprio link de "definir senha" no mesmo
     navegador em que já estava logado tinha sessão ativa — a checagem
     disparava, mas a tela pública de definir senha nunca manda
     `X-CSRF-Token` (não foi desenhada para isso). Corrigido isentando por
     caminho (`/api/auth/login`, `/bootstrap-admin`, `/claim-admin`,
     `/setup-password`, `/forgot-password`), não só por ausência de
     sessão.
  6. **Tela de ativação sem saída para quem já tinha senha**:
     `hasUnactivatedAdministrator()` verifica se existe *qualquer* pessoa
     com papel `administrador` sem senha — não é específica por e-mail.
     Com pessoas fictícias de teste ainda na base (algumas com esse
     papel, nunca ativadas de propósito), essa checagem nunca ficava
     `false`, mesmo com o Administrador real já ativado — qualquer
     acesso sem sessão (dispositivo novo) caía de novo na tela de
     ativação, sem nenhum link para o login comum. Corrigido com um link
     "Já tem uma senha? Fazer login" em `ClaimAdminScreen.tsx`, que troca
     para `LoginScreen.tsx` localmente em `App.tsx` (`preferLoginOverClaim`),
     sem depender de resolver a causa de fundo (que se resolve sozinha
     quando as pessoas fictícias forem limpas ou editadas).
  7. **Ativação aparentemente perdida por timeout do lado do cliente**:
     uma tentativa de ativação mostrou "Erro HTTP 502" no navegador — mas
     o servidor provavelmente processou a escrita da senha antes da
     conexão cair (instância gratuita do Render acordando devagar),
     deixando a conta "ativada" sem confirmação visível, com uma senha
     que ninguém sabia qual foi. `db/migrations/017_reset_pending_administrator.sql`
     zera `password_hash` do Administrador de volta para `NULL`,
     permitindo ativar de novo do zero. Reforça a recomendação, agora
     documentada no manual do Administrador, de esperar a instância
     "acordar" (30-60s) antes de tentar a primeira ativação do dia.
  8. **Reversão e nova implantação**: diante da instabilidade acumulada
     (itens 1-3), o site foi revertido temporariamente para o estado
     anterior ao login real (commit `59bc290`) via um commit de código
     (não pelo botão de rollback do Render, indisponível para automação
     nesta sessão) — preservando o histórico de migrações já aplicadas
     (irreversíveis: a coluna `registration_number` já tinha sido
     removida de verdade em produção pela `013`) e adicionando
     `db/migrations/016_restore_registration_number_for_revert.sql` só
     para a coluna existir de novo (vazia) e o código revertido não
     quebrar. Depois de validar os itens 4-5 (trust proxy, CSRF) contra
     uma simulação completa do ambiente de produção, o login real foi
     reintroduzido (reversão da reversão) com essas correções.
  9. **Metodologia de validação, reforçada a partir daqui**: toda
     correção depois do primeiro incidente foi testada simulando
     localmente o estado real do banco de produção (migrações aplicadas
     em sequência + dados fictícios + Administrador pendente), e as
     correções de sessão/CSRF foram validadas com requisições HTTP reais
     contra um servidor local atrás de um proxy HTTPS simulando a borda
     do Render — não só testes de unidade. Esta é agora a prática
     esperada para qualquer mudança futura nesta área antes de abrir PR.

- **Edição de pessoa cadastrada (01/10/2026, concluído)**: pessoas
  cadastradas antes do login real existir não têm e-mail — e sem e-mail
  nunca conseguem ativar conta nenhuma, mesmo recebendo um link de
  acesso. Em vez de forçar recriar do zero (perdendo o id original e
  qualquer vínculo histórico a ele), `PUT /api/people/:id`
  (`requireAdminSession`, mesma validação do cadastro) e `updatePerson`
  em `db/peopleRepo.ts` permitem editar nome, papel, instituição e
  e-mail de uma pessoa já existente. Botão "Editar" em
  `SettingsView.tsx`, formulário inline reaproveitando os campos do
  cadastro. Mesma proteção de e-mail único do cadastro (`error.code ===
  '23505'` → 409).

- **Mostrar/ocultar senha na tela de definição de senha (01/10/2026,
  concluído)**: `SetPasswordScreen.tsx` ganhou um ícone de olho em cada
  campo de senha (um único estado compartilhado entre os dois campos),
  para a pessoa conferir o que digitou antes de confirmar — sobretudo
  útil em teclados pequenos de celular. Puramente de interface; não
  muda nenhuma validação ou rota do servidor.

## References

- Arquivos: `db/migrations/009_auth.sql`,
  `db/migrations/010_password_reset_requests.sql`,
  `db/migrations/011_login_attempts.sql`,
  `db/migrations/012_email_identity.sql`,
  `db/migrations/013_remove_registration_number.sql`,
  `db/migrations/014_first_administrator.sql`,
  `db/migrations/015_ensure_first_administrator.sql`,
  `db/migrations/016_restore_registration_number_for_revert.sql`,
  `db/migrations/017_reset_pending_administrator.sql`,
  `db/authRepo.ts`, `db/peopleRepo.ts`,
  `server.ts`, `src/App.tsx`, `src/services/authService.ts`,
  `src/services/csrf.ts`, `src/services/peopleService.ts`,
  `src/components/LoginScreen.tsx`, `src/components/BootstrapAdminSetup.tsx`,
  `src/components/ClaimAdminScreen.tsx`,
  `src/components/SetPasswordScreen.tsx`,
  `src/components/ForgotPasswordScreen.tsx`,
  `src/components/ChangePasswordModal.tsx`,
  `src/components/SettingsView.tsx`
- Testes: `db/__tests__/authRepo.test.ts`, `db/__tests__/peopleRepo.test.ts`,
  `src/components/__tests__/{LoginScreen,BootstrapAdminSetup,ClaimAdminScreen,SetPasswordScreen,ForgotPasswordScreen,ChangePasswordModal}.test.tsx`
  — mais validação manual via HTTP real (não automatizada): round-trip de
  login e de ativação atrás de um proxy HTTPS local simulando o Render,
  cobrindo especificamente os itens 4-7 do episódio de lançamento acima.
- Manual do usuário: `public/manuais/manual-administrador-contas-v7.html`
  (gestão de contas — inclui "Primeiro acesso do Administrador" com nota
  sobre a instância "acordando" e o link alternativo de login, e a nova
  seção "Editar pessoa") e `public/manuais/manual-sigcoi-completo-v7.html`
  (seção "Perfis de acesso", sem mudança necessária nesta rodada)
- Policy relacionada: `_local-adr-policy-201` (a Zona de Risco é
  exatamente o tipo de ação que mais precisava desta prova de identidade)
- Pendência seguinte (não coberta aqui): ajuste fino de expiração de
  sessão, encerrar sessões abertas em outros dispositivos ao trocar a
  senha ou redefinir por link.
