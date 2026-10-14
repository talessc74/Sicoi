---
name: _local-edr-policy-103-tradutor-de-erros
description: Todo erro que o servidor sabe identificar manda um `code` estável, nunca mensagem técnica como texto a ser casado por padrão; o cliente traduz esse código para uma frase clara, mostrada por padrão, com a mensagem técnica original disponível atrás de "Ver detalhes técnicos". Use antes de adicionar qualquer resposta de erro no servidor, ou qualquer exibição de erro no cliente.
apply-to: src/utils/errorMessages.ts, src/components/ErrorNotice.tsx, server.ts (toda resposta de erro), db/historyGuard.ts, db/collectionsRepo.ts, db/adminRepo.ts, db/authRepo.ts (HistoryViolationError e Object.assign com code), src/services/*.ts (propagação do code recebido)
valid-from: 2026-10-14
---

# _local-edr-policy-103: Tradutor de erros — código estável, nunca casamento de texto

## Context and Problem Statement

O Tales relatou, a partir de um print real do site: "Assinatura
inválida para o conjunto COI-146, Fase 0: hash não confere com o
conteúdo da fase enviado." — e perguntou o que isso significava. Quem
usa o SIGCOI no dia a dia não é técnico e nunca vai entender frases como
essa, "HistoryViolationError", ou qualquer mensagem pensada para quem
desenvolve, não para quem opera o acervo. Uma investigação encontrou
**zero** sistema de tradução de erro existente — 16 pontos diferentes no
app mostravam `err.message` cru, ~60 mensagens técnicas distintas, sem
nenhum padrão comum.

Question: como mostrar uma frase clara por padrão, sem esconder a
informação técnica de quem precisa diagnosticar ou reportar um
problema de verdade — e sem depender de casar texto de mensagem (frágil,
muda a qualquer refatoração de string)?

## Decision Outcome

**Código estável no servidor, dicionário único no cliente — nunca
inferência a partir do texto da mensagem.** Confirmado com o Tales via 3
perguntas estruturadas: código fixo por erro (não casamento de padrão de
string), cobrir todos os ~16 pontos de exibição (não só o banner
principal), e mostrar a frase amigável por padrão com "ver detalhes
técnicos" expansível.

### Details

- **Servidor**: todo erro lançado (`throw new Error(...)`) passa a
  carregar um `code` via `Object.assign(new Error(msg), { code })`;
  `HistoryViolationError` (`db/historyGuard.ts`) ganhou um construtor com
  `code` próprio (default `HIST_FASE_TRAVADA`); toda validação inline em
  `server.ts` (`res.status(...).json({ error, code })`) ganhou o campo
  `code` correspondente. ~50 códigos cobrindo autenticação, histórico/
  assinatura, conjuntos, pessoas/administração, fotos, grafo, IA,
  autorizações de pesquisa.
- **Cliente**: `src/utils/errorMessages.ts` — `ErrorCode` (union fechada)
  + `ERROR_MESSAGES` (dicionário código → frase clara em português) +
  `friendlyMessage(code)`, que cai no fallback genérico
  (`ERRO_DESCONHECIDO`) para código ausente ou desconhecido — **nunca**
  mostra texto técnico cru por padrão, mesmo para um erro que o
  dicionário não previu. `toAppError(err, fallback)` padroniza o que cada
  estado de erro de tela guarda: `{ message, code }`.
- **`ErrorNotice.tsx`**: componente único (variantes `banner`/`inline`)
  que substituiu os ~16 pontos que antes mostravam `err.message` cru —
  telas de autenticação, Configurações, Fases 0/1/4, Grafo de
  Conhecimento, chat e condutor por voz Gemini, trilha de auditoria.
  Mostra a frase amigável com um ícone de alerta; "Ver detalhes
  técnicos"/"Ocultar detalhes técnicos" expande a mensagem técnica
  original, sempre disponível, nunca escondida de vez.
- **Services do cliente** (`collectionsService.ts`, `peopleService.ts`,
  `authService.ts`, `photoService.ts`, `adminService.ts`,
  `geminiService.ts`, `authorizationsService.ts`): o helper
  `parseJsonOrThrow` de cada um anexa o `code` recebido do servidor ao
  `Error` lançado no cliente (`Object.assign(new Error(...), { code:
  data?.code })`) — o código nunca se perde entre o servidor e a tela.
- **Nunca casamento de texto**: em nenhum ponto o cliente decide o
  código a partir do conteúdo da mensagem — nem olhando substring, nem
  regex. Onde um ponto de validação tinha várias mensagens possíveis sem
  um código óbvio por mensagem (ex.: as novas validações de
  `_local-adr-policy-206`), a decisão foi usar um código por função de
  validação chamada, não tentar inferir do texto.
- **Testado**: `friendlyMessage` tem teste garantindo que nenhuma frase
  do dicionário menciona termos técnicos vazados (Gemini, hash, HTTP,
  HistoryViolationError); `ErrorNotice.tsx` tem 4 testes cobrindo as duas
  variantes e a expansão de detalhes.

## References

- Arquivos: `src/utils/errorMessages.ts`, `src/components/ErrorNotice.tsx`,
  `server.ts`, `db/historyGuard.ts`, `db/collectionsRepo.ts`,
  `db/adminRepo.ts`, `db/authRepo.ts`, todos os `src/services/*.ts`
- Testes: `src/utils/__tests__/errorMessages.test.ts`,
  `src/components/__tests__/ErrorNotice.test.tsx`
- Policy relacionada: usada por `_local-adr-policy-205` e
  `_local-adr-policy-206` (códigos novos seguem este mesmo padrão)
