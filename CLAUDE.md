# Instruções para agentes de IA neste repositório

## Manuais do Usuário — manter atualizados

Os manuais do usuário estão em `public/manuais/` (arquivos HTML estáticos,
listados em `src/data/userManuals.ts` e exibidos na aba **Documentos** do
app). Eles não são gerados a partir do código — são escritos à mão — então
não se atualizam sozinhos quando o site muda.

Sempre que uma mudança de código alterar algo que os manuais descrevem
(uma fase, uma regra de assinatura, um papel de acesso, uma ferramenta,
o fluxo do condutor de voz, etc.), antes de considerar a tarefa concluída:

1. Releia a seção correspondente nos manuais atuais.
2. Se o conteúdo ficou desatualizado, publique uma nova versão do arquivo
   (`manual-sigcoi-completo-v2.html`, `-v3.html`, ...) — **nunca sobrescreva**
   um arquivo de versão já publicada, para preservar o histórico.
3. Atualize a entrada correspondente em `src/data/userManuals.ts`
   (`version`, `path`, `updatedAt`).
4. Leve a mudança de manual no mesmo pull request da mudança de código que
   a motivou, sempre que possível.

Se a mudança de código não afeta nada que os manuais descrevem, não é
necessário tocar neles.
