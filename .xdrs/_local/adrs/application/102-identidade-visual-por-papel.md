---
name: _local-adr-policy-102-identidade-visual-por-papel
description: Cada papel (Técnico, Curador, Administrador, Pesquisador, Estudante) tem uma cor e um ícone fixos, usados só como indicador de identidade (faixa no topo, selo do usuário, lista de pessoas) — nunca reaproveitando as cores que já significam status (emerald=assinado, amber=em aberto, rose=bloqueado/perigo, sky=marca/ação primária). Use ao adicionar qualquer superfície nova que precise mostrar "quem está ativo agora".
apply-to: src/utils/roleTheme.ts, src/components/Header.tsx, src/components/SettingsView.tsx
valid-from: 2026-09-28
---

# _local-adr-policy-102: Identidade visual por papel

## Context and Problem Statement

O Tales pediu que o site "respondesse" ao papel ativo — uma forma de saber
de relance se está operando como Técnico, Curador, Administrador,
Pesquisador ou Estudante, sem precisar ler texto. Uma deliberação da
Galera de UX (Compass · Empiricus · PolarBear · Few) identificou duas
tensões antes de qualquer código:

1. O sistema já usa cor com significado de **status** (emerald = fase
   assinada, amber = em aberto, rose = bloqueada/perigo — inclusive a
   Zona de Risco inteira, `_local-adr-policy-201`, sky = marca/ação
   primária). Uma cor de **identidade** não pode competir pela mesma
   paleta sem confundir as duas coisas.
2. Papel não é uma característica fixa da pessoa — é o que a **pessoa
   ativa agora** está exercendo (o Curador pode executar funções de
   qualquer papel; a troca de perfil no cabeçalho muda quem está
   operando a qualquer momento).

Uma primeira proposta de paleta (protótipo, não implementada) usou cinco
tons próximos entre si (ciano, violeta, índigo, fúcsia, cinza) e foi
rejeitada em revisão: "parecem tons da mesma cor", difícil de guardar de
cabeça no dia a dia.

## Decision Outcome

**Cor de papel nunca recoloriu a interface inteira — só o indicador de
identidade.** E, dentro dele, as cinco cores variam deliberadamente em
**claridade** (não só em tom), e cada papel carrega um **ícone fixo**
como segunda camada de identificação:

| Papel | Cor | Ícone |
|---|---|---|
| Técnico | Azul vívido (`blue-600`) | Chave de fenda |
| Curador | Roxo bem escuro (`purple-800/900`) | Frasco de laboratório |
| Administrador | Quase preto (`slate-800`) — nunca vermelho | Escudo |
| Pesquisador | Magenta vívido (`pink-600`) | Lupa |
| Estudante | Quase branco (`slate-300`) | Capelo |

Aplicado em três lugares (`src/utils/roleTheme.ts` centraliza a tabela):
faixa fina de 3px no topo do cabeçalho, selo com o nome da pessoa ativa
(cabeçalho e menu de troca de perfil) e a lista de pessoas cadastradas em
Configurações. Nenhum botão, borda de formulário ou elemento que já
carrega significado de status muda de cor por causa do papel.

### Details

- Administrador é deliberadamente quase preto, não vermelho — vermelho
  já significa "perigo/Zona de Risco"; usar a mesma cor para "eu sou
  admin" faria a tela parecer estar sempre em alerta.
- Todas as combinações de selo (texto sobre fundo) passam 4.5:1 de
  contraste, com variante `dark:` para o tema escuro.
- Testado com a mesa via um protótipo visual antes de qualquer código —
  a v1 (tons próximos) foi rejeitada e corrigida para a v2 (claridade
  bem diferente + ícone) antes de entrar no código.

## References

- Arquivo: `src/utils/roleTheme.ts`
- Aplicado em: `src/components/Header.tsx`, `src/components/SettingsView.tsx`
- Testes: `src/utils/__tests__/roleTheme.test.ts`
- Manual do usuário: v5 (`_local-edr-policy-101`)
