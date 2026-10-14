import React, { useState, useRef } from 'react';
import { OsteologicalCollection, UserProfile, Phase0Data, BrazilianUf } from '../types/sgccco';
import { createEmptyPhase0Data } from '../data/phaseDefaults';
import { PhotoSourceModal } from './PhotoSourceModal';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { extractDeathCertificateFields } from '../services/geminiService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canSignAsTechnician, canPerformRole } from '../utils/permissions';
import { Shield, FileText, Camera, CheckCircle2, AlertCircle, UserCheck, Plus, X } from 'lucide-react';

interface Phase0RecebimentoProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

const UF_OPTIONS: BrazilianUf[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
const SEXO_OPTIONS = ['M', 'F', 'Ignorado'];
const COR_OPTIONS = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Ignorada'];
const ESTADO_CIVIL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a) judicialmente', 'Ignorado'];

export const Phase0Recebimento: React.FC<Phase0RecebimentoProps> = ({
  collection,
  currentUser,
  onUpdateCollection
}) => {
  const [mode, setMode] = useState<'manual' | 'foto'>('manual');
  const [showSignModal, setShowSignModal] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedCount, setExtractedCount] = useState<number | null>(null);
  // Campos preenchidos pela extração por foto, até o Técnico editar cada um —
  // só efeito visual (dashed + etiqueta "IA"), nunca persistido no phase0.
  const [fromIA, setFromIA] = useState<Record<string, boolean>>({});
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 0);
  const isLocked = phaseSignature?.status === 'locked';

  // Mesma decisão de acesso out/2026 das demais fases: Técnico e Pesquisador
  // podem preencher, mas só Técnico (ou Curador agindo como técnico) assina.
  const canAccess = canPerformRole(currentUser.role, 'tecnico');
  const canActAsTechnician = canSignAsTechnician(currentUser);

  const p0: Phase0Data = collection.phase0 ?? createEmptyPhase0Data();

  const set = (patch: Partial<Phase0Data>) => {
    onUpdateCollection({ ...collection, phase0: { ...p0, ...patch } });
  };

  // Grava o campo editado manualmente e tira a etiqueta "IA" dele, se tinha —
  // uma vez revisado/corrigido pelo Técnico, deixa de ser "sugestão" e passa a
  // ser o dado que ele confirmou.
  const setField = <K extends keyof Phase0Data>(key: K, value: Phase0Data[K]) => {
    set({ [key]: value } as Partial<Phase0Data>);
    if (fromIA[key as string]) {
      setFromIA((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const filhos = p0.filhos || [];
  const addFilho = () => set({ filhos: [...filhos, { id: `filho-${Date.now()}`, nome: '', idade: '' }] });
  const updateFilho = (id: string, patch: Partial<{ nome: string; idade: string }>) =>
    set({ filhos: filhos.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const removeFilho = (id: string) => set({ filhos: filhos.filter((f) => f.id !== id) });

  const handleChoosePhotoSource = (source: 'camera' | 'gallery') => {
    setShowPhotoSourceModal(false);
    (source === 'camera' ? cameraInputRef : galleryInputRef).current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setExtracting(true);
    setExtractionError(null);
    setExtractedCount(null);
    try {
      const fields = await extractDeathCertificateFields(file);
      const keys = Object.keys(fields);
      if (keys.length === 0) {
        setExtractionError('Não foi possível identificar nenhum campo nesta imagem. Preencha manualmente ou tente outra foto.');
      } else {
        set(fields as Partial<Phase0Data>);
        const nextFromIA: Record<string, boolean> = {};
        keys.forEach((k) => {
          nextFromIA[k] = true;
        });
        setFromIA(nextFromIA);
        setExtractedCount(keys.length);
        setMode('manual');
      }
    } catch (err: any) {
      setExtractionError(err?.message || 'Erro ao extrair dados da Declaração de Óbito.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSignPhase = async () => {
    setSigning(true);
    const timestamp = new Date().toISOString();
    const payload = generateSignaturePayload({
      nic: collection.nic,
      phaseNumber: 0,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(p0)
    });
    const hash = await calculateSha256(payload);

    const updated = { ...collection };
    updated.phase0 = {
      ...p0,
      technicianReceivalSign: { signedByName: currentUser.name, signedAt: timestamp, sha256Hash: hash }
    };
    updated.signatures = [
      ...updated.signatures.map((s) => (s.phaseNumber === 0 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
      {
        phaseNumber: 0 as const,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked' as const
      }
    ];
    if (updated.currentPhase < 1) {
      updated.currentPhase = 1;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  // Confirmação opcional do Pesquisador — nunca trava nem destrava nada, nunca
  // substitui a assinatura do Técnico/Curador acima.
  const handleConfirmResearcherReview = async () => {
    const timestamp = new Date().toISOString();
    const hash = await calculateSha256(`researcher-review|phase0|${collection.nic}|${currentUser.id}|${timestamp}`);
    set({ researcherConfirmation: { confirmedByName: currentUser.name, confirmedAt: timestamp, sha256Hash: hash } });
  };

  const canSign = canActAsTechnician && !isLocked;
  const disabled = isLocked || !canAccess;

  return (
    <div className="space-y-6">
      {/* Banner de Identificação e NIC */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">Fase 0 · Recebimento</span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{collection.nic}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dados pessoais e do óbito transcritos da Declaração de Óbito (D.O.) recebida com o conjunto.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'pesquisador' && !isLocked && (
              p0.researcherConfirmation ? (
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
                <span>Fase 0 Assinada & Travada</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setReviewConfirmed(false);
                  setShowSignModal(true);
                }}
                disabled={!canSign}
                title={!canSign ? `Técnico ou Curador pode assinar a Fase 0 — a pessoa ativa agora ("${currentUser.name}") tem o papel "${currentUser.role}".` : undefined}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinar Fechamento da Fase 0</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Banner de responsabilidade */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-sm">
        <Shield className="w-4 h-4 flex-none" />
        <span>
          Fase 0 · Recebimento — responsabilidade do <strong>Técnico</strong>. Todo campo é opcional: registre o que a
          Declaração de Óbito realmente traz, mesmo que incompleta.
        </span>
      </div>

      {/* Alternância de modo */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            mode === 'manual'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Preenchimento Manual</span>
        </button>
        <button
          onClick={() => setMode('foto')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            mode === 'foto'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4 text-sky-500" />
          <span>Importar Foto da D.O.</span>
        </button>
      </div>

      {mode === 'foto' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-3">
          <input ref={cameraInputRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={handleFileSelected} />
          <input ref={galleryInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelected} />
          <Camera className="w-9 h-9 mx-auto text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            Tire uma foto ou envie a imagem da Declaração de Óbito
          </p>
          {extractionError && (
            <div className="max-w-md mx-auto p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px]">
              {extractionError}
            </div>
          )}
          <button
            type="button"
            disabled={disabled || extracting}
            onClick={() => setShowPhotoSourceModal(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {extracting ? 'Lendo documento...' : 'Selecionar Foto'}
          </button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            A IA só extrai o que está escrito e legível no documento — nunca inventa um valor. A foto não é guardada no
            conjunto; só é usada para preencher o formulário, que você revisa e confirma antes de assinar.
          </p>
        </div>
      ) : (
        <>
          {extractedCount !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-none" />
              <span>{extractedCount} campo(s) preenchido(s) a partir da foto — revise os marcados "IA" abaixo antes de assinar.</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
            <FormSection title="Dados Pessoais do Falecido">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <TextInput label="Nome completo" disabled={disabled} suggested={fromIA.nome} value={p0.nome || ''} onChange={(v) => setField('nome', v)} />
                </div>
                <SelectInput label="Sexo" disabled={disabled} suggested={fromIA.sexo} options={SEXO_OPTIONS} value={p0.sexo || ''} onChange={(v) => setField('sexo', v as Phase0Data['sexo'])} />
                <SelectInput label="Cor/raça" disabled={disabled} suggested={fromIA.cor} options={COR_OPTIONS} value={p0.cor || ''} onChange={(v) => setField('cor', v as Phase0Data['cor'])} />
                <TextInput label="Nacionalidade" disabled={disabled} suggested={fromIA.nacionalidade} value={p0.nacionalidade || ''} onChange={(v) => setField('nacionalidade', v)} />
                <TextInput label="Naturalidade — Cidade" disabled={disabled} suggested={fromIA.naturalCidade} value={p0.naturalCidade || ''} onChange={(v) => setField('naturalCidade', v)} />
                <SelectInput label="Naturalidade — UF" disabled={disabled} suggested={fromIA.naturalUf} options={UF_OPTIONS} value={p0.naturalUf || ''} onChange={(v) => setField('naturalUf', v as BrazilianUf)} />
                <TextInput label="Data de nascimento" type="date" disabled={disabled} suggested={fromIA.nascimento} value={p0.nascimento || ''} onChange={(v) => setField('nascimento', v)} />
                <TextInput label="Idade" type="number" disabled={disabled} suggested={fromIA.idade} value={p0.idade?.toString() || ''} onChange={(v) => setField('idade', v === '' ? undefined : Number(v))} />
                <SelectInput label="Estado civil" disabled={disabled} suggested={fromIA.estadoCivil} options={ESTADO_CIVIL_OPTIONS} value={p0.estadoCivil || ''} onChange={(v) => setField('estadoCivil', v as Phase0Data['estadoCivil'])} />
                <TextInput label="Profissão" disabled={disabled} suggested={fromIA.profissao} value={p0.profissao || ''} onChange={(v) => setField('profissao', v)} />
                <TextInput label="CPF" disabled={disabled} suggested={fromIA.cpf} value={p0.cpf || ''} onChange={(v) => setField('cpf', v)} />
                <TextInput label="RG + órgão expedidor" disabled={disabled} suggested={fromIA.rg} value={p0.rg || ''} onChange={(v) => setField('rg', v)} />
              </div>
            </FormSection>

            <FormSection title="Filiação">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <TextInput label="Nome do pai" disabled={disabled} suggested={fromIA.paiNome} value={p0.paiNome || ''} onChange={(v) => setField('paiNome', v)} />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 self-end pb-2.5">
                  <input type="checkbox" disabled={disabled} checked={Boolean(p0.paiFalecido)} onChange={(e) => setField('paiFalecido', e.target.checked)} />
                  Falecido
                </label>
                <TextInput label="Naturalidade do pai" disabled={disabled} suggested={fromIA.paiNatural} value={p0.paiNatural || ''} onChange={(v) => setField('paiNatural', v)} />
                <TextInput label="Estado civil do pai" disabled={disabled} suggested={fromIA.paiEstadoCivil} value={p0.paiEstadoCivil || ''} onChange={(v) => setField('paiEstadoCivil', v)} />
                <TextInput label="Profissão do pai" disabled={disabled} suggested={fromIA.paiProfissao} value={p0.paiProfissao || ''} onChange={(v) => setField('paiProfissao', v)} />

                <div className="sm:col-span-2">
                  <TextInput label="Nome da mãe" disabled={disabled} suggested={fromIA.maeNome} value={p0.maeNome || ''} onChange={(v) => setField('maeNome', v)} />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 self-end pb-2.5">
                  <input type="checkbox" disabled={disabled} checked={Boolean(p0.maeFalecida)} onChange={(e) => setField('maeFalecida', e.target.checked)} />
                  Falecida
                </label>
                <TextInput label="Naturalidade da mãe" disabled={disabled} suggested={fromIA.maeNatural} value={p0.maeNatural || ''} onChange={(v) => setField('maeNatural', v)} />
                <TextInput label="Estado civil da mãe" disabled={disabled} suggested={fromIA.maeEstadoCivil} value={p0.maeEstadoCivil || ''} onChange={(v) => setField('maeEstadoCivil', v)} />
                <TextInput label="Profissão da mãe" disabled={disabled} suggested={fromIA.maeProfissao} value={p0.maeProfissao || ''} onChange={(v) => setField('maeProfissao', v)} />
              </div>
            </FormSection>

            <FormSection title="Cônjuge">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <TextInput label="Nome do cônjuge" disabled={disabled} suggested={fromIA.conjugeNome} value={p0.conjugeNome || ''} onChange={(v) => setField('conjugeNome', v)} />
                </div>
                <TextInput label="Naturalidade do cônjuge" disabled={disabled} suggested={fromIA.conjugeNatural} value={p0.conjugeNatural || ''} onChange={(v) => setField('conjugeNatural', v)} />
                <TextInput label="Profissão do cônjuge" disabled={disabled} suggested={fromIA.conjugeProfissao} value={p0.conjugeProfissao || ''} onChange={(v) => setField('conjugeProfissao', v)} />
              </div>
            </FormSection>

            <FormSection title="Dados do Óbito">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextInput label="Local do falecimento" disabled={disabled} suggested={fromIA.localFalecimento} value={p0.localFalecimento || ''} onChange={(v) => setField('localFalecimento', v)} />
                <TextInput label="Cidade" disabled={disabled} suggested={fromIA.obitoCidade} value={p0.obitoCidade || ''} onChange={(v) => setField('obitoCidade', v)} />
                <SelectInput label="UF" disabled={disabled} suggested={fromIA.obitoUf} options={UF_OPTIONS} value={p0.obitoUf || ''} onChange={(v) => setField('obitoUf', v as BrazilianUf)} />
                <TextInput label="Data do falecimento" type="date" disabled={disabled} suggested={fromIA.dataFalecimento} value={p0.dataFalecimento || ''} onChange={(v) => setField('dataFalecimento', v)} />
                <TextInput label="Hora do falecimento" type="time" disabled={disabled} suggested={fromIA.horaFalecimento} value={p0.horaFalecimento || ''} onChange={(v) => setField('horaFalecimento', v)} />
                <TextInput label="Nome do médico" disabled={disabled} suggested={fromIA.medicoNome} value={p0.medicoNome || ''} onChange={(v) => setField('medicoNome', v)} />
                <TextInput label="CRM do médico" disabled={disabled} suggested={fromIA.medicoCrm} value={p0.medicoCrm || ''} onChange={(v) => setField('medicoCrm', v)} />
                <div className="sm:col-span-3">
                  <TextArea label="Causa da morte" disabled={disabled} suggested={fromIA.causaMorte} value={p0.causaMorte || ''} onChange={(v) => setField('causaMorte', v)} />
                </div>
              </div>
            </FormSection>

            <FormSection title="Sepultamento">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <TextInput label="Cemitério" disabled={disabled} suggested={fromIA.cemiterio} value={p0.cemiterio || ''} onChange={(v) => setField('cemiterio', v)} />
                </div>
                <TextInput label="Data da inumação" type="date" disabled={disabled} suggested={fromIA.dataInumacao} value={p0.dataInumacao || ''} onChange={(v) => setField('dataInumacao', v)} />
                <TextInput label="Data da exumação" type="date" disabled={disabled} suggested={fromIA.dataExumacao} value={p0.dataExumacao || ''} onChange={(v) => setField('dataExumacao', v)} />
              </div>
            </FormSection>

            <FormSection title={`Filhos${fromIA.filhos ? ' · IA' : ''}`}>
              <div className="space-y-2">
                {filhos.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum filho adicionado ainda.</p>}
                {filhos.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={disabled}
                      value={f.nome}
                      placeholder="Nome"
                      onChange={(e) => updateFilho(f.id, { nome: e.target.value })}
                      className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      value={f.idade}
                      placeholder="Idade"
                      onChange={(e) => updateFilho(f.id, { idade: e.target.value })}
                      className="w-24 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                    <button
                      type="button"
                      aria-label="Remover filho"
                      disabled={disabled}
                      onClick={() => removeFilho(f.id)}
                      className="shrink-0 w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 flex items-center justify-center disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={addFilho}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar filho</span>
                </button>
              </div>
            </FormSection>

            <FormSection title="Observações">
              <TextArea label="Campo livre de observações" disabled={disabled} suggested={fromIA.observacoes} value={p0.observacoes || ''} onChange={(v) => setField('observacoes', v)} />
            </FormSection>
          </div>
        </>
      )}

      {showPhotoSourceModal && (
        <PhotoSourceModal
          onChooseCamera={() => handleChoosePhotoSource('camera')}
          onChooseGallery={() => handleChoosePhotoSource('gallery')}
          onCancel={() => setShowPhotoSourceModal(false)}
        />
      )}

      {/* Modal de Assinatura da Fase 0 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Assinatura Técnica de Fechamento — Fase 0</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Ao assinar, você atesta a conformidade dos dados transcritos da Declaração de Óbito. O formulário será{' '}
              <strong>travado</strong> e gerará o hash SHA-256 da etapa, liberando a Fase 1 (Recebimento & A.1).
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1 font-mono text-slate-700 dark:text-slate-300 mb-4">
              <div>COI: {collection.nic}</div>
              <div>Responsável: {currentUser.name} ({currentUser.role})</div>
              <div>Data: {new Date().toLocaleString('pt-BR')}</div>
            </div>

            <label className="flex items-start gap-2 text-xs mb-4 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(e) => setReviewConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Revisei os dados acima (inclusive os sugeridos pela IA, se houver) e assumo a responsabilidade pelas
                informações registradas nesta fase.
              </span>
            </label>

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignPhase}
                disabled={signing || !reviewConfirmed}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 disabled:opacity-50"
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

// --- Componentes auxiliares de formulário ---

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
    <h4 className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">{title}</h4>
    {children}
  </div>
);

const IaTag: React.FC = () => (
  <span className="ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 align-middle">
    IA
  </span>
);

const TextInput: React.FC<{
  label: string;
  value: string;
  disabled?: boolean;
  type?: string;
  suggested?: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, disabled, type = 'text', suggested, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">
      {label}
      {suggested && <IaTag />}
    </label>
    <input
      type={type}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white ${
        suggested ? 'border-dashed border-amber-400 dark:border-amber-600' : 'border-slate-300 dark:border-slate-700'
      }`}
    />
  </div>
);

const TextArea: React.FC<{
  label: string;
  value: string;
  disabled?: boolean;
  suggested?: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, disabled, suggested, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">
      {label}
      {suggested && <IaTag />}
    </label>
    <textarea
      rows={3}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white ${
        suggested ? 'border-dashed border-amber-400 dark:border-amber-600' : 'border-slate-300 dark:border-slate-700'
      }`}
    />
  </div>
);

const SelectInput: React.FC<{
  label: string;
  value: string;
  disabled?: boolean;
  suggested?: boolean;
  options: string[];
  onChange: (v: string) => void;
}> = ({ label, value, disabled, suggested, options, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">
      {label}
      {suggested && <IaTag />}
    </label>
    <select
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white ${
        suggested ? 'border-dashed border-amber-400 dark:border-amber-600' : 'border-slate-300 dark:border-slate-700'
      }`}
    >
      <option value="">Selecione...</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);
