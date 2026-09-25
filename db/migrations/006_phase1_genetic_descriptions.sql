-- Descrições individuais e obrigatórias para "1ª costela" e "Patela" na coleta de
-- amostra para exame genético (Formulário A.1), pedidas por pesquisador em set/2026.
-- As demais opções (falange, ossos tarsais, dente hígido, outros) já tinham coluna.
ALTER TABLE phase1_forms
  ADD COLUMN IF NOT EXISTS genetico_primeira_costela_descricao TEXT,
  ADD COLUMN IF NOT EXISTS genetico_patela_descricao TEXT;
