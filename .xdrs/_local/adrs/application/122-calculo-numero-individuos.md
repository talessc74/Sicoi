---
name: _local-adr-policy-122-calculo-numero-individuos
description: Implementação da aba 'Número de Indivíduos' na Fase 4 (Curadoria Forense), com determinação bioantropológica em tempo real de NMI (Número Mínimo de Indivíduos), MMT (Mínimo Máximo Total) e NMPI (Número Mais Provável de Indivíduos com função piso e valor decimal) integrado com cálculo de variância Vx e intervalo de confiança IC 95%, gaveta retrátil inferior de ossos do inventário e isolamento rigoroso de resultados por osso.
apply-to: src/components/Phase4Curadoria.tsx, src/components/NumeroIndividuosViewer.tsx, src/utils/quantificacaoIndividuos.ts, src/types/sgccco.ts
valid-from: 2026-10-28
---

# _local-adr-policy-122: Cálculo e Quantificação Forense do Número de Indivíduos (NMI, MMT, NMPI e IC 95%)

## Context and Problem Statement

Na análise curatorial e bioantropológica de remanescentes ósseos humanos (Fase 4 - Curadoria Forense),
um dos objetivos centrais da antropologia forense é a quantificação e estimativa rigorosa do número de
indivíduos presentes no conjunto esquelético, especialmente em contextos de ossadas fragmentadas,
comissuradas ou de sepultamentos secundários.

Anteriormente, o sistema SIGCOI oferecia as abas "Indivíduos & Perfil Biológico", "Inventário Osteológico",
"Inventário Odontológico" e "Foto Montagem Completa", sem uma ferramenta integrada para o cálculo
antropológico padronizado do Número Mínimo de Indivíduos (NMI), Mínimo Máximo Total (MMT) e Número Mais
Provável de Indivíduos (NMPI / Estimador de Chapman). Era necessário que o perito realizasse esses cálculos
manualmente em planilhas externas.

## Decision Outcome

Adicionada ao lado de "Inventário Osteológico" e "Inventário Odontológico" uma nova aba dedicada:
**"Número de Indivíduos"** (`numero_individuos`), contendo 3 caixas de resultados numéricos no topo,
cálculos biométricos automatizados, gaveta retrátil inferior com os ossos presentes no inventário e
suporte a múltiplos ossos com isolamento de resultados.

### 1. Três Caixas de Métricas Consolidadas

No topo da aba, três cards de destaque exibem os resultados consolidados do conjunto:

1. **Número Mínimo de Indivíduos (NMI)**:
   $$\text{NMI} = \max(\text{NME}(E), \text{NME}(D))$$
   Maior número de um elemento anatômico único (NME) encontrado, seja do lado esquerdo ($E$) ou direito ($D$).
   No agregado, corresponde ao maior NMI entre todos os elementos ósseos analisados.

2. **Mínimo Máximo Total (MMT)**:
   $$\text{MMT} = \text{NME}(E) + \text{NME}(D) - P$$
   Soma dos elementos do lado esquerdo e direito, subtraindo a quantidade de elementos comprovadamente
   pareados ($P$). Validação estrita: $0 \le P \le \min(E, D)$.

3. **Número Mais Provável de Indivíduos (NMPI - Chapman / Adams & Konigsberg 2004)**:
   $$\text{NMPI} = \left\lfloor \frac{(E + 1)(D + 1)}{P + 1} - 1 \right\rfloor$$
   Uso estrito da **função piso** ($\lfloor \rfloor$), na qual o número final nunca arredonda para cima.
   Exemplo: se o cálculo resultar em $3.9$, a interface exibe **`3 (3.9)`**, mantendo o valor decimal
   exato entre parênteses para transparência metodológica.
   
   - **Variância ($V_x$)**:
     $$V_x = \frac{(E + 1)(D + 1)(E - P)(D - P)}{(P + 1)^2 (P + 2)}$$
   - **Intervalo de Confiança 95% ($IC_{95\%}$)**:
     $$IC_{95\%} = \text{NMPI} \pm 1.96 \sqrt{V_x}$$
     Com limite inferior restrito a $\ge \max(1, \text{NMI})$.

### 2. Comportamento Padrão (Default)

Por padrão, quando a página é aberta sem ossos cadastrados ou com contagens zeradas, todas as 3 caixas
retornam como resultado o valor padrão **`1`** (um indivíduo).

### 3. Gaveta Retrátil Inferior ("Ossos do Inventário Osteológico")

Um painel retrátil fixado na parte inferior da tela exibe todos os ossos marcados como presentes
(`P`), fragmentados (`F`) ou incompletos (`I`) no inventário osteológico do conjunto.
- Ao clicar no osso, ele é importado para a lista de quantificação com sugestões automáticas de $E$ e $D$.
- Apresenta também aba de "Catálogo Anatômico Completo" para inserção de qualquer osso bilateral padrão
  e campo para digitação de ossos personalizados.

### 4. Isolamento Rigoroso de Resultados por Osso

O usuário pode adicionar múltiplos ossos distintos (ex: Fêmur, Tíbia, Úmero, Costela C5). Cada linha/card
de osso dispõe de:
- Controles interativos para $E$, $D$ e $P$ (incremento, decremento e digitação direta).
- Resultados próprios e isolados (NMI, MMT, NMPI, $V_x$ e $IC_{95\%}$ daquele osso específico), sem que
  as contagens de um osso interfiram nas fórmulas do outro.
- O bloco consolidado superior reflete automaticamente o maior valor determinante do conjunto,
  indicando qual osso estabeleceu o valor máximo.

## References

- Arquivos: `src/components/Phase4Curadoria.tsx`, `src/components/NumeroIndividuosViewer.tsx`, `src/utils/quantificacaoIndividuos.ts`, `src/types/sgccco.ts`
- Literatura Forense:
  - Adams, B. J., & Konigsberg, L. W. (2004). *Estimation of the most likely number of individuals from commingled skeletal remains*. American Journal of Physical Anthropology, 125(2), 138-151.
  - Chapman, D. G. (1951). *Some properties of the hypergeometric distribution with applications to zoological sample censuses*. University of California Publications in Statistics, 1, 131-160.
  - Lyman, R. L. (1994). *Vertebrate Taphonomy*. Cambridge University Press.
  - White, T. E. (1953). *A method of calculating the dietary percentage of various food animals utilized by aboriginal peoples*. American Antiquity, 18(4), 396-398.
