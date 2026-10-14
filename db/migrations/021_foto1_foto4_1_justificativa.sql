-- Foto 1 e Foto 4.1 (Fase 1) ganharam a mesma saída que foto2/foto3/foto4_2 já tinham:
-- em vez de um boolean travado em "ainda não confirmado", o operador pode registrar a
-- foto real ('sim') ou, perguntado explicitamente pelo sistema quando a câmera não
-- está disponível, confirmar a ausência com justificativa escrita
-- ('sem_foto_justificado') — ver src/components/Phase1Recebimento.tsx. Esta tabela só
-- é escrita (projeção de full_state para relatório futuro; nenhum código lê dela
-- hoje), então o ALTER TYPE abaixo é seguro: nenhum consumidor depende do tipo
-- antigo. true existente vira 'sim'; false/NULL vira NULL (mesmo significado de
-- "ainda não confirmado" que já tinham).

ALTER TABLE phase1_forms
  ALTER COLUMN foto1_saco_fechado TYPE TEXT
    USING (CASE WHEN foto1_saco_fechado THEN 'sim' ELSE NULL END),
  ALTER COLUMN foto4_1_remanescentes_isolados TYPE TEXT
    USING (CASE WHEN foto4_1_remanescentes_isolados THEN 'sim' ELSE NULL END);

ALTER TABLE phase1_forms
  ADD CONSTRAINT phase1_forms_foto1_saco_fechado_check
    CHECK (foto1_saco_fechado IN ('sim', 'sem_foto_justificado')),
  ADD CONSTRAINT phase1_forms_foto4_1_remanescentes_isolados_check
    CHECK (foto4_1_remanescentes_isolados IN ('sim', 'sem_foto_justificado'));
