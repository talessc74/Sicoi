# SIGCOI — Sistema Integrado de Gestão da Coleção Osteológica Identificada

Sistema de custódia e gestão de coleções osteológicas forenses, desenvolvido
para a INC/DITEC/PF. Ele conduz o fluxo operacional real de recebimento,
limpeza e curadoria de remanescentes ósseos — passo a passo, por voz ou por
texto — a partir dos formulários oficiais em uso (Formulário A.1, Formulário
A.2, POP-01), com cada assinatura de fase travada por hash criptográfico
SHA-256 e uma trilha de auditoria completa e imutável de tudo o que foi
feito, por quem e quando. Tudo é persistido em PostgreSQL, e o acervo pode
ser explorado como um grafo de conhecimento conectando conjuntos, caixas,
indivíduos, patologias, localização física, responsáveis e datas.

## Acessar agora

**Aplicação em produção:** <https://sgcccco.onrender.com>

O deploy é automático a partir da branch `main` deste repositório (via Render
Blueprint — ver `render.yaml`). O indicador de versão fixo no topo de
qualquer tela da aplicação mostra o hash do commit em execução, para
conferir a qualquer momento que o que está no ar corresponde exatamente ao
código deste repositório.

Não há login/senha ainda (ver "Pendências conhecidas" abaixo) — ao abrir o
sistema pela primeira vez, ele pede o cadastro da primeira pessoa (nome,
papel, instituição, matrícula) para identificar quem está operando.

## Fontes normativas

A [Portaria DITEC/PF nº 1415/2024](docs/normativos/portaria-ditec-pf-1415-2024-coi-inc.pdf), que institui a COI-INC, está arquivada integralmente em [`docs/normativos/`](docs/normativos/README.md). Ela é uma fonte distinta do POP-01 e dos Formulários A.1 e A.2.

## Stack

- React 19 + Vite 8 + TypeScript, Tailwind 4
- Express (Node) como servidor único — API + arquivos estáticos em produção
- PostgreSQL (`pg`, migrações versionadas em arquivo, sem ORM)
- `@google/genai` (Gemini) — extração estruturada de fala transcrita para os
  campos do formulário-alvo; nunca recebe áudio bruto diretamente

## Governança e decisões arquiteturais (XDRS)

Este código implementa decisões registradas formalmente no repositório
[`talessc74/2026SENASP`](https://github.com/talessc74/2026SENASP), sob o
protocolo de governança ARGUS + XDRS (`.xdrs/_local/` daquele repositório):

- Fidelidade aos formulários oficiais reais e motor de condução por voz —
  `_local-edr-policy-001`
- Persistência PostgreSQL (`full_state` JSONB + tabelas derivadas) —
  `_local-edr-policy-002`
- Deploy no Render e ambiente de teste do zero — `_local-edr-policy-003`
- Cadastro real de pessoas (sem login/senha ainda) — `_local-edr-policy-004`
- Condutor de voz: compatibilidade entre navegadores (Safari/iOS) —
  `_local-edr-policy-005` (amplia a policy 001)
- Motor de passos do condutor: contexto cumulativo entre falas, checklist de
  fotos como fonte de verdade — `_local-edr-policy-006` (amplia a policy 001)
- Bloqueios de interface sempre visíveis, nunca silenciosos —
  `_local-edr-policy-007`
- Modelo de dados do fluxo: assinatura universal, nível Galpão, Agente Grafo
  incremental — `_local-adr-policy-002`
- Grafo de Conhecimento persistido em Postgres — `_local-adr-policy-004`
  (amplia a policy acima)
- Redesenho dos agentes de IA da Fase de Curadoria — `_local-adr-policy-001`
  (ainda não implementado neste código — ver "Estado atual" abaixo)

Antes de mudar o fluxo operacional, o modelo de dados ou a integração de voz,
consulte o índice `.xdrs/_local/index.md` daquele repositório.

## Estado atual

- **No ar:** Fase 1 (Recebimento) e Fase 2 (Limpeza até secagem), fiéis aos
  Formulários A.1 e A.2 reais, com condução por voz (multi-turno, robusta a
  Safari/iOS), assinatura de fase reconferida no servidor, cadastro real de
  pessoas, persistência em Postgres e o Grafo de Conhecimento persistido
  (aba "Ferramentas → Grafo de Conhecimento"). O gate de assinatura da Fase 1
  explica exatamente o que falta (campo, foto ou papel da pessoa ativa) em
  vez de só desabilitar o botão. Todo campo do formulário salva sozinho a
  cada mudança — um indicador visível ("Salvo automaticamente às HH:MM:SS")
  confirma isso em tempo real, sem precisar de um botão de salvar separado.
  Curador e Administrador podem reabrir uma fase já assinada (botão
  "Reabrir", com justificativa técnica obrigatória) para corrigir qualquer
  campo já preenchido; a assinatura original nunca é apagada — fica marcada
  como substituída, com quem reabriu, quando e por quê — e tudo isso aparece
  automaticamente na Linha do Tempo de Auditoria.
- **Ainda não implementado:** Fase 3 (Armazenamento provisório), Fase 4
  (Curadoria — os dois agentes de apoio previstos), Fase 5 (Completude dos
  formulários) e Fase 6 (Volta pro armazém/Galpão). Bloqueado pela ausência
  dos apêndices oficiais do POP-02 (Inventário Osteológico, Inventário
  Odontológico, Formulário de Patologias) — nenhuma fase é reconstruída antes
  do documento oficial correspondente chegar.
- **Pendências conhecidas, fora do escopo até agora:** login/senha real (o
  cadastro de pessoas identifica quem está operando, mas não autentica),
  CORS restrito (hoje `*`), validação de entrada mais rígida no backend.

## Rodando localmente

```bash
npm install --legacy-peer-deps
cp .env.example .env   # preencher DATABASE_URL, GEMINI_API_KEY
npm run db:migrate     # aplica as migrações em db/migrations/
npm run dev            # http://localhost:3000
```

Outros comandos úteis:

```bash
npm run test              # suíte de testes (vitest) — inclui testes de schema/persistência contra um Postgres local
npm run lint               # tsc --noEmit
npm run db:backfill-graph  # sincroniza o grafo para conjuntos já existentes no banco
```

`npm run test` espera um Postgres local acessível via `TEST_DATABASE_URL`
(padrão: banco `sgcccco_test`) — ver `db/__tests__/`.

## Estrutura

```
server.ts              servidor Express — API + serve o build em produção
db/                     pool, migrações versionadas, camadas de acesso a dados
  migrations/*.sql       schema versionado, aplicado automaticamente no boot
  collectionsRepo.ts      persistência do conjunto (full_state + tabelas derivadas)
  peopleRepo.ts            cadastro de pessoas (sem login/senha — só identificação)
  graphSync.ts            deriva o Grafo de Conhecimento a partir de cada conjunto
  graphRepo.ts             leitura do grafo (explain/path/search)
src/
  types/sgccco.ts         modelo de domínio completo (todas as fases)
  data/phaseDefaults.ts    forma vazia dos formulários — fonte única de verdade
  services/popConductorService.ts   roteiro + regras de extração por fase (context-aware)
  services/voiceAgent.ts             TTS/STT do condutor — unlock() para Safari/iOS
  components/FirstPersonSetup.tsx    tela bloqueante de cadastro da 1ª pessoa
  components/              telas por fase, condutor de voz, visualizador do grafo
  utils/signatures.ts      leitura da assinatura vigente de uma fase (a mais
                            recente — uma fase pode acumular histórico de
                            reaberturas sem perder nenhum registro anterior)
render.yaml             Blueprint de deploy (Postgres + serviço web)
```
