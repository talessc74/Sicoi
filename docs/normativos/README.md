# Fontes normativas

## Portaria DITEC/PF nº 1415/2024

- **Assunto:** institui a Coleção Osteológica Identificada do Instituto Nacional de Criminalística (COI-INC), no âmbito do Sistema Nacional de Criminalística da Polícia Federal (art. 1º).
- **Data:** 29 de abril de 2024; vigência em 2 de maio de 2024 (art. 10).
- **Publicação no arquivo fornecido:** Aditamento Semanal DITEC/PF nº 018, de 6 de maio de 2024, páginas 4 a 8.
- **Arquivo:** [portaria-ditec-pf-1415-2024-coi-inc.pdf](portaria-ditec-pf-1415-2024-coi-inc.pdf).
- **SHA-256 do arquivo original:** `ee9a06456f5448b3598d51528bfb8ebaf07220f84af2992c10033a073e88b9cd`.

O PDF foi preservado integralmente, sem alterações. Como as páginas vêm de um aditamento semanal, a primeira e a última também contêm trechos de portarias vizinhas. A Portaria 1415/2024 inclui os Anexos 1 a 3: termo de supervisão, formulário de acesso e termo de responsabilidade.

Esta portaria institui e disciplina a COI-INC. Ela não é o POP-01 nem os Formulários A.1 e A.2; regras operacionais atribuídas a esses documentos devem ser verificadas nas respectivas fontes.

Recebemos do Tales, em 16/10/2026, um novo upload desta mesma Portaria
(`Portaria_1415-2024_DITEC_-_Colecao_osteologica_identificada_do_INC.pdf`,
SHA-256 `4d20dc8b768d0a16e6774652da42dd6b6a911a51c80781fe0a95f93922e4bb0a`) —
conferido página a página, é o mesmo texto desta mesma publicação (Aditamento
Semanal nº 018), só reexportado (hash diferente só por metadado do PDF, não
por conteúdo). Mantivemos o arquivo já arquivado aqui, sem duplicar.

## POP-01 — Análise Preliminar, Preparação, Limpeza, Maceração, Secagem e Armazenamento

- **Arquivo:** [pop01-analise-preliminar-preparacao-limpeza-maceracao-secagem-armazenamento.docx](pop01-analise-preliminar-preparacao-limpeza-maceracao-secagem-armazenamento.docx)
- **Recebido do Tales em:** 16/10/2026.
- **SHA-256:** `6bb1ab3319d7a636a193c4a7b3a29a586d79f847e1916f68068010ba719c6305`
- **Fases aplicáveis:** 1, 2 e 3 (Recebimento, Limpeza & Secagem, Acondicionamento Provisório).
- Procedimento padronizado de exame inicial, preparação, coleta prévia de amostras biológicas, maceração, limpeza, secagem e acondicionamento dos remanescentes ósseos da COI-INC.

## POP-02 — Catalogação dos Remanescentes Ósseos

- **Arquivo:** [pop02-catalogacao.docx](pop02-catalogacao.docx)
- **Recebido do Tales em:** 16/10/2026.
- **SHA-256:** `f5c309b95e9e0f324b9a8b774e54155f50f5936eae015271903bdb096390d889`
- **Fases aplicáveis:** 4 e 5 (Montagem e Inventário, Alterações Ósseas).
- Procedimento de montagem anatômica, marcação óssea, inventário osteológico/odontológico, patologias/lesões/alterações ósseas e acondicionamento em caixas ossuárias individualizadas.

## POP-03 — Registro Fotográfico dos Remanescentes Ósseos

- **Arquivo:** [pop03-registro-fotografico.docx](pop03-registro-fotografico.docx)
- **Recebido do Tales em:** 16/10/2026.
- **SHA-256:** `a1a8b97875ece76b41790d9954fca73e237ce7fa2b39a24871e5f1bbc1623eac`
- **Fases aplicáveis:** todas (transversal — checklist fotográfico usado em várias fases).
- Orienta o registro fotográfico dos remanescentes ósseos destinados à curadoria da COI-INC.

## Formulário A.1 — Análise Preliminar e Limpeza dos Remanescentes Ósseos

- **Arquivo:** [formulario-a1-analise-preliminar-limpeza.pdf](formulario-a1-analise-preliminar-limpeza.pdf)
- **Recebido do Tales em:** 16/10/2026.
- **SHA-256:** `5b93e9b34194fc00a2da8d3d42cdc21af06ea142aa7f89d246d581170b068f79`
- **Fase aplicável:** 1 (Recebimento & A.1).
- Formulário real (exportado do Microsoft Forms) que embasa os campos já implementados em `Phase1Recebimento.tsx`/`Phase1Data` — checklist fotográfico, tipo de material, estado de preservação, coleta de amostra biológica, limpeza e danos. Referencia o POP-01 (preenchimento) e o POP-03 (fotos).

## Formulário A.2 — Maceração e Secagem dos Remanescentes Ósseos

- **Arquivo:** [formulario-a2-maceracao-secagem.pdf](formulario-a2-maceracao-secagem.pdf)
- **Recebido do Tales em:** 16/10/2026.
- **SHA-256:** `3f553535e9aa650049d06b9a8df446e12e34e805e42c9521aa36196f139caf89`
- **Fase aplicável:** 2 (Limpeza & Secagem).
- Formulário real (exportado do Microsoft Forms) que embasa os campos de `Phase2Limpeza.tsx`/`Phase2Data` — ciclos e instrumentos de maceração, danos e forma de secagem. Referencia o POP-01.

## Como estes documentos chegam ao site

Os arquivos ficam só aqui, fora da pasta pública — nunca copiados para
`public/`. A rota `GET /api/documentos/:id` (`server.ts`, protegida por
`requireAuth`) lê o arquivo direto desta pasta pelo `fileName` cadastrado em
`src/data/officialDocuments.ts`, nunca por um caminho vindo da URL; só quem
está logado consegue abrir ou baixar. A aba Documentos do site lista esses
mesmos registros sob "Documentos Oficiais da COI-INC". Para incluir um
documento novo: arquivo aqui + ficha de proveniência (hash, data) neste
README + entrada em `officialDocuments.ts` — sempre os três juntos.
