---
name: _local-adr-policy-401-exploracao-conexao-pci-conecta
description: Explora (sem decidir implementar) uma possível conexão entre o SIGCOI e a Rede PCI Conecta (sistema nacional de identificação de pessoas desaparecidas) — onde a busca por semelhança entre ossos poderia ajudar, e onde ela cruzaria a missão declarada do SIGCOI. Leia antes de qualquer integração entre SIGCOI e qualquer sistema externo de identificação de pessoas.
apply-to: db/boneSimilarity.ts, server.ts (rota /api/bone-similarity/search), src/components/KnowledgeGraphViewer.tsx
valid-from: 2026-10-06
---

# _local-adr-policy-401: Exploração de conexão com a Rede PCI Conecta

## Context and Problem Statement

Durante a implementação da busca por semelhança entre ossos
(`_local-adr-policy-103`), o Tales levantou uma ideia: usar o acervo do
SIGCOI (~500 conjuntos, coleção de referência osteológica) como apoio pra
comparar características de um osso achado fora do acervo — possivelmente
ligado a um caso de pessoa desaparecida — por região, sexo, altura, idade.

Ele citou um projeto real relacionado: a **Rede PCI Conecta**
(`mariabelcb-af/rede-pci-conecta-prototipo`), sistema nacional de apoio à
identificação de pessoas desaparecidas por confronto de características
(DRC — Dados de Rápida Conexão), com formulários de Referência (relato da
família), Questionado-Falecido (corpo achado) e Questionado-PVID (pessoa
viva achada), motor de pontuação ponderada, rodadas estadual e nacional.

Esta policy **não decide implementar nenhuma integração** — explicitamente
não (palavras do próprio Tales: "não estou afirmando que vamos conectar os
dois mundos... ainda"). Registra a ideia, o que já foi investigado, e o
limite institucional que ela encontra, pra não se perder e pra não ser
redescoberta do zero mais tarde.

## Decision Outcome

**Nenhuma integração técnica entre SIGCOI e PCI Conecta foi decidida.** O
que existe é uma observação de onde uma conexão *legítima* existiria, e
onde ela cruzaria a missão declarada do SIGCOI.

### A conexão legítima: apoio ao julgamento humano, não integração de sistema

O formulário "Questionado-Falecido" do PCI Conecta tem campos preenchidos
por um perito examinando um esqueleto achado — `A.a1_ESTATURA` (faixa
mín/máx em cm), `PES.SEXO_BIO` (Feminino/Masculino/Indeterminado),
`D.d_FRATURA` (fratura óssea antiga), `D.d_PROTESE_ORTO` (prótese/placa/pino
ortopédico). É exatamente o momento em que a busca por semelhança do SIGCOI
(`_local-adr-policy-103`) ajuda: o perito descreve o osso, vê candidatos
parecidos no acervo de referência, e usa isso pra embasar o que escreve
naqueles campos — do mesmo jeito que um manual de antropologia forense
ajudaria, só que interativo.

Essa conexão é **só de fluxo de trabalho humano**, nunca de sistema: o
SIGCOI não chamaria a API do PCI Conecta, nem o inverso. O único ponto de
alinhamento possível, sem nenhuma integração, é o **vocabulário**: hoje a
busca por semelhança do SIGCOI usa `sexEstimate`/`ageCategory` com rótulos e
granularidade próprios — alinhar esses rótulos (e, futuramente, uma faixa de
estatura) com os valores permitidos do dicionário de campos do PCI Conecta
tornaria a tradução direta pro perito, sem exigir nenhuma decisão maior.

### O limite: a missão declarada do SIGCOI

A própria instrução do sistema usada hoje na integração com o Gemini
(`server.ts`, rota `/api/chat`) declara o SIGCOI como coleção "para pesquisa
aplicada, capacitação e ensino em antropologia forense... **sem finalidade
de resolução de casos criminais**". Usar o acervo pra comparar e ajudar a
identificar o osso de uma pessoa desaparecida específica é resolução de
caso — isso não é um detalhe técnico, é mudança de missão institucional do
biobanco, do mesmo porte das decisões que o próprio documento de
especificação técnica do PCI Conecta trata como "fora de escopo, decisão
institucional" (escolha de fornecedor de nuvem, parecer jurídico de LGPD).

Qualquer integração de sistema de verdade (API entre SIGCOI e PCI Conecta,
ou acesso direto de um sistema aos dados do outro) precisaria, no mínimo,
de decisão institucional equivalente ao que o PCI Conecta já exige de si
mesmo: hospedagem sob tutela de pessoa jurídica de direito público,
avaliação de LGPD/RIPD, e — no caso do SIGCOI especificamente — decidir se
isso muda a missão declarada do biobanco. Nenhuma dessas decisões cabe a
uma sessão de desenvolvimento.

### Details

- **O que já foi investigado**: lido `Especificacao_Tecnica_Rede_PCI_Conecta.md`
  e `Dicionario_Campos_PCI_Conecta_v0.1.xlsx` do repositório
  `mariabelcb-af/rede-pci-conecta-prototipo`. O PCI Conecta já segue
  disciplina parecida com a do SIGCOI na parte de IA: schema explícito
  enviado à IA, proibição de inventar valor fora do vocabulário controlado,
  indicador de confiança por campo, nunca gravação direta no banco de
  confronto — o resultado da IA é sempre rascunho até confirmação humana.
  Mesma filosofia já seguida pelo SIGCOI em `_local-adr-policy-103` e no
  condutor de voz.
- **Campos do PCI Conecta relevantes a este acervo**: `A.a1_ESTATURA`,
  `PES.SEXO_BIO`, `A.a3_COR_PELE` (cor da pele/tipo populacional — não é
  exatamente "região do Brasil"), `D.d_FRATURA`, `D.d_PROTESE_ORTO`.
  `PES.MUNICIPIO_UF` existe no formulário, mas é do caso individual
  (desaparecimento ou nascimento), não uma consulta agregada por região.
- **Nenhum código foi alterado por esta policy** — é só registro de
  exploração.

## References

- Repositório investigado: `mariabelcb-af/rede-pci-conecta-prototipo`
  (`Especificacao_Tecnica_Rede_PCI_Conecta.md`,
  `Dicionario_Campos_PCI_Conecta_v0.1.xlsx`)
- Policy relacionada: `_local-adr-policy-103` (busca por semelhança entre
  ossos — onde a conexão legítima se apoiaria)
- Pendência explícita, não resolvida por esta policy: decisão institucional
  sobre se/quando alinhar vocabulário com o PCI Conecta, e se a missão do
  SIGCOI algum dia se amplia para apoiar resolução de caso — nenhuma das
  duas decidida aqui.
