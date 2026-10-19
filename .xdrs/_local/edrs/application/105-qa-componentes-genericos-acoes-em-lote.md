---
name: _local-edr-policy-105-qa-componentes-genericos-acoes-em-lote
description: 'Componente genérico reaproveitado por várias seções (ação em lote tipo "marcar tudo"/"limpar seção", ou estado compartilhado entre abas tipo os pooled de falanges/sesamoides) exige teste explícito dessas duas categorias — não só do caminho feliz de marcação individual. Nenhuma PR entra em main sem `npx tsc --noEmit` rodado de novo após a última edição de teste, mesmo que o vitest já tenha passado.'
apply-to: src/components/OsteologicalInventoryViewer.tsx, src/components/__tests__/OsteologicalInventoryViewer.test.tsx, qualquer componente futuro com ações em lote ou estado compartilhado entre abas/seções
valid-from: 2026-10-19
---

# _local-edr-policy-105: QA de componentes genéricos — ações em lote, estado compartilhado, tsc antes do merge

## Context and Problem Statement

A PR #82 generalizou o padrão P/F/I/A + alteração óssea (até então só em
Cabeça e Pescoço) para as Seções 2-8 do Inventário Osteológico, via
handlers parametrizados por chave de seção. Os 4 testes escritos
cobriam o caminho feliz — marcar presença de um osso, a regra
retroativa de exclusão A+alteração, e a presença do rótulo do pooled
de mão nas duas abas.

O Tales pediu convocação da Galera de QA (Pareto · Probe · Scaffold)
para revisar essa cobertura já mesclada. A mesa achou dois problemas
reais, não hipotéticos:

1. **Ações em lote** (`Marcar seção P`, `Limpar seção`) não tinham
   nenhum teste — é justamente a categoria que concentra defeito por
   efeito colateral (ex.: limpar `ossos` sem querer arrastar
   `alteracoes` junto, ou vice-versa).
2. **Estado compartilhado entre abas** (falanges/sesamoides da mão,
   contados uma única vez e reaproveitados nas abas Direita e
   Esquerda) só tinha um teste confirmando que o *rótulo* aparece nas
   duas abas — não que o *valor* digitado numa aba permanece visível
   ao trocar pra outra, que é o comportamento pedido de verdade.

Um terceiro achado, incidental: um teste da própria PR #82 usava um
valor de `AlteracaoOsseaTipo` que não existe no tipo (`'fratura'`,
quando o union real é `'lesao_ante_mortem'` etc.). Isso passou no
`vitest` (que não faz type-check de testes) e só apareceu no
`tsc --noEmit` — que não tinha sido re-executado depois da última
edição no arquivo de teste, antes do merge.

## Decision Outcome

**Dois testes obrigatórios para qualquer componente genérico com ações
em lote ou estado compartilhado, mais `tsc` como último passo antes do
merge, sempre, mesmo que pareça redundante com um `tsc` anterior na
mesma sessão de trabalho.**

### Details

- **Ação em lote**: todo botão que aplica uma mudança a múltiplos
  elementos de uma vez (marcar todos, limpar seção, marcar grupo) tem
  pelo menos um teste verificando o resultado em mais de um elemento —
  não só que o botão existe ou que dispara `onUpdateInventory`.
- **Estado compartilhado**: todo campo que vive logicamente fora de
  uma aba/seção específica (pooled, agregado, ou qualquer dado que
  apareça em mais de um lugar da UI) tem um teste que confirma
  *persistência visual* ao navegar entre os lugares onde aparece —
  usando `rerender` do React Testing Library para simular o
  componente controlado recebendo de volta o patch que ele mesmo
  emitiu, não só checagem de texto estático pós-clique.
- **`tsc` como gate de merge, não de desenvolvimento**: `npx tsc
  --noEmit` roda de novo depois da última edição em qualquer arquivo
  de teste, ainda que já tenha passado antes nessa mesma tarefa — o
  `vitest` não valida tipos de teste, só os executa.
- Investigação de um defeito suspeito que não se confirma (ex.: tentar
  reproduzir `NaN` num campo numérico a partir de entrada inválida, e
  descobrir que a sanitização nativa do `<input type="number">` já
  impede isso) não vira teste forçado — a guarda defensiva pode ficar
  no código por ser inofensiva, mas o achado é registrado como
  investigado-e-não-confirmado, nunca apresentado como bug real.

## References

- Arquivos: `src/components/OsteologicalInventoryViewer.tsx`,
  `src/components/__tests__/OsteologicalInventoryViewer.test.tsx`
- PRs: #82 (implementação), #83 (cobertura de QA e correção do tsc)
- Seeds da mesa: PARETO (cobertura de risco), PROBE (investigação
  exploratória), SCAFFOLD (arquitetura de automação)
