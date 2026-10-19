---
name: _local-adr-policy-112-inventario-osteologico-secoes-postcranianas
description: O Inventário Osteológico da Fase 4 (§15) generaliza o padrão P/F/I/A e alterações ósseas para as Seções 2 a 8 do esqueleto pós-craniano (Coluna, Tórax, Membros Superiores D/E, Pelve & Bacia, Membros Inferiores D/E) através de handlers parametrizados por chave de seção, contagem com ordinais identificados para peças repetitivas (vértebras e costelas), contagens pooled de falanges/sesamóides entre lados e regra de exclusão mútua entre Ausência (A) e alteração óssea. Use antes de alterar a persistência ou a interface do inventário osteológico pós-craniano.
apply-to: src/components/OsteologicalInventoryViewer.tsx, src/types/sgccco.ts, src/components/__tests__/OsteologicalInventoryViewer.test.tsx
valid-from: 2026-10-19
---

# _local-adr-policy-112: Inventário Osteológico Pós-Craniano (Seções 2 a 8, Fase 4)

> **[SUPERADA em 2026-10-19 por `_local-adr-policy-113`]** — Os pesquisadores
> pediram nova reestruturação: vértebras e costelas viraram linhas
> individuais (não mais contagem+identificação ordinal), carpo/metacarpo e
> tarso/metatarso saíram para seções próprias ("Ossos da Mão"/"Ossos do
> Pé"), e Pelve & Bacia se uniu ao Membro Inferior numa seção só. Este
> documento fica como registro histórico da decisão original — nunca
> apagado, só substituído.

## Context and Problem Statement

A Fase 4 da COI-INC prevê o inventário osteológico completo de 8 regiões anatômicas
do corpo humano: Cabeça e Pescoço (Seção 1), Coluna Vertebral (Seção 2), Tórax (Seção 3),
Membro Superior Direito (Seção 4), Membro Superior Esquerdo (Seção 5), Pelve & Bacia
(Seção 6), Membro Inferior Direito (Seção 7) e Membro Inferior Esquerdo (Seção 8).

Até então, apenas a Seção 1 (Cabeça e Pescoço) estava implementada. Replicar a lógica
de Cabeça e Pescoço manualmente para as outras 7 seções criaria duplicação de código
massiva em handlers de estado, formulários e estruturas de tipos. Além disso, elementos
anatômicos pós-cranianos possuem particularidades que não existem no crânio:
1. **Elementos repetitivos seriados:** Vértebras (C1-C7, T1-T12, L1-L5) e Costelas
   (1ª a 12ª) exigem registrar a contagem total recuperada e, quando possível, quais
   ordinais específicos foram individualizados pelo perito.
2. **Pequenos ossos das extremidades (mãos e pés):** Falanges e sesamóides
   frequentemente chegam misturados entre os lados no material exumado, tornando
   impossível ao técnico atribuir lado exato para cada falange isolada.
3. **Consistência de dados forenses:** Se um osso é marcado como `Ausente (A)`,
   não faz sentido reter ou permitir o registro de alterações ósseas patológicas
   ou traumáticas nele.

## Decision Outcome

**Parametrização unificada das Seções 2 a 8 com handlers genéricos por chave de região,
blocos especializados de contagem e identificação ordinal, contagens *pooled*
compartilhadas para mãos e pés, e regra rígida de exclusão mútua entre Ausência e Alteração.**

### Details

- **Handlers Parametrizados por Seção** (`OsteologicalInventoryViewer.tsx`):
  Em vez de 7 conjuntos de funções clonadas, implementou-se `handleSetSectionBonePresence(sectionKey, bone, code)`
  e `handleToggleSectionBoneAlteracao(sectionKey, bone, tipo)`, garantindo manutenibilidade
  e propagação instantânea de mudanças para todo o esqueleto pós-craniano.
- **Blocos de Contagem e Identificação Ordinal**:
  - *Coluna Vertebral*: Contadores independentes para Vértebras Cervicais (0 a 7, C1-C7),
    Torácicas (0 a 12, T1-T12) e Lombares (0 a 5, L1-L5).
  - *Tórax*: Costelas Direitas e Costelas Esquerdas (0 a 12 cada, com seleção das costelas
    específicas 1ª a 12ª identificadas).
- **Contagens *Pooled* Compartilhadas (Mãos e Pés)**:
  - As falanges (proximais, médias e distais) e sesamóides das mãos são armazenados
    em uma estrutura única compartilhada (`phase4.inventory.pooledMao`) acessível e
    sincronizada entre as abas do Membro Superior Direito e Esquerdo.
  - O mesmo princípio aplica-se aos pés (`phase4.inventory.pooledPe`), compartilhado
    entre Membro Inferior Direito e Esquerdo, evitando contagens duplicadas ou
    imputação arbitrária de lateralidade pelo técnico.
- **Regra de Exclusão Mútua (Ausente $\times$ Alteração)**:
  Ao marcar qualquer elemento ósseo como `Ausente (A)` (seja no crânio ou no pós-craniano):
  1. Qualquer alteração previamente registrada naquele osso é automaticamente purgada.
  2. O drawer de alterações é fechado.
  3. O botão de alerta vermelho (`!`) é desabilitado enquanto o estado persistir como `A`.
- **Correção da Barra de Navegação**:
  O contador visual de status no cabeçalho das abas (`X/Y catalogados`) agora calcula
  a fração de ossos preenchidos da respectiva seção ativa, em vez de refletir erroneamente
  sempre a contagem de Cabeça e Pescoço.

## References

- Arquivos: `src/components/OsteologicalInventoryViewer.tsx`, `src/types/sgccco.ts`
- Testes: `src/components/__tests__/OsteologicalInventoryViewer.test.tsx` (cobertura
  das seções 2 a 8, contagens de vértebras e costelas, e exclusão mútua de ausência)
- Policies relacionadas: `_local-adr-policy-111` (inventário craniano em 4 pranchas),
  `_local-adr-policy-109` (alterações ósseas por osso com botão `!`),
  `_local-bdr-policy-501` (conformidade com POP 02 do INC),
  `_local-edr-policy-105` (testes de ações em lote e estado compartilhado entre abas)
