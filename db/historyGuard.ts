/**
 * Proteção e registro do histórico de um conjunto, aplicados pelo servidor a cada
 * gravação (o navegador envia o conjunto inteiro; o que já é histórico não pode
 * ser reescrito por ele).
 *
 * - Assinaturas já gravadas: o servidor é a fonte de verdade. Só aceita as
 *   transições previstas (assinada → reaberta, com justificativa) e nunca
 *   reconfere o hash delas contra os dados atuais (que o Postgres devolve com as
 *   chaves em outra ordem — era isso que gerava o falso "Assinatura inválida").
 * - Assinaturas novas: o hash é conferido contra o conteúdo da fase exatamente
 *   como veio na requisição, e esse conteúdo é guardado como cópia da versão.
 * - Fase assinada e travada: o conteúdo não pode mudar sem reabertura.
 * - Cadeia de custódia: registros existentes não podem sumir nem mudar.
 * - Diferenças entre o estado anterior e o novo viram entradas do registro de
 *   alterações (change_log).
 */
import crypto from 'crypto';
import type { CustodyMovement, OsteologicalCollection, PhaseSignature } from '../src/types/sgccco';
import {
  generateSignaturePayload,
  LEGACY_SIGNATURE_PAYLOAD_PREFIXES,
  SIGNATURE_PAYLOAD_PREFIX
} from '../src/services/auditService';
import { canonicalJson, diffValues, sameContent } from '../src/utils/historyDiff';

export { canonicalJson };

export class HistoryViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoryViolationError';
  }
}

const SIGNABLE_PHASES = [1, 2, 3, 4, 5, 6] as const;
const ACCEPTED_PREFIXES = [SIGNATURE_PAYLOAD_PREFIX, ...LEGACY_SIGNATURE_PAYLOAD_PREFIXES];

export function signatureKey(sig: Pick<PhaseSignature, 'phaseNumber' | 'signedAt' | 'sha256Hash'>): string {
  return `${sig.phaseNumber}|${sig.signedAt}|${sig.sha256Hash}`;
}

function phaseData(collection: OsteologicalCollection, phaseNumber: number): unknown {
  return (collection as any)[`phase${phaseNumber}`];
}

/**
 * Confere o hash de uma assinatura nova contra o conteúdo da fase como veio na
 * requisição (o JSON.parse do Express preserva a ordem das chaves enviada pelo
 * navegador, a mesma usada para calcular o hash). Devolve a cópia exata assinada.
 */
export function verifyNewSignature(collection: OsteologicalCollection, sig: PhaseSignature): string | null {
  const data = phaseData(collection, sig.phaseNumber);
  if (data === undefined) return null;
  const snapshot = JSON.stringify(data);
  const matches = ACCEPTED_PREFIXES.some((prefix) => {
    const payload = generateSignaturePayload(
      {
        nic: collection.nic,
        phaseNumber: sig.phaseNumber,
        signedBy: sig.signedBy,
        role: sig.signedByRole,
        timestamp: sig.signedAt,
        dataSnapshotJson: snapshot
      },
      prefix
    );
    return crypto.createHash('sha256').update(payload, 'utf-8').digest('hex') === sig.sha256Hash;
  });
  return matches ? snapshot : null;
}

export interface SignatureEvent {
  kind: 'assinatura' | 'reabertura';
  signature: PhaseSignature;
}

/**
 * Junta as assinaturas gravadas com as recebidas. Devolve a lista que vale (com os
 * campos históricos vindos do banco) e os eventos novos (assinaturas e reaberturas).
 */
export function mergeSignatures(
  previous: OsteologicalCollection,
  incoming: OsteologicalCollection
): { signatures: PhaseSignature[]; events: SignatureEvent[] } {
  const previousByKey = new Map((previous.signatures || []).map((s) => [signatureKey(s), s]));
  const incomingKeys = new Set((incoming.signatures || []).map(signatureKey));

  for (const [key, stored] of previousByKey) {
    if (!incomingKeys.has(key)) {
      throw new HistoryViolationError(
        `Histórico protegido: a assinatura da Fase ${stored.phaseNumber} feita por ${stored.signedByName} em ${stored.signedAt} não pode ser removida.`
      );
    }
  }

  const events: SignatureEvent[] = [];
  const signatures = (incoming.signatures || []).map((received) => {
    const stored = previousByKey.get(signatureKey(received));

    if (!stored) {
      if (received.status !== 'locked') {
        throw new HistoryViolationError(`Assinatura nova da Fase ${received.phaseNumber} precisa chegar como assinada (travada).`);
      }
      const snapshot = verifyNewSignature(incoming, received);
      if (!snapshot) {
        throw new HistoryViolationError(
          `Assinatura inválida para o conjunto ${incoming.nic}, Fase ${received.phaseNumber}: hash não confere com o conteúdo da fase enviado.`
        );
      }
      const accepted: PhaseSignature = {
        phaseNumber: received.phaseNumber,
        signedBy: received.signedBy,
        signedByName: received.signedByName,
        signedByRole: received.signedByRole,
        signedAt: received.signedAt,
        sha256Hash: received.sha256Hash,
        status: 'locked',
        dataSnapshotJson: snapshot
      };
      events.push({ kind: 'assinatura', signature: accepted });
      return accepted;
    }

    if (
      received.signedBy !== stored.signedBy ||
      received.signedByName !== stored.signedByName ||
      received.signedByRole !== stored.signedByRole
    ) {
      throw new HistoryViolationError(
        `Histórico protegido: quem assinou a Fase ${stored.phaseNumber} em ${stored.signedAt} não pode ser alterado.`
      );
    }

    const merged: PhaseSignature = { ...stored };
    if (stored.status === 'locked' && received.status === 'unlocked_for_revision') {
      const justification = (received.reopenJustification || '').trim();
      if (!justification) {
        throw new HistoryViolationError(
          `A Fase ${stored.phaseNumber} está assinada: para alterá-la, reabra a fase com justificativa técnica.`
        );
      }
      merged.status = 'unlocked_for_revision';
      merged.reopenJustification = justification;
      merged.reopenedBy = received.reopenedBy;
      merged.reopenedAt = received.reopenedAt;
      events.push({ kind: 'reabertura', signature: merged });
    } else if (stored.status === 'unlocked_for_revision' && received.status === 'locked') {
      throw new HistoryViolationError(
        `Histórico protegido: a assinatura substituída da Fase ${stored.phaseNumber} não pode voltar a valer; assine a fase de novo.`
      );
    } else if (stored.status === 'unlocked_for_revision') {
      // Reabertura já registrada: justificativa, quem e quando não mudam depois.
      if (stored.reopenJustification && received.reopenJustification !== undefined && received.reopenJustification !== stored.reopenJustification) {
        throw new HistoryViolationError(
          `Histórico protegido: a justificativa da reabertura da Fase ${stored.phaseNumber} não pode ser alterada.`
        );
      }
    }
    return merged;
  });

  return { signatures, events };
}

/** Registros de custódia gravados não podem sumir nem mudar; os novos entram no fim. */
export function checkCustodyChain(previous: OsteologicalCollection, incoming: OsteologicalCollection): CustodyMovement[] {
  const incomingById = new Map((incoming.custodyChain || []).map((m) => [m.id, m]));
  for (const stored of previous.custodyChain || []) {
    const received = incomingById.get(stored.id);
    if (!received || !sameContent(received, stored)) {
      throw new HistoryViolationError(
        `Histórico protegido: o registro de custódia de ${stored.timestamp} (${stored.sourceLocation} → ${stored.targetLocation}) não pode ser removido nem alterado.`
      );
    }
  }
  const storedIds = new Set((previous.custodyChain || []).map((m) => m.id));
  return (incoming.custodyChain || []).filter((m) => !storedIds.has(m.id));
}

/** Fase cuja assinatura vigente está travada e tem cópia: o conteúdo não pode mudar. */
export function checkLockedPhases(signatures: PhaseSignature[], incoming: OsteologicalCollection): void {
  for (const phase of SIGNABLE_PHASES) {
    let latest: PhaseSignature | undefined;
    for (const s of signatures) if (s.phaseNumber === phase) latest = s;
    if (!latest || latest.status !== 'locked' || !latest.dataSnapshotJson) continue;
    if (!sameContent(JSON.parse(latest.dataSnapshotJson), phaseData(incoming, phase))) {
      throw new HistoryViolationError(
        `A Fase ${phase} está assinada e travada: para alterar o conteúdo, reabra a fase (Curador ou Administrador, com justificativa).`
      );
    }
  }
}

// --- Registro de alterações -------------------------------------------------------

export interface ChangeEntry {
  kind: 'criacao' | 'campo' | 'assinatura' | 'reabertura' | 'custodia';
  phaseNumber?: number | null;
  path?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  note?: string | null;
}

// Assinaturas e custódia viram eventos próprios; não entram como "campo".
const EXCLUDED_TOP_LEVEL = ['signatures', 'custodyChain'];

export function diffCollections(previous: OsteologicalCollection, next: OsteologicalCollection): ChangeEntry[] {
  return diffValues(previous, next, '', EXCLUDED_TOP_LEVEL).map((d) => {
    const phaseMatch = d.path.match(/^phase(\d)\b/);
    // Procedência (cemitério, jazigo, declaração de óbito) é restrita a Curador e
    // Administrador (§7): o registro guarda que mudou, quem e quando — não os valores.
    if (d.path.startsWith('legalOrigin')) {
      return {
        kind: 'campo' as const,
        phaseNumber: null,
        path: d.path,
        oldValue: null,
        newValue: null,
        note: 'dado restrito de procedência alterado (valores não registrados no histórico)'
      };
    }
    return {
      kind: 'campo' as const,
      phaseNumber: phaseMatch ? Number(phaseMatch[1]) : null,
      path: d.path,
      oldValue: d.before,
      newValue: d.after,
      note: d.aiSuggested ? 'preenchido pelo condutor/IA' : null
    };
  });
}

export function signatureEventsToEntries(events: SignatureEvent[]): ChangeEntry[] {
  return events.map(({ kind, signature }) =>
    kind === 'assinatura'
      ? {
          kind,
          phaseNumber: signature.phaseNumber,
          newValue: { sha256Hash: signature.sha256Hash, signedAt: signature.signedAt },
          note: `Fase ${signature.phaseNumber} assinada por ${signature.signedByName}`
        }
      : {
          kind,
          phaseNumber: signature.phaseNumber,
          oldValue: { sha256Hash: signature.sha256Hash, signedAt: signature.signedAt, signedByName: signature.signedByName },
          note: `Fase ${signature.phaseNumber} reaberta${signature.reopenedBy ? ` por ${signature.reopenedBy}` : ''}: ${signature.reopenJustification}`
        }
  );
}

export function custodyEventsToEntries(movements: CustodyMovement[]): ChangeEntry[] {
  return movements.map((m) => ({
    kind: 'custodia' as const,
    newValue: m,
    note: `${m.sourceLocation} → ${m.targetLocation}`
  }));
}

/** Hash encadeado de uma entrada do registro: qualquer edição posterior quebra a corrente. */
export function changeEntryHash(
  prevHash: string,
  row: { nic: string; changedAt: string; actorId: string | null; actorName: string | null; actorRole: string | null } & ChangeEntry
): string {
  const content = canonicalJson({
    nic: row.nic,
    changedAt: row.changedAt,
    actorId: row.actorId,
    actorName: row.actorName,
    actorRole: row.actorRole,
    kind: row.kind,
    phaseNumber: row.phaseNumber ?? null,
    path: row.path ?? null,
    oldValue: row.oldValue ?? null,
    newValue: row.newValue ?? null,
    note: row.note ?? null
  });
  return crypto.createHash('sha256').update(`${prevHash}|${content}`, 'utf-8').digest('hex');
}
