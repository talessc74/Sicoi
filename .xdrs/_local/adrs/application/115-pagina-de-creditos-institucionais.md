---
name: _local-adr-policy-115-pagina-de-creditos-institucionais
description: Página dedicada de créditos e governança institucional ("Quem fez o SIGCOI", rota /creditos), apresentando a autoria formal, corpo técnico-científico e equipes multidisciplinares da Portaria DITEC/PF nº 1415/2024. Use antes de alterar a tela de créditos, o catálogo de membros ou sua navegação.
apply-to: src/components/CreditsView.tsx, src/data/creditsData.ts, src/App.tsx (VALID_TABS, rota /creditos), src/components/__tests__/CreditsView.test.tsx
valid-from: 2026-10-15
---

# _local-adr-policy-115: Página de Créditos Institucionais (Quem fez o SIGCOI)

## Context and Problem Statement

A Coleção Osteológica Identificada do Instituto Nacional de Criminalística (COI-INC/DITEC/PF), instituída pela Portaria DITEC/PF nº 1415/2024, resulta da convergência entre antropologia forense, medicina legal, perícia oficial de natureza criminal e engenharia de software orientada à governança distribuída.

Para atender aos princípios de transparência pública, responsabilidade pericial e reconhecimento de autoria institucional, fez-se necessário um espaço dedicado no sistema para apresentar os integrantes das equipes técnicas, peritos responsáveis pela concepção dos procedimentos operacionais padrão (POPs), curadores e desenvolvedores.

Question: como estruturar essa exibição sem poluir as barras de navegação primárias de laboratório e sem perder o contexto de wayfinding de quem está operando o acervo?

## Decision Outcome

**Criação de uma tela exclusiva de créditos institucionais (`/creditos`), acessível por link dedicado no rodapé e com navegação contextual resiliente:**

1. **Catálogo Estruturado de Autoria (`src/data/creditsData.ts`)**:
   * Organização dos membros por frentes de atuação: Curadoria e Antropologia Forense, Perícia Criminal Oficial, Engenharia de Software & Arquitetura de Dados, e Governança ARGUS.
   * Exibição de nomes, títulos funcionais, instituições parceiras e papéis no ecossistema pericial.
2. **Componente de Visualização (`src/components/CreditsView.tsx`)**:
   * Apresentação em cards com padrão visual consistente com a identidade visual do SIGCOI.
   * Botão de retorno superior ("Voltar") que não força a Tela Inicial cegamente: utiliza o estado `previousTab` para devolver o usuário com exatidão à aba em que estava trabalhando antes de abrir os créditos.
3. **Integração com a Máquina de Estados e URL (`src/App.tsx`)**:
   * O identificador `'creditos'` integra `VALID_TABS` e responde pela rota canônica `/creditos`.
   * Preserva a sessão do usuário e não interfere nos parâmetros de coleção ativa (`?nic=...`).

## References

- Arquivos: `src/components/CreditsView.tsx`, `src/data/creditsData.ts`, `src/App.tsx`
- Testes: `src/components/__tests__/CreditsView.test.tsx`
- Policies correlatas: `_local-adr-policy-104` (navegação e histórico)
