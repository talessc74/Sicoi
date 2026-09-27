# _local Scope Overview

## Overview

Decisões locais deste projeto (SIGCOI), criadas por deliberação ARGUS.
Este escopo fica só neste workspace — não é distribuído para outros
projetos que instalem o pacote `argus-xdrs-governance`. Decisões aqui
sobrescrevem `_core` quando os dois se sobrepõem.

## Content

### EDRs — Engineering Decisions (2 documentos)

Manutenção dos Manuais do Usuário (`public/manuais/`) sincronizada com
mudanças no site. CORS restrito a origens conhecidas.

### ADRs — Architectural Decisions (2 documentos)

Histórico protegido de conjuntos: servidor como fonte de verdade,
assinaturas travadas, registro de alterações encadeado por hash.
Exclusão administrativa reversível (Zona de Risco): soft delete +
trilha própria + papel reconferido no servidor.

### BDRs — Business Decisions (0 documentos)

Nenhuma ainda.

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
