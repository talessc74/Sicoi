/**
 * Dados pessoais e de procedência só saem do servidor para quem pode vê-los
 * (_local-adr-policy-207). Até aqui a restrição era só da tela: o servidor
 * mandava o conjunto inteiro para qualquer pessoa logada, e quem abrisse as
 * ferramentas do navegador via nome, CPF, filiação e causa da morte (Fase 0) e
 * cemitério, jazigo e declaração de óbito (legalOrigin).
 *
 * - Fase 0 (Identificação e DO): Técnico, Curador e Administrador
 *   (canViewPhase0Identity).
 * - Origem legal / cemitério: Curador e Administrador, ajustável por pessoa
 *   (canViewLegalOrigin).
 *
 * Quem não pode ver recebe a Fase 0 como { filhos: [], redacted: true } e a
 * origem como {}. Ao salvar, o servidor devolve o que está guardado nesses dois
 * pontos antes de qualquer conferência de histórico — quem não vê não apaga nem
 * altera, e as fases assinadas continuam batendo com a cópia assinada.
 */
import type { OsteologicalCollection, PhaseSignature, UserProfile } from '../src/types/sgccco';
import { canViewLegalOrigin, canViewPhase0Identity } from '../src/utils/permissions';
import type { ChangeLogRow } from './collectionsRepo';

type Viewer = Pick<UserProfile, 'role' | 'adminAccess' | 'legalOriginAccess'>;

export class SensitiveDataAccessError extends Error {
  code = 'ACESSO_DADO_RESTRITO';
}

const hidesPhase0 = (viewer: Viewer) => !canViewPhase0Identity(viewer);
const hidesLegalOrigin = (viewer: Viewer) => !canViewLegalOrigin(viewer);

export function redactCollectionForViewer(collection: OsteologicalCollection, viewer: Viewer): OsteologicalCollection {
  const out: OsteologicalCollection = { ...collection };
  if (hidesPhase0(viewer) && collection.phase0) {
    out.phase0 = { filhos: [], redacted: true };
  }
  if (hidesLegalOrigin(viewer)) {
    out.legalOrigin = {};
  }
  if (hidesPhase0(viewer)) {
    // A cópia assinada da Fase 0 é o próprio conteúdo da DO.
    out.signatures = (collection.signatures || []).map((s) => redactPhase0Signature(s));
  }
  return out;
}

function redactPhase0Signature(signature: PhaseSignature): PhaseSignature {
  if (signature.phaseNumber !== 0 || !signature.dataSnapshotJson) return signature;
  const { dataSnapshotJson: _hidden, ...rest } = signature;
  return rest;
}

export function redactHistoryForViewer(
  signatures: PhaseSignature[],
  changes: ChangeLogRow[],
  viewer: Viewer
): { signatures: PhaseSignature[]; changes: ChangeLogRow[] } {
  if (!hidesPhase0(viewer)) return { signatures, changes };
  return {
    signatures: signatures.map(redactPhase0Signature),
    changes: changes.map((c) =>
      c.path && c.path.startsWith('phase0')
        ? { ...c, oldValue: null, newValue: null, note: 'dado restrito da Fase 0 alterado (valores visíveis só para Técnico, Curador e Administrador)' }
        : c
    )
  };
}

/**
 * Antes de salvar o que veio de alguém que não vê esses dados: devolve a Fase 0
 * e a origem guardadas, e recusa uma assinatura nova da Fase 0 — ela lacraria
 * um conteúdo que essa pessoa nem recebeu.
 */
export function restoreHiddenFields(
  incoming: OsteologicalCollection,
  stored: OsteologicalCollection | null,
  viewer: Viewer
): OsteologicalCollection {
  const out: OsteologicalCollection = { ...incoming };
  if (hidesPhase0(viewer)) {
    const storedPhase0Signatures = (stored?.signatures || []).filter((s) => s.phaseNumber === 0).length;
    const incomingPhase0Signatures = (incoming.signatures || []).filter((s) => s.phaseNumber === 0).length;
    if (incomingPhase0Signatures > storedPhase0Signatures) {
      throw new SensitiveDataAccessError('Só Técnico, Curador ou Administrador pode assinar a Fase 0 (Identificação e DO).');
    }
    if (stored?.phase0) out.phase0 = stored.phase0;
    // Conjunto novo: a Fase 0 existe, mas nasce vazia — nada do que veio é aceito.
    else if (!stored && incoming.phase0) out.phase0 = { filhos: [] };
    else delete out.phase0;
  }
  if (hidesLegalOrigin(viewer)) {
    out.legalOrigin = stored?.legalOrigin ?? {};
  }
  return out;
}
