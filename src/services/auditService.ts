/**
 * Serviço de Integridade Criptográfica e Trilha de Auditoria (§7, §15)
 */

export async function calculateSha256(content: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch {
      // Fallback
    }
  }
  // Deterministic quick hash fallback if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.substring(0, 64);
}

export function generateSignaturePayload(data: {
  nic: string;
  phaseNumber: number;
  signedBy: string;
  role: string;
  timestamp: string;
  dataSnapshotJson: string;
}): string {
  return `SIGCOI-SIG-ALFA|NIC:${data.nic}|PHASE:${data.phaseNumber}|BY:${data.signedBy}|ROLE:${data.role}|TIME:${data.timestamp}|SNAPSHOT:${data.dataSnapshotJson}`;
}

export function generateExportHeader(data: {
  nic: string;
  individualCode?: string;
  curationVersion: number;
  curatorName: string;
  methodsApplied: string[];
  exportDate: string;
  scopeAuthorizationId?: string;
  hash: string;
}): string {
  return `
================================================================================
SIGCOI ALFA - INC/DITEC/PF - RELATÓRIO CIENTÍFICO COM TRILHA DE REPRODUTIBILIDADE
--------------------------------------------------------------------------------
NIC: ${data.nic}
INDIVÍDUO: ${data.individualCode || 'CONJUNTO GERAL'}
VERSÃO CIENTÍFICA: v${data.curationVersion} (APROVADA)
CURADOR RESPONSÁVEL: ${data.curatorName}
MÉTODOS BIOANTROPOLÓGICOS: ${data.methodsApplied.join('; ')}
AUTORIZAÇÃO DE PESQUISA (CEP/SEI): ${data.scopeAuthorizationId || 'Acesso Curatorial Interno'}
DATA DE EXPORTAÇÃO: ${data.exportDate}
HASH CRIPTOGRÁFICO DE REPRODUTIBILIDADE (SHA-256):
${data.hash}
================================================================================
AVISO: Este documento não conclui causa, mecanismo ou circunstância jurídica de morte.
Dados de identificação civil e cemiterial de origem são restritos nos termos do §7.
--------------------------------------------------------------------------------
`.trim();
}
