# _local EDRs Index

Decisões de workflow e ferramental de engenharia deste projeto, criadas por deliberação ARGUS.

## Subjects

- `principles` — Princípios de engenharia e qualidade não-funcional
- `application` — Padrões e convenções de implementação a nível de código
- `infra` — Implementação de infraestrutura e operações de runtime
- `observability` — Telemetria, monitoramento, alertas e diagnóstico
- `devops` — Pipeline de entrega, automação de release, fluxo de trabalho
- `governance` — Governança de engenharia, controles de risco e compliance

## Application

- [_local-edr-policy-101](application/101-manter-manuais-usuario-atualizados.md) - Manter os Manuais do Usuário atualizados
- [_local-edr-policy-102](application/102-cors-restrito-a-origens-conhecidas.md) - CORS restrito a origens conhecidas (nunca mais '*')
- [_local-edr-policy-103](application/103-tradutor-de-erros.md) - Tradutor de erros: código estável do servidor + dicionário no cliente — nunca casamento de texto
- [_local-edr-policy-104](application/104-pendencias-centralizadas.md) - Pendências por conjunto centralizadas em uma função (utils/collectionPendencies.ts), reaproveitada entre o painel inicial e as telas de Fase 1/2 — nunca duplicada tela a tela
- [_local-edr-policy-105](application/105-qa-componentes-genericos-acoes-em-lote.md) - Componente genérico com ação em lote ou estado compartilhado entre abas exige teste dessas duas categorias, além do caminho feliz; tsc --noEmit roda de novo após a última edição de teste, sempre, antes do merge
