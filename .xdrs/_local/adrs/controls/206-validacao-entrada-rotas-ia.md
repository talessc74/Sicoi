---
name: _local-adr-policy-206-validacao-entrada-rotas-ia
description: /api/chat, /api/pop-step e /api/transcribe passam a validar forma e tamanho de entrada (funções puras em db/aiInputValidation.ts) antes de repassar qualquer corpo ao Gemini — mas continuam públicas, sem requireAuth, de propósito (gap já registrado, fora do escopo aqui). Use antes de alterar qualquer rota pública de IA, ou antes de assumir que "validação" nesta policy inclui autenticação.
apply-to: db/aiInputValidation.ts, server.ts (rotas /api/chat, /api/pop-step, /api/transcribe)
valid-from: 2026-10-14
---

# _local-adr-policy-206: Validação de entrada nas rotas públicas de IA

## Context and Problem Statement

`_local-adr-policy-103` já tinha registrado, como achado fora do escopo
daquela decisão, que `/api/chat`, `/api/pop-step` e `/api/transcribe` são
públicas (sem `requireAuth`) e não tinham limite nenhum de tamanho de
entrada — qualquer corpo aceito virava prompt enviado direto ao Gemini,
custeado pelo servidor. Continuar sem nenhuma validação de forma deixava
a superfície de custo/abuso dessas três rotas completamente aberta.

Question: como reduzir esse risco sem resolver (ainda) o gap de
autenticação — que é uma decisão maior, de produto, não deste PR?

## Decision Outcome

**Validação real de forma e tamanho, via funções puras, testáveis sem
IA nem banco — mas a decisão de manter as três rotas públicas continua
deliberadamente fora do escopo.** `db/aiInputValidation.ts` não decide
autenticação; só valida o que está no corpo da requisição.

### Details

- **Limites aplicados**: `/api/chat` — até 50 mensagens, cada
  `content` até 8000 caracteres, `systemInstruction` até 4000
  caracteres, `model` restrito a uma lista fechada de apelidos e nomes
  canônicos do Gemini (`VALID_CHAT_MODEL_INPUTS`). `/api/pop-step` —
  `transcript` até 4000 caracteres, `stepContext` até 20000 caracteres,
  `model` restrito ao único valor que o servidor aceita hoje
  (`VALID_POP_STEP_MODEL_INPUTS`). `/api/transcribe` — `audioBase64` até
  ~15MB decodificados, `mimeType` precisa começar com `audio/`.
- **Gap de autenticação permanece, de propósito**: as três rotas
  continuam sem `requireAuth` — esta policy não resolve isso, só reduz o
  risco adjacente (payload/custo ilimitado). Decisão de produto futura,
  não desta entrega.
- **Códigos de erro** (tradutor de erros, `_local-edr-policy-103`): cada
  falha de validação ganha `code` — `IA_ENTRADA_INVALIDA` para forma
  errada, `IA_MODELO_INVALIDO` para modelo fora da lista fechada,
  `IA_ENTRADA_VAZIA`/`IA_AUDIO_AUSENTE` mantidos para os casos que já
  tinham código específico antes desta decisão. Optou-se por não tentar
  casar o texto exato de cada mensagem de validação com um código
  específico por mensagem — um código por função de validação chamada é
  suficiente e evita qualquer heurística de casamento de string.
- **Achado incidental, corrigido no mesmo dia**: 4 ocorrências de
  `code: 401` (em vez do código estável `IA_CHAVE_AUSENTE`) tinham
  escapado da varredura original do tradutor de erros, porque o texto da
  mensagem variava rota a rota (`/api/chat`, `/api/transcribe`).
  Corrigidas junto com esta decisão.

## References

- Arquivos: `db/aiInputValidation.ts`, `server.ts`
- Testes: `db/__tests__/aiInputValidation.test.ts` (21 testes)
- Policy relacionada: `_local-adr-policy-103` (registrou o gap de
  autenticação originalmente), `_local-edr-policy-103` (tradutor de
  erros — códigos usados aqui)
