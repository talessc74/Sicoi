-- Corrige phase2_forms para o Formulário A.2 real (a versão anterior foi inferida do
-- texto narrativo do POP-01 §9.5-9.6, sem acesso ao formulário oficial — agora
-- disponível). O A.2 pergunta instrumentos usados e forma de secagem (estufa/
-- aquecedor/temperatura ambiente), não temperaturas em °C; e tem sua própria
-- introdução (equipe/data/hora), igual ao A.1. Acondicionamento em caixa ossuária
-- não é campo do A.2 — removido daqui (já coberto por phase1_forms.preliminaryBoxes
-- via full_state, e pela Fase 3 operacionalmente).

ALTER TABLE phase2_forms
  DROP COLUMN IF EXISTS maceracao_temperatura_c,
  DROP COLUMN IF EXISTS maceracao_duracao_horas,
  DROP COLUMN IF EXISTS maceracao_ciclos_monitoramento,
  DROP COLUMN IF EXISTS maceracao_resultado,
  DROP COLUMN IF EXISTS limpeza_manual_realizada,
  DROP COLUMN IF EXISTS limpeza_manual_observacoes,
  DROP COLUMN IF EXISTS secagem_temperatura_c,
  DROP COLUMN IF EXISTS secagem_ciclos,
  DROP COLUMN IF EXISTS acondicionamento_caixa_ossuaria_codigo,
  DROP COLUMN IF EXISTS acondicionamento_placa_nic_qr_fixada;

ALTER TABLE phase2_forms
  ADD COLUMN IF NOT EXISTS equipe_envolvida_limpeza TEXT,
  ADD COLUMN IF NOT EXISTS data_analise DATE,
  ADD COLUMN IF NOT EXISTS hora_analise TEXT,
  ADD COLUMN IF NOT EXISTS maceracao_ciclos_necessarios SMALLINT,
  ADD COLUMN IF NOT EXISTS instrumentos_utilizados TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instrumentos_outra_descricao TEXT,
  ADD COLUMN IF NOT EXISTS houve_danos_maceracao BOOLEAN,
  ADD COLUMN IF NOT EXISTS descricao_danos_maceracao TEXT,
  ADD COLUMN IF NOT EXISTS forma_secagem TEXT
    CHECK (forma_secagem IN ('estufa', 'aquecedor', 'temperatura_ambiente'));
