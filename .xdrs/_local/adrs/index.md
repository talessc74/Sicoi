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

## Platform

- [_local-adr-policy-301](platform/301-fotos-reais-postgres.md) - Fotos reais (Fase 1 e 2): captura pela câmera, guardadas como bytes direto no Postgres já existente — sem conta de armazenamento externa

## Controls

- [_local-adr-policy-201](controls/201-exclusao-administrativa-reversivel.md) - Exclusão administrativa reversível (Zona de Risco): soft delete + trilha própria + papel reconferido no servidor
- [_local-adr-policy-202](controls/202-login-real-sessao-servidor.md) - Login real: sessão no servidor (cookie httpOnly) como única fonte de identidade, nunca um actorId declarado pelo cliente
