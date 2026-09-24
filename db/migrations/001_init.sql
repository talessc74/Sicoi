-- SGCCCO — schema inicial de persistência
-- Cobre: conjuntos osteológicos, Formulário A.1 (Fase 1), Formulário A.2 / POP-01 9.5-9.7 (Fase 2),
-- fotos, assinaturas de fase, cadeia de custódia e trilha de auditoria da condução por voz.
--
-- Convenção: nenhuma linha é atualizada destrutivamente em tabelas de evento
-- (signatures, custody_chain, pop_step_audit) — só inserção. Tabelas de estado
-- (collections, phase1_forms, phase2_forms) são upsert por NIC.

CREATE TABLE IF NOT EXISTS collections (
  nic TEXT PRIMARY KEY,
  current_phase SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_technician TEXT NOT NULL,
  legal_origin JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Formulário A.1 — Análise Preliminar e Limpeza dos Remanescentes Ósseos (POP-01, item 9.2-9.4)
CREATE TABLE IF NOT EXISTS phase1_forms (
  nic TEXT PRIMARY KEY REFERENCES collections(nic) ON DELETE CASCADE,

  -- Introdução (campos 2-4 do A.1; campo 1 é o NIC, já é a chave)
  equipe_envolvida_limpeza TEXT,
  data_analise DATE,
  hora_analise TEXT,

  -- Checklist de fotos (campos 5-9)
  foto1_saco_fechado BOOLEAN,
  foto2_placa_cemiterio TEXT CHECK (foto2_placa_cemiterio IN ('sim', 'nao_se_aplica')),
  foto3_remanescentes_materiais TEXT CHECK (foto3_remanescentes_materiais IN ('sim', 'nao_se_aplica')),
  foto4_1_remanescentes_isolados BOOLEAN,
  foto4_2_materiais_isolados TEXT CHECK (foto4_2_materiais_isolados IN ('sim', 'nao_se_aplica')),

  -- Tipo de material (campo 10, multi-select) + descrições condicionais (11-15)
  tipo_material TEXT[] NOT NULL DEFAULT '{}',
  cabelo_descricao TEXT,
  proteses_descricao TEXT,
  vestes_descricao TEXT,
  pertences_descricao TEXT,
  tecidos_moles_descricao TEXT,

  -- Estado de preservação (campo 16, multi-select) + outros/observações (17-18)
  estado_preservacao TEXT[] NOT NULL DEFAULT '{}',
  estado_preservacao_outros_descricao TEXT,
  observacoes_gerais_preservacao TEXT,

  -- Coleta de amostra biológica — exame genético (19-25)
  exame_genetico TEXT[] NOT NULL DEFAULT '{}',
  genetico_falange_descricao TEXT,
  genetico_dente_higido_descricao TEXT,
  genetico_ossos_tarsais_descricao TEXT,
  genetico_outros_descricao TEXT,
  genetico_observacoes_gerais TEXT,
  genetico_responsavel_coleta TEXT,

  -- Coleta de amostra biológica — análise isotópica (26-31)
  analise_isotopica TEXT[] NOT NULL DEFAULT '{}',
  isotopica_cabelo_descricao TEXT,
  isotopica_unha_descricao TEXT,
  isotopica_dente_descricao TEXT,
  isotopica_observacoes TEXT,
  isotopica_responsavel_coleta TEXT,

  -- Limpeza (32-33)
  cor_saco_lavagem TEXT,
  tipo_limpeza TEXT CHECK (tipo_limpeza IN ('a_seco', 'agua_fria', 'agua_quente')),

  -- Danos (34-35)
  houve_danos BOOLEAN,
  descricao_danos TEXT,

  -- Metadados de rastreabilidade por campo (§15): { "<campo>": { "isAiSuggested": bool, "transcriptSnippet": text } }
  field_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fase 2 — Maceração (9.5), Secagem (9.6) e Acondicionamento em caixa ossuária (9.7)
CREATE TABLE IF NOT EXISTS phase2_forms (
  nic TEXT PRIMARY KEY REFERENCES collections(nic) ON DELETE CASCADE,

  maceracao_temperatura_c NUMERIC,
  maceracao_duracao_horas NUMERIC,
  maceracao_ciclos_monitoramento SMALLINT NOT NULL DEFAULT 0,
  maceracao_resultado TEXT CHECK (maceracao_resultado IN ('satisfatoria', 'necessitou_novo_ciclo')),

  limpeza_manual_realizada BOOLEAN,
  limpeza_manual_observacoes TEXT,

  secagem_temperatura_c NUMERIC,
  -- lista de ciclos de 4h: [{ "cycleNumber": 1, "startedAt": "...", "finishedAt": "...", "umidadeResidual": true }]
  secagem_ciclos JSONB NOT NULL DEFAULT '[]'::jsonb,
  secagem_confirmada_completa BOOLEAN NOT NULL DEFAULT false,
  secagem_confirmada_em TIMESTAMPTZ,
  secagem_confirmada_por TEXT,

  acondicionamento_caixa_ossuaria_codigo TEXT,
  acondicionamento_placa_nic_qr_fixada BOOLEAN NOT NULL DEFAULT false,

  field_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase1_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  sha256_hash TEXT NOT NULL,
  author TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phase2_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  category TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  sha256_hash TEXT NOT NULL,
  author TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only: reabrir uma fase nunca apaga a assinatura anterior, só insere uma nova
-- e marca a(s) anterior(es) daquele phase_number como superseded.
CREATE TABLE IF NOT EXISTS signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  phase_number SMALLINT NOT NULL,
  signed_by TEXT NOT NULL,
  signed_by_name TEXT NOT NULL,
  signed_by_role TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sha256_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'superseded')),
  reopen_justification TEXT
);

CREATE TABLE IF NOT EXISTS custody_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_location TEXT NOT NULL,
  target_location TEXT NOT NULL,
  carrier_person TEXT NOT NULL,
  receiver_person TEXT NOT NULL,
  carrier_signature_hash TEXT NOT NULL,
  receiver_signature_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL,
  box_ids TEXT[] NOT NULL DEFAULT '{}'
);

-- Trilha de cada interação de voz do condutor de POP — não só o resultado final,
-- mas cada rodada de fala, o que foi extraído e se o passo foi considerado confirmado.
CREATE TABLE IF NOT EXISTS pop_step_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nic TEXT NOT NULL REFERENCES collections(nic) ON DELETE CASCADE,
  phase_number SMALLINT NOT NULL,
  step_number SMALLINT NOT NULL,
  transcript TEXT NOT NULL,
  extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  step_confirmed BOOLEAN NOT NULL,
  confirmed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signatures_nic_phase ON signatures (nic, phase_number);
CREATE INDEX IF NOT EXISTS idx_custody_chain_nic ON custody_chain (nic);
CREATE INDEX IF NOT EXISTS idx_pop_step_audit_nic_phase ON pop_step_audit (nic, phase_number);
