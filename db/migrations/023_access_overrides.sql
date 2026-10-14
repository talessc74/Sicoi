-- Ajustes de acesso por pessoa (§13, out/2026): cada uma das 4 colunas
-- replica, por padrão, o comportamento REAL que o papel já tem hoje no
-- código (não a antiga tabela decorativa de Configurações, que estava
-- desatualizada em dois pontos) — e pode ser ampliado/reduzido por pessoa
-- na tela de Configurações, sem mexer no papel dela.
--
-- legal_origin_access  -> Fase 1: ver dados de origem legal/cemitério (§7).
--                         Hoje: curador, administrador.
-- curation_access      -> Fase 4: editar indivíduos/perfil biológico/
--                         odontograma (Montagem e Inventário). Hoje: curador,
--                         estudante (a tabela antiga dizia só curador —
--                         corrigido aqui pra bater com o código real).
-- phase_signing_access -> Assinatura que trava Fases 0-3, a Montagem da Fase 4
--                         e a Física da Fase 5. Hoje: curador, técnico. NUNCA
--                         cobre a assinatura do Inventário (Fase 4) nem a
--                         Científica (Fase 5) — essas continuam travadas só
--                         para o papel curador, sem exceção por pessoa (ver
--                         utils/permissions.ts e Phase4Curadoria.tsx).
-- export_access        -> Fase 7: exportar dados científicos. Hoje era
--                         liberado pra qualquer papel (sem trava nenhuma);
--                         esta migração já nasce com a trava pretendida
--                         (curador, administrador, pesquisador) — a primeira
--                         vez que esta coluna de fato restringe alguém.
--
-- Default false + backfill explícito por papel logo abaixo: ninguém perde
-- nem ganha acesso que já tinha hoje só por causa desta migração (exceto
-- quem usa Exportação Científica sem ser curador/administrador/pesquisador —
-- combinado com o Tales, é a mudança real desta rodada).

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS legal_origin_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS curation_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phase_signing_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS export_access BOOLEAN NOT NULL DEFAULT false;

UPDATE people SET
  legal_origin_access = (role IN ('curador', 'administrador')),
  curation_access = (role IN ('curador', 'estudante')),
  phase_signing_access = (role IN ('curador', 'tecnico')),
  export_access = (role IN ('curador', 'administrador', 'pesquisador'));
