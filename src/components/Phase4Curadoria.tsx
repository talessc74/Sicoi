import React, { useState } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  IndividualHypothesis,
  SkeletalElement,
  CurationVersionStatus,
  BiologicalConfidence
} from '../types/sgccco';
import { OdontogramViewer } from './OdontogramViewer';
import {
  CONTROLLED_BIOLOGICAL_METHODS,
  STANDARD_SKELETAL_INVENTORY_TEMPLATES,
  generateInitialOdontogram
} from '../data/mockData';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
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
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [refSearchResults, setRefSearchResults] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);

  const phaseSignature = collection.signatures.find(s => s.phaseNumber === 4);
  const isLocked = phaseSignature?.status === 'locked';

  const isCurator = currentUser.role === 'curador';
  const isStudent = currentUser.role === 'estudante';
  const canEdit = isCurator || isStudent;
  const canApprove = isCurator;

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

  const handleUpdateTooth = (num: number, condition: any, notes?: string) => {
    if (!currentInd) return;
    const updated = { ...collection };
    const ind = updated.phase4.individuals.find(i => i.id === currentInd.id);
    if (ind) {
      ind.odontogram = ind.odontogram.map(t => 
        t.toothNumberFdi === num ? { ...t, condition, notes: notes || '' } : t
      );
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

  const handleSearchReference = (query: string) => {
    setRefSearchQuery(query);
    // Simulates consultation to Graph + Anthropological Literature Catalog (§15)
    setRefSearchResults([
      `Ortner (2003) Identification of Pathological Conditions in Human Skeletal Remains, p. 120-145: Variações morfológicas compatíveis com "${query}".`,
      `Buikstra & Ubelaker (1994) Standards for Data Collection from Human Skeletal Remains: Protocolo de pontuação osteométrica.`,
      `Caso do Grafo SGCCCO (NIC-2025-0419 / IND-01): Calo ósseo remodelado em diáfise femoral sob método Trotter & Gleser.`
    ]);
    setShowRefSearchModal(true);
  };

  const handleApprovePhoto = async () => {
    const hash = await calculateSha256(`ASSEMBLY-PHOTO-${collection.nic}-${Date.now()}`);
    const updated = { ...collection };
    updated.phase4.completeAssemblyPhotoApproved = {
      photoUrl: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=1000&auto=format&fit=crop&q=80',
      capturedAt: new Date().toISOString(),
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
      sha256Hash: hash,
      resolution: '4032x3024'
    };
    onUpdateCollection(updated);
  };

  const handleSignPhase = async () => {
    setSigning(true);
    const timestamp = new Date().toISOString();
    const payload = generateSignaturePayload({
      nic: collection.nic,
      phaseNumber: 4,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(collection.phase4)
    });
    const hash = await calculateSha256(payload);

    const updated = { ...collection };
    updated.phase4.curationVersionStatus = 'aprovada';
    updated.phase4.curatorAuthor = currentUser.name;
    updated.signatures = [
      ...updated.signatures.filter(s => s.phaseNumber !== 4),
      {
        phaseNumber: 4,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked'
      }
    ];
    if (updated.currentPhase < 5) {
      updated.currentPhase = 5;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  const canSignCuration = isCurator && individuals.length > 0 && Boolean(collection.phase4.completeAssemblyPhotoApproved);

  return (
    <div className="space-y-6">
      {/* Top Banner Curadoria */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <UserCheck className="w-4 h-4" />
              <span>Fase 4 · Curadoria Bioantropológica & Versão Científica (§8)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {collection.nic} · Versão v{collection.phase4.curationVersionNumber} ({collection.phase4.curationVersionStatus.toUpperCase()})
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Quem identifica e decide é sempre o curador. Agentes de IA apenas buscam referências e apoiam narração de rascunhos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Versão Científica Aprovada & Assinada</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={!canSignCuration}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={!canSignCuration ? 'Exige perfil de Curador, ao menos 1 indivíduo e foto de montagem completa aprovada.' : ''}
              >
                <FileCheck className="w-4 h-4" />
                <span>Aprovar & Assinar Versão Científica</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Dentro da Curadoria */}
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
            Inventário & Completude Esquelética ({elements.length})
          </button>
          <button
            onClick={() => setActiveTab('odontograma')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'odontograma'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Odontograma (FDI / ISO 3950)
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
                      onClick={() => handleSearchReference(`Morfologia craniométrica e pélvica de ${currentInd.code}`)}
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

      {/* Conteúdo da Aba 2: Inventário Anatômico de Completude */}
      {activeTab === 'inventario' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Inventário Anatômico e Completude Esquelética
              </h3>
              <p className="text-xs text-slate-500">
                Presença, lateralidade e preservação de cada osso do conjunto.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {elements.filter(e => e.presence === 'completo').length} completos / {elements.length} mapeados
            </span>
          </div>

          <div className="overflow-x-auto">
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
        </div>
      )}

      {/* Conteúdo da Aba 3: Odontograma Forense */}
      {activeTab === 'odontograma' && currentInd && (
        <div className="space-y-4">
          <OdontogramViewer
            teeth={currentInd.odontogram}
            onUpdateTooth={handleUpdateTooth}
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
                onClick={handleApprovePhoto}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprovar Fotografia Oficial</span>
              </button>
            )}
          </div>

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
                  <span className="font-bold block">Status: APROVADA PELO CURADOR</span>
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
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-2">
              <Camera className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Fotografia de Montagem Completa Pendente
              </p>
              <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                Para fechar a curadoria científica, capture e aprove uma foto nítida do esqueleto articulado em norma anatômica com escala métrica.
              </p>
              {canApprove && (
                <button
                  onClick={handleApprovePhoto}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                >
                  Capturar & Aprovar Foto Agora
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Busca de Referências (§15) */}
      {showRefSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Agente de Busca de Referências & Grafo
              </h4>
              <button onClick={() => setShowRefSearchModal(false)} className="text-slate-400 hover:text-white">
                Fechar
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              O agente localiza literatura comparativa e casos anteriores no grafo. Ele <strong>nunca toma a decisão</strong>; cabe à curadora avaliar as referências:
            </p>
            <div className="space-y-2.5">
              {refSearchResults.map((ref, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="font-mono text-[10px] uppercase font-bold text-sky-600 block mb-1">
                    Referência #{idx + 1}:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-sans">{ref}</p>
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
              Assinatura Científica Curatorial — Fase 4
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Eu, {currentUser.name}, na condição de Curadora Antropóloga Forense, assumo a responsabilidade científica pela estimativa do perfil biológico, inventário anatômico, odontograma e montagem fotográfica do conjunto {collection.nic}.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-mono text-[11px] space-y-1">
              <div>NIC: {collection.nic}</div>
              <div>Versão Científica: v{collection.phase4.curationVersionNumber} (Aprovada)</div>
              <div>Foto de Montagem: {collection.phase4.completeAssemblyPhotoApproved?.sha256Hash.substring(0, 16)}...</div>
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
                <span>Confirmar e Liberar Fase 5</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
