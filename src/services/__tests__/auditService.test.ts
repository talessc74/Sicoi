import { describe, it, expect } from 'vitest';
import {
  calculateSha256,
  generateSignaturePayload,
  generateExportHeader,
  SIGNATURE_PAYLOAD_PREFIX,
  LEGACY_SIGNATURE_PAYLOAD_PREFIXES
} from '../auditService';

// Este ambiente de teste roda em Node (vitest.config.ts: environment 'node'),
// sem `window` global — exercita o fallback determinístico de calculateSha256,
// o mesmo caminho usado no servidor. O caminho com window.crypto.subtle (browser)
// já é indiretamente exercitado pelos testes de assinatura em jsdom/produção.

describe('calculateSha256', () => {
  it('é determinístico: o mesmo conteúdo produz sempre o mesmo hash', async () => {
    const a = await calculateSha256('SIGCOI-SIG-ALFA|NIC:2026-0841');
    const b = await calculateSha256('SIGCOI-SIG-ALFA|NIC:2026-0841');
    expect(a).toBe(b);
  });

  it('conteúdo diferente produz hash diferente', async () => {
    const a = await calculateSha256('conteudo-1');
    const b = await calculateSha256('conteudo-2');
    expect(a).not.toBe(b);
  });

  it('sempre devolve 64 caracteres hexadecimais', async () => {
    const hash = await calculateSha256('qualquer coisa');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateSignaturePayload', () => {
  const data = {
    nic: 'NIC-2026-0841',
    phaseNumber: 1,
    signedBy: 'user-1',
    role: 'Tecnico',
    timestamp: '2026-09-27T10:00:00.000Z',
    dataSnapshotJson: '{"equipe":"Alfa"}'
  };

  it('usa o prefixo atual por padrão', () => {
    expect(generateSignaturePayload(data)).toBe(
      `${SIGNATURE_PAYLOAD_PREFIX}|NIC:NIC-2026-0841|PHASE:1|BY:user-1|ROLE:Tecnico|TIME:2026-09-27T10:00:00.000Z|SNAPSHOT:{"equipe":"Alfa"}`
    );
  });

  it('aceita um prefixo legado, para reconferir assinaturas antigas', () => {
    const legacyPrefix = LEGACY_SIGNATURE_PAYLOAD_PREFIXES[0];
    expect(generateSignaturePayload(data, legacyPrefix)).toContain(`${legacyPrefix}|NIC:`);
  });

  it('dois payloads com dados iguais são idênticos (determinístico)', () => {
    expect(generateSignaturePayload(data)).toBe(generateSignaturePayload({ ...data }));
  });
});

describe('generateExportHeader', () => {
  it('inclui o número do conjunto (COI), hash e aviso de restrição no cabeçalho', () => {
    const header = generateExportHeader({
      nic: 'COI-001',
      curationVersion: 1,
      curatorName: 'Dra. Curadora',
      methodsApplied: ['Phenice (1969)'],
      exportDate: '2026-09-27',
      hash: 'abc123'
    });

    expect(header).toContain('COI: COI-001');
    expect(header).toContain('abc123');
    expect(header).toContain('Phenice (1969)');
    expect(header).toContain('Dados de identificação civil e cemiterial de origem são restritos');
  });

  it('usa "CONJUNTO GERAL" quando não há indivíduo específico', () => {
    const header = generateExportHeader({
      nic: 'NIC-2026-0841',
      curationVersion: 1,
      curatorName: 'Dra. Curadora',
      methodsApplied: [],
      exportDate: '2026-09-27',
      hash: 'abc123'
    });
    expect(header).toContain('INDIVÍDUO: CONJUNTO GERAL');
  });
});
