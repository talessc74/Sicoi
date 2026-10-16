import { describe, it, expect } from 'vitest';
import type { OsteologicalCollection, PhaseSignature, UserProfile } from '../../src/types/sgccco';
import type { ChangeLogRow } from '../collectionsRepo';
import {
  redactCollectionForViewer,
  redactHistoryForViewer,
  restoreHiddenFields,
  SensitiveDataAccessError
} from '../collectionRedaction';

type Viewer = Pick<UserProfile, 'role' | 'adminAccess' | 'legalOriginAccess'>;
const as = (role: UserProfile['role'], extra: Partial<Viewer> = {}): Viewer => ({ role, ...extra });

const phase0Signature: PhaseSignature = {
  phaseNumber: 0,
  signedBy: 'u1',
  signedByName: 'Técnico',
  signedByRole: 'tecnico',
  signedAt: '2026-10-16T10:00:00.000Z',
  sha256Hash: 'h0',
  status: 'locked',
  dataSnapshotJson: '{"nome":"Fulano de Tal","filhos":[]}'
};

function collection(): OsteologicalCollection {
  return {
    nic: 'COI-900',
    currentPhase: 1,
    signatures: [phase0Signature],
    legalOrigin: { cemeteryName: 'Cemitério X', deathDeclarationNumber: 'DO-1' },
    phase0: { nome: 'Fulano de Tal', cpf: '000.000.000-00', causaMorte: 'Causa', filhos: [] }
  } as unknown as OsteologicalCollection;
}

describe('dados restritos por papel', () => {
  it('Técnico vê a Fase 0, mas não a origem do cemitério', () => {
    const out = redactCollectionForViewer(collection(), as('tecnico'));
    expect(out.phase0?.nome).toBe('Fulano de Tal');
    expect(out.legalOrigin).toEqual({});
    expect(out.signatures[0].dataSnapshotJson).toBeDefined();
  });

  it('Curador e Administrador veem tudo', () => {
    for (const viewer of [as('curador'), as('administrador'), as('estudante', { adminAccess: true, legalOriginAccess: true })]) {
      const out = redactCollectionForViewer(collection(), viewer);
      expect(out.phase0?.cpf).toBe('000.000.000-00');
      expect(out.legalOrigin.cemeteryName).toBe('Cemitério X');
    }
  });

  it('Pesquisador e Estudante não recebem nada da DO nem da origem — nem na cópia assinada', () => {
    for (const viewer of [as('pesquisador'), as('estudante')]) {
      const out = redactCollectionForViewer(collection(), viewer);
      expect(out.phase0).toEqual({ filhos: [], redacted: true });
      expect(out.legalOrigin).toEqual({});
      expect(out.signatures[0].dataSnapshotJson).toBeUndefined();
      expect(JSON.stringify(out)).not.toContain('Fulano');
      expect(JSON.stringify(out)).not.toContain('Cemitério X');
    }
  });

  it('histórico: valores da Fase 0 somem para quem não pode ver, o resto fica', () => {
    const changes = [
      { id: 1, path: 'phase0.nome', oldValue: null, newValue: 'Fulano de Tal', note: null },
      { id: 2, path: 'phase1.corSacoLavagem', oldValue: null, newValue: 'Azul', note: null }
    ] as unknown as ChangeLogRow[];
    const hidden = redactHistoryForViewer([phase0Signature], changes, as('pesquisador'));
    expect(hidden.changes[0].newValue).toBeNull();
    expect(hidden.changes[0].note).toContain('restrito');
    expect(hidden.changes[1].newValue).toBe('Azul');
    expect(hidden.signatures[0].dataSnapshotJson).toBeUndefined();

    const shown = redactHistoryForViewer([phase0Signature], changes, as('tecnico'));
    expect(shown.changes[0].newValue).toBe('Fulano de Tal');
  });

  it('ao salvar, quem não vê não apaga nem troca a Fase 0 e a origem', () => {
    const stored = collection();
    const incoming = redactCollectionForViewer(stored, as('pesquisador'));
    incoming.legalOrigin = { cemeteryName: 'Outro' };
    const restored = restoreHiddenFields(incoming, stored, as('pesquisador'));
    expect(restored.phase0).toEqual(stored.phase0);
    expect(restored.legalOrigin).toEqual(stored.legalOrigin);
  });

  it('conjunto novo criado por quem não vê: Fase 0 nasce vazia', () => {
    const incoming = { ...collection(), signatures: [] };
    const restored = restoreHiddenFields(incoming, null, as('estudante'));
    expect(restored.phase0).toEqual({ filhos: [] });
    expect(restored.legalOrigin).toEqual({});
  });

  it('quem não vê a Fase 0 não pode assinar a Fase 0', () => {
    const stored = { ...collection(), signatures: [] };
    const incoming = { ...collection() };
    expect(() => restoreHiddenFields(incoming, stored, as('pesquisador'))).toThrow(SensitiveDataAccessError);
  });
});
