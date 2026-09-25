import React, { useState } from 'react';
import { OsteologicalCollection, UserProfile, StorageLocation, CustodyMovement } from '../types/sgccco';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canPerformRole } from '../utils/permissions';
import { WAREHOUSE_STRUCTURE } from '../data/mockData';
import { MapPin, QrCode, CheckCircle2, Clock, Box, ShieldCheck, ArrowRight } from 'lucide-react';

interface Phase3AcondicionamentoProps {
  collection: OsteologicalCollection;
  allCollections: OsteologicalCollection[];
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  onSelectCollectionToCurate?: (nic: string) => void;
}

export const Phase3Acondicionamento: React.FC<Phase3AcondicionamentoProps> = ({
  collection,
  allCollections,
  currentUser,
  onUpdateCollection,
  onSelectCollectionToCurate
}) => {
  const [selectedBoxId, setSelectedBoxId] = useState(collection.phase1.preliminaryBoxes[0]?.id || '');
  const [rackSelect, setRackSelect] = useState('Estante 04');
  const [shelfSelect, setShelfSelect] = useState('Prateleira 02');
  const [slotSelect, setSlotSelect] = useState('Vão 01');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [simulatedScanSuccess, setSimulatedScanSuccess] = useState(false);

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 3);
  const isLocked = phaseSignature?.status === 'locked';
  const canActAsTechnician = canPerformRole(currentUser.role, 'tecnico');

  const boxes = collection.phase1.preliminaryBoxes;
  const allBoxesPlaced = boxes.length > 0 && boxes.every(b => 
    collection.phase3.boxLocations.some(bl => bl.boxId === b.id)
  );

  const handlePlaceBox = async () => {
    if (!selectedBoxId) return;

    const newLocation: StorageLocation = {
      facility: 'Laboratório Central',
      room: 'Sala B-10',
      rack: rackSelect,
      shelf: shelfSelect,
      boxSlot: slotSelect
    };

    const updated = { ...collection };
    // Remove previous if any
    updated.phase3.boxLocations = [
      ...updated.phase3.boxLocations.filter(bl => bl.boxId !== selectedBoxId),
      {
        boxId: selectedBoxId,
        location: newLocation,
        placedAt: new Date().toISOString(),
        technicianName: currentUser.name,
        shelfQrScanned: true
      }
    ];

    if (!updated.phase3.enteredQueueAt) {
      updated.phase3.enteredQueueAt = new Date().toISOString();
    }

    // Registra na cadeia de custódia (§5)
    const movementHash = await calculateSha256(`CUSTODY-${collection.nic}-${selectedBoxId}-${Date.now()}`);
    const custodyMovement: CustodyMovement = {
      id: `cst-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceLocation: 'Bancada de Secagem',
      targetLocation: `Sala B-10 · ${rackSelect} · ${shelfSelect}`,
      carrierPerson: currentUser.name,
      receiverPerson: currentUser.name,
      carrierSignatureHash: movementHash,
      receiverSignatureHash: movementHash,
      purpose: 'acondicionamento_provisorio',
      status: 'concluido',
      boxIds: [selectedBoxId]
    };
    updated.custodyChain = [...updated.custodyChain, custodyMovement];

    setSimulatedScanSuccess(true);
    setTimeout(() => setSimulatedScanSuccess(false), 2500);

    onUpdateCollection(updated);
  };

  const handleSignPhase = async () => {
    setSigning(true);
    const timestamp = new Date().toISOString();
    const payload = generateSignaturePayload({
      nic: collection.nic,
      phaseNumber: 3,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(collection.phase3)
    });
    const hash = await calculateSha256(payload);

    const updated = { ...collection };
    updated.signatures = [
      ...updated.signatures.map((s) => (s.phaseNumber === 3 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
      {
        phaseNumber: 3,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked'
      }
    ];
    if (updated.currentPhase < 4) {
      updated.currentPhase = 4;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  // Fila de Curadoria (esperando Fase 4)
  const curationQueue = allCollections.filter(c => {
    const isP3Signed = c.signatures.some(s => s.phaseNumber === 3 && s.status === 'locked');
    const isP4Signed = c.signatures.some(s => s.phaseNumber === 4 && s.status === 'locked');
    return isP3Signed && !isP4Signed;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <MapPin className="w-4 h-4" />
              <span>Fase 3 · Acondicionamento Provisório (Sem Agente de IA)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {collection.nic}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registro determinístico de localização por leitura dupla de QR Code (Caixa + Prateleira).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fase 3 Assinada & Prateleira Travada</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={!allBoxesPlaced || !canActAsTechnician}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinar Acondicionamento Provisório</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Registro de Localização + Fila da Curadoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atribuição de Local das Caixas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-sky-600" />
              Leitura Dupla de QR: Caixa e Prateleira
            </h3>

            {!isLocked && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 mb-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Caixa a Guardar:
                    </label>
                    <select
                      value={selectedBoxId}
                      onChange={(e) => setSelectedBoxId(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    >
                      {boxes.map(b => (
                        <option key={b.id} value={b.id}>{b.boxCode}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Estante:
                    </label>
                    <select
                      value={rackSelect}
                      onChange={(e) => setRackSelect(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    >
                      <option value="Estante 01">Estante 01</option>
                      <option value="Estante 02">Estante 02</option>
                      <option value="Estante 04">Estante 04</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Prateleira:
                    </label>
                    <select
                      value={shelfSelect}
                      onChange={(e) => setShelfSelect(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    >
                      <option value="Prateleira 01">Prateleira 01</option>
                      <option value="Prateleira 02">Prateleira 02</option>
                      <option value="Prateleira 03">Prateleira 03</option>
                      <option value="Prateleira 04">Prateleira 04</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Vão / Slot:
                    </label>
                    <input
                      type="text"
                      value={slotSelect}
                      onChange={(e) => setSlotSelect(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 text-[11px]">
                    Lê o QR da caixa e o QR da prateleira para vincular a custódia.
                  </span>
                  <button
                    onClick={handlePlaceBox}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Confirmar Leitura e Guardar</span>
                  </button>
                </div>

                {simulatedScanSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-mono text-[11px]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>QR de caixa e prateleira validados! Registro de custódia gerado com hash.</span>
                  </div>
                )}
              </div>
            )}

            {/* Lista das caixas e suas posições */}
            <div className="space-y-2">
              {boxes.map((box) => {
                const loc = collection.phase3.boxLocations.find(bl => bl.boxId === box.id);
                return (
                  <div
                    key={box.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-bold">
                        {box.boxCode}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          Caixa do conjunto
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {loc
                            ? `Posição: ${loc.location.room} · ${loc.location.rack} · ${loc.location.shelf} (${loc.location.boxSlot || 'Vão'})`
                            : 'Aguardando alocação na estante'}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold ${
                      loc
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                      {loc ? 'Alocada na Estante' : 'Pendente de Leitura'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Fila de Curadoria (§6, §12) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Fila de Espera para Curadoria
              </h4>
              <span className="font-mono text-slate-400 font-semibold">
                {curationQueue.length} aguardando
              </span>
            </div>

            <p className="text-slate-500 leading-relaxed text-[11px]">
              Conjuntos secos e guardados temporariamente aguardando convocação para a mesa de montagem na Sala de Estudos.
            </p>

            <div className="space-y-2">
              {curationQueue.map((col) => (
                <div
                  key={col.nic}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-bold font-mono text-slate-900 dark:text-white block">
                      {col.nic}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Caixas: {col.phase1.preliminaryBoxes.length}
                    </span>
                  </div>

                  {onSelectCollectionToCurate && (
                    <button
                      onClick={() => onSelectCollectionToCurate(col.nic)}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-[11px] flex items-center gap-1"
                    >
                      <span>Curar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
              A convocação transfere a custódia para a Dra. Helena (Curadora).
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Assinatura da Fase 3 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Assinatura Técnica de Acondicionamento — Fase 3
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Ao assinar, você confirma que todas as caixas de {collection.nic} estão fisicamente acomodadas em suas respectivas estantes e prateleiras da Sala B-10, liberando o conjunto para a fila de Curadoria da Fase 4.
            </p>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignPhase}
                disabled={signing}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Liberar Fase 4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
