import React, { useState } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  FieldWithAiSuggestion,
  MaterialType,
  PreservationCharacteristic,
  GeneticSampleElement,
  IsotopicSampleMaterial,
  CleaningType,
  Phase1PhotoCategory,
  Phase1Data
} from '../types/sgccco';
import { PopConversationalConductor } from './PopConversationalConductor';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canSignAsTechnician } from '../utils/permissions';
import { Shield, Lock, FileText, Camera, CheckCircle2, AlertCircle, Sparkles, Printer, Bot, Save, UserCheck } from 'lucide-react';

interface Phase1RecebimentoProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'ossos', label: 'Ossos' },
  { value: 'dentes', label: 'Dentes' },
  { value: 'cabelo', label: 'Cabelo (solto ou aderido)' },
  { value: 'unha', label: 'Unha' },
  { value: 'proteses', label: 'Próteses' },
  { value: 'vestes', label: 'Vestes' },
  { value: 'pertences', label: 'Pertences' },
  { value: 'tecidos_moles', label: 'Tecidos moles e/ou mumificados' }
];

const PRESERVATION_OPTIONS: { value: PreservationCharacteristic; label: string }[] = [
  { value: 'preservado_integro', label: 'Preservado/Íntegro' },
  { value: 'degradado', label: 'Degradado' },
  { value: 'fragmentacao', label: 'Fragmentação' },
  { value: 'friavel', label: 'Friável' },
  { value: 'erosao', label: 'Erosão' },
  { value: 'umido', label: 'Úmido' },
  { value: 'seco', label: 'Seco' },
  { value: 'fungo_visivel', label: 'Fungo visível' },
  { value: 'manchas', label: 'Manchas' },
  { value: 'perda_cortical', label: 'Perda de cortical' },
  { value: 'carbonizacao', label: 'Carbonização' },
  { value: 'insetos_pupas', label: 'Insetos/Pupas' },
  { value: 'mumificado', label: 'Mumificado' },
  { value: 'adipocera', label: 'Adipocera' },
  { value: 'outros', label: 'Outros' }
];

const GENETIC_OPTIONS: { value: GeneticSampleElement; label: string }[] = [
  { value: 'falange', label: 'Falange' },
  { value: 'ossos_tarsais', label: 'Ossos tarsais' },
  { value: 'dente_higido', label: 'Dente hígido' },
  { value: 'primeira_costela', label: '1ª costela' },
  { value: 'patela', label: 'Patela' },
  { value: 'outros', label: 'Outros' },
  { value: 'nao_coletado', label: 'Não coletado' }
];

const ISOTOPIC_OPTIONS: { value: IsotopicSampleMaterial; label: string }[] = [
  { value: 'cabelo', label: 'Cabelo' },
  { value: 'unha', label: 'Unha' },
  { value: 'dente', label: 'Dente' },
  { value: 'nao_coletado', label: 'Não coletado' }
];

// Campos de texto do Phase1Data (descrições condicionais).
type Phase1DescriptionKey = {
  [K in keyof Phase1Data]-?: NonNullable<Phase1Data[K]> extends FieldWithAiSuggestion<string> ? K : never;
}[keyof Phase1Data];

// Opções que, quando marcadas, abrem uma caixa de descrição própria e obrigatória.
const MATERIAL_DESCRIPTION_FIELDS: Partial<Record<MaterialType, Phase1DescriptionKey>> = {
  cabelo: 'cabeloDescricao',
  proteses: 'protesesDescricao',
  vestes: 'vestesDescricao',
  pertences: 'pertencesDescricao',
  tecidos_moles: 'tecidosMolesDescricao'
};

const PRESERVATION_DESCRIPTION_FIELDS: Partial<Record<PreservationCharacteristic, Phase1DescriptionKey>> = {
  outros: 'estadoPreservacaoOutrosDescricao'
};

const GENETIC_DESCRIPTION_FIELDS: Partial<Record<GeneticSampleElement, Phase1DescriptionKey>> = {
  falange: 'geneticoFalangeDescricao',
  ossos_tarsais: 'geneticoOssosTarsaisDescricao',
  dente_higido: 'geneticoDenteHigidoDescricao',
  primeira_costela: 'geneticoPrimeiraCostelaDescricao',
  patela: 'geneticoPatelaDescricao',
  outros: 'geneticoOutrosDescricao'
};

const ISOTOPIC_DESCRIPTION_FIELDS: Partial<Record<IsotopicSampleMaterial, Phase1DescriptionKey>> = {
  cabelo: 'isotopicaCabeloDescricao',
  unha: 'isotopicaUnhaDescricao',
  dente: 'isotopicaDenteDescricao'
};

function toggleInArray<T>(arr: T[] | undefined, value: T): T[] {
  const current = arr || [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

export const Phase1Recebimento: React.FC<Phase1RecebimentoProps> = ({
  collection,
  currentUser,
  onUpdateCollection,
  laboratoryMode
}) => {
  const [interactionMode, setInteractionMode] = useState<'conversacional' | 'formulario'>('conversacional');
  const [showSignModal, setShowSignModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState(false);

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 1);
  const isLocked = phaseSignature?.status === 'locked';

  const canViewRestrictedLegal = currentUser.role === 'curador' || currentUser.role === 'administrador';
  // A assinatura que trava a fase é exclusiva de Técnico/Curador — o Pesquisador
  // tem acesso à Fase 1, mas sua participação é a confirmação opcional abaixo
  // (handleConfirmResearcherReview), nunca esta assinatura (decisão de acesso
  // out/2026, correção: "o técnico é obrigatório, o pesquisador pode ou não").
  const canActAsTechnician = canSignAsTechnician(currentUser.role);

  const p1 = collection.phase1;

  const setField = <K extends keyof typeof p1>(key: K, value: FieldWithAiSuggestion<any>) => {
    const updated = { ...collection, phase1: { ...collection.phase1, [key]: value } };
    onUpdateCollection(updated);
  };

  const descriptionValue = (key: Phase1DescriptionKey): string => p1[key]?.value || '';

  // Marca/desmarca uma opção de lista. Ao desmarcar, apaga também a descrição dela,
  // na mesma atualização (duas chamadas de setField seguidas se sobrescreveriam, já
  // que cada uma parte do mesmo `collection` do fechamento).
  const toggleOption = <T extends string>(
    listKey: 'tipoMaterial' | 'estadoPreservacao' | 'exameGenetico' | 'analiseIsotopica',
    value: T,
    descriptionFields: Partial<Record<T, Phase1DescriptionKey>>
  ) => {
    const current = ((p1[listKey].value as T[] | undefined) || []);
    const removing = current.includes(value);
    const patch: Partial<Phase1Data> = {
      [listKey]: { value: toggleInArray(current, value), isAiSuggested: false }
    };
    const descKey = descriptionFields[value];
    if (removing && descKey && descriptionValue(descKey)) {
      (patch as any)[descKey] = { value: '', isAiSuggested: false };
    }
    onUpdateCollection({ ...collection, phase1: { ...collection.phase1, ...patch } });
  };

  // Anexa a foto e marca o campo do checklist correspondente numa única atualização.
  // Antes eram duas chamadas separadas (uma síncrona pro campo, outra async pra foto,
  // cada uma lendo `collection` do fechamento no momento do clique): como a segunda só
  // resolve depois do await do hash, ela sempre aplicava por cima um snapshot do estado
  // ANTES da primeira mudança, apagando silenciosamente o campo que acabara de ser
  // marcado. Combinar em uma função só, que só escreve depois que a foto (e seu hash)
  // já está pronta, elimina essa corrida.
  const handleTakePhotoAndSetField = async (
    category: Phase1PhotoCategory,
    fieldKey: keyof typeof p1,
    fieldValue: FieldWithAiSuggestion<any>
  ) => {
    const photoId = `photo-p1-${category}-${Date.now()}`;
    const url = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80';
    const hash = await calculateSha256(`${url}|${category}|${collection.nic}|${currentUser.id}`);
    const newPhoto = {
      id: photoId,
      category,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      sha256Hash: hash,
      url
    };
    const updated = { ...collection };
    updated.phase1 = {
      ...updated.phase1,
      photos: [...updated.phase1.photos, newPhoto],
      [fieldKey]: fieldValue
    };
    onUpdateCollection(updated);
  };

  // O preenchimento já salva sozinho a cada campo (onUpdateCollection é chamado em todo
  // setField) — mas sem um botão pra apertar, ninguém tem como confirmar isso na hora. Este
  // botão não faz nada tecnicamente novo: só reenvia o estado atual e dá uma confirmação
  // visual local, pra quem quer ter certeza antes de sair da tela.
  const handleManualSave = () => {
    onUpdateCollection({ ...collection });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
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
      ...updated.signatures.map((s) => (s.phaseNumber === 1 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
      {
        phaseNumber: 1 as const,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked' as const
      }
    ];
    if (updated.currentPhase < 2) {
      updated.currentPhase = 2;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  // Confirmação opcional do Pesquisador — nunca trava nem destrava nada, nunca
  // substitui a assinatura do Técnico/Curador acima. Só registra que o
  // Pesquisador revisou a fase, se ele quiser (pode ou não).
  const handleConfirmResearcherReview = async () => {
    const timestamp = new Date().toISOString();
    const hash = await calculateSha256(`researcher-review|phase1|${collection.nic}|${currentUser.id}|${timestamp}`);
    onUpdateCollection({
      ...collection,
      phase1: {
        ...collection.phase1,
        researcherConfirmation: { confirmedByName: currentUser.name, confirmedAt: timestamp, sha256Hash: hash }
      }
    });
  };

  // Validação para assinatura, fiel aos campos obrigatórios (*) do Formulário A.1.
  // Cada entrada também vira um item legível na lista de pendências abaixo — sem
  // isso, o botão só fica cinza sem nenhuma pista do porquê (mesma classe de bug
  // já corrigida na voz: bloqueio silencioso).
  const missingFieldLabels: string[] = [];
  if (!Boolean(p1.equipeEnvolvidaLimpeza.value)) missingFieldLabels.push('equipe envolvida');
  if (!Boolean(p1.dataAnalise.value)) missingFieldLabels.push('data da análise');
  if (!Boolean(p1.horaAnalise.value)) missingFieldLabels.push('hora da análise');
  if (p1.foto1SacoFechado.value !== true) missingFieldLabels.push('foto do saco fechado');
  if (p1.foto2PlacaCemiterio.value === undefined) missingFieldLabels.push('foto da placa do cemitério (ou "não se aplica")');
  if (p1.foto3RemanescentesMateriais.value === undefined) missingFieldLabels.push('foto dos materiais associados (ou "não se aplica")');
  if (p1.foto4_1RemanescentesIsolados.value !== true) missingFieldLabels.push('foto dos remanescentes isolados');
  if (p1.foto4_2MateriaisIsolados.value === undefined) missingFieldLabels.push('foto dos materiais associados isolados (ou "não se aplica")');
  // Cada opção marcada que tem caixa de descrição exige a descrição preenchida.
  const pushMissingDescriptions = <T extends string>(
    selected: T[] | undefined,
    options: { value: T; label: string }[],
    descriptionFields: Partial<Record<T, Phase1DescriptionKey>>,
    sectionLabel: string
  ) => {
    for (const option of options) {
      const key = descriptionFields[option.value];
      if (key && selected?.includes(option.value) && !descriptionValue(key).trim()) {
        missingFieldLabels.push(`descrição de "${option.label}" (${sectionLabel})`);
      }
    }
  };
  if ((p1.tipoMaterial.value?.length || 0) === 0) missingFieldLabels.push('tipo de material');
  pushMissingDescriptions(p1.tipoMaterial.value, MATERIAL_TYPE_OPTIONS, MATERIAL_DESCRIPTION_FIELDS, 'tipo de material');
  if ((p1.estadoPreservacao.value?.length || 0) === 0) missingFieldLabels.push('estado de preservação');
  pushMissingDescriptions(p1.estadoPreservacao.value, PRESERVATION_OPTIONS, PRESERVATION_DESCRIPTION_FIELDS, 'estado de preservação');
  if ((p1.exameGenetico.value?.length || 0) === 0) missingFieldLabels.push('exame genético');
  pushMissingDescriptions(p1.exameGenetico.value, GENETIC_OPTIONS, GENETIC_DESCRIPTION_FIELDS, 'exame genético');
  if (!Boolean(p1.geneticoResponsavelColeta.value)) missingFieldLabels.push('responsável pela coleta genética');
  if ((p1.analiseIsotopica.value?.length || 0) === 0) missingFieldLabels.push('análise isotópica');
  pushMissingDescriptions(p1.analiseIsotopica.value, ISOTOPIC_OPTIONS, ISOTOPIC_DESCRIPTION_FIELDS, 'análise isotópica');
  if (!Boolean(p1.isotopicaResponsavelColeta.value)) missingFieldLabels.push('responsável pela coleta isotópica');
  if (!Boolean(p1.corSacoLavagem.value)) missingFieldLabels.push('cor do saco de lavagem');
  if (!Boolean(p1.tipoLimpeza.value)) missingFieldLabels.push('tipo de limpeza');
  if (p1.houveDanos.value === undefined) missingFieldLabels.push('se houve dano');
  if (p1.houveDanos.value === true && !Boolean(p1.descricaoDanos.value)) missingFieldLabels.push('descrição do dano');
  const requiredFieldsFilled = missingFieldLabels.length === 0;
  const hasBoxes = collection.phase1.preliminaryBoxes.length > 0;
  const hasPhotos = collection.phase1.photos.length > 0;
  const canSign = requiredFieldsFilled && hasBoxes && hasPhotos && canActAsTechnician;

  const signBlockers: string[] = [...missingFieldLabels];
  if (!hasBoxes) signBlockers.push('nenhuma caixa vinculada ao conjunto');
  if (!hasPhotos) signBlockers.push('nenhuma foto anexada');
  if (!canActAsTechnician) signBlockers.push(`a pessoa ativa agora ("${currentUser.name}") tem o papel "${currentUser.role}" — Técnico ou Curador pode assinar a Fase 1. Troque a pessoa ativa no menu de perfil, no topo da tela.`);

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
              <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{collection.nic}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Único e Imutável
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Entrada criada em {new Date(collection.createdAt).toLocaleDateString('pt-BR')} pelo técnico {collection.createdByTechnician}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isLocked && (
              <button
                onClick={handleManualSave}
                className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  justSaved
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title="O preenchimento já é salvo automaticamente a cada campo — este botão só confirma isso agora, na hora."
              >
                {justSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-slate-500" />}
                <span>{justSaved ? 'Salvo!' : 'Salvar Formulário'}</span>
              </button>
            )}
            <button
              onClick={() => setShowPrintLabel(true)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir Etiqueta QR</span>
            </button>

            {currentUser.role === 'pesquisador' && !isLocked && (
              p1.researcherConfirmation ? (
                <div className="px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 flex items-center gap-2 text-xs font-mono text-sky-700 dark:text-sky-300 font-semibold">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>Revisão do Pesquisador confirmada</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmResearcherReview}
                  title="Confirmação opcional — não trava nem substitui a assinatura do Técnico/Curador."
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
                <span>Fase 1 Assinada & Travada</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={!canSign}
                title={signBlockers.length > 0 ? `Ainda não é possível assinar: ${signBlockers.join('; ')}` : undefined}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Revisar & Assinar Fase 1</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de Modo de Interação: Condutor por Voz vs Formulário A.1 Manual */}
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
            <span>Condutor do POP-01 (Voz/Conversa)</span>
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
            <span>Formulário A.1 Manual</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-3 hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>POP-01 · Análise Preliminar e Limpeza</span>
        </div>
      </div>

      {interactionMode === 'conversacional' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PopConversationalConductor
              collection={collection}
              currentUser={currentUser}
              phaseNumber={1}
              onUpdateCollection={onUpdateCollection}
              isLocked={isLocked}
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Espelho do Formulário A.1 (Ao Vivo)
                </h4>
                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Fase 1
                </span>
              </div>

              <MirrorRow label="Equipe" value={p1.equipeEnvolvidaLimpeza.value} />
              <MirrorRow label="Tipo de Material" value={p1.tipoMaterial.value?.join(', ')} />
              <MirrorRow label="Estado de Preservação" value={p1.estadoPreservacao.value?.join(', ')} />
              <MirrorRow label="Exame Genético" value={p1.exameGenetico.value?.join(', ')} />
              <MirrorRow label="Análise Isotópica" value={p1.analiseIsotopica.value?.join(', ')} />
              <MirrorRow label="Cor do Saco / Limpeza" value={[p1.corSacoLavagem.value, p1.tipoLimpeza.value].filter(Boolean).join(' · ')} />
              <MirrorRow label="Danos" value={p1.houveDanos.value === undefined ? undefined : p1.houveDanos.value ? p1.descricaoDanos.value : 'Nenhum'} />

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Registros Fotográficos ({collection.phase1.photos.length}):
                  </span>
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {collection.phase1.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {collection.phase1.photos.map((photo) => (
                      <div key={photo.id} className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 aspect-video">
                        <img src={photo.url} alt={photo.category} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">Nenhuma foto anexada pelo condutor ainda.</div>
                )}
              </div>

              <div className="pt-2">
                {isLocked ? (
                  <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    ✓ Fase 1 Assinada
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSignModal(true)}
                      disabled={!canSign}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Concluir e Assinar Fase 1</span>
                    </button>
                    {signBlockers.length > 0 && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300">
                        <div className="flex items-center gap-1.5 font-semibold mb-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Ainda não é possível assinar:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {signBlockers.map((blocker, idx) => (
                            <li key={idx}>{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-600" />
                  Formulário A.1 — Análise Preliminar e Limpeza dos Remanescentes Ósseos
                </h3>
                <span className="text-[10px] font-mono text-slate-400">POP-01 §9.2-9.4</span>
              </div>

              {/* Introdução */}
              <FormSection title="Introdução">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <TextInput
                    label="Equipe envolvida na limpeza *"
                    disabled={isLocked}
                    value={p1.equipeEnvolvidaLimpeza.value || ''}
                    onChange={(v) => setField('equipeEnvolvidaLimpeza', { value: v, isAiSuggested: false })}
                  />
                  <TextInput
                    label="Data *"
                    type="date"
                    disabled={isLocked}
                    value={p1.dataAnalise.value || ''}
                    onChange={(v) => setField('dataAnalise', { value: v, isAiSuggested: false })}
                  />
                  <TextInput
                    label="Hora (ex: 11h20min) *"
                    disabled={isLocked}
                    value={p1.horaAnalise.value || ''}
                    onChange={(v) => setField('horaAnalise', { value: v, isAiSuggested: false })}
                  />
                </div>
              </FormSection>

              {/* Checklist de fotos */}
              <FormSection title="Checklist Fotográfico (POP-03)">
                <PhotoChecklistRow
                  label="Foto 1 — Saco fechado, lacre, número COI e escala *"
                  done={p1.foto1SacoFechado.value === true}
                  disabled={isLocked}
                  onCapture={() => {
                    handleTakePhotoAndSetField('foto1_saco_fechado', 'foto1SacoFechado', { value: true, isAiSuggested: false });
                  }}
                />
                <TriStateRow
                  label="Foto 2 — Placa do cemitério, se aplicável *"
                  value={p1.foto2PlacaCemiterio.value}
                  disabled={isLocked}
                  onChange={(v) => {
                    if (v === 'sim') {
                      handleTakePhotoAndSetField('foto2_placa_cemiterio', 'foto2PlacaCemiterio', { value: v, isAiSuggested: false });
                    } else {
                      setField('foto2PlacaCemiterio', { value: v, isAiSuggested: false });
                    }
                  }}
                />
                <TriStateRow
                  label="Foto 3 — Remanescentes e materiais associados, se aplicável *"
                  value={p1.foto3RemanescentesMateriais.value}
                  disabled={isLocked}
                  onChange={(v) => {
                    if (v === 'sim') {
                      handleTakePhotoAndSetField('foto3_remanescentes_materiais', 'foto3RemanescentesMateriais', { value: v, isAiSuggested: false });
                    } else {
                      setField('foto3RemanescentesMateriais', { value: v, isAiSuggested: false });
                    }
                  }}
                />
                <PhotoChecklistRow
                  label="Foto 4.1 — Remanescentes isolados *"
                  done={p1.foto4_1RemanescentesIsolados.value === true}
                  disabled={isLocked}
                  onCapture={() => {
                    handleTakePhotoAndSetField('foto4_1_remanescentes_isolados', 'foto4_1RemanescentesIsolados', { value: true, isAiSuggested: false });
                  }}
                />
                <TriStateRow
                  label="Foto 4.2 — Materiais associados isolados, se aplicável *"
                  value={p1.foto4_2MateriaisIsolados.value}
                  disabled={isLocked}
                  onChange={(v) => {
                    if (v === 'sim') {
                      handleTakePhotoAndSetField('foto4_2_materiais_isolados', 'foto4_2MateriaisIsolados', { value: v, isAiSuggested: false });
                    } else {
                      setField('foto4_2MateriaisIsolados', { value: v, isAiSuggested: false });
                    }
                  }}
                />
              </FormSection>

              {/* Tipo de material */}
              <FormSection title="Tipo de Material *">
                <MultiChip
                  options={MATERIAL_TYPE_OPTIONS}
                  selected={p1.tipoMaterial.value || []}
                  disabled={isLocked}
                  onToggle={(v) => toggleOption('tipoMaterial', v, MATERIAL_DESCRIPTION_FIELDS)}
                />
                <OptionDescriptions
                  options={MATERIAL_TYPE_OPTIONS}
                  selected={p1.tipoMaterial.value || []}
                  descriptionFields={MATERIAL_DESCRIPTION_FIELDS}
                  disabled={isLocked}
                  getValue={descriptionValue}
                  onChange={(key, v) => setField(key, { value: v, isAiSuggested: false })}
                />
              </FormSection>

              {/* Estado de preservação */}
              <FormSection title="Estado de Preservação *">
                <MultiChip
                  options={PRESERVATION_OPTIONS}
                  selected={p1.estadoPreservacao.value || []}
                  disabled={isLocked}
                  onToggle={(v) => toggleOption('estadoPreservacao', v, PRESERVATION_DESCRIPTION_FIELDS)}
                />
                <OptionDescriptions
                  options={PRESERVATION_OPTIONS}
                  selected={p1.estadoPreservacao.value || []}
                  descriptionFields={PRESERVATION_DESCRIPTION_FIELDS}
                  disabled={isLocked}
                  getValue={descriptionValue}
                  onChange={(key, v) => setField(key, { value: v, isAiSuggested: false })}
                />
              </FormSection>

              {/* Coleta genética */}
              <FormSection title="Coleta de Amostra Biológica — Exame Genético *">
                <MultiChip
                  options={GENETIC_OPTIONS}
                  selected={p1.exameGenetico.value || []}
                  disabled={isLocked}
                  onToggle={(v) => toggleOption('exameGenetico', v, GENETIC_DESCRIPTION_FIELDS)}
                />
                <OptionDescriptions
                  options={GENETIC_OPTIONS}
                  selected={p1.exameGenetico.value || []}
                  descriptionFields={GENETIC_DESCRIPTION_FIELDS}
                  disabled={isLocked}
                  getValue={descriptionValue}
                  onChange={(key, v) => setField(key, { value: v, isAiSuggested: false })}
                />
                <TextInput
                  label="Responsável pela coleta *"
                  disabled={isLocked}
                  value={p1.geneticoResponsavelColeta.value || ''}
                  onChange={(v) => setField('geneticoResponsavelColeta', { value: v, isAiSuggested: false })}
                />
              </FormSection>

              {/* Análise isotópica */}
              <FormSection title="Coleta de Amostra Biológica — Análise Isotópica *">
                <MultiChip
                  options={ISOTOPIC_OPTIONS}
                  selected={p1.analiseIsotopica.value || []}
                  disabled={isLocked}
                  onToggle={(v) => toggleOption('analiseIsotopica', v, ISOTOPIC_DESCRIPTION_FIELDS)}
                />
                <OptionDescriptions
                  options={ISOTOPIC_OPTIONS}
                  selected={p1.analiseIsotopica.value || []}
                  descriptionFields={ISOTOPIC_DESCRIPTION_FIELDS}
                  disabled={isLocked}
                  getValue={descriptionValue}
                  onChange={(key, v) => setField(key, { value: v, isAiSuggested: false })}
                />
                <TextInput
                  label="Responsável pela coleta *"
                  disabled={isLocked}
                  value={p1.isotopicaResponsavelColeta.value || ''}
                  onChange={(v) => setField('isotopicaResponsavelColeta', { value: v, isAiSuggested: false })}
                />
              </FormSection>

              {/* Limpeza */}
              <FormSection title="Limpeza">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput
                    label="Cor do saco de lavagem *"
                    disabled={isLocked}
                    value={p1.corSacoLavagem.value || ''}
                    onChange={(v) => setField('corSacoLavagem', { value: v, isAiSuggested: false })}
                  />
                  <SelectInput
                    label="Tipo de limpeza *"
                    disabled={isLocked}
                    value={p1.tipoLimpeza.value || ''}
                    options={[
                      { value: 'a_seco', label: 'A seco' },
                      { value: 'agua_fria', label: 'Água fria' },
                      { value: 'agua_quente', label: 'Água quente' }
                    ]}
                    onChange={(v) => setField('tipoLimpeza', { value: v as CleaningType, isAiSuggested: false })}
                  />
                </div>
              </FormSection>

              {/* Danos */}
              <FormSection title="Danos Durante o Processamento *">
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="houveDanos"
                      disabled={isLocked}
                      checked={p1.houveDanos.value === true}
                      onChange={() => setField('houveDanos', { value: true, isAiSuggested: false })}
                    />
                    Sim
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="houveDanos"
                      disabled={isLocked}
                      checked={p1.houveDanos.value === false}
                      onChange={() => setField('houveDanos', { value: false, isAiSuggested: false })}
                    />
                    Não
                  </label>
                </div>
                {p1.houveDanos.value === true && (
                  <TextInput
                    label="Descreva o(s) dano(s) *"
                    disabled={isLocked}
                    value={p1.descricaoDanos.value || ''}
                    onChange={(v) => setField('descricaoDanos', { value: v, isAiSuggested: false })}
                  />
                )}
              </FormSection>

              {/* Pendências para assinar: ficam no fim do formulário, onde a pessoa chega
                  depois de preencher (antes ficavam no topo da tela). No modo Condutor, a
                  mesma lista aparece embaixo do botão "Concluir e Assinar". */}
              {!isLocked && signBlockers.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold mb-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Ainda falta o seguinte para poder concluir e assinar a Fase 1:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {signBlockers.map((blocker, idx) => (
                      <li key={idx}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Segregação Estrita de Dados Legais (§7) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 text-rose-600 dark:text-rose-400">
                <Shield className="w-4 h-4" />
                <h3 className="font-bold text-xs">Dados Restritos de Origem Legal (§7)</h3>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Regra de Segurança §7: Informações de cemitério, jazigo e Declaração de Óbito ficam criptografadas e são
                visíveis <strong>apenas para Curador e Administrador</strong>. Nunca aparecem no QR Code, buscas, exportações
                nem para agentes de IA.
              </p>

              {canViewRestrictedLegal ? (
                <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                    Acesso Autorizado ({currentUser.role.toUpperCase()}):
                  </span>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Cemitério de Origem:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{collection.legalOrigin.cemeteryName || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Jazigo / Sepultura:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{collection.legalOrigin.cemeteryPlot || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Declaração de Óbito (D.O.):</span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">{collection.legalOrigin.deathDeclarationNumber || 'Não informado'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-100 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
                  <Lock className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Conteúdo Criptografado & Segregado</p>
                  <p className="text-[11px]">
                    Como técnico, você não tem privilégio de leitura dos dados de identificação civil cartorária. O cadastro é
                    reservado à Curadoria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura da Fase 1 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Assinatura Técnica de Fechamento — Fase 1</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Ao assinar, você atesta a conformidade do preenchimento do Formulário A.1. O formulário será <strong>travado</strong> e
              gerará o hash SHA-256 da etapa, liberando a Fase 2 (Maceração, Limpeza e Secagem).
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1 font-mono text-slate-700 dark:text-slate-300 mb-4">
              <div>COI: {collection.nic}</div>
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
            <h4 className="font-bold text-sm text-slate-900 dark:text-white font-mono">Etiqueta Oficial de Caixa / COI</h4>
            <div className="p-6 bg-white border-2 border-slate-900 rounded-xl inline-block mx-auto text-black">
              <div className="font-bold text-lg font-mono tracking-wider">{collection.nic}</div>
              <div className="w-36 h-36 mx-auto my-2 border-2 border-slate-900 flex items-center justify-center bg-slate-50">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=SIGCOI://${collection.nic}`}
                  alt="QR Code"
                  className="w-32 h-32"
                />
              </div>
              <div className="text-[10px] font-mono uppercase font-bold">SIGCOI · INC/DITEC/PF</div>
              <div className="text-[9px] font-mono text-slate-600">Entrada: {new Date(collection.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
            <p className="text-xs text-slate-500">Etiqueta autoadesiva para aplicação externa nas caixas de polipropileno corrugado.</p>
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

// --- Componentes auxiliares de formulário (compartilháveis dentro do arquivo) ---

const MirrorRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">{label}:</span>
    <p className="text-slate-700 dark:text-slate-300 text-[11px]">{value || <span className="text-slate-400 italic">Ainda não preenchido</span>}</p>
  </div>
);

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
    <h4 className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">{title}</h4>
    {children}
  </div>
);

const TextInput: React.FC<{
  label: string;
  value: string;
  disabled?: boolean;
  type?: string;
  onChange: (v: string) => void;
}> = ({ label, value, disabled, type = 'text', onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">{label}</label>
    <input
      type={type}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
    />
  </div>
);

const SelectInput: React.FC<{
  label: string;
  value: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, disabled, options, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">{label}</label>
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
    >
      <option value="">Selecione...</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const MultiChip: React.FC<{
  options: { value: string; label: string }[];
  selected: string[];
  disabled?: boolean;
  onToggle: (v: any) => void;
}> = ({ options, selected, disabled, onToggle }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => {
      const active = selected.includes(o.value);
      return (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onToggle(o.value)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            active
              ? 'bg-sky-600 border-sky-600 text-white'
              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          } disabled:opacity-50`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

function OptionDescriptions<T extends string>({
  options,
  selected,
  descriptionFields,
  disabled,
  getValue,
  onChange
}: {
  options: { value: T; label: string }[];
  selected: T[];
  descriptionFields: Partial<Record<T, Phase1DescriptionKey>>;
  disabled?: boolean;
  getValue: (key: Phase1DescriptionKey) => string;
  onChange: (key: Phase1DescriptionKey, value: string) => void;
}) {
  const withDescription = options.filter((o) => selected.includes(o.value) && descriptionFields[o.value]);
  if (withDescription.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      {withDescription.map((o) => {
        const key = descriptionFields[o.value]!;
        return (
          <TextInput
            key={o.value}
            label={`Descrição — ${o.label} *`}
            disabled={disabled}
            value={getValue(key)}
            onChange={(v) => onChange(key, v)}
          />
        );
      })}
    </div>
  );
}

const PhotoChecklistRow: React.FC<{ label: string; done: boolean; disabled?: boolean; onCapture: () => void }> = ({
  label,
  done,
  disabled,
  onCapture
}) => (
  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
    <span className="text-slate-700 dark:text-slate-300">{label}</span>
    {done ? (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" /> Registrada
      </span>
    ) : (
      <button
        type="button"
        disabled={disabled}
        onClick={onCapture}
        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Registrar Foto</span>
      </button>
    )}
  </div>
);

const TriStateRow: React.FC<{
  label: string;
  value: 'sim' | 'nao_se_aplica' | undefined;
  disabled?: boolean;
  onChange: (v: 'sim' | 'nao_se_aplica') => void;
}> = ({ label, value, disabled, onChange }) => (
  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
    <span className="text-slate-700 dark:text-slate-300">{label}</span>
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('sim')}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
          value === 'sim' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
        }`}
      >
        Sim
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('nao_se_aplica')}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
          value === 'nao_se_aplica' ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
        }`}
      >
        Não se aplica
      </button>
    </div>
  </div>
);
