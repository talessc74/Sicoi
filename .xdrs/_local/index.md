# _local Scope Overview

## Overview

Decisões locais deste projeto (SIGCOI), criadas por deliberação ARGUS.
Este escopo fica só neste workspace — não é distribuído para outros
projetos que instalem o pacote `argus-xdrs-governance`. Decisões aqui
sobrescrevem `_core` quando os dois se sobrepõem.

## Content

### EDRs — Engineering Decisions (5 documentos)

Manutenção dos Manuais do Usuário (`public/manuais/`) sincronizada com
mudanças no site. CORS restrito a origens conhecidas. Tradutor de
erros: código estável do servidor + dicionário de tradução no cliente —
nunca casamento de texto, frase amigável por padrão com detalhe técnico
expansível. Pendências por conjunto centralizadas numa função só,
reaproveitada entre o painel inicial e as telas de fase. Componente
genérico com ação em lote ou estado compartilhado entre abas exige
teste dessas duas categorias — tsc --noEmit roda de novo após a última
edição de teste, sempre, antes do merge.

### ADRs — Architectural Decisions (23 documentos)

Histórico protegido de conjuntos: servidor como fonte de verdade,
assinaturas travadas, registro de alterações encadeado por hash.
Exclusão administrativa reversível (Zona de Risco): soft delete +
trilha própria + papel reconferido no servidor. Identidade visual por
papel: cor + ícone fixos, só no indicador de identidade. Login real:
sessão no servidor (cookie httpOnly) como única fonte de identidade,
nunca um actorId declarado pelo cliente. Fotos reais (Fase 1 e 2):
captura pela câmera, guardadas como bytes direto no Postgres já
existente — sem conta de armazenamento externa. Busca por semelhança
entre ossos: recuperação real no Postgres primeiro, explicação por IA
depois — nunca o inverso. Exploração (sem decisão de implementar) de
conexão com a Rede PCI Conecta: onde a busca por semelhança ajudaria,
e onde cruzaria a missão declarada do SIGCOI. Leitura de conjuntos,
histórico e grafo exige sessão autenticada: nenhuma dessas rotas é
pública, e `/api/status` não devolve mais fragmento real de chave.
Navegação sincronizada com a URL (sem roteador): o botão "voltar" do
navegador/celular volta uma tela dentro do app, em vez de sair do site.
Fase 0 (Recebimento): transcrição da Declaração de Óbito com assinatura
única, nunca o padrão dual-sign de Fase 4/5. Busca de referência real
entre indivíduos (Fase 4, §15): determinística, sem IA. ABAC por
pessoa: acesso ajustável além do padrão do papel, exceto as assinaturas
de Inventário e Científica. Autorizações de pesquisa reais (Fase 7,
§13): escopo granular por projeto, revogação nunca é delete. Validação
de forma/tamanho nas rotas públicas de IA — gap de autenticação
permanece deliberadamente fora do escopo. Dados da DO (Fase 0) e de
procedência só saem do servidor para quem pode vê-los — a tela
esconder não basta. Criar um COI recusa duplicar um NIC já existente.
Inventário Odontológico: dentição permanente/mista/decídua por par de
quadrante, edêntulo em lote, dentes supranumerários. Alterações ósseas
embutidas em cada osso do Inventário Osteológico, nunca mais um
formulário único solto. Condutor por voz/conversa é opt-in. Documentos
oficiais da COI-INC servidos autenticados, nunca numa pasta pública.
Inventário osteológico interativo em 4 pranchas especializadas (Fase 4, §15)
e inventário pós-craniano em 3 seções separadas de Pelve/Membro Inferior —
**ambas superadas** por pedido dos pesquisadores: lista corrida sem prancha
visual em todas as 7 seções, vértebra e costela como elemento catalogável
individual (não mais contagem ordinal), Ossos da Mão e Ossos do Pé como
seções próprias reunindo os dois lados, e Membros Superiores e
Pelve + Bacia + Membros Inferiores unificados cada um numa seção só.

### BDRs — Business Decisions (1 documento)

Número do conjunto (e da caixa) no formato COI-XXX — telas falam em
"COI", POPs seguem chamando de NIC.

## Como adicionar uma policy

1. Disparar uma deliberação ARGUS sobre o tema
2. Chegar a convergência com assinatura das seeds
3. SCRIBE estrutura o documento — HERALD define o valid-from
4. Humano valida o rascunho
5. Policy é salva no tipo e assunto apropriados abaixo

## Índices por tipo

- [Índice de ADRs](adrs/index.md)
- [Índice de BDRs](bdrs/index.md)
- [Índice de EDRs](edrs/index.md)
