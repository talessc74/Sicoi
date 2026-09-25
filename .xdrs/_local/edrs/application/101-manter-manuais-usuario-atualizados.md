---
name: _local-edr-policy-101-manter-manuais-usuario-atualizados
description: Toda mudança de código que altere algo descrito nos Manuais do Usuário (public/manuais/) precisa revisar e, se necessário, versionar o manual correspondente. Use ao concluir qualquer tarefa que mude uma fase, regra de assinatura, papel de acesso, ferramenta ou o condutor de voz.
apply-to: public/manuais/**, src/data/userManuals.ts
valid-from: 2026-09-25
---

# _local-edr-policy-101: Manter os Manuais do Usuário atualizados

## Context and Problem Statement

Os Manuais do Usuário (`public/manuais/*.html`) são guias em HTML escritos
à mão, servidos como estáticos e listados na aba Documentos via
`src/data/userManuals.ts`. Eles não são gerados a partir do código — logo,
não se atualizam sozinhos quando uma fase, uma regra de assinatura, um
papel de acesso, uma ferramenta ou o condutor de voz mudam. Sem uma regra
explícita, o risco é o manual divergir silenciosamente do que o site
realmente faz.

Question: como garantir que o conteúdo dos manuais acompanhe o site sem
depender só da memória de quem está implementando?

## Decision Outcome

**Toda tarefa que altera algo descrito nos manuais revisa e versiona o
manual correspondente antes de ser considerada concluída.**

1. Ao terminar uma mudança de código, reler a seção correspondente nos
   manuais atuais.
2. Se o conteúdo ficou desatualizado, publicar uma **nova versão do
   arquivo** (`manual-sigcoi-completo-v2.html`, `-v3.html`, ...) —
   nunca sobrescrever uma versão já publicada, para preservar o
   histórico.
3. Atualizar a entrada correspondente em `src/data/userManuals.ts`
   (`version`, `path`, `updatedAt`).
4. Levar a mudança de manual no mesmo pull request da mudança de código
   que a motivou, sempre que possível.

Se a mudança de código não afeta nada que os manuais descrevem, esta
policy não se aplica — não é necessário tocar neles.

### Details

- Os arquivos ficam em `public/`, então o Vite os copia para `dist/` no
  build e são servidos como estáticos em produção, em `/manuais/...`.
- O versionamento vive no próprio nome do arquivo, não em metadata externa
  — isso torna o histórico rastreável só pelo Git, sem infraestrutura
  extra.

## References

- Arquivos: `public/manuais/manual-sigcoi-completo-v1.html`,
  `public/manuais/manual-sigcoi-fases-4-a-7-v1.html`,
  `src/data/userManuals.ts`
- PR: nicoledamascena-art/SIGCOI#6
