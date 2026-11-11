---
name: _local-adr-policy-124-distribuicao-academica-universidades-federacao-1-clique
description: Modelo de federação descentralizada em 1-clique (REDCap Model) para distribuição acadêmica às universidades no Pós-Doutorado da Dra. Nicole Damascena, assegurando soberania local de dados, parametrização institucional via ambiente, licenciamento GNU AGPLv3, empacotamento Turnkey (Render e Docker) e política de citação científica.
apply-to: render.yaml, Dockerfile, docker-compose.yml, LICENSE, src/config/institutionConfig.ts, src/components/CitationModal.tsx, src/components/UpdateChecker.tsx, src/App.tsx, src/components/Phase7ConsultaPesquisa.tsx, README.md, docs/
valid-from: 2026-11-11
---

# _local-adr-policy-124: Distribuição Acadêmica Universitária do SIGCOI sob Modelo de Federação Descentralizada ("REDCap Model")

## Context and Problem Statement

O SIGCOI (Sistema Integrado de Gestão de Coleções Osteológicas Identificadas) atingiu maturidade técnica, pericial e anatômica no Instituto Nacional de Criminalística (INC/DITEC/PF). No âmbito do Pós-Doutorado da Dra. Nicole Damascena (Perita Criminal Federal da PF), surgiu a necessidade de disponibilizar a plataforma para universidades públicas e privadas no Brasil e no exterior, transformando o SIGCOI em um padrão unificado de biobancos osteológicos.

Diante desse objetivo, três modelos arquiteturais de distribuição foram avaliados:
1. **Modelo A: Repositório GitHub Puro (Forks soltos):** Barreira técnica excessiva para antropólogos físicos e perda rápida de sincronização com o núcleo canônico.
2. **Modelo B: SaaS Multitenant Centralizado Único:** Custo financeiro proibitivo de infraestrutura (bancos, fotos, DICOM) concentrado nos pesquisadores e, criticamente, assunção indevida de risco jurídico e ético (guarda e custódia centralizada de remanescentes mortais humanos e dados de cemitérios de terceiros sob a LGPD).
3. **Modelo C: Federação Descentralizada 1-Clique ("REDCap Model"):** Inspirado na bem-sucedida experiência do REDCap (Vanderbilt University) na pesquisa clínica global, onde cada instituição opera sua própria instância e banco de dados de forma autônoma, recebendo melhorias contínuas do núcleo mantido por Nicole e Tales.

A deliberação convergiu unanimemente pela adoção do **Modelo C (Federação Descentralizada 1-Clique)**.

## Decision Outcome

1. **Os Três Princípios Invioláveis da Rede SIGCOI**:
   - **Soberania e Custódia Local das Universidades:** Cada universidade parceira é a única guardiã jurídica, ética e operacional de seu acervo ósseo. Nenhum dado sensível de identificação cadavérica, laudos ou fotos transita por servidores de Nicole ou Tales.
   - **Zero Ônus Operacional Central:** A equipe mantenedora do núcleo canônico não atua como provedora de infraestrutura, nem assume responsabilidades de suporte 24/7.
   - **Evolução Contínua Sincronizada:** As instâncias acadêmicas recebem atualizações metodológicas e corretivas através do procedimento simples de *"Sync Fork"* no GitHub, mantendo a integridade dos dados preexistentes.

2. **Parametrização Multi-Institucional por Variáveis de Ambiente (`src/config/institutionConfig.ts`)**:
   - Desacoplamento de qualquer referência institucional fixa ("INC/DITEC/PF") da interface e dos relatórios de exportação.
   - Variáveis configuráveis via `.env`:
     - `VITE_INSTITUTION_NAME`: Nome por extenso da instituição gestora.
     - `VITE_INSTITUTION_ACRONYM`: Sigla oficial nos cabeçalhos e crachás.
     - `VITE_COLLECTION_PREFIX`: Prefixo de códigos de acervo e caixas (ex: `COI`, `LAF-USP`, `UFMG-COI`).
     - `VITE_CURATOR_CONTACT_EMAIL`: E-mail institucional de contato da curadoria.
     - `VITE_DEFAULT_LANGUAGE`: Idioma da interface (`pt-BR`, `en-US`, `es-ES`).
   - Valores padrão seguros preservam a identidade institucional de referência caso nenhuma variável seja definida.

3. **Empacotamento de Deploy em 1-Clique e On-Premise**:
   - **Nuvem em 1-Clique (`render.yaml`)**: Blueprint oficial do Render com link direto pré-configurado no `README.md` (`?repo=https://github.com/nicoledamascena-art/SIGCOI`). Ligação ao banco de dados PostgreSQL serverless via `DATABASE_URL` (Neon ou similar) e suporte a portas dinâmicas no `server.ts` (`process.env.PORT`).
   - **On-Premise / Local (`Dockerfile` e `docker-compose.yml`)**: Multi-stage build com Node 22 e PostgreSQL 16 pronto para rodar em computadores de laboratório sem internet ou redes acadêmicas internas via `docker compose up -d`.

4. **Política de Citação Científica (*Citation Policy*)**:
   - Criação do componente modal `CitationModal.tsx` integrado ao rodapé global (`App.tsx`) e à tela de exportação de dados científicos da Fase 7 (`Phase7ConsultaPesquisa.tsx`).
   - Disponibilização instantânea de citação nos formatos ABNT (NBR 6023) e BibTeX com download direto de arquivo `.bib`, referenciando o artigo metodológico fundacional da Dra. Nicole Damascena, Tales Carvalho e equipe:
     `DAMASCENA, Nicole Prata; CARVALHO, Tales Seixas de; BENTO, Maria Izabel Cardoso; MACHADO, Carlos Eduardo Palhares. SIGCOI: An Open-Source, Blockchain-Ready Management System for Human Osteological Collections and Forensic Bioanthropology. 2026.`

5. **Notificador de Atualização da Federação (`UpdateChecker.tsx`)**:
   - Embutido na aba de Configurações (`SettingsView.tsx`), consulta de forma assíncrona a API pública de releases do repositório canônico (`nicoledamascena-art/SIGCOI`).
   - Informa o commit ativo e disponibiliza instruções passo a passo para sincronização de fork em 1 clique sem perda de dados no PostgreSQL.

6. **Licenciamento GNU AGPLv3 (`LICENSE`)**:
   - Adoção da licença **GNU Affero General Public License v3.0**, assegurando que o SIGCOI permaneça livre e gratuito permanentemente, proibindo fechamento proprietário por terceiros e garantindo reciprocidade científica internacional.

## Consequences

### Positivas
- **Impacto no Pós-Doutorado:** Criação de uma rede federada ("Consórcio SIGCOI"), com potencial de citação obrigatória em laudos, TCCs, dissertações e teses que utilizem a ferramenta.
- **Isenção de Risco Jurídico:** A custódia ética perante Comitês de Ética em Pesquisa (CEP/Conep) e a conformidade com a LGPD recaem integralmente sobre a instituição instaladora.
- **Sustentabilidade:** Custo financeiro zero para a equipe do projeto, com facilidade máxima de adoção para docentes e pesquisadores (onboarding em 5 a 15 minutos).

### Negativas / Trade-offs
- A qualidade do backup e da segurança de rede local depende das boas práticas de cada universidade (endereçado através dos manuais e templates do Render/Neon com backups automatizados).

## References

- Arquivos modificados/criados:
  - `LICENSE`
  - `Dockerfile`
  - `docker-compose.yml`
  - `render.yaml`
  - `server.ts`
  - `.env.example`
  - `README.md`
  - `src/config/institutionConfig.ts`
  - `src/components/CitationModal.tsx`
  - `src/components/UpdateChecker.tsx`
  - `src/components/SettingsView.tsx`
  - `src/components/Phase7ConsultaPesquisa.tsx`
  - `src/components/Phase1Recebimento.tsx`
  - `src/components/Phase6Galpao.tsx`
  - `src/components/AuditTimelineView.tsx`
  - `src/components/KnowledgeGraphViewer.tsx`
  - `src/components/HelpView.tsx`
  - `src/services/auditService.ts`
  - `docs/PLANO_ESTRATEGICO_DISTRIBUICAO_UNIVERSIDADES.md`
  - `docs/MANUAL_IMPLANTACAO_UNIVERSIDADES.md`
  - `docs/ARTIGO_CIENTIFICO_MINUTA.md`
  - `docs/ROTEIRO_TESTE_PILOTO_UNIVERSIDADE.md`
