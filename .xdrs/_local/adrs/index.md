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
