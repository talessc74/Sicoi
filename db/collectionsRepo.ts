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
 * Nunca confiar cegamente no que vem do cliente: assinaturas novas têm o hash
 * conferido aqui; assinaturas, custódia e registro de alterações já gravados são
 * protegidos (ver historyGuard.ts e a migração 007).
 */
import type { Pool, PoolClient } from 'pg';
import type { OsteologicalCollection, Phase1Data, Phase2Data } from '../src/types/sgccco';
import { syncGraphForCollection } from './graphSync';
import {
  ChangeEntry,
  changeEntryHash,
  checkCustodyChain,
  checkLockedPhases,
  custodyEventsToEntries,
  diffCollections,
  HistoryViolationError,
  mergeSignatures,
  signatureEventsToEntries
} from './historyGuard';
import crypto from 'crypto';

/** Quem está gravando (pessoa ativa no app). Sem login ainda: é declarado pelo navegador. */
export interface Actor {
  id: string | null;
  name: string | null;
  role: string | null;
}

const UNKNOWN_ACTOR: Actor = { id: null, name: null, role: null };

// Exclui os conjuntos marcados como excluídos (deleted_at) pela Zona de Risco do
// Administrador (db/adminRepo.ts) — a exclusão ali é reversível, nada é apagado de
// verdade; só some desta lista até alguém restaurar.
export async function listCollections(pool: Pool): Promise<OsteologicalCollection[]> {
  const { rows } = await pool.query<{ full_state: OsteologicalCollection }>(
    'SELECT full_state FROM collections WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map((r) => r.full_state);
}

/**
 * Apaga todos os conjuntos e tudo que depende deles (formulários, fotos, assinaturas,
 * custódia, registro de alterações) — via ON DELETE CASCADE. Irreversível. Não tem
 * rota HTTP nem botão no app (o histórico de um acervo real não pode ser apagado
 * por quem acessa o site); existe para os testes automatizados.
 */
export async function wipeAllCollections(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Única exceção aos gatilhos de histórico protegido (migração 007), válida só
    // dentro desta transação.
    await client.query(`SET LOCAL sigcoi.allow_wipe = 'on'`);
    await client.query('DELETE FROM collections');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getCollection(pool: Pool, nic: string): Promise<OsteologicalCollection | null> {
  const { rows } = await pool.query<{ full_state: OsteologicalCollection }>(
    'SELECT full_state FROM collections WHERE nic = $1',
    [nic]
  );
  return rows[0]?.full_state ?? null;
}

/**
 * Cria um conjunto. Idempotente só pra minha própria tentativa sendo repetida
 * (mesmo `collection.id`, gerado uma vez no navegador por tentativa de criação —
 * ex.: StrictMode do React re-executando um efeito em desenvolvimento, ou um
 * retry de rede): nesse caso não sobrescreve o que já está no banco, só devolve
 * o que já lá está. Uma tentativa de criar um NIC que já pertence a um conjunto
 * DIFERENTE (outro `id`) é um erro real — nunca um sucesso silencioso (bug
 * relatado pelo Tales, out/2026: a partir do COI-002, criar um NIC já existente
 * devolvia o conjunto antigo sem avisar nada).
 */
export async function createCollection(
  pool: Pool,
  collection: OsteologicalCollection,
  actor: Actor = UNKNOWN_ACTOR
): Promise<OsteologicalCollection> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `INSERT INTO collections (nic, current_phase, created_at, created_by_technician, legal_origin, full_state)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (nic) DO NOTHING`,
      [
        collection.nic,
        collection.currentPhase,
        collection.createdAt,
        collection.createdByTechnician,
        JSON.stringify(collection.legalOrigin),
        JSON.stringify(collection)
      ]
    );
    if (rowCount && rowCount > 0) {
      await syncDerivedTables(client, collection);
      await appendChangeLog(client, collection.nic, actor, [
        { kind: 'criacao', note: `Conjunto ${collection.nic} cadastrado` },
        ...custodyEventsToEntries(collection.custodyChain || [])
      ]);
    } else {
      const { rows } = await client.query<{ full_state: OsteologicalCollection; deleted_at: string | null }>(
        'SELECT full_state, deleted_at FROM collections WHERE nic = $1',
        [collection.nic]
      );
      const existing = rows[0]?.full_state;
      const isDeleted = rows[0]?.deleted_at !== null && rows[0]?.deleted_at !== undefined;

      if (isDeleted) {
        // O conjunto existia anteriormente mas foi excluído: reinicia com os dados novos
        await client.query(
          `UPDATE collections
           SET current_phase = $2,
               created_at = $3,
               created_by_technician = $4,
               legal_origin = $5,
               full_state = $6,
               deleted_at = NULL,
               deleted_by = NULL,
               deleted_by_name = NULL,
               deleted_reason = NULL
           WHERE nic = $1`,
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
        await appendChangeLog(client, collection.nic, actor, [
          { kind: 'criacao', note: `Conjunto ${collection.nic} reiniciado após exclusão anterior` },
          ...custodyEventsToEntries(collection.custodyChain || [])
        ]);
      } else if (existing && existing.id !== collection.id) {
        throw Object.assign(new Error(`O conjunto ${collection.nic} já existe no acervo.`), { code: 'CONJUNTO_JA_EXISTE' });
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const current = await getCollection(pool, collection.nic);
  if (!current) throw Object.assign(new Error(`Falha ao criar/recuperar o conjunto ${collection.nic} após o insert.`), { code: 'CONJUNTO_ERRO_INTERNO' });
  return current;
}

/**
 * Persiste um conjunto já existente, com o histórico protegido:
 * - assinaturas já gravadas vêm do banco (só aceitam reabertura com justificativa)
 *   e não têm o hash reconferido contra os dados atuais;
 * - assinaturas novas têm o hash conferido e a cópia do conteúdo guardada;
 * - fase assinada e travada não muda sem reabertura;
 * - custódia gravada não some nem muda;
 * - cada diferença vira uma entrada no registro de alterações.
 * Devolve o conjunto como ficou gravado.
 */
export async function saveCollection(
  pool: Pool,
  collection: OsteologicalCollection,
  actor: Actor = UNKNOWN_ACTOR
): Promise<OsteologicalCollection> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ full_state: OsteologicalCollection; deleted_at: string | null }>(
      'SELECT full_state, deleted_at FROM collections WHERE nic = $1 FOR UPDATE',
      [collection.nic]
    );
    const previous = rows[0]?.full_state;
    if (!previous) {
      throw Object.assign(new Error(`Conjunto ${collection.nic} não encontrado para atualização.`), { code: 'CONJUNTO_NAO_ENCONTRADO' });
    }
    if (rows[0].deleted_at) {
      throw new HistoryViolationError(
        `Conjunto ${collection.nic} está excluído — restaure-o na Zona de Risco (Configurações) antes de editar.`,
        'CONJUNTO_EXCLUIDO'
      );
    }

    const { signatures, events } = mergeSignatures(previous, collection);
    const newCustody = checkCustodyChain(previous, collection);
    const next: OsteologicalCollection = { ...collection, signatures };
    checkLockedPhases(signatures, next);

    await client.query(
      `UPDATE collections SET current_phase = $2, legal_origin = $3, full_state = $4 WHERE nic = $1`,
      [next.nic, next.currentPhase, JSON.stringify(next.legalOrigin), JSON.stringify(next)]
    );
    await syncDerivedTables(client, next);
    await appendChangeLog(client, next.nic, actor, [
      ...diffCollections(previous, next),
      ...signatureEventsToEntries(events),
      ...custodyEventsToEntries(newCustody)
    ]);
    await client.query('COMMIT');
    return next;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Grava entradas no registro de alterações, encadeando o hash de cada uma na anterior. */
async function appendChangeLog(client: PoolClient, nic: string, actor: Actor, entries: ChangeEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const { rows } = await client.query<{ entry_hash: string }>(
    'SELECT entry_hash FROM change_log WHERE nic = $1 ORDER BY id DESC LIMIT 1',
    [nic]
  );
  let prevHash = rows[0]?.entry_hash ?? 'GENESIS';
  const changedAt = new Date().toISOString();
  for (const entry of entries) {
    const row = { nic, changedAt, actorId: actor.id, actorName: actor.name, actorRole: actor.role, ...entry };
    const entryHash = changeEntryHash(prevHash, row);
    await client.query(
      `INSERT INTO change_log (nic, changed_at, actor_id, actor_name, actor_role, kind, phase_number, path, old_value, new_value, note, prev_hash, entry_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        nic,
        changedAt,
        actor.id,
        actor.name,
        actor.role,
        entry.kind,
        entry.phaseNumber ?? null,
        entry.path ?? null,
        JSON.stringify(entry.oldValue ?? null),
        JSON.stringify(entry.newValue ?? null),
        entry.note ?? null,
        prevHash,
        entryHash
      ]
    );
    prevHash = entryHash;
  }
}

export interface ChangeLogRow {
  id: number;
  changedAt: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  kind: ChangeEntry['kind'];
  phaseNumber: number | null;
  path: string | null;
  oldValue: unknown;
  newValue: unknown;
  note: string | null;
  prevHash: string;
  entryHash: string;
}

export async function listChangeLog(pool: Pool, nic: string): Promise<ChangeLogRow[]> {
  const { rows } = await pool.query(
    `SELECT id, changed_at, actor_id, actor_name, actor_role, kind, phase_number, path, old_value, new_value, note, prev_hash, entry_hash
       FROM change_log WHERE nic = $1 ORDER BY id ASC`,
    [nic]
  );
  return rows.map((r: any) => ({
    id: Number(r.id),
    changedAt: new Date(r.changed_at).toISOString(),
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    kind: r.kind,
    phaseNumber: r.phase_number,
    path: r.path,
    oldValue: r.old_value,
    newValue: r.new_value,
    note: r.note,
    prevHash: r.prev_hash,
    entryHash: r.entry_hash
  }));
}

/**
 * Refaz a corrente de hashes do registro de alterações de um conjunto. Se alguém
 * editar ou apagar uma entrada direto no banco, a corrente quebra a partir dela.
 */
export function verifyChangeLogChain(entries: ChangeLogRow[], nic: string): { ok: boolean; brokenAtId: number | null } {
  let prevHash = 'GENESIS';
  for (const e of entries) {
    const expected = changeEntryHash(prevHash, { nic, ...e });
    if (e.prevHash !== prevHash || e.entryHash !== expected) return { ok: false, brokenAtId: e.id };
    prevHash = e.entryHash;
  }
  return { ok: true, brokenAtId: null };
}

async function syncDerivedTables(client: PoolClient, collection: OsteologicalCollection): Promise<void> {
  await upsertPhase1Form(client, collection.nic, collection.phase1);
  await upsertPhase2Form(client, collection.nic, collection.phase2);
  await syncPhotos(client, 'phase1_photos', collection.nic, collection.phase1.photos);
  await syncPhotos(client, 'phase2_photos', collection.nic, collection.phase2.photos);
  await syncSignatures(client, collection.nic, collection.signatures);
  await syncCustodyChain(client, collection.nic, collection.custodyChain);
  await syncGraphForCollection(client, collection);
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
       genetico_responsavel_coleta, genetico_primeira_costela_descricao, genetico_patela_descricao,
       analise_isotopica, isotopica_cabelo_descricao, isotopica_unha_descricao,
       isotopica_dente_descricao, isotopica_observacoes, isotopica_responsavel_coleta,
       cor_saco_lavagem, tipo_limpeza, houve_danos, descricao_danos, field_metadata, updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
       $26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38, now()
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
       genetico_primeira_costela_descricao = EXCLUDED.genetico_primeira_costela_descricao,
       genetico_patela_descricao = EXCLUDED.genetico_patela_descricao,
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
      val(p1.foto1SacoFechado, 'foto1SacoFechado'),
      val(p1.foto2PlacaCemiterio, 'foto2PlacaCemiterio'),
      val(p1.foto3RemanescentesMateriais, 'foto3RemanescentesMateriais'),
      val(p1.foto4_1RemanescentesIsolados, 'foto4_1RemanescentesIsolados'),
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
      // Campos opcionais (conjuntos antigos não os têm).
      p1.geneticoPrimeiraCostelaDescricao ? val(p1.geneticoPrimeiraCostelaDescricao, 'geneticoPrimeiraCostelaDescricao') : null,
      p1.geneticoPatelaDescricao ? val(p1.geneticoPatelaDescricao, 'geneticoPatelaDescricao') : null,
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
       nic, equipe_envolvida_limpeza, data_analise, hora_analise,
       maceracao_ciclos_necessarios, instrumentos_utilizados, instrumentos_outra_descricao,
       houve_danos_maceracao, descricao_danos_maceracao, forma_secagem,
       secagem_confirmada_completa, secagem_confirmada_em, secagem_confirmada_por,
       field_metadata, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
     ON CONFLICT (nic) DO UPDATE SET
       equipe_envolvida_limpeza = EXCLUDED.equipe_envolvida_limpeza,
       data_analise = EXCLUDED.data_analise,
       hora_analise = EXCLUDED.hora_analise,
       maceracao_ciclos_necessarios = EXCLUDED.maceracao_ciclos_necessarios,
       instrumentos_utilizados = EXCLUDED.instrumentos_utilizados,
       instrumentos_outra_descricao = EXCLUDED.instrumentos_outra_descricao,
       houve_danos_maceracao = EXCLUDED.houve_danos_maceracao,
       descricao_danos_maceracao = EXCLUDED.descricao_danos_maceracao,
       forma_secagem = EXCLUDED.forma_secagem,
       secagem_confirmada_completa = EXCLUDED.secagem_confirmada_completa,
       secagem_confirmada_em = EXCLUDED.secagem_confirmada_em,
       secagem_confirmada_por = EXCLUDED.secagem_confirmada_por,
       field_metadata = EXCLUDED.field_metadata,
       updated_at = now()`,
    [
      nic,
      val(p2.equipeEnvolvidaLimpeza, 'equipeEnvolvidaLimpeza'),
      val(p2.dataAnalise, 'dataAnalise') || null,
      val(p2.horaAnalise, 'horaAnalise'),
      val(p2.maceracaoCiclosNecessarios, 'maceracaoCiclosNecessarios'),
      val(p2.instrumentosUtilizados, 'instrumentosUtilizados') || [],
      val(p2.instrumentosOutraDescricao, 'instrumentosOutraDescricao'),
      val(p2.houveDanosMaceracao, 'houveDanosMaceracao'),
      val(p2.descricaoDanosMaceracao, 'descricaoDanosMaceracao'),
      val(p2.formaSecagem, 'formaSecagem'),
      p2.dryingConfirmationAllBoxes,
      p2.dryingConfirmedAt || null,
      p2.dryingConfirmedBy || null,
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
  // Sincronização: o array em full_state é a fonte de verdade para metadados (App.tsx
  // só concatena fotos, nunca remove). Mas full_state nunca carrega os bytes de uma
  // foto real (ver _local-adr-policy-301) — esses chegam só pela rota de upload, que
  // grava direto na tabela. Por isso um registro com `data` preenchido nunca é apagado
  // aqui, e o upsert de metadados nunca toca as colunas de bytes.
  await client.query(`DELETE FROM ${table} WHERE nic = $1 AND data IS NULL`, [nic]);
  for (const photo of photos) {
    await client.query(
      `INSERT INTO ${table} (id, nic, category, url, caption, sha256_hash, author, taken_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         category = EXCLUDED.category,
         url = EXCLUDED.url,
         caption = EXCLUDED.caption,
         sha256_hash = EXCLUDED.sha256_hash,
         author = EXCLUDED.author,
         taken_at = EXCLUDED.taken_at`,
      [toUuidSafe(photo.id), nic, photo.category, photo.url, photo.caption || null, photo.sha256Hash, photo.author, photo.timestamp]
    );
  }
}

async function syncSignatures(
  client: PoolClient,
  nic: string,
  signatures: OsteologicalCollection['signatures']
): Promise<void> {
  // Só inserção: uma assinatura já gravada nunca é apagada; a única mudança é
  // passar a "substituída" com o registro da reabertura (gatilho da migração 007).
  for (const sig of signatures) {
    await client.query(
      `INSERT INTO signatures (nic, phase_number, signed_by, signed_by_name, signed_by_role, signed_at, sha256_hash, status,
                               reopen_justification, data_snapshot, reopened_by, reopened_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (nic, phase_number, signed_at, sha256_hash) DO UPDATE SET
         status = EXCLUDED.status,
         reopen_justification = COALESCE(signatures.reopen_justification, EXCLUDED.reopen_justification),
         reopened_by = COALESCE(signatures.reopened_by, EXCLUDED.reopened_by),
         reopened_at = COALESCE(signatures.reopened_at, EXCLUDED.reopened_at)
       WHERE signatures.status IS DISTINCT FROM EXCLUDED.status
          OR (signatures.reopen_justification IS NULL AND EXCLUDED.reopen_justification IS NOT NULL)`,
      [
        nic,
        sig.phaseNumber,
        sig.signedBy,
        sig.signedByName,
        sig.signedByRole,
        sig.signedAt,
        sig.sha256Hash,
        sig.status === 'locked' ? 'locked' : 'superseded',
        sig.reopenJustification || null,
        sig.dataSnapshotJson || null,
        sig.reopenedBy || null,
        sig.reopenedAt || null
      ]
    );
  }
}

async function syncCustodyChain(
  client: PoolClient,
  nic: string,
  custodyChain: OsteologicalCollection['custodyChain']
): Promise<void> {
  // Só inserção (gatilho da migração 007): registros já gravados ficam como estão.
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

export type PhotoTable = 'phase1_photos' | 'phase2_photos' | 'phase4_photos';

/**
 * Grava os bytes de uma foto real (_local-adr-policy-301) na linha já criada por
 * saveCollection/syncPhotos (ou, na Fase 4, por insertPhase4AssemblyPhotoMetadata
 * abaixo) — em todos os casos, só metadados. Chamado depois que a foto já
 * está no full_state — nunca antes, para não deixar bytes órfãos se o save falhar
 * (fase travada, etc.).
 */
export async function attachPhotoBytes(
  pool: Pool,
  table: PhotoTable,
  photoId: string,
  bytes: Buffer,
  mimetype: string,
  sizeBytes: number,
  width: number | null,
  height: number | null
): Promise<void> {
  await pool.query(
    `UPDATE ${table} SET data = $2, mimetype = $3, size_bytes = $4, width = $5, height = $6 WHERE id = $1::uuid`,
    [photoId, bytes, mimetype, sizeBytes, width, height]
  );
}

// Fase 4 não tem array de fotos como Fase 1/2 (ver syncPhotos) — é uma foto
// única oficial (completeAssemblyPhotoApproved), então o metadado é inserido
// direto pela rota de upload, nunca por syncDerivedTables.
export async function insertPhase4AssemblyPhotoMetadata(
  pool: Pool,
  photo: { id: string; category: string; url: string; caption?: string; sha256Hash: string; author: string; timestamp: string },
  nic: string
): Promise<void> {
  await pool.query(
    `INSERT INTO phase4_photos (id, nic, category, url, caption, sha256_hash, author, taken_at)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [toUuidSafe(photo.id), nic, photo.category, photo.url, photo.caption || null, photo.sha256Hash, photo.author, photo.timestamp]
  );
}

export interface StoredPhotoFile {
  data: Buffer;
  mimetype: string;
}

/** Lê os bytes de uma foto real para a rota de exibição. Nunca devolve fotos fictícias (sem `data`). */
export async function getPhotoFile(
  pool: Pool,
  table: PhotoTable,
  nic: string,
  photoId: string
): Promise<StoredPhotoFile | null> {
  const { rows } = await pool.query<{ data: Buffer | null; mimetype: string | null }>(
    `SELECT data, mimetype FROM ${table} WHERE id = $1::uuid AND nic = $2`,
    [photoId, nic]
  );
  const row = rows[0];
  if (!row || !row.data || !row.mimetype) return null;
  return { data: row.data, mimetype: row.mimetype };
}
