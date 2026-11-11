# SIGCOI — Sistema de Gestão da Coleção Osteológica Identificada

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Status: Alfa](https://img.shields.io/badge/Status-Alfa-emerald.svg)](https://sgcccco-k50m.onrender.com)

**Projeto de Internacionalização, Padronização Osteológica e Biobancos Forenses**  
*Pesquisa de Pós-Doutorado da Dra. Nicole Damascena (Perita Criminal Federal - INC/DITEC/PF)*

---

## 🏛️ Distribuição Acadêmica para Universidades & Modelo de Federação ("REDCap Model")

O **SIGCOI** foi arquitetado sob o modelo de **Federação de Instâncias Autônomas**, viabilizando que qualquer universidade, laboratório de bioantropologia ou museu de história natural implante e opere seu próprio biobanco osteológico com soberania absoluta.

### Os 3 Princípios Invioláveis da Rede SIGCOI:
1. **Soberania e Custódia Local das Universidades**: Cada instituição é ética e juridicamente responsável pela guarda de seu próprio acervo esquelético. Nenhum dado sensível de terceiros ou restos mortais transita por servidores externos.
2. **Zero Ônus Operacional Central**: Cada laboratório opera sua própria infraestrutura em nuvem de baixo custo/gratuita ou servidor local, sem dependência de helpdesk contínuo.
3. **Evolução Sincronizada e Contínua**: As instâncias parceiras recebem atualizações do núcleo canônico com 1 clique (*"Sync Fork"* no GitHub) mantendo 100% da integridade dos dados históricos no PostgreSQL.

---

## 🚀 Como Colocar o SIGCOI no Ar na sua Universidade

### Opção A: Nuvem em 1-Clique (Render / Neon) — *Recomendado (5 Minutos)*

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Clique no botão **Deploy to Render** acima.
2. Conecte sua conta gratuita do Render.
3. Crie um banco PostgreSQL gratuito no [Neon](https://console.neon.tech) e cole a connection string na variável `DATABASE_URL`.
4. Defina as variáveis institucionais da sua faculdade (veja [Parametrização Multi-Institucional](#-parametrização-multi-institucional) abaixo).
5. O Render provisiona a aplicação e, ao abrir a URL, você cadastra o primeiro Administrador local.

---

### Opção B: On-Premise / Servidor Local (Docker Compose)

Para laboratórios ou departamentos de TI que exigem execução em rede interna local:

```bash
# 1. Clone o repositório
git clone https://github.com/nicoledamascena-art/SIGCOI.git && cd SIGCOI

# 2. Configure as variáveis da sua universidade
cp .env.example .env

# 3. Suba o ecossistema completo (Node.js + PostgreSQL)
docker compose up -d
```
Acesse `http://localhost:3000` na rede local do laboratório.

---

## ⚙️ Parametrização Multi-Institucional (.env)

O SIGCOI desacopla todas as referências institucionais em variáveis de ambiente:

| Variável | Exemplo | Descrição |
| :--- | :--- | :--- |
| `VITE_INSTITUTION_NAME` | `"Universidade de São Paulo - IB/USP"` | Nome por extenso da instituição gestora |
| `VITE_INSTITUTION_ACRONYM` | `"LAF-USP"` | Sigla para crachás e relatórios |
| `VITE_COLLECTION_PREFIX` | `"USP-OSTEO"` | Prefixo dos códigos de caixas e acervos |
| `VITE_CURATOR_CONTACT_EMAIL` | `"curadoria@ib.usp.br"` | E-mail de suporte e comitê de ética |
| `VITE_DEFAULT_LANGUAGE` | `"pt-BR"` | Idioma padrão da interface |

---

## 📜 Como Citar este Software (Citation Policy)

O uso do SIGCOI ou de dados gerados por sua metodologia em artigos científicos, dissertações de mestrado, teses de doutorado e laudos periciais requer a citação da publicação fundacional:

```bibtex
@article{damascena2026sigcoi,
  title={SIGCOI: An Open-Source, Blockchain-Ready Management System for Human Osteological Collections and Forensic Bioanthropology},
  author={Damascena, Nicole Prata and Carvalho, Tales Seixas de and Bento, Maria Izabel Cardoso and Machado, Carlos Eduardo Palhares},
  journal={Forensic Science International (Preprint/Em Avaliação)},
  year={2026},
  url={https://github.com/nicoledamascena-art/SIGCOI}
}
```

O próprio sistema oferece na tela de exportação de dados (Fase 7) e no rodapé um botão para cópia instantânea nos formatos **ABNT** e **BibTeX**.

---

## Acessar agora (Instância de Demonstração / Referência)

**Aplicação em produção:** <https://sgcccco-k50m.onrender.com>

(O Render acrescenta um sufixo ao nome do serviço quando o nome simples já
está em uso por outra conta — a URL real é sempre a que aparece no painel
do Render, não necessariamente `sgcccco.onrender.com`.)

O deploy é automático a partir da branch `main` deste repositório (via Render
Blueprint — ver `render.yaml`). O indicador de versão fixo no topo de
qualquer tela da aplicação mostra o hash do commit em execução, para
conferir a qualquer momento que o que está no ar corresponde exatamente ao
código deste repositório.

**Banco de dados de produção:** PostgreSQL no **Neon** (console.neon.tech),
gerenciado fora do blueprint — o Postgres gratuito do Render expira e é
apagado, o do Neon não tem prazo. O serviço web continua no Render e se liga
ao banco só pela variável `DATABASE_URL` (connection string *pooled* do Neon,
colada no painel do Render). As tabelas são criadas e atualizadas sozinhas
quando o servidor liga (`db/migrations/`).

Login real: e-mail + senha, com sessão no servidor (cookie httpOnly) — ao
abrir o sistema com o banco totalmente vazio, ele pede o cadastro do
primeiro Administrador (com senha já definida ali). **Ao migrar dados
antigos** (gente já cadastrada, sem senha nenhuma), esse cadastro nunca
aparece; em vez disso, quem já era Administrador ativa a própria conta com
o e-mail + um código de ativação
(`ADMIN_BOOTSTRAP_SECRET`, configurado por quem tem acesso ao ambiente) — ver
a seção "Primeiro acesso do Administrador" do manual "Administrador — Gestão
de Contas", na aba Documentos do próprio sistema. Depois disso, toda pessoa
nova é cadastrada por um Administrador logado, que gera um link de uso único
para cada pessoa definir a própria senha.

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
  (parcialmente implementado — ver "Estado atual" abaixo)

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
- **No ar, mas não certificado contra o formulário oficial:** Fase 3
  (Acondicionamento Provisório), Fase 4 (Curadoria — gestão de indivíduos/NMI
  com fusão e separação de hipóteses, inventário osteológico de 33 regiões
  anatômicas, odontograma FDI completo de 32 dentes, exigência de foto de
  montagem aprovada e assinatura restrita ao Curador), Fase 5 (Patologias e
  Marcação) e Fase 6 (Galpão Definitivo) têm interface, modelo de dados e
  fluxo de assinatura funcionando de ponta a ponta — dá pra usar. O que falta
  é a mesma verificação que as Fases 1 e 2 já passaram: confirmar campo a
  campo contra os apêndices oficiais do POP-02 (Inventário Osteológico,
  Inventário Odontológico, Formulário de Patologias), que ainda não foram
  entregues. Até lá, o conteúdo dos formulários dessas fases é a melhor
  aproximação possível, não uma cópia fiel confirmada de um documento oficial.
  Dentro da Fase 4, a busca de referência para comparação entre conjuntos já
  consulta o acervo de verdade: compara o perfil biológico do indivíduo (sexo
  e idade estimados, incluindo o método usado) com os demais indivíduos já
  cadastrados em outros conjuntos, e mostra os casos reais que batem — nunca
  texto fixo de exemplo.
- **Pendências conhecidas, fora do escopo até agora:** validação de entrada
  mais rígida no backend. CSRF (double-submit token, `csrfProtection` em
  `server.ts`) e rate-limit de login persistente em Postgres (tabela
  `login_attempts`) já estão implementados — ver `_local-adr-policy-202`.

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
  peopleRepo.ts            cadastro de pessoas (papéis de acesso)
  authRepo.ts              login real: hash de senha, sessão, token de definição de senha
  graphSync.ts            deriva o Grafo de Conhecimento a partir de cada conjunto
  graphRepo.ts             leitura do grafo (explain/path/search)
src/
  types/sgccco.ts         modelo de domínio completo (todas as fases)
  data/phaseDefaults.ts    forma vazia dos formulários — fonte única de verdade
  services/popConductorService.ts   roteiro + regras de extração por fase (context-aware)
  services/voiceAgent.ts             TTS/STT do condutor — unlock() para Safari/iOS
  services/authService.ts            login, logout, bootstrap e link de definição de senha
  components/LoginScreen.tsx          tela de entrada (e-mail + senha)
  components/BootstrapAdminSetup.tsx  cadastro do 1º Administrador (banco vazio)
  components/ClaimAdminScreen.tsx     ativa Administrador de dados antigos (banco não vazio)
  components/SetPasswordScreen.tsx    tela pública do link de definição de senha
  components/              telas por fase, condutor de voz, visualizador do grafo
  utils/signatures.ts      leitura da assinatura vigente de uma fase (a mais
                            recente — uma fase pode acumular histórico de
                            reaberturas sem perder nenhum registro anterior)
render.yaml             Blueprint de deploy (serviço web; o banco é o Neon, fora do blueprint)
```
