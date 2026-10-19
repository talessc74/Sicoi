---
name: _local-adr-policy-111-inventario-osteologico-4-pranchas-anatomicas
description: O Inventário Osteológico da Cabeça e Pescoço (Fase 4, §15) utiliza um visualizador interativo em split-screen composto por 4 pranchas especializadas (Figuras 5.1 a 5.4 do livro de anatomia craniofacial) com sub-abas, contornos vetoriais orgânicos 1:1 extraídos via visão computacional (OpenCV) e sincronização bidirecional em tempo real — preservando o crânio de Beauchêne histórico via modal. Use antes de alterar o visualizador de crânio, os mapas SVG de hotspots, o cadastro de ossos cranianos ou a sincronização do inventário osteológico.
apply-to: src/components/AnatomicMultiPlateSkullViewer.tsx, src/components/OsteologicalInventoryViewer.tsx, public/images/anatomical/cranio_grupo*.png, public/images/anatomical/cranio_beauchene_completo.jpg, src/components/__tests__/AnatomicMultiPlateSkullViewer.test.tsx
valid-from: 2026-10-19
---

# _local-adr-policy-111: Inventário Osteológico da Cabeça e Pescoço — Visualizador Interativo em 4 Pranchas Anatômicas com Contornos Orgânicos

> **[SUPERADA em 2026-10-19 por `_local-adr-policy-113`]** — Os pesquisadores
> pediram a remoção da prancha visual: Cabeça e Pescoço voltou a ser lista
> corrida, igual às demais seções. `AnatomicMultiPlateSkullViewer.tsx`, as
> imagens (`public/images/anatomical/cranio_*`) e o teste correspondente
> foram removidos do repositório. Este documento fica como registro
> histórico da decisão original — nunca apagado, só substituído.

## Context and Problem Statement

Na Fase 4 (Inventário e Análise Osteológica), o técnico e o perito precisam
registrar a presença e integridade de 23 ossos craniofaciais e estruturas anexas
(cervicais e ossículos da audição). Anteriormente, a interface exibia apenas
uma lista textual de campos.

Quando se propôs adicionar uma prancha gráfica para seleção visual direta,
duas tentativas iniciais enfrentaram problemas críticos de usabilidade e precisão:
1. **Sobrecarga de informação em imagem única:** Uma única prancha panorâmica
   de crânio explodido (Beauchêne) concentrava muitas peças diminutas e sobrepostas
   (etmóide, esfenóide, vômer, conchas nasais e palatinos espremidos entre a calota
   e a mandíbula), dificultando o clique em dispositivos móveis e telas médias.
2. **Falta de precisão em protótipos retangulares:** A primeira divisão em 4 grupos
   utilizou caixas retangulares genéricas (*bounding boxes* ou colunas inteiras).
   Os peritos rejeitaram imediatamente: peças vizinhas tinham áreas de clique
   invasivas e a seleção visual não correspondia à morfologia real do osso desenhado.

Question: Como organizar a identificação dos 23 ossos cranianos e anexos de forma
didática, sem poluição visual, garantindo que o clique acompanhe a curvatura exata
dos desenhos anatômicos com sincronização fluida e sem perder o valor histórico
do crânio panorâmico montado?

## Decision Outcome

**Divisão do inventário craniano em 4 Pranchas Especializadas de Referência
(783 × 1024 px cada), com sub-abas rápidas no formulário, contornos vetoriais
orgânicos 1:1 calibrados via OpenCV e sincronização bidirecional completa —
mantendo o Crânio de Beauchêne acessível por modal.**

### Details

- **Estrutura das 4 Pranchas Didáticas** (`SKULL_SUBGROUPS_CONFIG`):
  1. `calota` (*Figura 5.3 - Pág. 33 · Calota Craniana & Neurocrânio*):
     Frontal (cúpula anterior e fronte lateral), Parietal D (abóbada lateral),
     Parietal E (assoalho interno), Temporal D (escama, meato e mastóide),
     Temporal E (porção petrosa e fossa média) e Occipital (base inferior e forame magno).
  2. `base_profunda` (*Figura 5.4 - Pág. 35 · Base Craniana Profunda*):
     Etmóide (3 vistas: lâmina crivosa, superfície posterior e assoalho) e
     Esfenóide (4 vistas: vista anterior, posterior, superior e base com asa maior).
  3. `face` (*Figura 5.2 - Pág. 31 · Esqueleto Facial Menor & Nariz*):
     Nasais D e E (divididos milimetricamente na sutura internasal), Palatinos D e E
     (divididos na sutura interpalatina), Zigomático D e E, Conchas Nasais Inferiores
     D e E, Lacrimais D e E e Vômer (lâmina vertical + septo no crânio anterior).
  4. `mandibula_cervical` (*Figura 5.1 - Pág. 29 · Arcadas Dentárias & Mandíbula*):
     Mandíbula completa, medial, edêntula e vistas de crânio; Maxilas D e E
     (superfícies lateral/medial e arcada superior); Hióide e estruturas anexas.
- **Navegação por Sub-abas com Contadores**:
  Tanto no formulário quanto no topo do visualizador, mini-seletores exibem o
  progresso de preenchimento (`preenchidos / total`), permitindo focar num conjunto
  de ossos de cada vez sem rolagem excessiva.
- **Contornos Vetoriais Orgânicos 1:1 via Visão Computacional**:
  Em vez de retângulos ou polígonos manuais aproximados, as coordenadas SVG
  (`M ... L ... Z`) foram extraídas através de pipeline em OpenCV:
  `cv2.threshold` binário inverso dos traços em nanquim, fechamento morfológico
  (`cv2.morphologyEx` com kernel elíptico/retangular), extração de contorno externo,
  envoltória convexa e simplificação poligonal via Douglas-Peucker (`cv2.approxPolyDP`).
  O polígono resultante abraça as suturas, fossas e apófises reais do desenho.
- **Mapeamento Multi-vista sob o mesmo Identificador**:
  Quando um osso é representado em mais de um ângulo na mesma prancha (ex.: a Mandíbula
  possui 5 desenhos na Figura 5.1; o Esfenóide possui 4 desenhos na Figura 5.4),
  todos os sub-caminhos são agrupados no mesmo elemento SVG (`M ... Z M ... Z`).
  Ao passar o cursor ou selecionar o osso, todas as suas vistas acendem juntas.
- **Sincronização Bidirecional e Rolagem Automática**:
  - *Clique na imagem*: seleciona o osso, alterna para a prancha correta caso
    necessário e executa `scrollIntoView({ behavior: 'smooth', block: 'center' })`
    na linha do formulário correspondente.
  - *Clique no formulário*: acende e destaca com brilho (*drop-shadow*) o contorno
    anatômico correspondente na prancha ativa.
  - *Badges informativos*: cada peça na prancha exibe uma badge circular indicando
    o código registrado (`P` verde, `F` âmbar, `I` roxo, `A` ardósia tracejado).
- **Preservação do Crânio de Beauchêne**:
  A imagem histórica de alta resolução (`cranio_beauchene_completo.jpg`) continua
  no repositório e é acessível instantaneamente através do botão **`🏛️ Ver Beauchêne`**
  no topo do visualizador, abrindo um modal de consulta panorâmica.
- **Estruturas Anexas (Cartilagens e Ossículos)**:
  Ficam agrupadas sob a aba `mandibula_cervical` com caixas de seleção dedicadas
  para cartilagens laríngeas (tireóidea e cricoide) e ossículos da audição (martelo,
  bigorna e estribo direitos e esquerdos).

## References

- Arquivos: `src/components/AnatomicMultiPlateSkullViewer.tsx`,
  `src/components/OsteologicalInventoryViewer.tsx`,
  `public/images/anatomical/cranio_grupo1_calota.png`,
  `public/images/anatomical/cranio_grupo2_base_profunda.png`,
  `public/images/anatomical/cranio_grupo3_face_pequenos.png`,
  `public/images/anatomical/cranio_grupo4_arcadas_mandibula.png`,
  `public/images/anatomical/cranio_beauchene_completo.jpg`
- Testes: `src/components/__tests__/AnatomicMultiPlateSkullViewer.test.tsx`
  (renderização de pranchas, clique em hotspots e alternância de sub-abas)
- Policies relacionadas: `_local-adr-policy-102` (identidade visual e semântica de cores),
  `_local-adr-policy-109` (alterações ósseas por osso com botão `!`),
  `_local-bdr-policy-501` (conformidade com POP 02 e formulários da COI-INC)
