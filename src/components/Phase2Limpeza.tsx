import React, { useState } from 'react';
import { OsteologicalCollection, UserProfile, FieldWithAiSuggestion, CleaningInstrument } from '../types/sgccco';
import { PopConversationalConductor } from './PopConversationalConductor';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { getLatestPhaseSignature } from '../utils/signatures';
import { canPerformRole } from '../utils/permissions';
import { Droplet, Wind, Clock, CheckCircle2, ShieldCheck, Bot, FileText, Sparkles, Box, Save, AlertCircle } from 'lucide-react';

const INSTRUMENT_OPTIONS: { value: CleaningInstrument; label: string }[] = [
  { value: 'esponja', label: 'Esponja' },
  { value: 'escova_dentes', label: 'Escova de dentes' },
  { value: 'escova_grande', label: 'Escova grande' },
  { value: 'lamina_bisturi', label: 'Lâmina de bisturi' },
  { value: 'faca', label: 'Faca' },
  { value: 'pinca', label: 'Pinça' },
  { value: 'pinceis', label: 'Pincéis' },
  { value: 'maquina_redutora_corpos', label: 'Máquina redutora de corpos' },
  { value: 'panela_fogao', label: 'Panela/Fogão' },
  { value: 'outra', label: 'Outra' }
];

function toggleInArray<T>(arr: T[] | undefined, value: T): T[] {
  const current = arr || [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

interface Phase2LimpezaProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase2Limpeza: React.FC<Phase2LimpezaProps> = ({ collection, currentUser, onUpdateCollection }) => {
  const [interactionMode, setInteractionMode] = useState<'conversacional' | 'formulario'>('conversacional');
  const [showSignModal, setShowSignModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [signing, setSigning] = useState(false);

  const phaseSignature = getLatestPhaseSignature(collection.signatures, 2);
  const isLocked = phaseSignature?.status === 'locked';
  const canActAsTechnician = canPerformRole(currentUser.role, 'tecnico');

  const p2 = collection.phase2;
  // O status de limpeza/secagem vive em phase2.boxDryingStatus (não em
  // phase1.preliminaryBoxes — ver comentário em BoxDryingStatus, types/sgccco.ts).
  // Uma caixa sem entrada ainda é 'pendente'. Faz o merge aqui pra manter o resto do
  // componente (JSX, allBoxesDry) lendo box.cleaningStatus como antes.
  const boxes = collection.phase1.preliminaryBoxes.map((box) => {
    const drying = p2.boxDryingStatus.find((d) => d.boxId === box.id);
    return {
      ...box,
      cleaningStatus: drying?.cleaningStatus || ('pendente' as const),
      dryingStartedAt: drying?.dryingStartedAt,
      dryingDurationHours: drying?.dryingDurationHours
    };
  });
  const allBoxesDry = boxes.length > 0 && boxes.every((b) => b.cleaningStatus === 'seca');

  const setField = <K extends keyof typeof p2>(key: K, value: FieldWithAiSuggestion<any>) => {
    onUpdateCollection({ ...collection, phase2: { ...collection.phase2, [key]: value } });
  };

  const handleUpdateBoxStatus = (boxId: string, newStatus: (typeof boxes)[0]['cleaningStatus']) => {
    // Escreve só em phase2 — nunca em phase1. A Fase 1 já está assinada e travada quando
    // a Fase 2 começa; se isto mexesse em phase1.preliminaryBoxes, o servidor recalcularia
    // um hash diferente do que foi assinado e rejeitaria a gravação inteira com
    // "Assinatura inválida" (o status mudava na tela e sumia de volta no próximo reload —
    // era exatamente esse o bug).
    const existing = p2.boxDryingStatus.find((d) => d.boxId === boxId);
    const next = {
      boxId,
      cleaningStatus: newStatus,
      dryingStartedAt: existing?.dryingStartedAt,
      dryingDurationHours: existing?.dryingDurationHours
    };
    if (newStatus === 'em_secagem' && !next.dryingStartedAt) {
      next.dryingStartedAt = new Date().toISOString();
      next.dryingDurationHours = 0;
    } else if (newStatus === 'seca' && !next.dryingDurationHours) {
      next.dryingDurationHours = 72;
    }

    const updatedBoxDryingStatus = [...p2.boxDryingStatus.filter((d) => d.boxId !== boxId), next];
    const allDry = collection.phase1.preliminaryBoxes.every(
      (b) => updatedBoxDryingStatus.find((d) => d.boxId === b.id)?.cleaningStatus === 'seca'
    );

    const updated: OsteologicalCollection = {
      ...collection,
      phase2: {
        ...collection.phase2,
        boxDryingStatus: updatedBoxDryingStatus,
        dryingConfirmationAllBoxes: allDry,
        ...(allDry ? { dryingConfirmedAt: new Date().toISOString(), dryingConfirmedBy: currentUser.name } : {})
      }
    };

    onUpdateCollection(updated);
  };

  // Itemizado (em vez de um booleano só) para poder mostrar exatamente o que falta —
  // mesma lógica já usada na Fase 1, que corrigiu o mesmo tipo de bloqueio silencioso.
  const missingFieldLabels: string[] = [];
  if (!Boolean(p2.equipeEnvolvidaLimpeza.value)) missingFieldLabels.push('equipe envolvida');
  if (!Boolean(p2.dataAnalise.value)) missingFieldLabels.push('data da análise');
  if (!Boolean(p2.horaAnalise.value)) missingFieldLabels.push('hora da análise');
  if ((p2.instrumentosUtilizados.value?.length || 0) === 0) missingFieldLabels.push('instrumentos utilizados');
  if (p2.houveDanosMaceracao.value === undefined) missingFieldLabels.push('se houve dano na maceração');
  if (p2.houveDanosMaceracao.value === true && !Boolean(p2.descricaoDanosMaceracao.value)) missingFieldLabels.push('descrição do dano na maceração');
  if (!Boolean(p2.formaSecagem.value)) missingFieldLabels.push('forma de secagem');
  // A secagem completa não é mais uma caixa de marcar à parte: vem do status "Seca" de
  // cada caixa (handleBoxStatus já grava dryingConfirmationAllBoxes), e o bloqueio
  // correspondente é o allBoxesDry, logo abaixo.
  const requiredFieldsFilled = missingFieldLabels.length === 0;

  // O preenchimento já salva sozinho a cada campo (onUpdateCollection é chamado em todo
  // setField) — este botão não faz nada tecnicamente novo, só reenvia o estado atual e dá
  // uma confirmação visual local, pra quem quer ter certeza antes de sair da tela.
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
      phaseNumber: 2,
      signedBy: currentUser.id,
      role: currentUser.role,
      timestamp,
      dataSnapshotJson: JSON.stringify(collection.phase2)
    });
    const hash = await calculateSha256(payload);

    const updated = { ...collection };
    updated.signatures = [
      ...updated.signatures.map((s) => (s.phaseNumber === 2 ? { ...s, status: 'unlocked_for_revision' as const } : s)),
      {
        phaseNumber: 2 as const,
        signedBy: currentUser.id,
        signedByName: currentUser.name,
        signedByRole: currentUser.role,
        signedAt: timestamp,
        sha256Hash: hash,
        status: 'locked' as const
      }
    ];
    if (updated.currentPhase < 3) {
      updated.currentPhase = 3;
    }

    setSigning(false);
    setShowSignModal(false);
    onUpdateCollection(updated);
  };

  const canSign = requiredFieldsFilled && allBoxesDry && canActAsTechnician;
  const signBlockers: string[] = [...missingFieldLabels];
  if (!allBoxesDry) signBlockers.push('todas as caixas precisam estar com status "Seca"');
  if (!canActAsTechnician) signBlockers.push(`a pessoa ativa agora ("${currentUser.name}") tem o papel "${currentUser.role}" — Técnico ou Curador pode assinar a Fase 2. Troque a pessoa ativa no menu de perfil, no topo da tela.`);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <Droplet className="w-4 h-4" />
              <span>Fase 2 · Maceração, Limpeza e Secagem (POP-01 §9.5-9.6)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">{collection.nic}</h2>
            <p className="text-xs text-slate-500 mt-1">Formulário A.2: maceração, instrumentos utilizados, danos e forma de secagem, até a confirmação de secagem completa.</p>
          </div>

          <div className="flex items-center gap-3">
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
            {isLocked ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Fase 2 Assinada & Concluída</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSignModal(true)}
                disabled={!canSign}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={signBlockers.length > 0 ? `Ainda não é possível assinar: ${signBlockers.join('; ')}` : undefined}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinar Fase 2</span>
              </button>
            )}
          </div>
        </div>

        {!isLocked && signBlockers.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-semibold mb-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Ainda falta o seguinte para poder concluir e assinar a Fase 2:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {signBlockers.map((blocker, idx) => (
                <li key={idx}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Seletor de Modo de Interação */}
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
            <span>Formulário Manual (§9.5-9.6)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-3 hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>POP-01 · Maceração, Limpeza e Secagem</span>
        </div>
      </div>

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

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Status da Fase 2 (Ao Vivo)
                </h4>
                <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Fase 2
                </span>
              </div>

              <SummaryRow label="Equipe" value={p2.equipeEnvolvidaLimpeza.value} />
              <SummaryRow label="Maceração" value={p2.instrumentosUtilizados.value?.length ? `${p2.maceracaoCiclosNecessarios.value ?? '?'} ciclo(s) · ${p2.instrumentosUtilizados.value.join(', ')}` : undefined} />
              <SummaryRow label="Danos" value={p2.houveDanosMaceracao.value === undefined ? undefined : p2.houveDanosMaceracao.value ? p2.descricaoDanosMaceracao.value : 'Nenhum'} />
              <SummaryRow label="Secagem" value={p2.formaSecagem.value ? `${p2.formaSecagem.value} · Completa: ${p2.dryingConfirmationAllBoxes ? 'sim' : 'não'}` : undefined} />

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Caixas:</span>
                {boxes.map((box) => (
                  <div key={box.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{box.boxCode}</div>
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

              <div className="pt-2">
                {isLocked ? (
                  <div className="w-full text-center py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    ✓ Fase 2 Assinada
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSignModal(true)}
                    disabled={!canSign}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Wind className="w-4 h-4 text-amber-500" />
                  Status de Limpeza e Secagem por Caixa
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {boxes.filter((b) => b.cleaningStatus === 'seca').length} de {boxes.length} caixas secas
                </span>
              </div>

              <div className="space-y-3">
                {boxes.map((box) => (
                  <div key={box.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{box.boxCode}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold uppercase ${
                          box.cleaningStatus === 'seca'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : box.cleaningStatus === 'em_secagem'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
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

            {/* Formulário A.2 — Maceração e Secagem */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Droplet className="w-4 h-4 text-sky-600" />
                Formulário A.2 — Análise Preliminar e Limpeza (Maceração e Secagem)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextInput label="Equipe envolvida na limpeza *" disabled={isLocked} value={p2.equipeEnvolvidaLimpeza.value || ''} onChange={(v) => setField('equipeEnvolvidaLimpeza', { value: v, isAiSuggested: false })} />
                <DateInput label="Data *" disabled={isLocked} value={p2.dataAnalise.value || ''} onChange={(v) => setField('dataAnalise', { value: v, isAiSuggested: false })} />
                <TextInput label="Hora (ex: 11h20min) *" disabled={isLocked} value={p2.horaAnalise.value || ''} onChange={(v) => setField('horaAnalise', { value: v, isAiSuggested: false })} />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Maceração</h4>
                <NumberInput label="Quantos ciclos foram necessários?" disabled={isLocked} value={p2.maceracaoCiclosNecessarios.value} onChange={(v) => setField('maceracaoCiclosNecessarios', { value: v, isAiSuggested: false })} />
                <span className="block text-slate-600 dark:text-slate-400 font-medium text-xs mt-2">Instrumentos utilizados *</span>
                <MultiChip
                  options={INSTRUMENT_OPTIONS}
                  selected={p2.instrumentosUtilizados.value || []}
                  disabled={isLocked}
                  onToggle={(v) => setField('instrumentosUtilizados', { value: toggleInArray(p2.instrumentosUtilizados.value, v), isAiSuggested: false })}
                />
                {p2.instrumentosUtilizados.value?.includes('outra') && (
                  <TextInput label="Outra (descrição)" disabled={isLocked} value={p2.instrumentosOutraDescricao.value || ''} onChange={(v) => setField('instrumentosOutraDescricao', { value: v, isAiSuggested: false })} />
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Danos</h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Houve dano(s) durante a maceração? *</span>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" disabled={isLocked} checked={p2.houveDanosMaceracao.value === true} onChange={() => setField('houveDanosMaceracao', { value: true, isAiSuggested: false })} />
                    Sim
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" disabled={isLocked} checked={p2.houveDanosMaceracao.value === false} onChange={() => setField('houveDanosMaceracao', { value: false, isAiSuggested: false })} />
                    Não
                  </label>
                </div>
                {p2.houveDanosMaceracao.value === true && (
                  <TextInput label="Descreva o(s) dano(s) *" disabled={isLocked} value={p2.descricaoDanosMaceracao.value || ''} onChange={(v) => setField('descricaoDanosMaceracao', { value: v, isAiSuggested: false })} />
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400">Secagem</h4>
                <SelectInput
                  label="Forma de secagem *"
                  disabled={isLocked}
                  value={p2.formaSecagem.value || ''}
                  options={[
                    { value: 'estufa', label: 'Estufa' },
                    { value: 'aquecedor', label: 'Aquecedor' },
                    { value: 'temperatura_ambiente', label: 'Temperatura ambiente' }
                  ]}
                  onChange={(v) => setField('formaSecagem', { value: v, isAiSuggested: false })}
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita: Regras de Bloqueio */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4>Critério de Bloqueio Sequencial (§6)</h4>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                O material só avança para a Fase 3 (Acondicionamento Provisório) após confirmação de que todas as caixas
                estão secas e o Formulário §9.5-9.6 está completo.
              </p>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Total de Caixas:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{boxes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caixas Secas:</span>
                  <span className={`font-bold ${allBoxesDry ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {boxes.filter((b) => b.cleaningStatus === 'seca').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pronto para Fase 3:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{canSign ? 'SIM (Apto)' : 'NÃO (Pendente)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura da Fase 2 */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Assinatura Técnica — Fase 2</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Eu, {currentUser.name}, técnico responsável, atesto que o conjunto {collection.nic} passou pela maceração
              e secagem conforme o Formulário A.2 (POP-01 §9.5-9.6), com todas as caixas confirmadas secas.
            </p>

            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setShowSignModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Cancelar
              </button>
              <button onClick={handleSignPhase} disabled={signing} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5">
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

const SummaryRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">{label}:</span>
    <p className="text-slate-700 dark:text-slate-300 text-[11px]">{value || <span className="text-slate-400 italic">Ainda não preenchido</span>}</p>
  </div>
);

const TextInput: React.FC<{ label: string; value: string; disabled?: boolean; onChange: (v: string) => void }> = ({ label, value, disabled, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">{label}</label>
    <input
      type="text"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
    />
  </div>
);

const DateInput: React.FC<{ label: string; value: string; disabled?: boolean; onChange: (v: string) => void }> = ({ label, value, disabled, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">{label}</label>
    <input
      type="date"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
    />
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

const NumberInput: React.FC<{ label: string; value: number | undefined; disabled?: boolean; onChange: (v: number) => void }> = ({ label, value, disabled, onChange }) => (
  <div>
    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-xs">{label}</label>
    <input
      type="number"
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
    />
  </div>
);

const SelectInput: React.FC<{ label: string; value: string; disabled?: boolean; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({
  label,
  value,
  disabled,
  options,
  onChange
}) => (
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
