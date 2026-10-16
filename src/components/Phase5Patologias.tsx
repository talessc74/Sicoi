import React, { useState } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  BonePathology,
  ComplementaryExam
} from '../types/sgccco';
import { DicomViewer } from './DicomViewer';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canPerformRole, canSignAsTechnician } from '../utils/permissions';
import {
  Activity,
  Layers,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Box,
  Plus,
  UserCheck
} from 'lucide-react';

interface Phase5PatologiasProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase5Patologias: React.FC<Phase5PatologiasProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  laboratoryMode
}) => {
  const [activeTab, setActiveTab] = useState<'patologias' | 'exames' | 'marcacao' | 'checklist'>('patologias');
  const [activeDicomExam, setActiveDicomExam] = useState<ComplementaryExam | null>(null);
  const [showAddPathologyModal, setShowAddPathologyModal] = useState(false);
  const [pathologyCategory, setPathologyCategory] = useState('trauma_antemortem');
  const [pathologyTerm, setPathologyTerm] = useState('Fratura consolidada com calo ósseo');
  const [pathologyElement, setPathologyElement] = useState('FEM-D');
  const [pathologyNotes, setPathologyNotes] = useState('');
  const [isUncataloged, setIsUncataloged] = useState(false);
  const [uncatalogedJustification, setUncatalogedJustification] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'curador' | 'tecnico'>('curador');

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 5);
  const isLocked = phaseSignature?.status === 'locked';

  const isCurator = currentUser.role === 'curador';
  // Acesso aos checklists físicos (marcação, embalagem) — o Pesquisador tem o
  // mesmo acesso do Técnico aqui (decisão de acesso out/2026). Diferente da
  // assinatura física abaixo, que continua exclusiva de Técnico/Curador —
  // decisivo nesta fase, já que agora é ELA SOZINHA que trava e avança a fase.
  const canActAsTechnician = canPerformRole(currentUser.role, 'tecnico');
  const canSignScientific = isCurator && !collection.phase5.curatorScientificSign;
  // A assinatura física que trava e avança a fase é exclusiva de Técnico/
  // Curador — o Pesquisador pode registrar sua própria confirmação separada
  // (ver handleConfirmResearcherReview), nunca esta assinatura (correção: "o
  // técnico é obrigatório, o pesquisador pode ou não").
  const canSignPhysical = canSignAsTechnician(currentUser) && !collection.phase5.technicianPhysicalSign;

  const pathologies = collection.phase5.pathologies || [];
  const exams = collection.phase5.complementaryExams || collection.phase5.exams || [];
  const marking = collection.phase5.physicalBoneMarking || {
    techniqueUsed: 'Tinta nanquim impermeável sobre Paraloid B-72',
    completed: false,
    elementsMarkedCount: 0
  };
  const packaging = collection.phase5.finalPackagingInertMaterial || {
    materialUsed: 'Berços de Ethafoam e papel pH neutro',
    boxesCompletedCount: 0
  };
  const checklist = collection.phase5.phase5Checklist || {
    pathologiesReviewed: false,
    examsAttached: false,
    finalPhotosRegistered: false,
    boneMarkingCompleted: false,
    inertPackagingCompleted: false
  };

  const handleAddPathology = () => {
    const newPath: BonePathology = {
      id: `pat-${Date.now()}`,
      category: pathologyCategory,
      termControlled: isUncataloged ? 'NÃO CATALOGADO' : pathologyTerm,
      isUncataloged,
      uncatalogedJustification: isUncataloged ? uncatalogedJustification : undefined,
      associatedElementCode: pathologyElement,
      elementName: pathologyElement,
      associatedIndividualId: collection.phase4.individuals[0]?.id,
      notes: pathologyNotes,
      description: pathologyNotes,
      taxonomyLabel: isUncataloged ? 'NÃO CATALOGADO' : pathologyTerm,
      metricPhotos: []
    };

    const updated = { ...collection };
    updated.phase5.pathologies = [...pathologies, newPath];
    onUpdateCollection(updated);
    setShowAddPathologyModal(false);
    setPathologyNotes('');
    setIsUncataloged(false);
  };

  const handleToggleChecklist = (key: keyof typeof checklist) => {
    const updated = { ...collection };
    const currentChecklist = updated.phase5.phase5Checklist || {
      pathologiesReviewed: false,
      examsAttached: false,
      finalPhotosRegistered: false,
      boneMarkingCompleted: false,
      inertPackagingCompleted: false
    };
    (currentChecklist as any)[key] = !(currentChecklist as any)[key];
    updated.phase5.phase5Checklist = currentChecklist;
    onUpdateCollection(updated);
  };

  const handleUpdateMarking = (technique: string, completed: boolean) => {
    const updated = { ...collection };
    updated.phase5.physicalBoneMarking = {
      techniqueUsed: technique,
      completed,
      completedBy: currentUser.name,
      completedAt: new Date().toISOString(),
      elementsMarkedCount: updated.phase4.skeletalElements.length
    };
    if (!updated.phase5.phase5Checklist) {
      updated.phase5.phase5Checklist = { ...checklist };
    }
    updated.phase5.phase5Checklist.boneMarkingCompleted = completed;
    onUpdateCollection(updated);
  };

  const handleUpdatePackaging = (material: string, completed: boolean) => {
    const updated = { ...collection };
    updated.phase5.finalPackagingInertMaterial = {
      materialUsed: material,
      boxesCompletedCount: updated.phase1.preliminaryBoxes.length,
      packedBy: currentUser.name,
      packedAt: new Date().toISOString()
    };
    if (!updated.phase5.phase5Checklist) {
      updated.phase5.phase5Checklist = { ...checklist };
    }
    updated.phase5.phase5Checklist.inertPackagingCompleted = completed;
    onUpdateCollection(updated);
  };

  // Deterministic Checklist Progress (§15)
  const checklistTotal = 5;
  const checklistChecked = [
    checklist.pathologiesReviewed,
    checklist.examsAttached,
    checklist.finalPhotosRegistered,
    checklist.boneMarkingCompleted,
    checklist.inertPackagingCompleted
  ].filter(Boolean).length;
  const isChecklist100 = checklistChecked === checklistTotal;

  const handleSignPhase = async () => {
    if ((signatureTarget === 'curador' && !canSignScientific) ||
        (signatureTarget === 'tecnico' && !canSignPhysical)) return;
    setSigning(true);
    const timestamp = new Date().toISOString();
    const signPayload = (phase5Data: typeof collection.phase5) =>
      generateSignaturePayload({
        nic: collection.nic,
        phaseNumber: 5,
        signedBy: currentUser.id,
        role: currentUser.role,
        timestamp,
        dataSnapshotJson: JSON.stringify(phase5Data)
      });
    // Hash da confirmação individual (curador ou técnico), sobre a fase antes dela.
    const hash = await calculateSha256(signPayload(collection.phase5));

    const partialSign = { signedByName: currentUser.name, signedAt: timestamp, sha256Hash: hash };
    const updated = {
      ...collection,
      phase5: {
        ...collection.phase5,
        ...(signatureTarget === 'curador' ? { curatorScientificSign: partialSign } : { technicianPhysicalSign: partialSign })
      }
    };

    // Decisão de acesso (out/2026): a Fase 5 não é mais travada pela ausência da
    // confirmação do Curador — trava e avança com a confirmação física sozinha
    // (Técnico, ou o próprio Curador atuando como técnico — nunca o Pesquisador,
    // que tem acesso à fase mas não a esta assinatura; ver canSignAsTechnician).
    // A confirmação científica do Curador continua podendo ser registrada, mas
    // é opcional: nunca bloqueia o fechamento, e sozinha também não trava a fase.
    const hasTechSign = Boolean(updated.phase5.technicianPhysicalSign);

    if (hasTechSign) {
      // O lacre da fase é calculado sobre o estado FINAL, já com as duas confirmações,
      // que é o que fica gravado.
      const phaseHash = await calculateSha256(signPayload(updated.phase5));
      updated.signatures = [
        ...updated.signatures.map((s) => (s.phaseNumber === 5 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
        {
          phaseNumber: 5,
          signedBy: currentUser.id,
          signedByName: currentUser.name,
          signedByRole: currentUser.role,
          signedAt: timestamp,
          sha256Hash: phaseHash,
          status: 'locked'
        }
      ];
      if (updated.currentPhase < 6) {
        updated.currentPhase = 6;
      }
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  // Confirmação opcional do Pesquisador — nunca trava nem destrava nada, nunca
  // substitui a assinatura física do Técnico/Curador acima. Ainda mais
  // decisivo nesta fase, já que a física sozinha agora trava e avança tudo.
  const handleConfirmResearcherReview = async () => {
    const timestamp = new Date().toISOString();
    const hash = await calculateSha256(`researcher-review|phase5|${collection.nic}|${currentUser.id}|${timestamp}`);
    onUpdateCollection({
      ...collection,
      phase5: {
        ...collection.phase5,
        researcherConfirmation: { confirmedByName: currentUser.name, confirmedAt: timestamp, sha256Hash: hash }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono text-xs font-semibold uppercase">
              <Activity className="w-4 h-4" />
              <span>Fase 5 · Alterações Ósseas, Exames Complementares & Marcação Física</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {collection.nic}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Registro das lesões ósseas, DICOM integrado, marcação em nanquim/Paraloid e checklist de liberação para o Galpão.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentUser.role === 'pesquisador' && !isLocked && (
              collection.phase5.researcherConfirmation ? (
                <div className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 flex items-center gap-2 text-xs font-mono text-sky-700 dark:text-sky-300 font-semibold">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Revisão do Pesquisador confirmada</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmResearcherReview}
                  title="Confirmação opcional — não trava nem substitui a assinatura física do Técnico/Curador."
                  className="px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirmar Revisão (Pesquisador)</span>
                </button>
              )
            )}

            {isLocked ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fase 5 Assinada & Travada</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSignatureTarget(canSignScientific ? 'curador' : 'tecnico');
                  setShowSignModal(true);
                }}
                disabled={!isChecklist100 || (!canSignScientific && !canSignPhysical)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={!isChecklist100 ? 'O checklist determinístico deve estar 100% concluído para permitir a assinatura.' : ''}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Assinar Fechamento da Fase 5</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('patologias')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'patologias'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Alterações Ósseas & Traumas ({pathologies.length})
          </button>
          <button
            onClick={() => setActiveTab('exames')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'exames'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Exames & DICOM ({exams.length})
          </button>
          <button
            onClick={() => setActiveTab('marcacao')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'marcacao'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Marcação Física & Embalagem
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'checklist'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Checklist Determinístico ({checklistChecked}/{checklistTotal})
          </button>
        </div>
      </div>

      {/* DICOM Viewer Modal se ativado */}
      {activeDicomExam && (
        <div className="mb-6">
          <DicomViewer exam={activeDicomExam} onClose={() => setActiveDicomExam(null)} />
        </div>
      )}

      {/* Aba 1: Alterações Ósseas & Traumas */}
      {activeTab === 'patologias' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" />
                Catálogo de Alterações Ósseas, Traumas e Alterações Tafonômicas (§9)
              </h3>
              <p className="text-xs text-slate-500">
                Taxonomia controlada DITEC com suporte a registro não catalogado justificado.
              </p>
            </div>
            {!isLocked && (
              <button
                onClick={() => setShowAddPathologyModal(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Lesão / Patologia</span>
              </button>
            )}
          </div>

          {pathologies.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Nenhuma patologia registrada no conjunto.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pathologies.map((p) => {
                const label = p.termControlled || p.taxonomyLabel || 'Alteração Óssea';
                const cat = p.category || (p.taxonomyCode ? p.taxonomyCode.split('_')[0] : 'Geral');
                const desc = p.notes || p.description || 'Sem descrição cadastrada.';
                const elem = p.associatedElementCode || p.elementName || 'Elemento';

                return (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        {cat.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {desc}
                    </p>
                    <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <span>Elemento: {elem}</span>
                      <span>Indivíduo: IND-01</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Aba 2: Exames Complementares & DICOM */}
      {activeTab === 'exames' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Exames Complementares e Tomografias DICOM (§16)
              </h3>
              <p className="text-xs text-slate-500">
                Parâmetros normalizados extraídos diretamente dos metadados da imagem tomográfica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((ex: ComplementaryExam) => (
              <div key={ex.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white font-mono block">
                      {ex.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Tipo: {ex.examType.toUpperCase()} · Cortes: {ex.dicomMetadata?.slicesCount || 1}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveDicomExam(ex)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1"
                  >
                    <span>Abrir DICOM</span>
                  </button>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>kVp do Tubo:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{ex.parametersExtractedByMethodPrepop.kVp || 120} kV</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Espessura do Corte:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{ex.parametersExtractedByMethodPrepop.sliceThicknessMm || 0.625} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Densidade Óssea Média:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{ex.parametersExtractedByMethodPrepop.hounsfieldMean || 1150} HU</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aba 3: Marcação Física & Embalagem */}
      {activeTab === 'marcacao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Marcação óssea permanente */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Tag className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Marcação Óssea Física Permanente (§10)
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              O técnico deve registrar que cada osso recebeu a marcação com o número COI oficial utilizando técnica museológica padrão (tinta nanquim impermeável sobre base protetora de resina acrílica Paraloid B-72).
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Técnica Recomendada:</span>
                <span className="font-bold text-slate-900 dark:text-white">{marking.techniqueUsed}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Elementos Marcados:</span>
                <span className="font-bold text-slate-900 dark:text-white">{marking.elementsMarkedCount} peças</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Status da Marcação:</span>
                <span className={`font-bold ${marking.completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {marking.completed ? 'CONCLUÍDA' : 'PENDENTE'}
                </span>
              </div>
            </div>

            {!isLocked && canActAsTechnician && (
              <button
                onClick={() => handleUpdateMarking('Tinta nanquim preta sobre camada protetora de Paraloid B-72 a 20%', !marking.completed)}
                className={`w-full py-2.5 rounded-xl font-medium transition-colors ${
                  marking.completed ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-amber-600 text-white'
                }`}
              >
                {marking.completed ? 'Desmarcar Conclusão' : 'Atestar Marcação Física Concluída'}
              </button>
            )}
          </div>

          {/* Acondicionamento Definitivo com Material Inerte */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Box className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Acondicionamento Definitivo Inerte
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Disposição final dos ossos em berços de espuma de polietileno expandido (Ethafoam) e papel de pH neutro, prevenindo atrito durante o transporte e estocagem.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Material de Amortecimento:</span>
                <span className="font-bold text-slate-900 dark:text-white">{packaging.materialUsed}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Caixas Embaladas:</span>
                <span className="font-bold text-slate-900 dark:text-white">{packaging.boxesCompletedCount}</span>
              </div>
            </div>

            {!isLocked && canActAsTechnician && (
              <button
                onClick={() => handleUpdatePackaging('Berços de espuma de polietileno expandido (Ethafoam) e envelopes de papel alcalino neutro', true)}
                className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-medium hover:bg-sky-500 transition-colors"
              >
                Atestar Embalagem Inerte Concluída
              </button>
            )}
          </div>
        </div>
      )}

      {/* Aba 4: Checklist Determinístico de Completude (§15) */}
      {activeTab === 'checklist' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                Checklist Determinístico de Completude — Fase 5 (§15)
              </h3>
              <p className="text-slate-500">
                A liberação da Fase 6 (Armazenamento Definitivo) exige 100% dos itens validados e dupla assinatura.
              </p>
            </div>
            <div className="text-right font-mono">
              <span className={`text-base font-bold ${isChecklist100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {checklistChecked} / {checklistTotal}
              </span>
              <span className="text-slate-400 block text-[10px]">
                {isChecklist100 ? 'PRONTO PARA GALPÃO' : 'PENDÊNCIAS EM ABERTO'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { key: 'pathologiesReviewed', title: '1. Revisão e homologação curatorial de patologias e traumas', desc: 'Curadora revisou lesões patológicas e traumas perimortem.' },
              { key: 'examsAttached', title: '2. Vinculação de exames complementares (DICOM / DNA)', desc: 'Imagens tomográficas e parâmetros de método anexados.' },
              { key: 'finalPhotosRegistered', title: '3. Registro de fotografias finais com escala métrica', desc: 'Registros fotográficos de norma anterior, lateral e detalhes anatômicos.' },
              { key: 'boneMarkingCompleted', title: '4. Marcação óssea física com tinta nanquim / Paraloid B-72', desc: 'Técnico atestou marcação em todas as peças principais.' },
              { key: 'inertPackagingCompleted', title: '5. Acondicionamento com espuma inerte e papel neutro', desc: 'Técnico atestou proteção mecânica e química das peças nas caixas.' }
            ].map(item => {
              const checked = Boolean((checklist as any)[item.key]);
              return (
                <div
                  key={item.key}
                  onClick={() => !isLocked && handleToggleChecklist(item.key as any)}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                    checked
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block font-sans">
                      {item.title}
                    </span>
                    <span className="text-slate-500 text-[11px] leading-tight block">
                      {item.desc}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status da Dupla Assinatura (§7) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px] block">
                Assinatura 1: Curador (Científica)
              </span>
              {collection.phase5.curatorScientificSign ? (
                <div className="text-emerald-600 font-mono text-[11px]">
                  ✓ Assinado por {collection.phase5.curatorScientificSign.signedByName}
                </div>
              ) : (
                <span className="text-amber-600 font-mono text-[11px]">Aguardando assinatura da Curadora</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px] block">
                Assinatura 2: Técnico ou Curador (Física / Embalagem)
              </span>
              {collection.phase5.technicianPhysicalSign ? (
                <div className="text-emerald-600 font-mono text-[11px]">
                  ✓ Assinado por {collection.phase5.technicianPhysicalSign.signedByName}
                </div>
              ) : (
                <span className="text-amber-600 font-mono text-[11px]">Aguardando confirmação física</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Patologia */}
      {showAddPathologyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              Adicionar Patologia ou Lesão Traumática
            </h4>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoria Geral:
              </label>
              <select
                value={pathologyCategory}
                onChange={(e) => setPathologyCategory(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="trauma_antemortem">Trauma Ante-Mortem (Calo/Remodelado)</option>
                <option value="trauma_perimortem">Trauma Peri-Mortem (Fratura em Osso Fresco)</option>
                <option value="doenca_infecciosa">Doença Infecciosa (Periostite/Osteomielite)</option>
                <option value="doenca_articular_degenerativa">Doença Articular Degenerativa (Osteoartrite)</option>
                <option value="tafonomia">Alteração Tafonômica (Raízes/Intempérie)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Elemento Anatômico:
              </label>
              <select
                value={pathologyElement}
                onChange={(e) => setPathologyElement(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              >
                {collection.phase4.skeletalElements.map(el => (
                  <option key={el.id} value={el.anatomicalCode}>{el.anatomicalCode} — {el.namePt}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="uncat"
                checked={isUncataloged}
                onChange={(e) => setIsUncataloged(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="uncat" className="font-semibold text-rose-600 dark:text-rose-400">
                Termo Não Catalogado (Exige Justificativa Obrigatória §9)
              </label>
            </div>

            {isUncataloged ? (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justificativa Técnica do Termo Não Catalogado:
                </label>
                <textarea
                  rows={2}
                  value={uncatalogedJustification}
                  onChange={(e) => setUncatalogedJustification(e.target.value)}
                  placeholder="Justifique a especificidade nosográfica não contemplada no catálogo padrão..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Termo Padronizado:
                </label>
                <input
                  type="text"
                  value={pathologyTerm}
                  onChange={(e) => setPathologyTerm(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descrição e Observações Antropológicas:
              </label>
              <textarea
                rows={2}
                value={pathologyNotes}
                onChange={(e) => setPathologyNotes(e.target.value)}
                placeholder="Detalhes macroscópicos da lesão..."
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddPathologyModal(false)}
                className="px-4 py-2 rounded-lg border"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPathology}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold"
              >
                Registrar Patologia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Assinatura de Fechamento — Fase 5
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está assinando como <strong>{currentUser.name} ({currentUser.role.toUpperCase()})</strong>. A Fase 5 trava com a confirmação física (Técnico ou Curador). A confirmação científica do Curador é opcional e não bloqueia o fechamento.
            </p>
            {canSignScientific && canSignPhysical && (
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300" htmlFor="phase5-signature-target">
                  Qual responsabilidade deseja confirmar agora?
                </label>
                <select
                  id="phase5-signature-target"
                  value={signatureTarget}
                  onChange={(event) => setSignatureTarget(event.target.value as 'curador' | 'tecnico')}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="curador">Científica (Curador)</option>
                  <option value="tecnico">Física e embalagem (Técnico ou Curador)</option>
                </select>
              </div>
            )}
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Confirmação atual: {signatureTarget === 'curador' ? 'científica' : 'física e embalagem'}.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowSignModal(false)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button
                onClick={handleSignPhase}
                disabled={signing}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Minha Assinatura</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
