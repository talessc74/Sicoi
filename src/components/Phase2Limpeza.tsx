import React, { useState } from 'react';
import { OsteologicalCollection, UserProfile, CleaningSession } from '../types/sgccco';
import { VoiceHandsFreeBar } from './VoiceHandsFreeBar';
import { PopConversationalConductor } from './PopConversationalConductor';
import { POP_PHASE_2_STEPS } from '../services/voiceAgent';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { Droplet, Wind, Clock, CheckCircle2, AlertTriangle, Sparkles, Camera, ShieldCheck, Bot, FileText } from 'lucide-react';

interface Phase2LimpezaProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase2Limpeza: React.FC<Phase2LimpezaProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  laboratoryMode
}) => {
  const [interactionMode, setInteractionMode] = useState<'conversacional' | 'formulario'>('conversacional');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedBoxId, setSelectedBoxId] = useState(collection.phase1.preliminaryBoxes[0]?.id || '');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);

  const phaseSignature = collection.signatures.find(s => s.phaseNumber === 2);
  const isLocked = phaseSignature?.status === 'locked';
  const isTechnician = currentUser.role === 'tecnico';

  const popSteps = POP_PHASE_2_STEPS;
  const activeStep = popSteps[currentStepIndex] || popSteps[0];

  const boxes = collection.phase1.preliminaryBoxes;
  const allBoxesDry = boxes.length > 0 && boxes.every(b => b.cleaningStatus === 'seca');

  const handleUpdateBoxStatus = (boxId: string, newStatus: typeof boxes[0]['cleaningStatus']) => {
    const updated = { ...collection };
    const targetBox = updated.phase1.preliminaryBoxes.find(b => b.id === boxId);
    if (targetBox) {
      targetBox.cleaningStatus = newStatus;
      if (newStatus === 'em_secagem' && !targetBox.dryingStartedAt) {
        targetBox.dryingStartedAt = new Date().toISOString();
        targetBox.dryingDurationHours = 0;
      } else if (newStatus === 'seca') {
        if (!targetBox.dryingDurationHours) targetBox.dryingDurationHours = 72;
      }
    }

    // Check if all are dry
    const allDry = updated.phase1.preliminaryBoxes.every(b => b.cleaningStatus === 'seca');
    updated.phase2.dryingConfirmationAllBoxes = allDry;
    if (allDry) {
      updated.phase2.dryingConfirmedAt = new Date().toISOString();
      updated.phase2.dryingConfirmedBy = currentUser.name;
    }

    onUpdateCollection(updated);
  };

  const handleStepExtracted = (extractedData: Record<string, any>, transcript: string) => {
    const updated = { ...collection };
    if (extractedData.methodUsed) {
      const newSession: CleaningSession = {
        id: `cln-${Date.now()}`,
        boxId: selectedBoxId || boxes[0]?.id || 'CX-01',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        finishedAt: new Date().toISOString(),
        methodUsed: extractedData.methodUsed,
        waterTemperatureC: extractedData.waterTemperatureC || 24,
        operatorName: currentUser.name,
        observations: {
          value: extractedData.observations || transcript,
          isAiSuggested: true,
          transcriptSnippet: transcript
        },
        photos: []
      };
      updated.phase2.cleaningSessions = [...updated.phase2.cleaningSessions, newSession];
      // Mark current box as clean or drying
      handleUpdateBoxStatus(selectedBoxId || boxes[0]?.id, 'em_secagem');
    }

    if (extractedData.dryingConfirmed) {
      handleUpdateBoxStatus(selectedBoxId || boxes[0]?.id, 'seca');
    }

    onUpdateCollection(updated);
  };

  const handleSignPhase = async () => {
    setSigning(true);
    const timestamp = new Date().toISOString();
    const payload = generateSignaturePayload({
      nic: collection.nic,
      phaseNumber: 2,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(collection.phase2)
    });
    const hash = await calculateSha256(payload);

    const updated = { ...collection };
    updated.signatures = [
      ...updated.signatures.filter(s => s.phaseNumber !== 2),
      {
        phaseNumber: 2,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked'
      }
    ];
    if (updated.currentPhase < 3) {
      updated.currentPhase = 3;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <Droplet className="w-4 h-4" />
              <span>Fase 2 · Limpeza até Secagem (Formulário A.2)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {collection.nic}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Controle de maceração, lavagem mecânica e secagem completa das caixas. Trava sequencial ativa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fase 2 Assinada & Concluída</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={!allBoxesDry || !isTechnician}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={!allBoxesDry ? 'Todas as caixas devem estar com status "Seca" para liberar a assinatura.' : ''}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinar Término de Secagem</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de Modo de Interação no POP-02: Conversa vs Formulário */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setInteractionMode('conversacional')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              interactionMode === 'conversacional'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-sky-500" />
            <span>Condutor do POP-02 (Interação via Conversa)</span>
            <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono px-2 py-0.5 rounded-full font-bold">
              Modo Recomendado
            </span>
          </button>

          <button
            onClick={() => setInteractionMode('formulario')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              interactionMode === 'formulario'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Ficha Técnica Convencional (Formulário A.2)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-3 hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>POP-SENASP-02 · Limpeza & Secagem Controlada</span>
        </div>
      </div>

      {/* MODO CONVERSACIONAL */}
      {interactionMode === 'conversacional' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PopConversationalConductor
              collection={collection}
              currentUser={currentUser}
              phaseNumber={2}
              onUpdateCollection={onUpdateCollection}
              isLocked={isLocked}
            />
          </div>

          {/* Resumo Lateral do Status de Limpeza e Caixas */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Status de Secagem (Ao Vivo)
                </h4>
                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Fase 2
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                  Caixas em Limpeza / Secagem:
                </span>
                {boxes.map((box) => (
                  <div
                    key={box.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{box.boxCode}</div>
                      <div className="text-[10px] text-slate-500">{box.presumedIndividualLabel}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        box.cleaningStatus === 'seca'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : box.cleaningStatus === 'em_secagem'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {box.cleaningStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Todas as Caixas Secas:</span>
                  <span className={`font-bold ${allBoxesDry ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {allBoxesDry ? 'SIM (100% Conforme)' : 'NÃO (Pendente)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sessões de Limpeza:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {collection.phase2.cleaningSessions.length} registrada(s)
                  </span>
                </div>
              </div>

              <div className="pt-2">
                {isLocked ? (
                  <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    ✓ Fase 2 Assinada
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignModal(true)}
                    disabled={!allBoxesDry || !isTechnician}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Concluir e Assinar Fase 2</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODO FORMULÁRIO CONVENCIONAL */
        <>
          {/* POP Guiado por Voz */}
          {!isLocked && (
            <VoiceHandsFreeBar
              currentStep={activeStep}
              totalSteps={popSteps.length}
              onStepExtracted={handleStepExtracted}
              onNextStep={() => setCurrentStepIndex((currentStepIndex + 1) % popSteps.length)}
              isLocked={isLocked}
            />
          )}

          {/* Grid: Acompanhamento por Caixa + Registro de Manuseio */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status das Caixas e Secagem */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Wind className="w-4 h-4 text-amber-500" />
                Status de Limpeza e Secagem por Caixa
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {boxes.filter(b => b.cleaningStatus === 'seca').length} de {boxes.length} caixas secas
              </span>
            </div>

            <div className="space-y-3">
              {boxes.map((box) => (
                <div
                  key={box.id}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedBoxId === box.id
                      ? 'border-sky-500 bg-sky-50/20 dark:bg-sky-950/20 ring-1 ring-sky-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                  }`}
                  onClick={() => setSelectedBoxId(box.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {box.boxCode}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {box.presumedIndividualLabel}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold uppercase ${
                      box.cleaningStatus === 'seca'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : box.cleaningStatus === 'em_secagem'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {box.cleaningStatus === 'seca' ? 'Seca (Liberada)' : box.cleaningStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Tempo em secagem: {box.dryingDurationHours || 0} horas
                    </span>
                    <span>QR: {box.qrCode}</span>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400 mr-1">Alterar status:</span>
                      <button
                        onClick={() => handleUpdateBoxStatus(box.id, 'em_limpeza')}
                        className={`px-2 py-1 rounded text-[10px] font-medium border ${box.cleaningStatus === 'em_limpeza' ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-900'}`}
                      >
                        Em Limpeza
                      </button>
                      <button
                        onClick={() => handleUpdateBoxStatus(box.id, 'em_secagem')}
                        className={`px-2 py-1 rounded text-[10px] font-medium border ${box.cleaningStatus === 'em_secagem' ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-900'}`}
                      >
                        Em Secagem
                      </button>
                      <button
                        onClick={() => handleUpdateBoxStatus(box.id, 'seca')}
                        className={`px-2 py-1 rounded text-[10px] font-medium border ${box.cleaningStatus === 'seca' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900'}`}
                      >
                        Marcar como Seca
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sessões de Limpeza Registradas (Formulário A.2) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <Droplet className="w-4 h-4 text-sky-600" />
              Sessões de Trabalho de Limpeza ({collection.phase2.cleaningSessions.length})
            </h3>

            {collection.phase2.cleaningSessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nenhuma sessão registrada. Utilize o POP de voz acima para narrar o procedimento de limpeza da caixa.
              </p>
            ) : (
              <div className="space-y-3">
                {collection.phase2.cleaningSessions.map((session) => (
                  <div key={session.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs space-y-1.5">
                    <div className="flex justify-between items-center font-mono">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Método: {session.methodUsed.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-slate-500">
                        Temp: {session.waterTemperatureC}°C
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {session.observations.value}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <span>Operador: {session.operatorName}</span>
                      <span>Caixa: {session.boxId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Regras de Bloqueio e Manuseio */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4>Critério de Bloqueio Sequencial (§6)</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              O material só pode avançar para a Fase 3 (Acondicionamento Provisório) após confirmação inequívoca de que todas as peças ósseas estão completamente secas, evitando proliferação fúngica no armazenamento.
            </p>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Total de Caixas:</span>
                <span className="font-bold text-slate-900 dark:text-white">{boxes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Caixas Secas:</span>
                <span className={`font-bold ${allBoxesDry ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {boxes.filter(b => b.cleaningStatus === 'seca').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pronto para Fase 3:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {allBoxesDry ? 'SIM (Apto)' : 'NÃO (Aguardando secagem)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Modal de Assinatura da Fase 2 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Assinatura Técnica de Secagem — Fase 2
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Eu, {currentUser.name}, técnico responsável, atesto que todas as caixas do conjunto {collection.nic} passaram pelo procedimento de limpeza A.2 e que o material ósseo encontra-se plenamente seco e pronto para armazenamento provisório.
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
                <span>Confirmar e Gerar Hash SHA-256</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
