# _local ADRs Index

Decisões de arquitetura e técnicas deste projeto, criadas por deliberação ARGUS.

## Subjects

- `principles` — Fundamentos de arquitetura e política transversais
- `application` — Decisões de design de sistema e serviço
- `data` — Arquitetura de dados e modelagem de informação
- `integration` — Comunicação entre sistemas internos/externos
- `platform` — Capacidades de runtime e plataforma
- `controls` — Controles de arquitetura para risco, segurança e compliance
- `operations` — Decisões de arquitetura operacional

## Application

- [_local-adr-policy-101](application/101-historico-protegido-de-conjuntos.md) - Histórico protegido de conjuntos: servidor como fonte de verdade, assinaturas travadas, registro de alterações encadeado por hash
- [_local-adr-policy-102](application/102-identidade-visual-por-papel.md) - Identidade visual por papel: cor + ícone fixos, só no indicador de identidade, nunca reaproveitando cor de status
- [_local-adr-policy-103](application/103-busca-por-semelhanca-ossos.md) - Busca por semelhança entre ossos: recuperação real no Postgres primeiro, explicação por IA depois — nunca o inverso
- [_local-adr-policy-104](application/104-navegacao-sincronizada-com-url.md) - activeTab/activePhase sincronizados com a URL real (sem roteador) — o botão "voltar" do navegador/celular volta uma tela dentro do app
- [_local-adr-policy-105](application/105-fase-0-recebimento.md) - Fase 0 (Recebimento): transcrição da Declaração de Óbito, manual ou por foto com extração via Gemini, assinatura única — nunca o padrão de assinatura dupla de Fase 4/5
- [_local-adr-policy-106](application/106-busca-referencia-entre-individuos.md) - Busca de referência real entre indivíduos (Fase 4, §15): determinística, sem IA — compara perfil biológico com outros conjuntos do acervo
- [_local-adr-policy-107](application/107-coi-recusa-duplicar-nic.md) - Criar um COI recusa duplicar um NIC já existente: createCollection distingue retentativa da própria criação (mesmo id) de duplicata real (id diferente) — só a primeira é idempotente
- [_local-adr-policy-108](application/108-inventario-odontologico-denticao.md) - Inventário Odontológico: dentição permanente/mista/decídua por par de quadrante anatômico, edêntulo em lote, dentes supranumerários
- [_local-adr-policy-109](application/109-inventario-osteologico-alteracoes-por-osso.md) - Alterações ósseas embutidas em cada osso do Inventário Osteológico (botão de exclamação), nunca mais um formulário único solto com dropdown "osso afetado"
- [_local-adr-policy-110](application/110-condutor-por-voz-opt-in.md) - Condutor por voz/conversa é opt-in: Fases 1 e 2 abrem no Formulário Manual por padrão, sem áudio automático
- [_local-adr-policy-111](application/111-inventario-osteologico-4-pranchas-anatomicas.md) - **[SUPERADA pela 113]** Inventário Osteológico da Cabeça e Pescoço (Fase 4, §15): visualizador interativo em 4 pranchas especializadas com sub-abas, contornos vetoriais orgânicos (OpenCV) e sincronização bidirecional
- [_local-adr-policy-112](application/112-inventario-osteologico-secoes-postcranianas.md) - **[SUPERADA pela 113]** Inventário Osteológico Pós-Craniano (Seções 2 a 8, Fase 4): handlers parametrizados por região, contagem ordinal seriada, contagens pooled de falanges e exclusão mútua Ausente x Alteração
- [_local-adr-policy-113](application/113-inventario-osteologico-reestruturacao-pesquisadores.md) - Inventário Osteológico: lista corrida em todas as 7 seções (sem prancha visual), vértebra/costela como elemento catalogável individual, Ossos da Mão/Ossos do Pé em seções próprias, Membros Superiores e Pelve+Bacia+Membro Inferior unificados

## Integration

- [_local-adr-policy-401](integration/401-exploracao-conexao-pci-conecta.md) - Exploração (sem decisão de implementar) de conexão com a Rede PCI Conecta — onde a busca por semelhança entre ossos ajudaria, e onde cruzaria a missão declarada do SIGCOI

## Platform

- [_local-adr-policy-301](platform/301-fotos-reais-postgres.md) - Fotos reais (Fase 1 e 2): captura pela câmera, guardadas como bytes direto no Postgres já existente — sem conta de armazenamento externa

## Controls

- [_local-adr-policy-201](controls/201-exclusao-administrativa-reversivel.md) - Exclusão administrativa reversível (Zona de Risco): soft delete + trilha própria + papel reconferido no servidor
- [_local-adr-policy-202](controls/202-login-real-sessao-servidor.md) - Login real: sessão no servidor (cookie httpOnly) como única fonte de identidade, nunca um actorId declarado pelo cliente
- [_local-adr-policy-203](controls/203-leitura-publica-de-conjuntos-e-grafo.md) - Leitura de conjuntos, histórico e grafo exige sessão autenticada — nenhuma dessas rotas é pública
- [_local-adr-policy-204](controls/204-abac-por-pessoa.md) - ABAC por pessoa: acesso ajustável além do padrão do papel — assinatura de Inventário e Científica nunca são override-áveis
- [_local-adr-policy-205](controls/205-autorizacoes-de-pesquisa-reais.md) - Autorizações de pesquisa reais (Fase 7, §13): escopo granular por projeto/NIC/validade, persistidas em Postgres — revogação nunca é delete
- [_local-adr-policy-206](controls/206-validacao-entrada-rotas-ia.md) - Validação de forma/tamanho nas rotas públicas de IA — gap de autenticação permanece deliberadamente fora do escopo
- [_local-adr-policy-207](controls/207-dados-restritos-saem-so-para-quem-pode-ver.md) - Dados da DO (Fase 0) e de procedência só saem do servidor para quem pode vê-los; a tela esconder não basta
- [_local-adr-policy-208](controls/208-documentos-oficiais-autenticados.md) - Documentos oficiais da COI-INC (Portaria, POPs, Formulários): arquivo original fora da pasta pública, só sai autenticado por GET /api/documentos/:id restrito a uma lista fechada de ids
