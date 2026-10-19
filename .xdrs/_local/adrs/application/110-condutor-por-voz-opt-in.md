---
name: _local-adr-policy-110-condutor-por-voz-opt-in
description: Fases 1 e 2 abrem no Formulário Manual por padrão — sem áudio automático. O Condutor por voz/conversa só começa a falar e ouvir se a pessoa apertar a aba dele. Use antes de mudar o estado inicial de interactionMode ou o default de voiceEnabled no condutor.
apply-to: src/components/Phase1Recebimento.tsx (interactionMode), src/components/Phase2Limpeza.tsx (interactionMode), src/components/PopConversationalConductor.tsx (voiceEnabled)
valid-from: 2026-10-17
---

# _local-adr-policy-110: Condutor por voz/conversa é opt-in

## Context and Problem Statement

Pedido do Tales: "quero que seja opcional a entrada falando. Comecemos
com os campos a serem respondidos sem o auxílio vocal. E se o usuário
quiser ele aperta o botão para começar." Antes desta decisão, abrir a
Fase 1 ou a Fase 2 já vinha com o modo "Condutor do POP (Voz/Conversa)"
selecionado, e o condutor narrava o primeiro passo em voz alta assim que
a tela carregava — sem nenhuma ação da pessoa.

## Decision Outcome

`interactionMode` inicial de Fase 1 e Fase 2 passa de `'conversacional'`
para `'formulario'`: a fase abre em texto/seleção, sem áudio automático.
Quem quiser o auxílio por voz/conversa aperta o botão da aba "Condutor do
POP (Voz/Conversa)" pra começar — esse clique é o "apertar o botão" que
liga o modo voz.

### Details

- A escuta por voz (microfone) dentro do condutor já era opt-in — só
  começa a ouvir quando a pessoa toca o botão do microfone
  (`handleToggleVoice`) — isso não mudou.
- Cobertura: suíte geral (`npx vitest run`); sem teste dedicado ao
  `interactionMode` inicial ainda.
