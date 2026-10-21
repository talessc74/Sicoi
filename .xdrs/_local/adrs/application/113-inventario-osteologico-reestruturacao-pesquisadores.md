---
name: _local-adr-policy-113-inventario-osteologico-reestruturacao-pesquisadores
description: 'O Inventário Osteológico (Fase 4, §15) tem 7 seções: Cabeça e Pescoço, Coluna Vertebral, Tórax, Membros Superiores, Ossos da Mão, Membros Inferiores e Ossos do Pé. Coluna Vertebral e Tórax seguem o padrão normativo de contagem por seleção numérica rolagem e identificação individualizada múltipla escolha; Sacro, Cóccix e Esterno operam com P/F/I/A. Visualização bilateral em duas colunas ergonomicamente alinhadas ao monitor (Lado Esquerdo à esquerda, Lado Direito à direita) com controles limpos de filtro e marcação em lote completa (P, F, I, A). Use antes de alterar a estrutura, a persistência, o layout ou as ações do inventário osteológico.'
apply-to: src/components/OsteologicalInventoryViewer.tsx, src/types/sgccco.ts, src/components/__tests__/OsteologicalInventoryViewer.test.tsx, src/components/__tests__/osteologicalLogic.test.ts
valid-from: 2026-10-19
---

# _local-adr-policy-113: Inventário Osteológico — reestruturação a pedido dos pesquisadores

## Context and Problem Statement

Os pesquisadores da curadoria trouxeram 5 pedidos sobre o Inventário
Osteológico das 8 seções originais (até então: `_local-adr-policy-111`
para a prancha visual de Cabeça e Pescoço, `_local-adr-policy-112` para
as Seções 2-8):

1. A contagem de "catalogados" (badge `X/Y` em cada seção) não contava
   vértebras, costelas nem estruturas complementares (cartilagens,
   ossículos) — só o que estava no registro `ossos` simples. Exemplo
   citado: C1, C2, T5, estribo precisam contar.
2. Cabeça e Pescoço: tirar a prancha visual (imagens + sub-abas por
   grupo de osso) e voltar a ser lista corrida, como as outras seções.
3. Coluna: cervicais, torácicas e lombares deixam de ser contagem +
   identificação por ordinal — cada vértebra vira linha própria, nessa
   ordem (cervicais → torácicas → lombares), com Sacro e Cóccix por
   último, tudo sob o nome único "Coluna Vertebral".
4. Membros Superiores: separar carpo/metacarpo (ossos da mão) numa
   seção própria, tirando-os de Membro Superior Direito/Esquerdo.
5. Pelve & Bacia + Membro Inferior: unir numa seção só (antes eram 3:
   Pelve, MI Direito, MI Esquerdo). Tarso/metatarso saem dessa seção
   pra outra seção própria ("Ossos do Pé"), mesma lógica da mão.

O mesmo princípio do item 1, confirmado pelo Tales, se aplica às
costelas do Tórax: também viram linhas individuais. Logo em seguida,
o mesmo raciocínio do item 5 (lados juntos numa seção só) se estendeu
também a Membro Superior Direito/Esquerdo — viram uma seção só,
"Membros Superiores".

Subsequentemente, no dia 20/10/2026, refinamentos cruciais de conformidade
normativa e ergonomia de uso foram solicitados pelo Tales:
6. Restauração do padrão normativo dos formulários oficiais (Portaria DITEC/PF
   e Formulários A.1/A.2) para Coluna Vertebral e Tórax: contagem numérica em
   caixa de rolagem e identificação individual por múltipla escolha com badges,
   em vez de uma lista corrida homogênea sem distinção morfológica.
7. Alinhamento bilateral à ergonomia física de tela: a coluna do "Lado Esquerdo"
   deve ficar sempre à esquerda do monitor e a do "Lado Direito" à direita do
   monitor, evitando a inversão espacial que gerava erro cognitivo.
8. Despoluição visual: remoção de parênteses e contagens redundantes de ossos nos
   títulos e botões de filtro ("Lado Esquerdo", "Lado Direito", "Duas Colunas").
9. Nomenclatura concisa: padronização definitiva de "3. Tórax" (sem "& Esterno")
   e "6. Membros Inferiores" (sem "Pelve & Bacia /").
10. Ações em lote completas: inclusão de marcação massiva para "F", "I" e "A"
    além de "P", com atalhos compactos por lado.

## Decision Outcome

**Lista corrida única com padrão unificado (inclusive Cabeça e Pescoço),
padrão normativo de contagem e seleção para Coluna Vertebral e Tórax,
Mão e Pé como seções próprias (ambos os lados), Membros Superiores e
Membros Inferiores unificados cada um numa seção só — consolidando 7 seções
reorganizadas, com visualização bilateral ergonômica em duas colunas e
ações em lote completas (P, F, I, A).**

### Details

- **Cabeça e Pescoço volta à lista corrida**: `AnatomicMultiPlateSkullViewer.tsx`,
  as 5 imagens (`public/images/anatomical/cranio_*`) e o teste
  correspondente foram removidos do repositório — não há mais
  prancha visual em seção nenhuma do inventário. A seção usa o mesmo
  componente genérico `SimpleBoneRows` das demais seções.
- **Coluna Vertebral** (`colunaVertebral: OsteologicalSectionColunaVertebral`):
  Conforme especificação dos docs, as vértebras utilizam o padrão de contagem numérica (caixa de seleção rolagem)
  e identificação múltipla escolha de elementos individualizados (com "Nenhuma identificada" e "Supranumerária"):
  - Vértebras cervicais: rolagem 0 a 7 e +7; C1 a C7
  - Vértebras torácicas: rolagem 0 a 12 e +12; T1 a T12
  - Vértebras lombares: rolagem 0 a 5 e +5; L1 a L5
  - Sacro e Cóccix: catalogados individualmente com códigos P/F/I/A e alterações ósseas.
- **Tórax** (`torax: OsteologicalSectionTorax`):
  Conforme especificação dos docs, as costelas utilizam o padrão de contagem numérica (caixa de seleção rolagem 0 a 12 e +12)
  e identificação múltipla escolha de costelas individualizadas (1ª a 12ª, com "Nenhuma identificada" e "Supranumerária"):
  - Costelas direitas: rolagem 0 a 12 e +12; 1ª a 12ª
  - Costelas esquerdas: rolagem 0 a 12 e +12; 1ª a 12ª
  - Esterno (Manúbrio, Corpo, Processo xifóide): catalogado com códigos P/F/I/A e alterações ósseas.
- **Membros Superiores** (`membrosSuperiores`, 22 ossos): só os ossos do
  braço/cintura escapular (Clavícula, Escápula, Úmero, Ulna, Rádio — 11
  por lado), Direito e Esquerdo juntos na mesma seção — substitui as 2
  seções antigas (Membro Superior Direito, Membro Superior Esquerdo).
  Carpo e metacarpo saem pra **Ossos da Mão** (`ossosMao`, 26 ossos,
  Direito+Esquerdo juntos, cada um identificado por lado).
- **Membros Inferiores** (`pelveMembroInferior`, 26 ossos — rotulado na interface como "6. Membros Inferiores"):
  Ílio/Ísquio/Púbis + Fêmur/Patela/Tíbia/Fíbula, Direito e Esquerdo juntos
  na mesma seção — substitui as 3 seções antigas (Pelve & Bacia, Membro
  Inferior Direito, Membro Inferior Esquerdo). Tarso e metatarso saem pra
  **Ossos do Pé** (`ossosPe`, 24 ossos, mesma lógica da mão).
- **Pooled de falanges/sesamoides** (`maoPooled`/`pePooled`, inalterado
  desde `_local-adr-policy-109`/`_local-edr-policy-105`): antes aparecia
  duplicado nas duas abas do mesmo membro (Direito e Esquerdo eram seções
  separadas); agora aparece uma vez só, dentro da seção única "Ossos da
  Mão"/"Ossos do Pé".
- **Contagem de "catalogados" cobre tudo que é determinado**: o badge
  `X/Y catalogados` de cada seção agora é `Object.keys(ossos).length`
  sobre a lista corrida real (vértebra, costela e osso contam igual).
  Cabeça e Pescoço soma também as estruturas complementares
  (cartilagens da laringe + ossículos da audição D/E): `Y` passa de 23
  para 31. Dentro de um grupo complementar, marcar "Ausentes" conta
  como todos os itens daquele grupo determinados (mesmo raciocínio do
  código `A` num osso comum) — não como mais um item à parte.
- **Visualização bilateral em 2 colunas e ergonomia visual de tela**:
  Nas 4 seções apendiculares bilaterais (Membros Superiores, Membros Inferiores, Ossos da Mão, Ossos do Pé), bem como no Tórax (Costelas) e Cabeça/Pescoço (Ossículos), a interface organiza os elementos em duas colunas ergonomicamente alinhadas ao monitor do usuário: a coluna do **Lado Esquerdo** fica posicionada à esquerda da tela e a do **Lado Direito** fica posicionada à direita da tela, eliminando incongruências espaciais e fadiga visual de catalogação. A interface fornece controles de visualização limpos ("Duas Colunas", "Lado Esquerdo", "Lado Direito"), sem poluição de parênteses e contagens redundantes nos cabeçalhos e botões de filtro.
- **Ações rápidas de preenchimento em lote completas (P, F, I, A)**:
  A barra de ações de cada seção agora oferece botões dedicados de marcação em lote para todos os estados de presença:
  "Marcar Todos P" (Presente sem fratura), "Marcar Todos F" (Presente com fratura), "Marcar Todos I" (Incompleto) e "Marcar Todos A" (Ausente, com limpeza retroativa de alterações ósseas conforme ADR 109), além de "Limpar". Nas seções bilaterais com duas colunas, cada coluna de lado (Esquerdo e Direito) conta com atalhos compactos equivalentes ("Todos: [P] [F] [I] [A]"), acelerando o fluxo de trabalho pericial.
- **Regra retroativa de exclusão A×alteração** (`_local-adr-policy-109`)
  e o clique na linha do osso abrindo a gaveta de alterações (fix
  anterior, aplicado só à Cabeça e Pescoço e ao componente genérico)
  continuam valendo — agora uniformemente em todas as seções, já que
  todas usam o mesmo `SimpleBoneRows`.

## References

- Arquivos: `src/components/OsteologicalInventoryViewer.tsx`,
  `src/types/sgccco.ts`
- Testes: `src/components/__tests__/OsteologicalInventoryViewer.test.tsx`,
  `src/components/__tests__/osteologicalLogic.test.ts`
- Policies superadas por este documento: `_local-adr-policy-111`
  (prancha visual de 4 pranchas), `_local-adr-policy-112` (estrutura
  anterior das Seções 2-8)
- Policies relacionadas, ainda válidas: `_local-adr-policy-109`
  (alterações ósseas por osso com botão `!`), `_local-edr-policy-105`
  (testes de ações em lote e estado compartilhado entre seções)
