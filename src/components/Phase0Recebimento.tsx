import React, { useState, useRef } from 'react';
import { cities } from 'estados-cidades';
import { OsteologicalCollection, UserProfile, Phase0Data, BrazilianUf } from '../types/sgccco';
import { createEmptyPhase0Data } from '../data/phaseDefaults';
import { PhotoSourceModal } from './PhotoSourceModal';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { extractDeathCertificateFields } from '../services/geminiService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canSignAsTechnician, canPerformRole } from '../utils/permissions';
import { ErrorNotice } from './ErrorNotice';
import { toAppError, AppError } from '../utils/errorMessages';
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

// "Brasileira" primeiro (valor padrão de createEmptyPhase0Data) — o resto em
// ordem alfabética. Forma feminina pra concordar com "nacionalidade", igual
// aos documentos civis brasileiros de verdade (RG, certidões).
const NACIONALIDADE_OPTIONS = [
  'Brasileira', 'Alemã', 'Americana', 'Angolana', 'Argentina', 'Australiana', 'Austríaca', 'Belga', 'Boliviana',
  'Britânica', 'Búlgara', 'Canadense', 'Chilena', 'Chinesa', 'Colombiana', 'Congolesa', 'Coreana', 'Costarriquenha',
  'Cubana', 'Dinamarquesa', 'Egípcia', 'Equatoriana', 'Eslovaca', 'Espanhola', 'Filipina', 'Finlandesa', 'Francesa',
  'Grega', 'Guianense', 'Haitiana', 'Holandesa', 'Hondurenha', 'Húngara', 'Indiana', 'Indonésia', 'Iraniana',
  'Iraquiana', 'Irlandesa', 'Israelense', 'Italiana', 'Jamaicana', 'Japonesa', 'Libanesa', 'Marroquina', 'Mexicana',
  'Moçambicana', 'Nicaraguense', 'Nigeriana', 'Norueguesa', 'Panamenha', 'Paraguaia', 'Peruana', 'Polonesa',
  'Portuguesa', 'Romena', 'Russa', 'Salvadorenha', 'Senegalesa', 'Síria', 'Sul-africana', 'Sueca', 'Suíça',
  'Tailandesa', 'Taiwanesa', 'Turca', 'Ucraniana', 'Uruguaia', 'Venezuelana', 'Vietnamita', 'Ignorada'
];

const ORGAO_EXPEDIDOR_OPTIONS = [
  'SSP', 'DETRAN', 'Polícia Federal', 'Polícia Civil', 'IFP', 'IIRGD', 'Exército', 'Marinha', 'Aeronáutica', 'OAB',
  'CRM', 'CRC', 'CREA'
];

const CITIES_BY_UF: Record<string, string[]> = {};
function citiesForUf(uf?: string): string[] {
  if (!uf) return [];
  if (!CITIES_BY_UF[uf]) CITIES_BY_UF[uf] = cities(uf) || [];
  return CITIES_BY_UF[uf];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Aceita qualquer coisa digitada e devolve só os dígitos formatados como
// XXX.XXX.XXX-XX, truncando em 11 dígitos — nunca rejeita o que já foi
// digitado, só formata incrementalmente.
function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  let formatted = parts.join('.');
  if (digits.length > 9) formatted += `-${digits.slice(9, 11)}`;
  return formatted;
}

// Idade completa (anos) na data do óbito — nunca mais digitada à mão.
// undefined quando as duas datas não estão disponíveis ou não fazem sentido
// (óbito antes do nascimento, data inválida).
function calculateAgeAtDeath(nascimentoIso?: string, obitoIso?: string): number | undefined {
  if (!nascimentoIso || !obitoIso) return undefined;
  const birth = new Date(nascimentoIso);
  const death = new Date(obitoIso);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(death.getTime()) || death < birth) return undefined;
  let age = death.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = death.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && death.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

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
  const [extractionError, setExtractionError] = useState<AppError | null>(null);
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

  // Nascimento e data do óbito alimentam a idade calculada — qualquer edição
  // em um dos dois recalcula e grava a idade no mesmo patch (nunca duas
  // chamadas de set() em sequência, que perderiam a primeira por operarem
  // sobre o mesmo p0 da closure).
  const setNascimento = (v: string) => {
    const computed = calculateAgeAtDeath(v, p0.dataFalecimento);
    const patch: Partial<Phase0Data> = { nascimento: v };
    if (computed !== undefined) patch.idade = computed;
    set(patch);
    setFromIA((prev) => {
      const next = { ...prev };
      delete next.nascimento;
      if (computed !== undefined) delete next.idade;
      return next;
    });
  };
  const setDataFalecimento = (v: string) => {
    const computed = calculateAgeAtDeath(p0.nascimento, v);
    const patch: Partial<Phase0Data> = { dataFalecimento: v };
    if (computed !== undefined) patch.idade = computed;
    set(patch);
    setFromIA((prev) => {
      const next = { ...prev };
      delete next.dataFalecimento;
      if (computed !== undefined) delete next.idade;
      return next;
    });
  };
  const idadeCalculada = calculateAgeAtDeath(p0.nascimento, p0.dataFalecimento);
  const idadeExibida = idadeCalculada ?? p0.idade;

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
        setExtractionError({ message: 'Não foi possível identificar nenhum campo nesta imagem. Preencha manualmente ou tente outra foto.' });
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
      setExtractionError(toAppError(err, 'Erro ao extrair dados da Declaração de Óbito.'));
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

    // Diferente de Fase 4/5 (dupla assinatura, guardada dentro da própria fase):
    // a Fase 0 tem assinatura única e não guarda nada de assinatura dentro de
    // phase0 — só no registro de nível superior (signatures), mesmo padrão de
    // Fase 1/2/3. O hash é calculado sobre p0 e tem que continuar batendo com
    // o que realmente é salvo em phase0; se este objeto embutisse um campo de
    // assinatura, o servidor recalcularia o hash sobre o conteúdo JÁ com esse
    // campo, e nunca bateria com o hash calculado antes de adicioná-lo (bug
    // real encontrado em produção — COI-146, out/2026).
    const updated = { ...collection };
    updated.phase0 = p0;
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
            <ErrorNotice
              className="max-w-md mx-auto"
              code={extractionError.code}
              message={extractionError.message}
            />
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
                <SelectInput label="Nacionalidade" disabled={disabled} suggested={fromIA.nacionalidade} options={NACIONALIDADE_OPTIONS} value={p0.nacionalidade || ''} onChange={(v) => setField('nacionalidade', v)} />
                <SelectInput label="Naturalidade — UF" disabled={disabled} suggested={fromIA.naturalUf} options={UF_OPTIONS} value={p0.naturalUf || ''} onChange={(v) => setField('naturalUf', v as BrazilianUf)} />
                <SelectInput
                  label="Naturalidade — Cidade"
                  disabled={disabled || !p0.naturalUf}
                  suggested={fromIA.naturalCidade}
                  options={citiesForUf(p0.naturalUf)}
                  value={p0.naturalCidade || ''}
                  onChange={(v) => setField('naturalCidade', v)}
                />
                <TextInput label="Data de nascimento" type="date" max={todayIsoDate()} disabled={disabled} suggested={fromIA.nascimento} value={p0.nascimento || ''} onChange={setNascimento} />
                <ReadOnlyField label="Idade (calculada)" value={idadeExibida !== undefined ? `${idadeExibida} ano(s)` : ''} hint="Calculada a partir da data de nascimento e da data do óbito — não é digitada." />
                <SelectInput label="Estado civil" disabled={disabled} suggested={fromIA.estadoCivil} options={ESTADO_CIVIL_OPTIONS} value={p0.estadoCivil || ''} onChange={(v) => setField('estadoCivil', v as Phase0Data['estadoCivil'])} />
                <TextInput label="Profissão" disabled={disabled} suggested={fromIA.profissao} value={p0.profissao || ''} onChange={(v) => setField('profissao', v)} />
                <TextInput label="CPF" disabled={disabled} suggested={fromIA.cpf} value={p0.cpf || ''} onChange={(v) => setField('cpf', formatCpf(v))} />
                <TextInput label="RG — número" disabled={disabled} suggested={fromIA.rgNumero} value={p0.rgNumero || ''} onChange={(v) => setField('rgNumero', v)} />
                <SelectInput label="RG — órgão expedidor" disabled={disabled} suggested={fromIA.rgOrgaoExpedidor} options={ORGAO_EXPEDIDOR_OPTIONS} value={p0.rgOrgaoExpedidor || ''} onChange={(v) => setField('rgOrgaoExpedidor', v)} />
                <SelectInput label="RG — UF expedidor" disabled={disabled} suggested={fromIA.rgUfExpedidor} options={UF_OPTIONS} value={p0.rgUfExpedidor || ''} onChange={(v) => setField('rgUfExpedidor', v as BrazilianUf)} />
              </div>
            </FormSection>

            <FormSection title="Filiação">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <TextInput
                    label="Nome do pai"
                    disabled={disabled || Boolean(p0.paiNaoConsta)}
                    suggested={fromIA.paiNome}
                    value={p0.paiNaoConsta ? '' : p0.paiNome || ''}
                    onChange={(v) => setField('paiNome', v)}
                  />
                </div>
                <div className="flex items-end gap-3 pb-2.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={Boolean(p0.paiNaoConsta)}
                      onChange={(e) => {
                        setField('paiNaoConsta', e.target.checked);
                        if (e.target.checked) setField('paiNome', '');
                      }}
                    />
                    Não consta
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <input type="checkbox" disabled={disabled} checked={Boolean(p0.paiFalecido)} onChange={(e) => setField('paiFalecido', e.target.checked)} />
                    Falecido
                  </label>
                </div>
                <SelectInput label="Naturalidade do pai — UF" disabled={disabled} suggested={fromIA.paiNaturalUf} options={UF_OPTIONS} value={p0.paiNaturalUf || ''} onChange={(v) => setField('paiNaturalUf', v as BrazilianUf)} />
                <SelectInput
                  label="Naturalidade do pai — Cidade"
                  disabled={disabled || !p0.paiNaturalUf}
                  suggested={fromIA.paiNaturalCidade}
                  options={citiesForUf(p0.paiNaturalUf)}
                  value={p0.paiNaturalCidade || ''}
                  onChange={(v) => setField('paiNaturalCidade', v)}
                />
                <SelectInput label="Estado civil do pai" disabled={disabled} suggested={fromIA.paiEstadoCivil} options={ESTADO_CIVIL_OPTIONS} value={p0.paiEstadoCivil || ''} onChange={(v) => setField('paiEstadoCivil', v)} />
                <TextInput label="Profissão do pai" disabled={disabled} suggested={fromIA.paiProfissao} value={p0.paiProfissao || ''} onChange={(v) => setField('paiProfissao', v)} />

                <div className="sm:col-span-2">
                  <TextInput
                    label="Nome da mãe"
                    disabled={disabled || Boolean(p0.maeNaoConsta)}
                    suggested={fromIA.maeNome}
                    value={p0.maeNaoConsta ? '' : p0.maeNome || ''}
                    onChange={(v) => setField('maeNome', v)}
                  />
                </div>
                <div className="flex items-end gap-3 pb-2.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={Boolean(p0.maeNaoConsta)}
                      onChange={(e) => {
                        setField('maeNaoConsta', e.target.checked);
                        if (e.target.checked) setField('maeNome', '');
                      }}
                    />
                    Não consta
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <input type="checkbox" disabled={disabled} checked={Boolean(p0.maeFalecida)} onChange={(e) => setField('maeFalecida', e.target.checked)} />
                    Falecida
                  </label>
                </div>
                <SelectInput label="Naturalidade da mãe — UF" disabled={disabled} suggested={fromIA.maeNaturalUf} options={UF_OPTIONS} value={p0.maeNaturalUf || ''} onChange={(v) => setField('maeNaturalUf', v as BrazilianUf)} />
                <SelectInput
                  label="Naturalidade da mãe — Cidade"
                  disabled={disabled || !p0.maeNaturalUf}
                  suggested={fromIA.maeNaturalCidade}
                  options={citiesForUf(p0.maeNaturalUf)}
                  value={p0.maeNaturalCidade || ''}
                  onChange={(v) => setField('maeNaturalCidade', v)}
                />
                <SelectInput label="Estado civil da mãe" disabled={disabled} suggested={fromIA.maeEstadoCivil} options={ESTADO_CIVIL_OPTIONS} value={p0.maeEstadoCivil || ''} onChange={(v) => setField('maeEstadoCivil', v)} />
                <TextInput label="Profissão da mãe" disabled={disabled} suggested={fromIA.maeProfissao} value={p0.maeProfissao || ''} onChange={(v) => setField('maeProfissao', v)} />
              </div>
            </FormSection>

            <FormSection title="Cônjuge">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <TextInput
                    label="Nome do cônjuge"
                    disabled={disabled || Boolean(p0.conjugeNaoConsta)}
                    suggested={fromIA.conjugeNome}
                    value={p0.conjugeNaoConsta ? '' : p0.conjugeNome || ''}
                    onChange={(v) => setField('conjugeNome', v)}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 self-end pb-2.5">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={Boolean(p0.conjugeNaoConsta)}
                    onChange={(e) => {
                      setField('conjugeNaoConsta', e.target.checked);
                      if (e.target.checked) setField('conjugeNome', '');
                    }}
                  />
                  Não consta
                </label>
                <SelectInput label="Naturalidade do cônjuge — UF" disabled={disabled} suggested={fromIA.conjugeNaturalUf} options={UF_OPTIONS} value={p0.conjugeNaturalUf || ''} onChange={(v) => setField('conjugeNaturalUf', v as BrazilianUf)} />
                <SelectInput
                  label="Naturalidade do cônjuge — Cidade"
                  disabled={disabled || !p0.conjugeNaturalUf}
                  suggested={fromIA.conjugeNaturalCidade}
                  options={citiesForUf(p0.conjugeNaturalUf)}
                  value={p0.conjugeNaturalCidade || ''}
                  onChange={(v) => setField('conjugeNaturalCidade', v)}
                />
                <SelectInput label="Estado civil do cônjuge" disabled={disabled} suggested={fromIA.conjugeEstadoCivil} options={ESTADO_CIVIL_OPTIONS} value={p0.conjugeEstadoCivil || ''} onChange={(v) => setField('conjugeEstadoCivil', v)} />
                <TextInput label="Profissão do cônjuge" disabled={disabled} suggested={fromIA.conjugeProfissao} value={p0.conjugeProfissao || ''} onChange={(v) => setField('conjugeProfissao', v)} />
              </div>
            </FormSection>

            <FormSection title="Dados do Óbito">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextInput label="Local do falecimento" disabled={disabled} suggested={fromIA.localFalecimento} value={p0.localFalecimento || ''} onChange={(v) => setField('localFalecimento', v)} />
                <SelectInput label="UF" disabled={disabled} suggested={fromIA.obitoUf} options={UF_OPTIONS} value={p0.obitoUf || ''} onChange={(v) => setField('obitoUf', v as BrazilianUf)} />
                <SelectInput
                  label="Cidade"
                  disabled={disabled || !p0.obitoUf}
                  suggested={fromIA.obitoCidade}
                  options={citiesForUf(p0.obitoUf)}
                  value={p0.obitoCidade || ''}
                  onChange={(v) => setField('obitoCidade', v)}
                />
                <TextInput label="Data do falecimento" type="date" max={todayIsoDate()} disabled={disabled} suggested={fromIA.dataFalecimento} value={p0.dataFalecimento || ''} onChange={setDataFalecimento} />
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
  max?: string;
  suggested?: boolean;
  onChange: (v: string) => void;
}> = ({ label, value, disabled, type = 'text', max, suggested, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">
      {label}
      {suggested && <IaTag />}
    </label>
    <input
      type={type}
      max={max}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2.5 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white ${
        suggested ? 'border-dashed border-amber-400 dark:border-amber-600' : 'border-slate-300 dark:border-slate-700'
      }`}
    />
  </div>
);

const ReadOnlyField: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">{label}</label>
    <div
      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs"
      title={hint}
    >
      {value || '—'}
    </div>
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
