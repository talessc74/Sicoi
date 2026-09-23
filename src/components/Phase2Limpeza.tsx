import React, { useState } from 'react';
import { OsteologicalCollection, UserProfile, FieldWithAiSuggestion } from '../types/sgccco';
import { PopConversationalConductor } from './PopConversationalConductor';
import { calculateSha256, generateSignaturePayload } from '../services/auditService';
import { Droplet, Wind, Clock, CheckCircle2, ShieldCheck, Bot, FileText, Sparkles, Box } from 'lucide-react';

interface Phase2LimpezaProps {
  collection: OsteologicalCollection;
  currentUser: UserProfile;
  onUpdateCollection: (updated: OsteologicalCollection) => void;
  laboratoryMode: boolean;
}

export const Phase2Limpeza: React.FC<Phase2LimpezaProps> = ({ collection, currentUser, onUpdateCollection }) => {
  const [interactionMode, setInteractionMode] = useState<'conversacional' | 'formulario'>('conversacional');
  const [showSignModal, setShowSignModal] = useState(false);
  const [signing, setSigning] = useState(false);

  const phaseSignature = collection.signatures.find((s) => s.phaseNumber === 2);
  const isLocked = phaseSignature?.status === 'locked';
  const isTechnician = currentUser.role === 'tecnico';

  const p2 = collection.phase2;
  const boxes = collection.phase1.preliminaryBoxes;
  const allBoxesDry = boxes.length > 0 && boxes.every((b) => b.cleaningStatus === 'seca');

  const setField = <K extends keyof typeof p2>(key: K, value: FieldWithAiSuggestion<any>) => {
    onUpdateCollection({ ...collection, phase2: { ...collection.phase2, [key]: value } });
  };

  const handleUpdateBoxStatus = (boxId: string, newStatus: (typeof boxes)[0]['cleaningStatus']) => {
    const updated = { ...collection };
    updated.phase1 = {
      ...updated.phase1,
      preliminaryBoxes: updated.phase1.preliminaryBoxes.map((b) => {
        if (b.id !== boxId) return b;
        const next = { ...b, cleaningStatus: newStatus };
        if (newStatus === 'em_secagem' && !next.dryingStartedAt) {
          next.dryingStartedAt = new Date().toISOString();
          next.dryingDurationHours = 0;
        } else if (newStatus === 'seca' && !next.dryingDurationHours) {
          next.dryingDurationHours = 72;
        }
        return next;
      })
    };

    const allDry = updated.phase1.preliminaryBoxes.every((b) => b.cleaningStatus === 'seca');
    updated.phase2 = {
      ...updated.phase2,
      dryingConfirmationAllBoxes: allDry,
      ...(allDry ? { dryingConfirmedAt: new Date().toISOString(), dryingConfirmedBy: currentUser.name } : {})
    };

    onUpdateCollection(updated);
  };

  const requiredFieldsFilled =
    Boolean(p2.maceracaoTemperaturaC.value) &&
    Boolean(p2.maceracaoDuracaoHoras.value) &&
    Boolean(p2.maceracaoResultado.value) &&
    p2.limpezaManualRealizada.value === true &&
    Boolean(p2.secagemTemperaturaC.value) &&
    p2.dryingConfirmationAllBoxes &&
    Boolean(p2.acondicionamentoCaixaOssuariaCodigo.value) &&
    p2.acondicionamentoPlacaNicQrFixada.value === true;

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

  const canSign = requiredFieldsFilled && allBoxesDry && isTechnician;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <Droplet className="w-4 h-4" />
              <span>Fase 2 · Maceração, Limpeza e Secagem (POP-01 §9.5-9.7)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">{collection.nic}</h2>
            <p className="text-xs text-slate-500 mt-1">Controle de maceração, limpeza manual, secagem completa e acondicionamento em caixa ossuária.</p>
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
                disabled={!canSign}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold hover:opacity-95 disabled:opacity-40 transition-all flex items-center gap-2 shadow-xs"
                title={!allBoxesDry ? 'Todas as caixas devem estar com status "Seca" para liberar a assinatura.' : ''}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assinar Fase 2</span>
              </button>
            )}
          </div>
        </div>
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
            <span>Formulário Manual (§9.5-9.7)</span>
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

              <SummaryRow label="Maceração" value={p2.maceracaoTemperaturaC.value ? `${p2.maceracaoTemperaturaC.value}°C · ${p2.maceracaoDuracaoHoras.value || '?'}h · ${p2.maceracaoResultado.value || ''}` : undefined} />
              <SummaryRow label="Limpeza Manual" value={p2.limpezaManualRealizada.value === undefined ? undefined : p2.limpezaManualRealizada.value ? 'Realizada' : 'Não realizada'} />
              <SummaryRow label="Secagem" value={p2.secagemTemperaturaC.value ? `${p2.secagemTemperaturaC.value}°C · Completa: ${p2.dryingConfirmationAllBoxes ? 'sim' : 'não'}` : undefined} />
              <SummaryRow label="Acondicionamento" value={p2.acondicionamentoCaixaOssuariaCodigo.value ? `Caixa ${p2.acondicionamentoCaixaOssuariaCodigo.value} · Placa: ${p2.acondicionamentoPlacaNicQrFixada.value ? 'fixada' : 'pendente'}` : undefined} />

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Caixas:</span>
                {boxes.map((box) => (
                  <div key={box.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
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
                        <span className="text-xs text-slate-600 dark:text-slate-300">{box.presumedIndividualLabel}</span>
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

            {/* Formulário de Maceração, Limpeza, Secagem e Acondicionamento */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Droplet className="w-4 h-4 text-sky-600" />
                Maceração, Limpeza, Secagem e Acondicionamento (POP-01 §9.5-9.7)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <NumberInput label="Temp. maceração (°C) *" disabled={isLocked} value={p2.maceracaoTemperaturaC.value} onChange={(v) => setField('maceracaoTemperaturaC', { value: v, isAiSuggested: false })} />
                <NumberInput label="Duração (horas) *" disabled={isLocked} value={p2.maceracaoDuracaoHoras.value} onChange={(v) => setField('maceracaoDuracaoHoras', { value: v, isAiSuggested: false })} />
                <SelectInput
                  label="Resultado *"
                  disabled={isLocked}
                  value={p2.maceracaoResultado.value || ''}
                  options={[
                    { value: 'satisfatoria', label: 'Satisfatória' },
                    { value: 'necessitou_novo_ciclo', label: 'Necessitou novo ciclo' }
                  ]}
                  onChange={(v) => setField('maceracaoResultado', { value: v, isAiSuggested: false })}
                />
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Limpeza manual realizada *</span>
                <label className="flex items-center gap-1.5">
                  <input type="radio" disabled={isLocked} checked={p2.limpezaManualRealizada.value === true} onChange={() => setField('limpezaManualRealizada', { value: true, isAiSuggested: false })} />
                  Sim
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" disabled={isLocked} checked={p2.limpezaManualRealizada.value === false} onChange={() => setField('limpezaManualRealizada', { value: false, isAiSuggested: false })} />
                  Não
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberInput label="Temp. estufa (°C) *" disabled={isLocked} value={p2.secagemTemperaturaC.value} onChange={(v) => setField('secagemTemperaturaC', { value: v, isAiSuggested: false })} />
                <div className="flex items-center gap-3 text-xs pt-5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Secagem completa (todas as caixas) *</span>
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={p2.dryingConfirmationAllBoxes}
                    onChange={(e) =>
                      onUpdateCollection({
                        ...collection,
                        phase2: {
                          ...collection.phase2,
                          dryingConfirmationAllBoxes: e.target.checked,
                          ...(e.target.checked ? { dryingConfirmedAt: new Date().toISOString(), dryingConfirmedBy: currentUser.name } : {})
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextInput label="Código da caixa ossuária *" disabled={isLocked} value={p2.acondicionamentoCaixaOssuariaCodigo.value || ''} onChange={(v) => setField('acondicionamentoCaixaOssuariaCodigo', { value: v, isAiSuggested: false })} />
                <div className="flex items-center gap-2 text-xs pt-5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Placa NIC/QR fixada *</span>
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={p2.acondicionamentoPlacaNicQrFixada.value === true}
                    onChange={(e) => setField('acondicionamentoPlacaNicQrFixada', { value: e.target.checked, isAiSuggested: false })}
                  />
                </div>
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
                estão secas e o Formulário §9.5-9.7 está completo.
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
              Eu, {currentUser.name}, técnico responsável, atesto que o conjunto {collection.nic} passou pela maceração,
              limpeza manual e secagem (POP-01 §9.5-9.6) e foi acondicionado em caixa ossuária (§9.7).
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
