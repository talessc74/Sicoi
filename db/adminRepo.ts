/**
 * Zona de Risco do Administrador — exclusão reversível (§ Configurações).
 *
 * Nada aqui apaga uma linha do Postgres. "Excluir" marca (deleted_at/deleted_by/
 * deleted_reason em `collections`, ou os mesmos quatro campos dentro de uma caixa
 * em phase1.preliminaryBoxes) e esconde da tela; "restaurar" limpa a marca. Isso é
 * compatível de propósito com o histórico protegido (db/historyGuard.ts, migração
 * 007): nunca fazemos DELETE/UPDATE fora das transições já previstas em
 * signatures/custody_chain/change_log — só UPDATE em `collections`, que nunca teve
 * essa trava.
 *
 * Toda ação (exclusão ou restauração, de caixa, conjunto ou tudo) grava uma linha
 * em `admin_actions` — uma trilha própria, sem FK para `collections`, que sobrevive
 * a qualquer uma das ações que ela mesma registra.
 *
 * Quem chama estas funções já deve ter conferido que o ator é administrador
 * (ver requireAdmin em server.ts) — este módulo não reconfere papel.
 */
import type { Pool } from 'pg';
import type { Actor } from './collectionsRepo';
import { getCollection, saveCollection } from './collectionsRepo';
import type { OsteologicalCollection } from '../src/types/sgccco';

export type AdminActionKind =
  | 'excluir_caixa'
  | 'restaurar_caixa'
  | 'excluir_conjunto'
  | 'restaurar_conjunto'
  | 'excluir_tudo'
  | 'restaurar_tudo';

export interface AdminActionRow {
  id: number;
  performedAt: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  kind: AdminActionKind;
  nic: string | null;
  boxId: string | null;
  reason: string | null;
  affectedCount: number;
}

async function recordAdminAction(
  pool: Pool,
  actor: Actor,
  kind: AdminActionKind,
  extra: { nic?: string | null; boxId?: string | null; reason?: string | null; affectedCount?: number } = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO admin_actions (actor_id, actor_name, actor_role, kind, nic, box_id, reason, affected_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [actor.id, actor.name, actor.role, kind, extra.nic ?? null, extra.boxId ?? null, extra.reason ?? null, extra.affectedCount ?? 1]
  );
}

export async function listAdminActions(pool: Pool, limit = 100): Promise<AdminActionRow[]> {
  const { rows } = await pool.query(
    `SELECT id, performed_at, actor_id, actor_name, actor_role, kind, nic, box_id, reason, affected_count
     FROM admin_actions ORDER BY performed_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    performedAt: r.performed_at,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    kind: r.kind,
    nic: r.nic,
    boxId: r.box_id,
    reason: r.reason,
    affectedCount: r.affected_count
  }));
}

export interface DeletedCollectionSummary {
  nic: string;
  deletedAt: string;
  deletedByName: string | null;
  deletedReason: string | null;
  currentPhase: number;
}

/** Conjuntos excluídos (deleted_at preenchido) — para a lista "Restaurar" da Zona de Risco. */
export async function listDeletedCollections(pool: Pool): Promise<DeletedCollectionSummary[]> {
  const { rows } = await pool.query(
    `SELECT nic, deleted_at, deleted_by_name, deleted_reason, current_phase
     FROM collections WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
  );
  return rows.map((r) => ({
    nic: r.nic,
    deletedAt: r.deleted_at,
    deletedByName: r.deleted_by_name,
    deletedReason: r.deleted_reason,
    currentPhase: r.current_phase
  }));
}

export async function softDeleteCollection(pool: Pool, nic: string, actor: Actor, reason: string): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE collections SET deleted_at = now(), deleted_by = $2, deleted_by_name = $3, deleted_reason = $4
     WHERE nic = $1 AND deleted_at IS NULL`,
    [nic, actor.id, actor.name, reason]
  );
  if (!rowCount) throw new Error(`Conjunto ${nic} não encontrado ou já está excluído.`);
  await recordAdminAction(pool, actor, 'excluir_conjunto', { nic, reason });
}

export async function restoreCollection(pool: Pool, nic: string, actor: Actor): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE collections SET deleted_at = NULL, deleted_by = NULL, deleted_by_name = NULL, deleted_reason = NULL
     WHERE nic = $1 AND deleted_at IS NOT NULL`,
    [nic]
  );
  if (!rowCount) throw new Error(`Conjunto ${nic} não encontrado ou não está excluído.`);
  await recordAdminAction(pool, actor, 'restaurar_conjunto', { nic });
}

/** Marca todo conjunto ainda ativo como excluído. Devolve quantos foram afetados. */
export async function softDeleteAllCollections(pool: Pool, actor: Actor, reason: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE collections SET deleted_at = now(), deleted_by = $1, deleted_by_name = $2, deleted_reason = $3
     WHERE deleted_at IS NULL`,
    [actor.id, actor.name, reason]
  );
  const affected = rowCount ?? 0;
  await recordAdminAction(pool, actor, 'excluir_tudo', { reason, affectedCount: affected });
  return affected;
}

/** Restaura todo conjunto excluído. Devolve quantos foram afetados. */
export async function restoreAllCollections(pool: Pool, actor: Actor): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE collections SET deleted_at = NULL, deleted_by = NULL, deleted_by_name = NULL, deleted_reason = NULL
     WHERE deleted_at IS NOT NULL`
  );
  const affected = rowCount ?? 0;
  await recordAdminAction(pool, actor, 'restaurar_tudo', { affectedCount: affected });
  return affected;
}

function findBox(collection: OsteologicalCollection, boxId: string) {
  return collection.phase1.preliminaryBoxes.find((b) => b.id === boxId);
}

/**
 * Exclui uma caixa (marca, não remove) dentro de um conjunto. Se a Fase 1 já está
 * assinada e travada, a mudança passa pela mesma reabertura protegida de qualquer
 * outro campo (a justificativa da exclusão vira a justificativa da reabertura) —
 * sem isso, saveCollection recusaria com "Assinatura inválida"/histórico protegido.
 */
export async function adminDeleteBox(
  pool: Pool,
  nic: string,
  boxId: string,
  actor: Actor,
  reason: string
): Promise<OsteologicalCollection> {
  const collection = await getCollection(pool, nic);
  if (!collection) throw new Error(`Conjunto ${nic} não encontrado.`);
  const box = findBox(collection, boxId);
  if (!box) throw new Error(`Caixa ${boxId} não encontrada no conjunto ${nic}.`);
  if (box.deletedAt) throw new Error(`Caixa ${boxId} já está excluída.`);

  const timestamp = new Date().toISOString();
  const next: OsteologicalCollection = {
    ...collection,
    phase1: {
      ...collection.phase1,
      preliminaryBoxes: collection.phase1.preliminaryBoxes.map((b) =>
        b.id === boxId
          ? { ...b, deletedAt: timestamp, deletedBy: actor.id ?? undefined, deletedByName: actor.name ?? undefined, deletedReason: reason }
          : b
      )
    }
  };

  const lockedPhase1 = collection.signatures.find((s) => s.phaseNumber === 1 && s.status === 'locked');
  if (lockedPhase1) {
    next.signatures = collection.signatures.map((s) =>
      s === lockedPhase1
        ? { ...s, status: 'unlocked_for_revision' as const, reopenedBy: actor.name ?? 'Administrador', reopenedAt: timestamp, reopenJustification: reason }
        : s
    );
  }

  const saved = await saveCollection(pool, next, actor);
  await recordAdminAction(pool, actor, 'excluir_caixa', { nic, boxId, reason });
  return saved;
}

export async function adminRestoreBox(pool: Pool, nic: string, boxId: string, actor: Actor): Promise<OsteologicalCollection> {
  const collection = await getCollection(pool, nic);
  if (!collection) throw new Error(`Conjunto ${nic} não encontrado.`);
  const box = findBox(collection, boxId);
  if (!box) throw new Error(`Caixa ${boxId} não encontrada no conjunto ${nic}.`);
  if (!box.deletedAt) throw new Error(`Caixa ${boxId} não está excluída.`);

  const next: OsteologicalCollection = {
    ...collection,
    phase1: {
      ...collection.phase1,
      preliminaryBoxes: collection.phase1.preliminaryBoxes.map((b) =>
        b.id === boxId ? { ...b, deletedAt: undefined, deletedBy: undefined, deletedByName: undefined, deletedReason: undefined } : b
      )
    }
  };

  const saved = await saveCollection(pool, next, actor);
  await recordAdminAction(pool, actor, 'restaurar_caixa', { nic, boxId });
  return saved;
}
