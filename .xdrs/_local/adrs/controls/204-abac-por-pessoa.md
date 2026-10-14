---
name: _local-adr-policy-204-abac-por-pessoa
description: Cada pessoa pode ter o acesso ampliado ou reduzido em relação ao padrão do seu papel (legalOriginAccess, curationAccess, phaseSigningAccess, exportAccess) — mas a assinatura de Inventário (Fase 4) e a Científica (Fase 5) nunca são override-áveis, ficam travadas em role === 'curador' para sempre. Use antes de alterar qualquer checagem de permissão, ou antes de tratar a Matriz ABAC de Configurações como decorativa.
apply-to: src/types/sgccco.ts (UserProfile, PersonAccessOverrides), src/utils/permissions.ts (canViewLegalOrigin, canCurate, canSignAsTechnician, canExportScientificData), db/peopleRepo.ts, db/authRepo.ts (PERSON_AUTH_COLUMNS), db/migrations/023_access_overrides.sql, server.ts (POST/PUT /api/people), src/components/SettingsView.tsx
valid-from: 2026-10-14
---

# _local-adr-policy-204: ABAC por pessoa — acesso ajustável além do padrão do papel

## Context and Problem Statement

A "Matriz de Permissões ABAC" em Configurações já existia, mas era
puramente decorativa — mostrava o que cada papel *deveria* ter, sem
nenhuma ligação com o código real, e sem forma de ajustar o acesso de uma
pessoa específica sem trocar o papel dela inteiro (perdendo o papel que
vai nas assinaturas e no histórico).

Question: como permitir que cada pessoa amplie ou reduza seu acesso além
do padrão do papel — sem abrir brecha para destravar as duas assinaturas
mais sensíveis do sistema (Inventário e Científica), que decidimos
manter restritas a Curador de verdade, sempre?

## Decision Outcome

**Cada pessoa ganha 4 campos de override opcionais** —
`legalOriginAccess`, `curationAccess`, `phaseSigningAccess`,
`exportAccess` (mais `adminAccess`, que já existia) — resolvidos pelo
padrão `override ?? roleDefault` em `src/utils/permissions.ts`. Editável
abaixo do nome da pessoa, dentro de "Editar" em Configurações, pré-
preenchido com o padrão real do papel.

### Details

- **Funções de permissão** (`src/utils/permissions.ts`): `canViewLegalOrigin`
  (padrão: Curador + Administrador), `canCurate` (padrão: Curador +
  Estudante), `canSignAsTechnician` (padrão: Técnico + Curador — mudou de
  assinatura `(role: UserRole)` para `(person)`, considerando o override),
  `canExportScientificData` (padrão: Curador + Administrador +
  Pesquisador — antes desta decisão, **qualquer** papel autenticado
  exportava livremente; `Phase7ConsultaPesquisa.tsx` passou a ter o botão
  de exportação realmente bloqueado quando `!canExport`).
- **Duas assinaturas nunca são override-áveis, por decisão explícita**:
  a assinatura de Inventário (Fase 4, `canSignInventory`) e a Científica
  (Fase 5) continuam gated em `currentUser.role === 'curador'` literal,
  para sempre — mesmo que a pessoa tenha `phaseSigningAccess: true`. Essa
  restrição foi confirmada explicitamente com o Tales antes de
  implementar (opção "Nunca liberar essas duas" nas 3 perguntas
  estruturadas desta decisão).
- **Migração** `023_access_overrides.sql`: 4 colunas booleanas `NOT NULL
  DEFAULT false`, com backfill (`UPDATE people SET ... = (role IN (...))`)
  reproduzindo o comportamento real que já existia em código antes desta
  decisão — nenhuma pessoa perde ou ganha acesso silenciosamente na
  migração.
- **Bug real encontrado pelos testes, corrigido no mesmo dia**:
  `db/authRepo.ts` mantinha sua própria lista de colunas SQL,
  independente de `db/peopleRepo.ts` — usada só pelo login e troca de
  senha. Adicionar as 4 colunas novas em `peopleRepo.ts` sem tocar
  `authRepo.ts` faria os overrides desaparecerem silenciosamente do
  `currentUser` a cada login. Corrigido com `PERSON_AUTH_COLUMNS`
  compartilhada entre as 7 consultas de `authRepo.ts`.
- **Configurações**: `AccessChecklist` (componente compartilhado entre
  cadastro e edição), `defaultAccessForRole`, recalculado quando o papel
  muda no formulário; `abacRolesMatrix` deixou de ser texto fixo — passou
  a ser calculado a partir das mesmas 4 funções reais, corrigindo 2
  células que já estavam desatualizadas em relação ao código.

## References

- Arquivos: `src/types/sgccco.ts`, `src/utils/permissions.ts`,
  `db/peopleRepo.ts`, `db/authRepo.ts`, `db/migrations/023_access_overrides.sql`,
  `server.ts`, `src/components/SettingsView.tsx`,
  `src/components/Phase4Curadoria.tsx`, `src/components/Phase7ConsultaPesquisa.tsx`
- Testes: `src/utils/__tests__/permissions.test.ts`,
  `db/__tests__/peopleRepo.test.ts`, `db/__tests__/authRepo.test.ts`,
  `src/components/__tests__/Phase7ConsultaPesquisa.test.tsx`
- Policy relacionada: `_local-adr-policy-202` (o papel/acesso de quem age
  continua vindo só da sessão no servidor, nunca do cliente — o override
  é lido do banco a cada requisição, do mesmo jeito que `admin_access`)
