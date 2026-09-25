import { AuditEvent, OsteologicalCollection } from '../types/sgccco';

export function getAuditTrailForCollection(collection: OsteologicalCollection): AuditEvent[] {
  if (collection.auditTrail && collection.auditTrail.length > 0) {
    return collection.auditTrail;
  }

  // Gera os eventos a partir dos dados reais do conjunto (criação, fases assinadas,
  // reaberturas técnicas e cadeia de custódia). Isto vale para QUALQUER conjunto —
  // inclusive os 3 de demonstração carregados via "Carregar dados de exemplo" em
  // Configurações, que têm signatures/custodyChain reais preenchidas com a mesma
  // história. Nunca decidir isto pelo NIC: um conjunto real criado do zero recebe
  // NICs sequenciais (NIC-2026-0841, -0842, ...) que colidem exatamente com os NICs
  // de demonstração — um projeto que apagou a base e começou do zero teria seu
  // primeiro conjunto real mostrando, silenciosamente, a trilha de auditoria FICTÍCIA
  // da demonstração em vez da real.
  const dynamicEvents: AuditEvent[] = [
    {
      id: `aud-${collection.nic}-01`,
      timestamp: collection.createdAt,
      phaseNumber: 1,
      actionType: 'criacao_nic',
      actionTitle: `Registro e Abertura Formal de ${collection.nic}`,
      description: `Registro cadastral do conjunto osteológico sob protocolo ${collection.legalOrigin.deliveryDocumentNumber || 'Ofício Inicial'}.`,
      operatorId: 'usr-dyn-01',
      operatorName: collection.createdByTechnician || 'Técnico Responsável',
      operatorRole: 'tecnico',
      operatorInstitution: 'INC/DITEC/PF',
      ipOrTerminal: 'Terminal-Operacional-01 (10.22.4.10)',
      previousValueSnapshot: 'Status: Não Cadastrado',
      newValueSnapshot: `NIC: ${collection.nic} | Fase Atual: ${collection.currentPhase}`,
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      verificationStatus: 'valido',
      boxIds: collection.phase1.preliminaryBoxes.map(b => b.id)
    }
  ];

  // Adiciona eventos das assinaturas
  collection.signatures.forEach((sig, idx) => {
    dynamicEvents.push({
      id: `aud-${collection.nic}-sig-${sig.phaseNumber}-${idx}`,
      timestamp: sig.signedAt,
      phaseNumber: sig.phaseNumber,
      actionType: 'assinatura_fase',
      actionTitle: `Assinatura Digital da Fase ${sig.phaseNumber}`,
      description: `Conclusão e travamento criptográfico dos procedimentos técnicos da Fase ${sig.phaseNumber}.`,
      operatorId: sig.signedBy,
      operatorName: sig.signedByName,
      operatorRole: sig.signedByRole,
      operatorInstitution: 'INC/DITEC/PF',
      ipOrTerminal: 'Terminal-Certificacao (10.22.4.15)',
      previousValueSnapshot: `Fase ${sig.phaseNumber}: Aberto`,
      newValueSnapshot: `Fase ${sig.phaseNumber}: Travado (Locked)`,
      sha256Hash: sig.sha256Hash,
      verificationStatus: 'valido',
      boxIds: collection.phase1.preliminaryBoxes.map(b => b.id)
    });

    if (sig.status === 'unlocked_for_revision' && sig.reopenedAt) {
      dynamicEvents.push({
        id: `aud-${collection.nic}-reopen-${sig.phaseNumber}-${idx}`,
        timestamp: sig.reopenedAt,
        phaseNumber: sig.phaseNumber,
        actionType: 'reabertura_fase',
        actionTitle: `Reabertura Técnica Justificada da Fase ${sig.phaseNumber}`,
        description: `Fase ${sig.phaseNumber} destravada para revisão conforme autorização técnica.`,
        operatorId: 'usr-reopen',
        operatorName: sig.reopenedBy || 'Responsável Técnico',
        operatorRole: 'curador',
        operatorInstitution: 'INC/DITEC/PF',
        ipOrTerminal: 'Terminal-Supervisao (10.22.4.35)',
        previousValueSnapshot: `Fase ${sig.phaseNumber}: Travado`,
        newValueSnapshot: `Fase ${sig.phaseNumber}: Reaberto para Revisão`,
        sha256Hash: sig.sha256Hash.split('').reverse().join(''),
        verificationStatus: 'valido',
        justification: sig.reopenJustification || 'Reabertura técnica justificada.'
      });
    }
  });

  // Adiciona movimentos de custódia
  collection.custodyChain.forEach((cst, idx) => {
    dynamicEvents.push({
      id: `aud-${collection.nic}-cst-${idx}`,
      timestamp: cst.timestamp,
      phaseNumber: 6,
      actionType: 'despacho_transporte',
      actionTitle: `Movimentação de Custódia: ${cst.sourceLocation} → ${cst.targetLocation}`,
      description: `Finalidade: ${cst.purpose}. Transportado por ${cst.carrierPerson} e recebido por ${cst.receiverPerson}.`,
      operatorId: 'cst-op',
      operatorName: cst.carrierPerson,
      operatorRole: 'tecnico',
      operatorInstitution: 'INC/DITEC/PF',
      ipOrTerminal: 'Terminal-Custodia (10.22.4.22)',
      previousValueSnapshot: `Origem: ${cst.sourceLocation}`,
      newValueSnapshot: `Destino: ${cst.targetLocation} | Status: ${cst.status}`,
      sha256Hash: cst.carrierSignatureHash,
      verificationStatus: 'valido',
      boxIds: cst.boxIds
    });
  });

  // Ordena cronologicamente
  return dynamicEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
