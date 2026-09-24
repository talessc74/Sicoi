import React, { useState } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  StorageLocation,
  CustodyMovement
} from '../types/sgccco';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { PublicQRInspectionModal } from './PublicQRInspectionModal';
import {
  Warehouse,
  Truck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  MapPin,
  ShieldCheck,
  FileSignature,
  Eye
} from 'lucide-react';

interface Phase6GalpaoProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase6Galpao: React.FC<Phase6GalpaoProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  laboratoryMode
}) => {
  const [transitInitiated, setTransitInitiated] = useState(
    collection.phase6.deliveryReceiptCarrier !== undefined
  );
  const [rackSelect, setRackSelect] = useState('Estante G-12');
  const [shelfSelect, setShelfSelect] = useState('Prateleira 03');
  const [slotSelect, setSlotSelect] = useState('Nicho 01');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSignDualModal, setShowSignDualModal] = useState(false);
  const [signing, setSigning] = useState(false);

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 6);
  const isLocked = phaseSignature?.status === 'locked';

  // Verificação rigorosa de pré-condições (§6)
  const isPhase1Signed = collection.signatures.some(s => s.phaseNumber === 1 && s.status === 'locked');
  const isPhase2Signed = collection.signatures.some(s => s.phaseNumber === 2 && s.status === 'locked');
  const isPhase3Signed = collection.signatures.some(s => s.phaseNumber === 3 && s.status === 'locked');
  const isPhase4Signed = collection.signatures.some(s => s.phaseNumber === 4 && s.status === 'locked');
  const isPhase5Signed = collection.signatures.some(s => s.phaseNumber === 5 && s.status === 'locked');
  const isChecklist100 = collection.phase5.phase5Checklist
    ? Object.values(collection.phase5.phase5Checklist).every(Boolean)
    : true;

  const canEnterPhase6 = isPhase1Signed && isPhase2Signed && isPhase3Signed && isPhase4Signed && isPhase5Signed && isChecklist100;

  const boxes = collection.phase1.preliminaryBoxes;
  const isDelivered = collection.phase6.finalLocations && collection.phase6.finalLocations.length > 0;

  const handleStartTransit = async () => {
    const timestamp = new Date().toISOString();
    const hash = await calculateSha256(`TRANSIT-DISPATCH-${collection.nic}-${currentUser.name}-${timestamp}`);

    const updated = { ...collection };
    updated.phase6.deliveryReceiptCarrier = {
      carrierName: currentUser.name,
      dispatchedAt: timestamp,
      sha256Hash: hash
    };
    updated.phase6.transferStartedAt = timestamp;
    updated.phase6.transferDispatchedByTechnician = currentUser.name;
    updated.phase6.transferDispatchHash = hash;

    // Registra movimento de custódia
    const custodyMovement: CustodyMovement = {
      id: `cst-transit-${Date.now()}`,
      timestamp,
      sourceLocation: 'Laboratório Central (Sala B-10)',
      targetLocation: 'Galpão Definitivo INC/DITEC/PF (Em Trânsito)',
      carrierPerson: currentUser.name,
      receiverPerson: 'Aguardando Responsável do Galpão',
      carrierSignatureHash: hash,
      receiverSignatureHash: '',
      purpose: 'transferencia_definitiva',
      status: 'em_transito',
      boxIds: boxes.map(b => b.id)
    };
    updated.custodyChain = [...updated.custodyChain, custodyMovement];

    setTransitInitiated(true);
    onUpdateCollection(updated);
  };

  const handleAcceptAtWarehouse = async () => {
    setSigning(true);
    const timestamp = new Date().toISOString();
    const receiveHash = await calculateSha256(`WAREHOUSE-ACCEPT-${collection.nic}-${currentUser.name}-${timestamp}`);

    const finalLoc: StorageLocation = {
      facility: 'Galpão Central de Custódia DITEC',
      room: 'Ala B - Osteologia',
      rack: rackSelect,
      shelf: shelfSelect,
      boxSlot: slotSelect
    };

    const updated = { ...collection };
    updated.phase6.acceptanceReceiptWarehouse = {
      receiverName: currentUser.name,
      receivedAt: timestamp,
      sha256Hash: receiveHash
    };
    updated.phase6.warehouseAcceptedBy = currentUser.name;
    updated.phase6.warehouseAcceptedAt = timestamp;
    updated.phase6.warehouseCustodyTermHash = receiveHash;

    updated.phase6.finalLocations = boxes.map(b => ({
      boxId: b.id,
      location: finalLoc,
      shelfQrVerified: true,
      storedAt: timestamp,
      finalizedAt: timestamp,
      warehouseOperator: currentUser.name
    }));

    // Ativa QR Code Público oficial (§11)
    updated.phase6.publicQrActive = true;
    updated.phase6.publicQrActivationDate = timestamp;

    // Atualiza custódia para concluído
    const lastCustody = updated.custodyChain[updated.custodyChain.length - 1];
    if (lastCustody) {
      lastCustody.receiverPerson = currentUser.name;
      lastCustody.receiverSignatureHash = receiveHash;
      lastCustody.status = 'concluido';
      lastCustody.targetLocation = `Galpão DITEC · ${finalLoc.room} · ${rackSelect} · ${shelfSelect}`;
    }

    // Assinatura da Fase 6
    const payload = generateSignaturePayload({
      nic: collection.nic,
      phaseNumber: 6,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(collection.phase6)
    });
    const phase6Hash = await calculateSha256(payload);

    updated.signatures = [
      ...updated.signatures.map((s) => (s.phaseNumber === 6 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
      {
        phaseNumber: 6,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: phase6Hash,
        status: 'locked'
      }
    ];
    if (updated.currentPhase < 7) {
      updated.currentPhase = 7;
    }

    setSigning(false);
    setShowSignDualModal(false);
    onUpdateCollection(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <Warehouse className="w-4 h-4" />
              <span>Fase 6 · Galpão Definitivo & Ativação de QR Code (§11)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {collection.nic}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Transferência de custódia com termo de entrega e aceite duplamente assinado. Sem agente de IA por design.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Consulta Pública do QR</span>
                </button>
                <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Guardado Definitivamente</span>
                </div>
              </div>
            ) : isDelivered ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Aceite Realizado</span>
              </div>
            ) : transitInitiated ? (
              <button
                onClick={() => setShowSignDualModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-xs"
              >
                <FileSignature className="w-4 h-4" />
                <span>Conferir Caixas & Assinar Aceite no Galpão</span>
              </button>
            ) : (
              <button
                onClick={handleStartTransit}
                disabled={!canEnterPhase6}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={!canEnterPhase6 ? 'Fases 1 a 5 devem estar assinadas e checklist 100% para despachar.' : ''}
              >
                <Truck className="w-4 h-4" />
                <span>Despachar em Trânsito para Galpão</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verificação de Pré-requisitos (§6) */}
      {!canEnterPhase6 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold block text-sm">Bloqueio Sequencial Mandatório (§6, §7):</span>
            <p className="mt-1 leading-relaxed">
              O conjunto {collection.nic} não pode ingressar na Fase 6 enquanto todas as fases anteriores (1 a 5) não estiverem devidamente assinadas e o checklist determinístico da Fase 5 não atingir 100% de conformidade.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Termo Duplo de Custódia + Localização Definitiva */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Termo Duplo de Custódia */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Termo Duplo de Entrega e Aceite com Criptografia SHA-256
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Quem Entrega (Técnico Transportador) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-sky-600 block">
                  1. Entrega / Despacho (Laboratório)
                </span>
                {collection.phase6.deliveryReceiptCarrier ? (
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-900 dark:text-white font-bold">
                      {collection.phase6.deliveryReceiptCarrier.carrierName}
                    </div>
                    <div className="text-slate-500">
                      Data: {new Date(collection.phase6.deliveryReceiptCarrier.dispatchedAt).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-slate-400 text-[10px] truncate">
                      Hash: {collection.phase6.deliveryReceiptCarrier.sha256Hash}
                    </div>
                    <div className="pt-2 text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Despacho Assinado
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic py-2">
                    Aguardando emissão de despacho pelo técnico transportador.
                  </div>
                )}
              </div>

              {/* Quem Recebe (Responsável pelo Galpão) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600 block">
                  2. Aceite / Recepção (Galpão)
                </span>
                {collection.phase6.acceptanceReceiptWarehouse ? (
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-900 dark:text-white font-bold">
                      {collection.phase6.acceptanceReceiptWarehouse.receiverName}
                    </div>
                    <div className="text-slate-500">
                      Data: {new Date(collection.phase6.acceptanceReceiptWarehouse.receivedAt).toLocaleString('pt-BR')}
                    </div>
                    <div className="text-slate-400 text-[10px] truncate">
                      Hash: {collection.phase6.acceptanceReceiptWarehouse.sha256Hash}
                    </div>
                    <div className="pt-2 text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aceite Assinado
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 italic py-2">
                    Aguardando conferência e assinatura de aceite no Galpão.
                  </div>
                )}
              </div>
            </div>

            {/* Localização Definitiva Atribuída */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-sky-600" />
                Localização Definitiva no Galpão DITEC
              </h4>

              {collection.phase6.finalLocations && collection.phase6.finalLocations.length > 0 ? (
                <div className="space-y-2">
                  {collection.phase6.finalLocations.map((fl) => (
                    <div
                      key={fl.boxId}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {fl.boxId}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {fl.location.facility} · {fl.location.room} · {fl.location.rack} · {fl.location.shelf} ({fl.location.boxSlot || 'Nicho 01'})
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Definitivo
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs">
                  A localização definitiva será registrada no momento da assinatura do aceite.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Ativação do QR Code Público */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold pb-2 border-b border-slate-200 dark:border-slate-800">
              <QrCode className="w-4 h-4 text-sky-600" />
              <h4>Consulta Oficial por QR Code (§11)</h4>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Com o fechamento da Fase 6, a etiqueta QR Code afixada na caixa torna-se <strong>ativa para consulta pública</strong> autorizada.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=SIGCOI://${collection.nic}`}
                  alt="QR Code Ativo"
                  className="w-28 h-28"
                />
              </div>
              <div>
                <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold ${
                  collection.phase6.publicQrActive
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}>
                  {collection.phase6.publicQrActive ? '● QR Code Ativado Oficialmente' : '▲ Inativo (Aguardando Aceite)'}
                </span>
              </div>
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium text-xs hover:opacity-95 transition-opacity"
              >
                Testar Visualização do QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Aceite com Dupla Assinatura */}
      {showSignDualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Aceite de Custódia Definitiva no Galpão
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Ao assinar o aceite, você declara ter conferido a integridade dos lacres e das {boxes.length} caixas do conjunto {collection.nic}, alocando-as definitivamente na estrutura física do Galpão.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-600 font-mono text-[11px] mb-1">Estante:</label>
                <input
                  type="text"
                  value={rackSelect}
                  onChange={(e) => setRackSelect(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-mono text-[11px] mb-1">Prateleira:</label>
                <input
                  type="text"
                  value={shelfSelect}
                  onChange={(e) => setShelfSelect(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-mono text-[11px] mb-1">Nicho / Slot:</label>
                <input
                  type="text"
                  value={slotSelect}
                  onChange={(e) => setSlotSelect(e.target.value)}
                  className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowSignDualModal(false)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button
                onClick={handleAcceptAtWarehouse}
                disabled={signing}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinar Aceite & Ativar QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consulta do QR Code */}
      {showQrModal && (
        <PublicQRInspectionModal
          collection={collection}
          onClose={() => setShowQrModal(false)}
          userRole={currentUser.role}
        />
      )}
    </div>
  );
};
