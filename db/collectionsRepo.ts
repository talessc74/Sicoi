/**
 * Camada de acesso a dados para OsteologicalCollection.
 *
 * `full_state` (JSONB em collections) é a fonte de verdade para load/save do
 * conjunto inteiro — inclui as Fases 3-7, que ainda não têm tabelas normalizadas
 * próprias (fora do escopo deste plano). As tabelas granulares (phase1_forms,
 * phase2_forms, phase1_photos, phase2_photos, signatures, custody_chain) são
 * derivadas do mesmo save, para consulta e auditoria estruturada das Fases 1-2 —
 * nunca são a única cópia do dado.
 *
 * Nunca confiar cegamente em hash vindo do cliente: quem assina (sha256Hash em
 * signatures) é sempre recalculado/conferido aqui antes de persistir.
 */
import type { Pool, PoolClient } from 'pg';
import type { OsteologicalCollection, Phase1Data, Phase2Data } from '../src/types/sgccco';
import { generateSignaturePayload } from '../src/services/auditService';
import crypto from 'crypto';

function serverSideSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export async function listCollections(pool: Pool): Promise<OsteologicalCollection[]> {
  const { rows } = await pool.query<{ full_state: OsteologicalCollection }>(
    'SELECT full_state FROM collections ORDER BY created_at DESC'
  );
  return rows.map((r) => r.full_state);
}

export async function getCollection(pool: Pool, nic: string): Promise<OsteologicalCollection | null> {
  const { rows } = await pool.query<{ full_state: OsteologicalCollection }>(
    'SELECT full_state FROM collections WHERE nic = $1',
    [nic]
  );
  return rows[0]?.full_state ?? null;
}

export async function createCollection(pool: Pool, collection: OsteologicalCollection): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO collections (nic, current_phase, created_at, created_by_technician, legal_origin, full_state)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        collection.nic,
        collection.currentPhase,
        collection.createdAt,
        collection.createdByTechnician,
        JSON.stringify(collection.legalOrigin),
        JSON.stringify(collection)
      ]
    );
    await syncDerivedTables(client, collection);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Persiste um conjunto já existente. Antes de gravar, recalcula e confere o hash
 * de cada assinatura presente no payload — se o hash recebido não bate com o
 * recalculado a partir do payload canônico, a assinatura é rejeitada (o cliente
 * nunca decide sozinho que um hash é válido).
 */
export async function saveCollection(pool: Pool, collection: OsteologicalCollection): Promise<void> {
  for (const sig of collection.signatures) {
    const dataSnapshotJson =
      sig.phaseNumber === 1
        ? JSON.stringify(collection.phase1)
        : sig.phaseNumber === 2
        ? JSON.stringify(collection.phase2)
        : null;
    if (!dataSnapshotJson) continue; // fases 3-7: verificação de hash fora do escopo deste plano
    const expectedHash = serverSideSha256(
      generateSignaturePayload({
        nic: collection.nic,
        phaseNumber: sig.phaseNumber,
        signedBy: sig.signedBy,
        role: sig.signedByRole,
        timestamp: sig.signedAt,
        dataSnapshotJson
      })
    );
    if (expectedHash !== sig.sha256Hash) {
      throw new Error(
        `Assinatura inválida para NIC ${collection.nic}, Fase ${sig.phaseNumber}: hash não confere com o payload canônico recalculado no servidor.`
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE collections SET current_phase = $2, legal_origin = $3, full_state = $4 WHERE nic = $1`,
      [collection.nic, collection.currentPhase, JSON.stringify(collection.legalOrigin), JSON.stringify(collection)]
    );
    if (rowCount === 0) {
      throw new Error(`Conjunto ${collection.nic} não encontrado para atualização.`);
    }
    await syncDerivedTables(client, collection);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function syncDerivedTables(client: PoolClient, collection: OsteologicalCollection): Promise<void> {
  await upsertPhase1Form(client, collection.nic, collection.phase1);
  await upsertPhase2Form(client, collection.nic, collection.phase2);
  await syncPhotos(client, 'phase1_photos', collection.nic, collection.phase1.photos);
  await syncPhotos(client, 'phase2_photos', collection.nic, collection.phase2.photos);
  await syncSignatures(client, collection.nic, collection.signatures);
  await syncCustodyChain(client, collection.nic, collection.custodyChain);
}

async function upsertPhase1Form(client: PoolClient, nic: string, p1: Phase1Data): Promise<void> {
  const fieldMetadata: Record<string, { isAiSuggested?: boolean; transcriptSnippet?: string }> = {};
  const val = (f: { value: any; isAiSuggested?: boolean; transcriptSnippet?: string }, key: string) => {
    if (f.isAiSuggested || f.transcriptSnippet) {
      fieldMetadata[key] = { isAiSuggested: f.isAiSuggested, transcriptSnippet: f.transcriptSnippet };
    }
    return f.value ?? null;
  };

  await client.query(
    `INSERT INTO phase1_forms (
       nic, equipe_envolvida_limpeza, data_analise, hora_analise,
       foto1_saco_fechado, foto2_placa_cemiterio, foto3_remanescentes_materiais,
       foto4_1_remanescentes_isolados, foto4_2_materiais_isolados,
       tipo_material, cabelo_descricao, proteses_descricao, vestes_descricao,
       pertences_descricao, tecidos_moles_descricao,
       estado_preservacao, estado_preservacao_outros_descricao, observacoes_gerais_preservacao,
       exame_genetico, genetico_falange_descricao, genetico_dente_higido_descricao,
       genetico_ossos_tarsais_descricao, genetico_outros_descricao, genetico_observacoes_gerais,
       genetico_responsavel_coleta,
       analise_isotopica, isotopica_cabelo_descricao, isotopica_unha_descricao,
       isotopica_dente_descricao, isotopica_observacoes, isotopica_responsavel_coleta,
       cor_saco_lavagem, tipo_limpeza, houve_danos, descricao_danos, field_metadata, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
       $26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36, now()
     )
     ON CONFLICT (nic) DO UPDATE SET
       equipe_envolvida_limpeza = EXCLUDED.equipe_envolvida_limpeza,
       data_analise = EXCLUDED.data_analise,
       hora_analise = EXCLUDED.hora_analise,
       foto1_saco_fechado = EXCLUDED.foto1_saco_fechado,
       foto2_placa_cemiterio = EXCLUDED.foto2_placa_cemiterio,
       foto3_remanescentes_materiais = EXCLUDED.foto3_remanescentes_materiais,
       foto4_1_remanescentes_isolados = EXCLUDED.foto4_1_remanescentes_isolados,
       foto4_2_materiais_isolados = EXCLUDED.foto4_2_materiais_isolados,
       tipo_material = EXCLUDED.tipo_material,
       cabelo_descricao = EXCLUDED.cabelo_descricao,
       proteses_descricao = EXCLUDED.proteses_descricao,
       vestes_descricao = EXCLUDED.vestes_descricao,
       pertences_descricao = EXCLUDED.pertences_descricao,
       tecidos_moles_descricao = EXCLUDED.tecidos_moles_descricao,
       estado_preservacao = EXCLUDED.estado_preservacao,
       estado_preservacao_outros_descricao = EXCLUDED.estado_preservacao_outros_descricao,
       observacoes_gerais_preservacao = EXCLUDED.observacoes_gerais_preservacao,
       exame_genetico = EXCLUDED.exame_genetico,
       genetico_falange_descricao = EXCLUDED.genetico_falange_descricao,
       genetico_dente_higido_descricao = EXCLUDED.genetico_dente_higido_descricao,
       genetico_ossos_tarsais_descricao = EXCLUDED.genetico_ossos_tarsais_descricao,
       genetico_outros_descricao = EXCLUDED.genetico_outros_descricao,
       genetico_observacoes_gerais = EXCLUDED.genetico_observacoes_gerais,
       genetico_responsavel_coleta = EXCLUDED.genetico_responsavel_coleta,
       analise_isotopica = EXCLUDED.analise_isotopica,
       isotopica_cabelo_descricao = EXCLUDED.isotopica_cabelo_descricao,
       isotopica_unha_descricao = EXCLUDED.isotopica_unha_descricao,
       isotopica_dente_descricao = EXCLUDED.isotopica_dente_descricao,
       isotopica_observacoes = EXCLUDED.isotopica_observacoes,
       isotopica_responsavel_coleta = EXCLUDED.isotopica_responsavel_coleta,
       cor_saco_lavagem = EXCLUDED.cor_saco_lavagem,
       tipo_limpeza = EXCLUDED.tipo_limpeza,
       houve_danos = EXCLUDED.houve_danos,
       descricao_danos = EXCLUDED.descricao_danos,
       field_metadata = EXCLUDED.field_metadata,
       updated_at = now()`,
    [
      nic,
      val(p1.equipeEnvolvidaLimpeza, 'equipeEnvolvidaLimpeza'),
      val(p1.dataAnalise, 'dataAnalise') || null,
      val(p1.horaAnalise, 'horaAnalise'),
      val(p1.foto1SacoFechado, 'foto1SacoFechado') ?? false,
      val(p1.foto2PlacaCemiterio, 'foto2PlacaCemiterio'),
      val(p1.foto3RemanescentesMateriais, 'foto3RemanescentesMateriais'),
      val(p1.foto4_1RemanescentesIsolados, 'foto4_1RemanescentesIsolados') ?? false,
      val(p1.foto4_2MateriaisIsolados, 'foto4_2MateriaisIsolados'),
      val(p1.tipoMaterial, 'tipoMaterial') || [],
      val(p1.cabeloDescricao, 'cabeloDescricao'),
      val(p1.protesesDescricao, 'protesesDescricao'),
      val(p1.vestesDescricao, 'vestesDescricao'),
      val(p1.pertencesDescricao, 'pertencesDescricao'),
      val(p1.tecidosMolesDescricao, 'tecidosMolesDescricao'),
      val(p1.estadoPreservacao, 'estadoPreservacao') || [],
      val(p1.estadoPreservacaoOutrosDescricao, 'estadoPreservacaoOutrosDescricao'),
      val(p1.observacoesGeraisPreservacao, 'observacoesGeraisPreservacao'),
      val(p1.exameGenetico, 'exameGenetico') || [],
      val(p1.geneticoFalangeDescricao, 'geneticoFalangeDescricao'),
      val(p1.geneticoDenteHigidoDescricao, 'geneticoDenteHigidoDescricao'),
      val(p1.geneticoOssosTarsaisDescricao, 'geneticoOssosTarsaisDescricao'),
      val(p1.geneticoOutrosDescricao, 'geneticoOutrosDescricao'),
      val(p1.geneticoObservacoesGerais, 'geneticoObservacoesGerais'),
      val(p1.geneticoResponsavelColeta, 'geneticoResponsavelColeta'),
      val(p1.analiseIsotopica, 'analiseIsotopica') || [],
      val(p1.isotopicaCabeloDescricao, 'isotopicaCabeloDescricao'),
      val(p1.isotopicaUnhaDescricao, 'isotopicaUnhaDescricao'),
      val(p1.isotopicaDenteDescricao, 'isotopicaDenteDescricao'),
      val(p1.isotopicaObservacoes, 'isotopicaObservacoes'),
      val(p1.isotopicaResponsavelColeta, 'isotopicaResponsavelColeta'),
      val(p1.corSacoLavagem, 'corSacoLavagem'),
      val(p1.tipoLimpeza, 'tipoLimpeza'),
      val(p1.houveDanos, 'houveDanos'),
      val(p1.descricaoDanos, 'descricaoDanos'),
      JSON.stringify(fieldMetadata)
    ]
  );
}

async function upsertPhase2Form(client: PoolClient, nic: string, p2: Phase2Data): Promise<void> {
  const fieldMetadata: Record<string, { isAiSuggested?: boolean; transcriptSnippet?: string }> = {};
  const val = (f: { value: any; isAiSuggested?: boolean; transcriptSnippet?: string }, key: string) => {
    if (f.isAiSuggested || f.transcriptSnippet) {
      fieldMetadata[key] = { isAiSuggested: f.isAiSuggested, transcriptSnippet: f.transcriptSnippet };
    }
    return f.value ?? null;
  };

  await client.query(
    `INSERT INTO phase2_forms (
       nic, maceracao_temperatura_c, maceracao_duracao_horas, maceracao_ciclos_monitoramento,
       maceracao_resultado, limpeza_manual_realizada, limpeza_manual_observacoes,
       secagem_temperatura_c, secagem_ciclos, secagem_confirmada_completa,
       secagem_confirmada_em, secagem_confirmada_por,
       acondicionamento_caixa_ossuaria_codigo, acondicionamento_placa_nic_qr_fixada,
       field_metadata, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
     ON CONFLICT (nic) DO UPDATE SET
       maceracao_temperatura_c = EXCLUDED.maceracao_temperatura_c,
       maceracao_duracao_horas = EXCLUDED.maceracao_duracao_horas,
       maceracao_ciclos_monitoramento = EXCLUDED.maceracao_ciclos_monitoramento,
       maceracao_resultado = EXCLUDED.maceracao_resultado,
       limpeza_manual_realizada = EXCLUDED.limpeza_manual_realizada,
       limpeza_manual_observacoes = EXCLUDED.limpeza_manual_observacoes,
       secagem_temperatura_c = EXCLUDED.secagem_temperatura_c,
       secagem_ciclos = EXCLUDED.secagem_ciclos,
       secagem_confirmada_completa = EXCLUDED.secagem_confirmada_completa,
       secagem_confirmada_em = EXCLUDED.secagem_confirmada_em,
       secagem_confirmada_por = EXCLUDED.secagem_confirmada_por,
       acondicionamento_caixa_ossuaria_codigo = EXCLUDED.acondicionamento_caixa_ossuaria_codigo,
       acondicionamento_placa_nic_qr_fixada = EXCLUDED.acondicionamento_placa_nic_qr_fixada,
       field_metadata = EXCLUDED.field_metadata,
       updated_at = now()`,
    [
      nic,
      val(p2.maceracaoTemperaturaC, 'maceracaoTemperaturaC'),
      val(p2.maceracaoDuracaoHoras, 'maceracaoDuracaoHoras'),
      val(p2.maceracaoCiclosMonitoramento, 'maceracaoCiclosMonitoramento') ?? 0,
      val(p2.maceracaoResultado, 'maceracaoResultado'),
      val(p2.limpezaManualRealizada, 'limpezaManualRealizada'),
      val(p2.limpezaManualObservacoes, 'limpezaManualObservacoes'),
      val(p2.secagemTemperaturaC, 'secagemTemperaturaC'),
      JSON.stringify(p2.secagemCiclos || []),
      p2.dryingConfirmationAllBoxes,
      p2.dryingConfirmedAt || null,
      p2.dryingConfirmedBy || null,
      val(p2.acondicionamentoCaixaOssuariaCodigo, 'acondicionamentoCaixaOssuariaCodigo'),
      val(p2.acondicionamentoPlacaNicQrFixada, 'acondicionamentoPlacaNicQrFixada') ?? false,
      JSON.stringify(fieldMetadata)
    ]
  );
}

async function syncPhotos(
  client: PoolClient,
  table: 'phase1_photos' | 'phase2_photos',
  nic: string,
  photos: { id: string; category: string; url: string; caption?: string; sha256Hash: string; author: string; timestamp: string }[]
): Promise<void> {
  // Sincronização simples: o array em full_state é a fonte de verdade e nunca perde
  // entradas (App.tsx só concatena fotos, nunca remove) — replace completo é seguro.
  await client.query(`DELETE FROM ${table} WHERE nic = $1`, [nic]);
  for (const photo of photos) {
    await client.query(
      `INSERT INTO ${table} (id, nic, category, url, caption, sha256_hash, author, taken_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [toUuidSafe(photo.id), nic, photo.category, photo.url, photo.caption || null, photo.sha256Hash, photo.author, photo.timestamp]
    );
  }
}

async function syncSignatures(
  client: PoolClient,
  nic: string,
  signatures: OsteologicalCollection['signatures']
): Promise<void> {
  // Append-only por natureza (nunca apaga uma assinatura anterior) — mas o array em
  // full_state também nunca remove entradas (ver handleSignPhase em Phase1/2), então
  // resincronizar por delete+insert aqui não perde histórico algum.
  await client.query(`DELETE FROM signatures WHERE nic = $1`, [nic]);
  for (const sig of signatures) {
    await client.query(
      `INSERT INTO signatures (nic, phase_number, signed_by, signed_by_name, signed_by_role, signed_at, sha256_hash, status, reopen_justification)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        nic,
        sig.phaseNumber,
        sig.signedBy,
        sig.signedByName,
        sig.signedByRole,
        sig.signedAt,
        sig.sha256Hash,
        sig.status === 'locked' ? 'locked' : 'superseded',
        sig.reopenJustification || null
      ]
    );
  }
}

async function syncCustodyChain(
  client: PoolClient,
  nic: string,
  custodyChain: OsteologicalCollection['custodyChain']
): Promise<void> {
  await client.query(`DELETE FROM custody_chain WHERE nic = $1`, [nic]);
  for (const event of custodyChain) {
    await client.query(
      `INSERT INTO custody_chain (id, nic, "timestamp", source_location, target_location, carrier_person, receiver_person, carrier_signature_hash, receiver_signature_hash, purpose, status, box_ids)
       VALUES ($1::uuid, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO NOTHING`,
      [
        toUuidSafe(event.id),
        nic,
        event.timestamp,
        event.sourceLocation,
        event.targetLocation,
        event.carrierPerson,
        event.receiverPerson,
        event.carrierSignatureHash,
        event.receiverSignatureHash || '',
        event.purpose,
        event.status,
        event.boxIds
      ]
    );
  }
}

// IDs gerados no cliente antes desta mudança (ex.: `cst-init-123`) não são UUID.
// Deriva um UUID v5-like determinístico via hash para não perder o registro.
function toUuidSafe(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
  const hash = crypto.createHash('sha256').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}
