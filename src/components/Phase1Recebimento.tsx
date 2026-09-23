import React, { useState } from 'react';
import { OsteologicalCollection, UserProfile, PreliminaryBox } from '../types/sgccco';
import { VoiceHandsFreeBar } from './VoiceHandsFreeBar';
import { PopConversationalConductor } from './PopConversationalConductor';
import { POP_PHASE_1_STEPS, PopStep } from '../services/voiceAgent';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { Shield, Lock, FileText, Camera, Box, CheckCircle2, AlertCircle, Sparkles, Printer, MessageSquare, Bot } from 'lucide-react';

interface Phase1RecebimentoProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase1Recebimento: React.FC<Phase1RecebimentoProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  laboratoryMode
}) => {
  const [interactionMode, setInteractionMode] = useState<'conversacional' | 'formulario'>('conversacional');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState(false);

  const phaseSignature = collection.signatures.find(s => s.phaseNumber === 1);
  const isLocked = phaseSignature?.status === 'locked';

  // Permission check: restricted legal data visible ONLY to Curador & Admin
  const canViewRestrictedLegal = currentUser.role === 'curador' || currentUser.role === 'administrador';
  const isTechnician = currentUser.role === 'tecnico';

  const popSteps = POP_PHASE_1_STEPS;
  const activeStep = popSteps[currentStepIndex] || popSteps[0];

  const handleStepExtracted = (extractedData: Record<string, any>, transcript: string) => {
    const updated = { ...collection };
    const p1 = updated.phase1;

    if (extractedData.receivedBagsCount !== undefined) {
      p1.receivedBagsCount = {
        value: extractedData.receivedBagsCount,
        isAiSuggested: true,
        transcriptSnippet: transcript
      };
    }
    if (extractedData.bagSealNumbers) {
      p1.bagSealNumbers = {
        value: extractedData.bagSealNumbers,
        isAiSuggested: true,
        transcriptSnippet: transcript
      };
    }
    if (extractedData.initialConditionNotes) {
      p1.initialConditionNotes = {
        value: extractedData.initialConditionNotes,
        isAiSuggested: true,
        transcriptSnippet: transcript
      };
    }
    if (extractedData.apparentMni !== undefined) {
      p1.apparentMni = {
        value: extractedData.apparentMni,
        isAiSuggested: true,
        transcriptSnippet: transcript
      };
    }
    if (extractedData.preliminaryBonesNoted) {
      p1.preliminaryBonesNoted = {
        value: extractedData.preliminaryBonesNoted,
        isAiSuggested: true,
        transcriptSnippet: transcript
      };
    }

    onUpdateCollection(updated);
  };

  const handleTakeStepPhoto = async () => {
    const photoId = `photo-p1-${Date.now()}`;
    const hash = await calculateSha256(`PHOTO-${photoId}-${Date.now()}`);
    const newPhoto = {
      id: photoId,
      stepNumber: activeStep.stepNumber,
      description: activeStep.photoPrompt || 'Registro fotográfico preliminar de triagem',
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      sha256Hash: hash,
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80'
    };

    const updated = { ...collection };
    updated.phase1.initialPhotos = [...updated.phase1.initialPhotos, newPhoto];
    onUpdateCollection(updated);
  };

  const handleConfirmAiField = (fieldKey: keyof typeof collection.phase1) => {
    const updated = { ...collection };
    const field = updated.phase1[fieldKey] as any;
    if (field && typeof field === 'object' && 'isAiSuggested' in field) {
      field.isAiSuggested = false;
      field.reviewedBy = currentUser.name;
      field.reviewedAt = new Date().toISOString();
      onUpdateCollection(updated);
    }
  };

  const handleAddBox = () => {
    const count = collection.phase1.preliminaryBoxes.length + 1;
    const letter = String.fromCharCode(64 + count);
    const newBox: PreliminaryBox = {
      id: `CX-${collection.nic}-${letter}`,
      boxCode: `CX-${collection.nic.split('-')[2]}-${letter}`,
      presumedIndividualLabel: `Indivíduo Presumido ${letter}`,
      currentLocation: 'Bancada de Triagem e Recepção Inicial',
      qrCode: `SGCCCO://BOX/CX-${collection.nic}-${letter}`,
      cleaningStatus: 'pendente'
    };
    const updated = { ...collection };
    updated.phase1.preliminaryBoxes = [...updated.phase1.preliminaryBoxes, newBox];
    onUpdateCollection(updated);
  };

  const handleSignPhase = async () => {
    setSigning(true);
    const timestamp = new Date().toISOString();
    const payload = generateSignaturePayload({
      nic: collection.nic,
      phaseNumber: 1,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(collection.phase1)
    });
    const hash = await calculateSha256(payload);

    const updated = { ...collection };
    updated.signatures = [
      ...updated.signatures.filter(s => s.phaseNumber !== 1),
      {
        phaseNumber: 1,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked'
      }
    ];
    if (updated.currentPhase < 2) {
      updated.currentPhase = 2;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  // Validation rules for signing Phase 1
  const hasDeliveryDoc = Boolean(collection.phase1.deliveryDocumentNumber.value);
  const hasBags = collection.phase1.receivedBagsCount.value > 0;
  const hasBoxes = collection.phase1.preliminaryBoxes.length > 0;
  const hasPhotos = collection.phase1.initialPhotos.length > 0;
  const canSign = hasDeliveryDoc && hasBags && hasBoxes && hasPhotos && isTechnician;

  return (
    <div className="space-y-6">
      {/* Banner de Identificação e NIC */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
              Conjunto Osteológico em Entrada
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {collection.nic}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Único e Imutável
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Entrada criada em {new Date(collection.createdAt).toLocaleDateString('pt-BR')} pelo técnico {collection.createdByTechnician}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintLabel(true)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir Etiqueta QR</span>
            </button>

            {isLocked ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fase 1 Assinada & Travada</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={!canSign}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Revisar & Assinar Fase 1</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de Modo de Interação no POP: Conversa com Condutor vs Formulário A.1 */}
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
            <span>Condutor do POP (Interação via Conversa)</span>
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
            <span>Ficha Técnica Convencional (Formulário A.1)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-3 hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>POP-SENASP-01 · Condução por Diálogo & Voz</span>
        </div>
      </div>

      {/* MODO CONVERSACIONAL (Condutor do POP) */}
      {interactionMode === 'conversacional' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat do Condutor (2 colunas) */}
          <div className="lg:col-span-2">
            <PopConversationalConductor
              collection={collection}
              currentUser={currentUser}
              phaseNumber={1}
              onUpdateCollection={onUpdateCollection}
              isLocked={isLocked}
            />
          </div>

          {/* Painel Lateral: Espelho em Tempo Real dos Dados do NIC */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Espelho do NIC (Ao Vivo)
                </h4>
                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Fase 1
                </span>
              </div>

              {/* Sacos e Lacres */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                  Invólucros e Lacres:
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Total de Sacos:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {collection.phase1.receivedBagsCount.value || 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-300 block mb-1">Lacres Registrados:</span>
                  <div className="flex flex-wrap gap-1">
                    {collection.phase1.bagSealNumbers.value?.map((seal: string, idx: number) => (
                      <span key={idx} className="font-mono text-[11px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                        {seal}
                      </span>
                    )) || <span className="text-slate-400 italic">Nenhum lacre ainda</span>}
                  </div>
                </div>
              </div>

              {/* NMI e Elementos Triados */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                  Triagem e NMI Preliminar:
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">NMI Estimado:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {collection.phase1.apparentMni.value || 1} indivíduo(s)
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-300 block mb-1">Ossos Notados:</span>
                  <div className="flex flex-wrap gap-1">
                    {collection.phase1.preliminaryBonesNoted.value?.map((bone: string, idx: number) => (
                      <span key={idx} className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
                        {bone}
                      </span>
                    )) || <span className="text-slate-400 italic">Aguardando triagem</span>}
                  </div>
                </div>
              </div>

              {/* Condição Preliminar */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                  Condição e Umidade:
                </span>
                <p className="text-slate-700 dark:text-slate-300 italic text-[11px] leading-relaxed">
                  "{collection.phase1.initialConditionNotes.value || 'Ainda não descrita na conversa'}"
                </p>
              </div>

              {/* Fotos Registradas */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Evidências Fotográficas ({collection.phase1.initialPhotos.length}):
                  </span>
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {collection.phase1.initialPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {collection.phase1.initialPhotos.map((photo) => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 aspect-video">
                        <img src={photo.url} alt={photo.description} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    Nenhuma foto anexada pelo condutor ainda.
                  </div>
                )}
              </div>

              {/* Ação de Finalização e Assinatura */}
              <div className="pt-2">
                {isLocked ? (
                  <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    ✓ Fase 1 Assinada
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignModal(true)}
                    disabled={!canSign}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Concluir e Assinar Fase 1</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODO FORMULÁRIO CONVENCIONAL */
        <>
          {/* POP Guiado por Voz (Hands-Free Tablet Mode) */}
          {!isLocked && (
            <VoiceHandsFreeBar
              currentStep={activeStep}
              totalSteps={popSteps.length}
              onStepExtracted={handleStepExtracted}
              onNextStep={() => setCurrentStepIndex((currentStepIndex + 1) % popSteps.length)}
              onTakeStepPhoto={handleTakeStepPhoto}
              isLocked={isLocked}
            />
          )}

          {/* Grid Principal: Formulário A.1 + Segregação de Dados Restritos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário A.1 (Análise Preliminar) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                Formulário A.1 — Recebimento Legal e Análise Preliminar
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                POP Etapa 1 a 3
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Documento de Entrega (Guia / Ofício):
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={collection.phase1.deliveryDocumentNumber.value}
                  onChange={(e) => {
                    const updated = { ...collection };
                    updated.phase1.deliveryDocumentNumber = { value: e.target.value, isAiSuggested: false };
                    onUpdateCollection(updated);
                  }}
                  placeholder="Ex: GUIA-REMESSA-SENASP-2026/0491"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Instituição / Órgão de Origem:
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={collection.phase1.originInstitution.value}
                  onChange={(e) => {
                    const updated = { ...collection };
                    updated.phase1.originInstitution = { value: e.target.value, isAiSuggested: false };
                    onUpdateCollection(updated);
                  }}
                  placeholder="Ex: IML Regional ou Serviço Municipal"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Quantidade de Sacos Recebidos:
                </label>
                <input
                  type="number"
                  disabled={isLocked}
                  value={collection.phase1.receivedBagsCount.value || ''}
                  onChange={(e) => {
                    const updated = { ...collection };
                    updated.phase1.receivedBagsCount = { value: parseInt(e.target.value, 10) || 0, isAiSuggested: false };
                    onUpdateCollection(updated);
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                {collection.phase1.receivedBagsCount.isAiSuggested && (
                  <div className="mt-1 flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400">
                    <span>Extraído por voz: "{collection.phase1.receivedBagsCount.transcriptSnippet}"</span>
                    <button onClick={() => handleConfirmAiField('receivedBagsCount')} className="underline font-semibold ml-1">
                      Confirmar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  NMI Presumido Preliminar:
                </label>
                <input
                  type="number"
                  disabled={isLocked}
                  value={collection.phase1.apparentMni.value || ''}
                  onChange={(e) => {
                    const updated = { ...collection };
                    updated.phase1.apparentMni = { value: parseInt(e.target.value, 10) || 1, isAiSuggested: false };
                    onUpdateCollection(updated);
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Condição Preliminar das Ossadas */}
            <div className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  Condição Inicial das Peças (Umidade, Solos, Tecidos Moles):
                </label>
                {collection.phase1.initialConditionNotes.isAiSuggested && (
                  <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded font-mono">
                    sugerida_por_ia (Transcrição)
                  </span>
                )}
              </div>
              <textarea
                disabled={isLocked}
                rows={3}
                value={collection.phase1.initialConditionNotes.value}
                onChange={(e) => {
                  const updated = { ...collection };
                  updated.phase1.initialConditionNotes = { value: e.target.value, isAiSuggested: false };
                  onUpdateCollection(updated);
                }}
                placeholder="Descreva o estado físico das peças..."
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              {collection.phase1.initialConditionNotes.isAiSuggested && (
                <div className="mt-1 flex items-center justify-between text-[11px] p-2 rounded bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="italic text-slate-600 dark:text-slate-400">
                    Origem de voz: "{collection.phase1.initialConditionNotes.transcriptSnippet}"
                  </span>
                  <button
                    onClick={() => handleConfirmAiField('initialConditionNotes')}
                    className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-[10px]"
                  >
                    Confirmar Campo
                  </button>
                </div>
              )}
            </div>

            {/* Separação em Caixas Preliminares */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-amber-600" />
                    Separação em Caixas de Triagem
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Uma caixa por indivíduo presumido + elementos não associados
                  </p>
                </div>
                {!isLocked && (
                  <button
                    onClick={handleAddBox}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium hover:bg-slate-200"
                  >
                    + Adicionar Caixa
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {collection.phase1.preliminaryBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
                        {box.boxCode}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {box.presumedIndividualLabel}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          QR: {box.qrCode} · Local: {box.currentLocation}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Status: {box.cleaningStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fotografias Iniciais */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Fotografias Iniciais Obrigatórias ({collection.phase1.initialPhotos.length})
                </h4>
                {!isLocked && (
                  <button
                    onClick={handleTakeStepPhoto}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Anexar Foto</span>
                  </button>
                )}
              </div>

              {collection.phase1.initialPhotos.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>A assinatura da Fase 1 exige ao menos 1 fotografia inicial dos sacos ou da bancada.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {collection.phase1.initialPhotos.map((photo) => (
                    <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black relative group">
                      <img src={photo.url} alt={photo.description} className="w-full h-28 object-cover opacity-90 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                      <div className="p-2 bg-slate-900 text-white text-[10px] space-y-0.5">
                        <p className="truncate font-medium">{photo.description}</p>
                        <p className="font-mono text-slate-400 truncate">Hash: {photo.sha256Hash.substring(0, 12)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Segregação Estrita de Dados Legais (§7) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 text-rose-600 dark:text-rose-400">
              <Shield className="w-4 h-4" />
              <h3 className="font-bold text-xs">
                Dados Restritos de Origem Legal (§7)
              </h3>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Regra de Segurança §7: Informações de cemitério, jazigo e Declaração de Óbito ficam criptografadas e são visíveis <strong>apenas para Curador e Administrador</strong>. Nunca aparecem no QR Code, buscas, exportações nem para agentes de IA.
            </p>

            {canViewRestrictedLegal ? (
              <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                  Acesso Autorizado ({currentUser.role.toUpperCase()}):
                </span>
                <div>
                  <span className="text-slate-500 block text-[11px]">Cemitério de Origem:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {collection.legalOrigin.cemeteryName || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Jazigo / Sepultura:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {collection.legalOrigin.cemeteryPlot || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Declaração de Óbito (D.O.):</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">
                    {collection.legalOrigin.deathDeclarationNumber || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Processo Legal / Comarca:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {collection.legalOrigin.legalProcessNumber} ({collection.legalOrigin.courtDistrict})
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-100 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
                <Lock className="w-6 h-6 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  Conteúdo Criptografado & Segregado
                </p>
                <p className="text-[11px]">
                  Como técnico, você não tem privilégio de leitura dos dados de identificação civil cartorária. O cadastro é reservado à Curadoria.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Modal de Assinatura da Fase 1 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Assinatura Técnica de Fechamento — Fase 1
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Ao assinar, você atesta a conformidade da conferência dos sacos, lacres, fotos iniciais e separação das caixas. O formulário A.1 será <strong>travado</strong> e gerará o hash SHA-256 da etapa, liberando a Fase 2 (Limpeza e Secagem).
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1 font-mono text-slate-700 dark:text-slate-300 mb-4">
              <div>NIC: {collection.nic}</div>
              <div>Responsável: {currentUser.name} ({currentUser.role})</div>
              <div>Data: {new Date().toLocaleString('pt-BR')}</div>
            </div>

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

      {/* Modal de Impressão da Etiqueta QR */}
      {showPrintLabel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white font-mono">
              Etiqueta Oficial de Caixa / NIC
            </h4>
            <div className="p-6 bg-white border-2 border-slate-900 rounded-xl inline-block mx-auto text-black">
              <div className="font-bold text-lg font-mono tracking-wider">{collection.nic}</div>
              <div className="w-36 h-36 mx-auto my-2 border-2 border-slate-900 flex items-center justify-center bg-slate-50">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=SGCCCO://${collection.nic}`}
                  alt="QR Code"
                  className="w-32 h-32"
                />
              </div>
              <div className="text-[10px] font-mono uppercase font-bold">SGCCCO · SENASP / DITEC</div>
              <div className="text-[9px] font-mono text-slate-600">Entrada: {new Date(collection.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
            <p className="text-xs text-slate-500">
              Etiqueta autoadesiva para aplicação externa nas caixas de polipropileno corrugado.
            </p>
            <div className="flex justify-center gap-2 text-xs">
              <button
                onClick={() => setShowPrintLabel(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium"
              >
                Concluir Impressão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
