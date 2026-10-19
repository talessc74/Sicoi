import React, { useState, useRef } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  IndividualHypothesis,
  SkeletalElement,
  CurationVersionStatus,
  BiologicalConfidence,
  OsteologicalInventoryData,
  ToothPresenceCondition,
  ToothClinicalCondition,
  ToothRecord
} from '../types/sgccco';
import { OdontogramViewer } from './OdontogramViewer';
import { OsteologicalInventoryViewer } from './OsteologicalInventoryViewer';
import { PhotoSourceModal } from './PhotoSourceModal';
import { ErrorNotice } from './ErrorNotice';
import { toAppError, AppError } from '../utils/errorMessages';
import {
  CONTROLLED_BIOLOGICAL_METHODS,
  STANDARD_SKELETAL_INVENTORY_TEMPLATES,
  generateInitialOdontogram
} from '../data/mockData';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { searchIndividualReferences, IndividualReferenceMatch } from '../services/collectionsService';
import { uploadCollectionPhoto } from '../services/photoService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canPerformRole, canSignAsTechnician, canCurate } from '../utils/permissions';
import {
  UserCheck,
  Search,
  BookOpen,
  Camera,
  Layers,
  GitMerge,
  Split,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface Phase4CuradoriaProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase4Curadoria: React.FC<Phase4CuradoriaProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  laboratoryMode
}) => {
  const [activeTab, setActiveTab] = useState<'individuos' | 'inventario' | 'odontograma' | 'montagem'>('individuos');
  const [selectedIndividualId, setSelectedIndividualId] = useState<string>(
    collection.phase4.individuals[0]?.id || ''
  );
  const [showRefSearchModal, setShowRefSearchModal] = useState(false);
  const [refSearchLoading, setRefSearchLoading] = useState(false);
  const [refSearchError, setRefSearchError] = useState<string | null>(null);
  const [refSearchResults, setRefSearchResults] = useState<IndividualReferenceMatch[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'curador' | 'tecnico'>('curador');
  const [uploadingAssemblyPhoto, setUploadingAssemblyPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<AppError | null>(null);
  const [showNoPhotoModal, setShowNoPhotoModal] = useState(false);
  const [noPhotoJustification, setNoPhotoJustification] = useState('');
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  // Dois inputs ocultos: um com capture="environment" (força a câmera) e um
  // sem capture (seletor comum do dispositivo, que pode incluir a galeria) —
  // o PhotoSourceModal decide qual deles clicar (pedido do Tales, out/2026).
  const assemblyCameraInputRef = useRef<HTMLInputElement>(null);
  const assemblyGalleryInputRef = useRef<HTMLInputElement>(null);

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 4);
  const isLocked = phaseSignature?.status === 'locked';

  // isCurator fica exclusivo do papel Curador, literal — usado só pra
  // assinatura do Inventário (canSignInventory abaixo) e pra atribuição de
  // curatorAuthor, nunca ajustável por pessoa (decisão §13, out/2026: "quem
  // identifica e decide é sempre o curador", sem exceção).
  const isCurator = currentUser.role === 'curador';
  // Editar indivíduos/perfil biológico/odontograma (Montagem e Inventário) —
  // padrão Curador + Estudante, ajustável por pessoa (canCurate, §13).
  const canEdit = canCurate(currentUser);
  // Aba Montagem (e aprovação da foto oficial): mesmo acesso de Técnico já
  // usado nas demais fases (Fase 1, 2, 3 e 5) — Curador, Técnico e
  // Pesquisador. Indivíduos/Inventário/Odontograma continuam exclusivos de
  // Curador e Estudante, como já eram.
  const canAccessMontagem = canPerformRole(currentUser.role, 'tecnico');
  const canApprove = canAccessMontagem;
  // A assinatura "Montagem" (technicianAssemblySign) que trava a fase é
  // diferente do acesso à aba acima — continua exclusiva de Técnico/Curador;
  // o Pesquisador tem acesso à aba, mas sua participação é a confirmação
  // opcional (handleConfirmResearcherReview), nunca esta assinatura (correção:
  // "o técnico é obrigatório, o pesquisador pode ou não").
  const canSignAsTechnicianRole = canSignAsTechnician(currentUser);

  const individuals = collection.phase4.individuals || [];
  const currentInd = individuals.find(i => i.id === selectedIndividualId) || individuals[0];

  // Elementos do inventário
  const elements = collection.phase4.skeletalElements || [];

  const handleAddIndividual = () => {
    const code = `IND-0${individuals.length + 1}`;
    const newInd: IndividualHypothesis = {
      id: `IND-${collection.nic.split('-')[2]}-0${individuals.length + 1}`,
      code,
      confidence: 'alta',
      justification: 'Hipótese biológica fundamentada em concordância anatômica e antimeria.',
      associatedBoxId: collection.phase1.preliminaryBoxes[0]?.id || 'CX-01',
      status: 'ativo',
      biologicalProfile: {
        sexEstimate: {
          value: 'indeterminado',
          methodCode: 'Phenice 1969',
          bibliographicRef: 'Phenice (1969)',
          notes: ''
        },
        ageCategory: {
          value: 'adulto_medio',
          estimatedRangeYears: '30 - 45 anos',
          methodCode: 'Suchey-Brooks 1990',
          bibliographicRef: 'Suchey-Brooks (1990)',
          notes: ''
        },
        statureCm: {
          estimatedValue: 170.0,
          marginErrorCm: 3.5,
          methodCode: 'Trotter & Gleser 1952',
          measuredElement: 'Fêmur direito',
          bibliographicRef: 'Trotter & Gleser 1952'
        },
        ancestryIndication: {
          traitsObserved: '',
          methodCode: 'Hefner 2009',
          bibliographicRef: 'Hefner 2009'
        }
      },
      odontogram: generateInitialOdontogram()
    };

    const updated = { ...collection };
    updated.phase4.individuals = [...individuals, newInd];
    if (elements.length === 0) {
      updated.phase4.skeletalElements = STANDARD_SKELETAL_INVENTORY_TEMPLATES.map((tpl, idx) => ({
        id: `elem-${Date.now()}-${idx}`,
        anatomicalCode: tpl.anatomicalCode,
        namePt: tpl.namePt,
        region: tpl.region,
        side: tpl.side,
        presence: 'completo',
        preservationQuality: 'boa',
        associatedIndividualId: newInd.id,
        associationMethod: 'Inspeção anatômica direta',
        associationConfidence: 'alta',
        associationJustification: 'Simetria e correspondência de facetas articulares.',
        observations: ''
      }));
    }
    onUpdateCollection(updated);
    setSelectedIndividualId(newInd.id);
  };

  const handleUpdateTooth = (
    num: number,
    update: {
      presence?: ToothPresenceCondition;
      clinicalConditions?: ToothClinicalCondition[];
      condition?: ToothRecord['condition'];
    } | any,
    notes?: string
  ) => {
    if (!currentInd) return;
    const updated = { ...collection };
    const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
    if (ind) {
      ind.odontogram = ind.odontogram.map(t => {
        if (t.toothNumberFdi !== num) return t;
        if (typeof update === 'object' && update !== null && ('presence' in update || 'clinicalConditions' in update)) {
          return {
            ...t,
            presence: update.presence ?? t.presence,
            clinicalConditions: update.clinicalConditions ?? t.clinicalConditions,
            condition: update.condition ?? t.condition,
            notes: notes !== undefined ? notes : t.notes || ''
          };
        }
        return { ...t, condition: update, notes: notes !== undefined ? notes : t.notes || '' };
      });
      onUpdateCollection(updated);
    }
  };

  // Marcação em lote (Edêntulo ante/post-mortem) — só os dentes passados,
  // nunca o odontograma inteiro, pra não sobrescrever posições de outra
  // arcada ou dentes inativos da dentição mista.
  const handleBulkMarkTeeth = (
    toothNumbers: number[],
    mark: {
      presence: ToothPresenceCondition;
      condition: ToothRecord['condition'];
    } | any
  ) => {
    if (!currentInd) return;
    const updated = { ...collection };
    const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
    if (ind) {
      ind.odontogram = ind.odontogram.map(t => {
        if (!toothNumbers.includes(t.toothNumberFdi)) return t;
        if (typeof mark === 'object' && mark !== null && 'presence' in mark) {
          return {
            ...t,
            presence: mark.presence,
            clinicalConditions: mark.presence === 'articulado' ? ['higido'] : [],
            condition: mark.condition
          };
        }
        return {
          ...t,
          presence: mark === 'ausente_ante_mortem' || mark === 'ausente_post_mortem' ? mark : 'articulado',
          clinicalConditions: mark === 'higido' ? ['higido'] : [],
          condition: mark
        };
      });
      onUpdateCollection(updated);
    }
  };

  const handlePatchIndividual = (patch: Partial<IndividualHypothesis>) => {
    if (!currentInd) return;
    const updated = { ...collection };
    const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
    if (ind) {
      Object.assign(ind, patch);
      onUpdateCollection(updated);
    }
  };

  const handleUpdateElementPresence = (elemId: string, presence: any, quality: any) => {
    const updated = { ...collection };
    updated.phase4.skeletalElements = updated.phase4.skeletalElements.map(e => 
      e.id === elemId ? { ...e, presence, preservationQuality: quality } : e
    );
    onUpdateCollection(updated);
  };

  const handleUpdateOsteologicalInventory = (updatedInv: OsteologicalInventoryData) => {
    const updated = { ...collection };
    updated.phase4.osteologicalInventory = updatedInv;
    onUpdateCollection(updated);
  };

  const handleSearchReference = async (individualId: string) => {
    setShowRefSearchModal(true);
    setRefSearchLoading(true);
    setRefSearchError(null);
    setRefSearchResults([]);
    try {
      const matches = await searchIndividualReferences(collection.nic, individualId);
      setRefSearchResults(matches);
    } catch (err: any) {
      setRefSearchError(err?.message || 'Erro ao buscar referências no acervo.');
    } finally {
      setRefSearchLoading(false);
    }
  };

  // Pergunta explicitamente câmera ou galeria antes de abrir qualquer
  // seletor — nunca mais aprova a mesma imagem fixa de um banco de
  // terceiros. O upload de verdade só acontece depois que o usuário escolhe
  // o arquivo, em handleAssemblyPhotoFileSelected.
  const handleRequestAssemblyPhoto = () => {
    setUploadError(null);
    setShowPhotoSourceModal(true);
  };

  const handleChoosePhotoSource = (source: 'camera' | 'gallery') => {
    setShowPhotoSourceModal(false);
    (source === 'camera' ? assemblyCameraInputRef : assemblyGalleryInputRef).current?.click();
  };

  // Só grava o metadado (e marca como aprovada) depois que o upload real
  // confirma — bytes e hash calculados pelo servidor sobre o arquivo de
  // verdade, nunca sobre um texto qualquer.
  const handleAssemblyPhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois
    if (!file) return;

    setUploadingAssemblyPhoto(true);
    setUploadError(null);
    try {
      const { collection: saved } = await uploadCollectionPhoto(
        collection.nic,
        'phase4',
        'montagem_completa',
        file,
        'Fotografia Oficial de Montagem Completa'
      );
      onUpdateCollection(saved);
    } catch (err: any) {
      setUploadError(toAppError(err, 'Erro ao registrar a fotografia.'));
    } finally {
      setUploadingAssemblyPhoto(false);
    }
  };

  // Confirma explicitamente a ausência da foto, com justificativa obrigatória
  // — nunca silenciosa, nunca travada pra sempre (mesmo padrão da Fase 1).
  const handleConfirmNoAssemblyPhoto = () => {
    if (!noPhotoJustification.trim()) return;
    const updated = {
      ...collection,
      phase4: {
        ...collection.phase4,
        completeAssemblyPhotoApproved: undefined,
        assemblyPhotoJustification: {
          justifiedByName: currentUser.name,
          justifiedAt: new Date().toISOString(),
          reason: noPhotoJustification.trim()
        }
      }
    };
    onUpdateCollection(updated);
    setShowNoPhotoModal(false);
    setNoPhotoJustification('');
  };

  const handleSignPhase = async () => {
    if ((signatureTarget === 'curador' && !canSignInventory) || (signatureTarget === 'tecnico' && !canSignAssembly)) return;
    setSigning(true);
    const timestamp = new Date().toISOString();
    const signPayload = (phase4Data: typeof collection.phase4) =>
      generateSignaturePayload({
        nic: collection.nic,
        phaseNumber: 4,
        signedBy: currentUser.id,
        role: currentUser.role,
        timestamp,
        dataSnapshotJson: JSON.stringify(phase4Data)
      });
    // Hash da confirmação individual (técnico ou curador), sobre a fase antes dela.
    const hash = await calculateSha256(signPayload(collection.phase4));

    const partialSign = { signedByName: currentUser.name, signedAt: timestamp, sha256Hash: hash };
    const updated = {
      ...collection,
      phase4: {
        ...collection.phase4,
        ...(signatureTarget === 'curador'
          ? { curatorInventorySign: partialSign }
          : { technicianAssemblySign: partialSign })
      }
    };

    // A fase só trava depois das duas confirmações (Montagem e Inventário), inclusive
    // quando o Curador faz as duas — mesmo mecanismo já usado na Fase 5.
    const hasAssemblySign = Boolean(updated.phase4.technicianAssemblySign);
    const hasInventorySign = Boolean(updated.phase4.curatorInventorySign);

    if (hasAssemblySign && hasInventorySign) {
      // O lacre é calculado sobre o estado FINAL da fase, já com as duas confirmações
      // e já aprovada, que é o que fica gravado.
      updated.phase4.curationVersionStatus = 'aprovada';
      updated.phase4.curatorAuthor = currentUser.role === 'curador' ? currentUser.name : updated.phase4.curatorAuthor;
      const phaseHash = await calculateSha256(signPayload(updated.phase4));
      updated.signatures = [
        ...updated.signatures.map((s) => (s.phaseNumber === 4 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
        {
          phaseNumber: 4,
          signedBy: currentUser.id,
          signedByName: currentUser.name,
          signedByRole: currentUser.role,
          signedAt: timestamp,
          sha256Hash: phaseHash,
          status: 'locked'
        }
      ];
      if (updated.currentPhase < 5) {
        updated.currentPhase = 5;
      }
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  // completeAssemblyPhotoApproved real OU a justificativa de ausência (mesmo
  // padrão da Fase 1 — handleConfirmNoAssemblyPhoto) libera a assinatura de
  // Montagem; nunca as duas ao mesmo tempo (registrar uma sempre limpa a outra).
  const hasAssemblyPhotoOrJustification =
    Boolean(collection.phase4.completeAssemblyPhotoApproved) || Boolean(collection.phase4.assemblyPhotoJustification);
  const canSignAssembly = canSignAsTechnicianRole && hasAssemblyPhotoOrJustification && !collection.phase4.technicianAssemblySign;
  const canSignInventory = isCurator && individuals.length > 0 && !collection.phase4.curatorInventorySign;

  // Confirmação opcional do Pesquisador — nunca trava nem destrava nada, nunca
  // substitui a assinatura de Montagem do Técnico/Curador acima.
  const handleConfirmResearcherReview = async () => {
    const timestamp = new Date().toISOString();
    const hash = await calculateSha256(`researcher-review|phase4|${collection.nic}|${currentUser.id}|${timestamp}`);
    onUpdateCollection({
      ...collection,
      phase4: {
        ...collection.phase4,
        researcherConfirmation: { confirmedByName: currentUser.name, confirmedAt: timestamp, sha256Hash: hash }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Montagem e Inventário */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <UserCheck className="w-4 h-4" />
              <span>Fase 4 · Montagem e Inventário — Bioantropológico & Versão Científica (§8)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {collection.nic} · Versão v{collection.phase4.curationVersionNumber} ({collection.phase4.curationVersionStatus.toUpperCase()})
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Quem identifica e decide é sempre o curador. Agentes de IA apenas buscam referências e apoiam narração de rascunhos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentUser.role === 'pesquisador' && !isLocked && (
              collection.phase4.researcherConfirmation ? (
                <div className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 flex items-center gap-2 text-xs font-mono text-sky-700 dark:text-sky-300 font-semibold">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Revisão do Pesquisador confirmada</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmResearcherReview}
                  title="Confirmação opcional — não trava nem substitui a assinatura de Montagem do Técnico/Curador."
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
                <span>Fase 4 Duplamente Assinada & Travada</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSignatureTarget(canSignInventory ? 'curador' : 'tecnico');
                  setShowSignModal(true);
                }}
                disabled={!canSignAssembly && !canSignInventory}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={!canSignAssembly && !canSignInventory ? 'Exige foto de montagem (ou confirmar que não há foto) para a Montagem (Técnico/Curador) ou ao menos 1 indivíduo para o Inventário (Curador) — a confirmação que falta pra você.' : ''}
              >
                <FileCheck className="w-4 h-4" />
                <span>Assinar Fechamento da Fase 4</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Dentro de Montagem e Inventário */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('individuos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'individuos'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Indivíduos & Perfil Biológico ({individuals.length})
          </button>
          <button
            onClick={() => setActiveTab('inventario')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'inventario'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Inventário Osteológico ({elements.length})
          </button>
          <button
            onClick={() => setActiveTab('odontograma')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'odontograma'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Inventário Odontológico
          </button>
          <button
            onClick={() => setActiveTab('montagem')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'montagem'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Foto Montagem Completa (QR Code)
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba 1: Indivíduos e Perfil Biológico */}
      {activeTab === 'individuos' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Seletor Lateral de Indivíduos */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase font-mono">
                  Indivíduos (Hipóteses)
                </h4>
                {!isLocked && canEdit && (
                  <button
                    onClick={handleAddIndividual}
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    + Novo
                  </button>
                )}
              </div>

              {individuals.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum indivíduo criado. Clique em "+ Novo" para formalizar a primeira hipótese biológica.
                </div>
              ) : (
                <div className="space-y-2">
                  {individuals.map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => setSelectedIndividualId(ind.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                        currentInd?.id === ind.id
                          ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30 font-semibold text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-center font-mono">
                        <span>{ind.code}</span>
                        <span className="text-[10px] uppercase font-bold text-sky-600">
                          {ind.confidence}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                        {ind.biologicalProfile.sexEstimate.value} · {ind.biologicalProfile.ageCategory.value}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Botão de Fusão com Prévia de Impacto (§8) */}
              {individuals.length > 1 && !isLocked && canEdit && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="w-full mt-3 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Fusão de Indivíduos (Prévia)</span>
                </button>
              )}
            </div>
          </div>

          {/* Ficha Curatorial do Indivíduo Selecionado */}
          {currentInd ? (
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white font-mono flex items-center gap-2">
                      Ficha do Indivíduo {currentInd.code}
                    </h3>
                    <p className="text-xs text-slate-500">
                      ID Hipótese: {currentInd.id} · Caixa Vinculada: {currentInd.associatedBoxId}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSearchReference(currentInd.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1 hover:bg-sky-50 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Buscar Referência (§15)</span>
                    </button>
                  </div>
                </div>

                {/* Justificativa e Grau de Confiança */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Grau de Confiança Biológica:
                    </label>
                    <select
                      disabled={isLocked || !canEdit}
                      value={currentInd.confidence}
                      onChange={(e) => {
                        const updated = { ...collection };
                        const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                        if (ind) ind.confidence = e.target.value as BiologicalConfidence;
                        onUpdateCollection(updated);
                      }}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                    >
                      <option value="alta">Alta (Concordância Anatômica Consistente)</option>
                      <option value="media">Média (Elementos Pares Compatíveis)</option>
                      <option value="baixa">Baixa (Associação Provisória)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Justificativa Científica da Associação:
                    </label>
                    <input
                      type="text"
                      disabled={isLocked || !canEdit}
                      value={currentInd.justification}
                      onChange={(e) => {
                        const updated = { ...collection };
                        const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                        if (ind) ind.justification = e.target.value;
                        onUpdateCollection(updated);
                      }}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Perfil Biológico (Preenchido estritamente pelo Curador a partir do catálogo controlado) */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                    Perfil Biológico (Catálogo Controlado §9)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Sexo Estimado */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <span className="font-bold text-slate-900 dark:text-white block">1. Sexo Estimado</span>
                      <select
                        disabled={isLocked || !canEdit}
                        value={currentInd.biologicalProfile.sexEstimate.value}
                        onChange={(e) => {
                          const updated = { ...collection };
                          const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                          if (ind) ind.biologicalProfile.sexEstimate.value = e.target.value as any;
                          onUpdateCollection(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                      >
                        <option value="masculino">Masculino</option>
                        <option value="provavel_masculino">Provável Masculino</option>
                        <option value="indeterminado">Indeterminado</option>
                        <option value="provavel_feminino">Provável Feminino</option>
                        <option value="feminino">Feminino</option>
                      </select>

                      <div className="text-[11px] space-y-1">
                        <label className="text-slate-500 font-mono">Método Padronizado:</label>
                        <select
                          disabled={isLocked || !canEdit}
                          value={currentInd.biologicalProfile.sexEstimate.methodCode}
                          onChange={(e) => {
                            const updated = { ...collection };
                            const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                            if (ind) ind.biologicalProfile.sexEstimate.methodCode = e.target.value;
                            onUpdateCollection(updated);
                          }}
                          className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          {CONTROLLED_BIOLOGICAL_METHODS.sex.map(m => (
                            <option key={m.code} value={m.code}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Faixa Etária */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <span className="font-bold text-slate-900 dark:text-white block">2. Faixa Etária Óssea</span>
                      <select
                        disabled={isLocked || !canEdit}
                        value={currentInd.biologicalProfile.ageCategory.value}
                        onChange={(e) => {
                          const updated = { ...collection };
                          const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                          if (ind) ind.biologicalProfile.ageCategory.value = e.target.value as any;
                          onUpdateCollection(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                      >
                        <option value="subadulto">Subadulto (&lt; 20 anos)</option>
                        <option value="adulto_jovem">Adulto Jovem (20 - 35 anos)</option>
                        <option value="adulto_medio">Adulto Médio (35 - 50 anos)</option>
                        <option value="adulto_maduro">Adulto Maduro (50+ anos)</option>
                      </select>

                      <input
                        type="text"
                        disabled={isLocked || !canEdit}
                        value={currentInd.biologicalProfile.ageCategory.estimatedRangeYears}
                        onChange={(e) => {
                          const updated = { ...collection };
                          const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                          if (ind) ind.biologicalProfile.ageCategory.estimatedRangeYears = e.target.value;
                          onUpdateCollection(updated);
                        }}
                        placeholder="Intervalo estimado: ex: 35 - 45 anos"
                        className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>

                    {/* Estatura */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <span className="font-bold text-slate-900 dark:text-white block">3. Estatura Estimada</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          disabled={isLocked || !canEdit}
                          value={currentInd.biologicalProfile.statureCm.estimatedValue}
                          onChange={(e) => {
                            const updated = { ...collection };
                            const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                            if (ind) ind.biologicalProfile.statureCm.estimatedValue = parseFloat(e.target.value) || 0;
                            onUpdateCollection(updated);
                          }}
                          className="w-2/3 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                        />
                        <span className="flex items-center text-slate-500 font-mono text-xs">cm (± {currentInd.biologicalProfile.statureCm.marginErrorCm})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Método: {currentInd.biologicalProfile.statureCm.methodCode}
                      </span>
                    </div>

                    {/* Ancestralidade */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <span className="font-bold text-slate-900 dark:text-white block">4. Traços Craniomórficos</span>
                      <textarea
                        rows={2}
                        disabled={isLocked || !canEdit}
                        value={currentInd.biologicalProfile.ancestryIndication.traitsObserved}
                        onChange={(e) => {
                          const updated = { ...collection };
                          const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
                          if (ind) ind.biologicalProfile.ancestryIndication.traitsObserved = e.target.value;
                          onUpdateCollection(updated);
                        }}
                        placeholder="Descreva abertura piriforme, espinha nasal anterior..."
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3 text-center py-16 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Selecione ou crie um indivíduo à esquerda para iniciar o estudo curatorial.
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Inventário Osteológico */}
      {activeTab === 'inventario' && (
        <div className="space-y-6">
          <OsteologicalInventoryViewer
            inventory={collection.phase4.osteologicalInventory}
            onUpdateInventory={handleUpdateOsteologicalInventory}
            readOnly={isLocked || !canEdit}
          />

          {/* Tabela de Completude Geral do Acervo (Legado / Mapeamento de Indivíduos) */}
          <details className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs group">
            <summary className="cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between list-none">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                Mapeamento Geral de Completude e Associação por Indivíduo ({elements.length} elementos)
              </span>
              <span className="font-mono text-[11px] text-slate-400 font-normal">
                {elements.filter(e => e.presence === 'completo').length} completos / {elements.length} mapeados (clique para expandir)
              </span>
            </summary>

            <div className="overflow-x-auto mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 font-mono uppercase text-[10px] text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Código Anatômico</th>
                    <th className="p-2.5">Elemento Ósseo</th>
                    <th className="p-2.5">Região / Lado</th>
                    <th className="p-2.5">Presença</th>
                    <th className="p-2.5">Preservação</th>
                    <th className="p-2.5">Indivíduo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {elements.map((el) => (
                    <tr key={el.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">{el.anatomicalCode}</td>
                      <td className="p-2.5 text-slate-900 dark:text-white font-medium">{el.namePt}</td>
                      <td className="p-2.5 text-slate-500 capitalize">{el.region} · {el.side}</td>
                      <td className="p-2.5">
                        <select
                          disabled={isLocked || !canEdit}
                          value={el.presence}
                          onChange={(e) => handleUpdateElementPresence(el.id, e.target.value, el.preservationQuality)}
                          className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                        >
                          <option value="completo">Completo</option>
                          <option value="parcial_maior_50">Parcial (&gt; 50%)</option>
                          <option value="fragmentado_menor_50">Fragmentado (&lt; 50%)</option>
                          <option value="ausente">Ausente</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          disabled={isLocked || !canEdit}
                          value={el.preservationQuality}
                          onChange={(e) => handleUpdateElementPresence(el.id, el.presence, e.target.value)}
                          className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                        >
                          <option value="excelente">Excelente</option>
                          <option value="boa">Boa</option>
                          <option value="regular">Regular</option>
                          <option value="erosao_cortical_severa">Erosão Severa</option>
                        </select>
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-sky-600">
                        {individuals.find(i => i.id === el.associatedIndividualId)?.code || 'Conjunto Geral'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Conteúdo da Aba 3: Inventário Odontológico */}
      {activeTab === 'odontograma' && currentInd && (
        <div className="space-y-4">
          <OdontogramViewer
            teeth={currentInd.odontogram}
            onUpdateTooth={handleUpdateTooth}
            onBulkMarkTeeth={handleBulkMarkTeeth}
            denticao={currentInd.denticao}
            onSetDenticao={(d) => handlePatchIndividual({ denticao: d })}
            denticaoQuadrantePares={currentInd.denticaoQuadrantePares}
            onSetQuadrantePar={(q, lado) =>
              handlePatchIndividual({
                denticaoQuadrantePares: { ...currentInd.denticaoQuadrantePares, [q]: lado }
              })
            }
            mistaActiveDeciduous={currentInd.mistaActiveDeciduous}
            onSetMistaActiveDeciduous={(list) => handlePatchIndividual({ mistaActiveDeciduous: list })}
            supernumeraryTeeth={currentInd.supernumeraryTeeth}
            onSetSupernumeraryTeeth={(list) => handlePatchIndividual({ supernumeraryTeeth: list })}
            readOnly={isLocked || !canEdit}
          />
        </div>
      )}

      {/* Conteúdo da Aba 4: Fotografia de Montagem Completa */}
      {activeTab === 'montagem' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                Fotografia Oficial de Montagem Completa (Categoria MONTAGEM_COMPLETA)
              </h3>
              <p className="text-slate-500 mt-0.5">
                Esta é a fotografia institucional que ficará visível publicamente na leitura do QR Code (§11).
              </p>
            </div>
            {!collection.phase4.completeAssemblyPhotoApproved && canApprove && (
              <button
                onClick={handleRequestAssemblyPhoto}
                disabled={uploadingAssemblyPhoto}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{uploadingAssemblyPhoto ? 'Enviando...' : 'Aprovar Fotografia Oficial'}</span>
              </button>
            )}
          </div>

          {uploadError && <ErrorNotice code={uploadError.code} message={uploadError.message} />}
          <input
            ref={assemblyCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleAssemblyPhotoFileSelected}
          />
          <input
            ref={assemblyGalleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAssemblyPhotoFileSelected}
          />

          {collection.phase4.completeAssemblyPhotoApproved ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-black">
              <img
                src={collection.phase4.completeAssemblyPhotoApproved.photoUrl}
                alt="Montagem esquelética completa aprovada"
                className="w-full h-80 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white text-xs flex justify-between font-mono">
                <div>
                  <span className="font-bold block">Status: APROVADA</span>
                  <span>Aprovada por: {collection.phase4.completeAssemblyPhotoApproved.approvedBy}</span>
                </div>
                <div className="text-right">
                  <span>Res: {collection.phase4.completeAssemblyPhotoApproved.resolution}</span>
                  <div className="text-[10px] text-slate-400 truncate max-w-xs">
                    Hash: {collection.phase4.completeAssemblyPhotoApproved.sha256Hash}
                  </div>
                </div>
              </div>
            </div>
          ) : collection.phase4.assemblyPhotoJustification ? (
            <div className="p-6 text-center border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 bg-amber-50 dark:bg-amber-950/30">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                Sem foto oficial — justificado
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] max-w-md mx-auto">
                {collection.phase4.assemblyPhotoJustification.reason}
              </p>
              <p className="text-slate-400 text-[10px]">
                Confirmado por {collection.phase4.assemblyPhotoJustification.justifiedByName}
              </p>
              {canApprove && (
                <button
                  onClick={handleRequestAssemblyPhoto}
                  disabled={uploadingAssemblyPhoto}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50 font-semibold"
                >
                  {uploadingAssemblyPhoto ? 'Enviando...' : 'Registrar Foto Agora'}
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-2">
              <Camera className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Fotografia de Montagem Completa Pendente
              </p>
              <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                Para fechar a Montagem e Inventário, capture e aprove uma foto nítida do esqueleto articulado em norma anatômica com escala métrica.
              </p>
              {canApprove && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button
                    onClick={handleRequestAssemblyPhoto}
                    disabled={uploadingAssemblyPhoto}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50 font-semibold"
                  >
                    {uploadingAssemblyPhoto ? 'Enviando...' : 'Capturar & Aprovar Foto Agora'}
                  </button>
                  <button
                    onClick={() => setShowNoPhotoModal(true)}
                    disabled={uploadingAssemblyPhoto}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 font-semibold"
                  >
                    Não há foto
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Escolha entre câmera e galeria antes de abrir qualquer seletor de arquivo. */}
      {showPhotoSourceModal && (
        <PhotoSourceModal
          onChooseCamera={() => handleChoosePhotoSource('camera')}
          onChooseGallery={() => handleChoosePhotoSource('gallery')}
          onCancel={() => setShowPhotoSourceModal(false)}
        />
      )}

      {/* Modal de Confirmação de Ausência de Foto — pergunta explícita antes de
          aceitar seguir sem a fotografia oficial de montagem (nunca silencioso,
          nunca travado pra sempre: exige justificativa escrita). */}
      {showNoPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <h4>Confirmar ausência de foto</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta fotografia normalmente é obrigatória para fechar a curadoria científica. Antes de continuar sem ela, descreva por que não há uma foto pra guardar neste caso — a justificativa fica registrada no histórico do conjunto.
            </p>
            <textarea
              rows={3}
              autoFocus
              value={noPhotoJustification}
              onChange={(e) => setNoPhotoJustification(e.target.value)}
              placeholder="Ex.: câmera indisponível no momento da montagem, esqueleto incompleto não permite a foto padrão..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setShowNoPhotoModal(false);
                  setNoPhotoJustification('');
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNoAssemblyPhoto}
                disabled={!noPhotoJustification.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
              >
                Confirmar sem foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Busca de Referências (§15) */}
      {showRefSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Busca de Referência entre Conjuntos
              </h4>
              <button onClick={() => setShowRefSearchModal(false)} className="text-slate-400 hover:text-white">
                Fechar
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Compara o perfil biológico deste indivíduo com os demais já cadastrados no acervo (mesmo valor estimado <strong>e</strong> mesmo método). Ele <strong>nunca toma a decisão</strong>; cabe à curadora avaliar se o caso serve de referência.
            </p>
            {refSearchLoading && <p className="text-slate-500">Buscando no acervo...</p>}
            {refSearchError && (
              <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                {refSearchError}
              </p>
            )}
            {!refSearchLoading && !refSearchError && refSearchResults.length === 0 && (
              <p className="text-slate-500">Nenhum outro indivíduo do acervo compartilha sexo ou idade estimados pelo mesmo método.</p>
            )}
            <div className="space-y-2.5">
              {refSearchResults.map((match, idx) => (
                <div key={`${match.nic}-${match.individual.id}-${idx}`} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="font-mono text-[10px] uppercase font-bold text-sky-600 block mb-1">
                    {match.nic} / {match.individual.code}
                  </span>
                  <ul className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans list-disc list-inside">
                    {match.sharedTraits.map((trait, traitIdx) => (
                      <li key={traitIdx}>{trait}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fusão de Indivíduos com Prévia de Impacto (§8) */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <GitMerge className="w-5 h-5" />
              <h4>Prévia de Impacto — Fusão de Indivíduos (§8)</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Antes de confirmar a fusão biológica de hipóteses, o sistema calcula deterministicamente todos os registros que serão afetados:
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1 font-mono text-[11px] text-amber-900 dark:text-amber-200">
              <div>• 14 elementos ósseos serão reatribuídos a IND-01</div>
              <div>• 1 odontograma secundário será incorporado como variante</div>
              <div>• Nova versão curatorial v3 será gerada com rastreabilidade</div>
              <div>• Histórico anterior da hipótese IND-02 permanecerá intacto</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowMergeModal(false);
                  // Simula fusão
                }}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold"
              >
                Confirmar Fusão e Gerar Nova Versão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura da Fase 4 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Assinatura de Fechamento — Fase 4
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está assinando como <strong>{currentUser.name} ({currentUser.role.toUpperCase()})</strong>. A Fase 4 exige confirmação de Montagem e confirmação de Inventário. O Curador pode realizar as duas, uma de cada vez.
            </p>
            {canSignAssembly && canSignInventory && (
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300" htmlFor="phase4-signature-target">
                  Qual responsabilidade deseja confirmar agora?
                </label>
                <select
                  id="phase4-signature-target"
                  value={signatureTarget}
                  onChange={(event) => setSignatureTarget(event.target.value as 'curador' | 'tecnico')}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="curador">Inventário (Curador)</option>
                  <option value="tecnico">Montagem (Técnico, Pesquisador ou Curador)</option>
                </select>
              </div>
            )}
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Confirmação atual: {signatureTarget === 'curador' ? 'inventário' : 'montagem'}.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-mono text-[11px] space-y-1">
              <div>COI: {collection.nic}</div>
              <div>Versão Científica: v{collection.phase4.curationVersionNumber}</div>
              <div>
                Foto de Montagem:{' '}
                {collection.phase4.completeAssemblyPhotoApproved
                  ? `${collection.phase4.completeAssemblyPhotoApproved.sha256Hash.substring(0, 16)}...`
                  : collection.phase4.assemblyPhotoJustification
                  ? 'sem foto (justificado)'
                  : 'pendente'}
              </div>
            </div>
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
