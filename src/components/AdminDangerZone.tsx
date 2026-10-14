import React, { useEffect, useMemo, useState } from 'react';
import { OsteologicalCollection, UserProfile } from '../types/sgccco';
import {
  ShieldAlert,
  Trash2,
  RotateCcw,
  Package,
  FolderX,
  Bomb,
  Loader2,
  History
} from 'lucide-react';
import {
  fetchDeletedCollections,
  fetchAdminActions,
  deleteCollectionApi,
  restoreCollectionApi,
  deleteAllCollectionsApi,
  restoreAllCollectionsApi,
  deleteBoxApi,
  restoreBoxApi,
  DeletedCollectionSummary,
  AdminActionRow
} from '../services/adminService';

interface AdminDangerZoneProps {
  currentUser: UserProfile;
  collections: OsteologicalCollection[];
  onRefreshCollections: () => Promise<void>;
}

const ACTION_LABELS: Record<string, string> = {
  excluir_caixa: 'Excluiu a caixa',
  restaurar_caixa: 'Restaurou a caixa',
  excluir_conjunto: 'Excluiu o conjunto',
  restaurar_conjunto: 'Restaurou o conjunto',
  excluir_tudo: 'Excluiu todos os conjuntos',
  restaurar_tudo: 'Restaurou todos os conjuntos'
};

export const AdminDangerZone: React.FC<AdminDangerZoneProps> = ({ currentUser, collections, onRefreshCollections }) => {
  const [deletedCollections, setDeletedCollections] = useState<DeletedCollectionSummary[]>([]);
  const [actions, setActions] = useState<AdminActionRow[]>([]);
  const [isLoadingTrail, setIsLoadingTrail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Caixa
  const [boxNic, setBoxNic] = useState('');
  const [boxId, setBoxId] = useState('');
  const [boxReason, setBoxReason] = useState('');

  // Conjunto
  const [collectionNic, setCollectionNic] = useState('');
  const [collectionReason, setCollectionReason] = useState('');
  const [collectionConfirm, setCollectionConfirm] = useState('');

  // Tudo
  const [allReason, setAllReason] = useState('');
  const [allConfirm, setAllConfirm] = useState('');

  const refreshTrail = async () => {
    setIsLoadingTrail(true);
    try {
      const [deleted, log] = await Promise.all([
        fetchDeletedCollections(),
        fetchAdminActions()
      ]);
      setDeletedCollections(deleted);
      setActions(log);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar a trilha de ações administrativas.');
    } finally {
      setIsLoadingTrail(false);
    }
  };

  useEffect(() => {
    refreshTrail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBoxesByNic = useMemo(
    () =>
      collections.map((c) => ({
        nic: c.nic,
        boxes: c.phase1.preliminaryBoxes.filter((b) => !b.deletedAt)
      })),
    [collections]
  );

  const deletedBoxes = useMemo(
    () =>
      collections.flatMap((c) =>
        c.phase1.preliminaryBoxes.filter((b) => b.deletedAt).map((b) => ({ nic: c.nic, box: b }))
      ),
    [collections]
  );

  const boxesForSelectedNic = activeBoxesByNic.find((c) => c.nic === boxNic)?.boxes || [];

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      await Promise.all([onRefreshCollections(), refreshTrail()]);
    } catch (err: any) {
      setError(err?.message || 'A ação não pôde ser concluída.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteBox = () =>
    runAction(async () => {
      await deleteBoxApi(boxNic, boxId, boxReason.trim());
      setBoxNic('');
      setBoxId('');
      setBoxReason('');
    });

  const handleRestoreBox = (nic: string, id: string) =>
    runAction(async () => {
      await restoreBoxApi(nic, id);
    });

  const handleDeleteCollection = () =>
    runAction(async () => {
      await deleteCollectionApi(collectionNic, collectionReason.trim());
      setCollectionNic('');
      setCollectionReason('');
      setCollectionConfirm('');
    });

  const handleRestoreCollection = (nic: string) =>
    runAction(async () => {
      await restoreCollectionApi(nic);
    });

  const handleDeleteAll = () =>
    runAction(async () => {
      await deleteAllCollectionsApi(allReason.trim());
      setAllReason('');
      setAllConfirm('');
    });

  const handleRestoreAll = () =>
    runAction(async () => {
      await restoreAllCollectionsApi();
    });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 shadow-xs overflow-hidden text-xs">
      <div className="p-5 border-b border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
        <h3 className="font-bold text-sm text-rose-700 dark:text-rose-300 font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Zona de Risco — Administrador
        </h3>
        <p className="text-rose-700/80 dark:text-rose-300/70 mt-1 leading-relaxed">
          Nada aqui apaga um registro para sempre: toda exclusão só esconde o dado e pode ser restaurada ("Desfazer") a
          qualquer momento na lista abaixo. Cada ação fica gravada — quem, quando, o quê e por quê — numa trilha
          própria que sobrevive a qualquer exclusão. O servidor reconfere, pela sua sessão de login, que você é
          Administrador a cada chamada — ficará registrado em nome de <strong>{currentUser.name}</strong>.
        </p>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-mono">
          {error}
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Excluir caixa */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Package className="w-3.5 h-3.5" /> Excluir uma caixa
          </div>
          <select
            value={boxNic}
            onChange={(e) => { setBoxNic(e.target.value); setBoxId(''); }}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">Selecione o conjunto (COI)…</option>
            {activeBoxesByNic.filter((c) => c.boxes.length > 0).map((c) => (
              <option key={c.nic} value={c.nic}>{c.nic}</option>
            ))}
          </select>
          <select
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            disabled={!boxNic}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
          >
            <option value="">Selecione a caixa…</option>
            {boxesForSelectedNic.map((b) => (
              <option key={b.id} value={b.id}>{b.boxCode}</option>
            ))}
          </select>
          <textarea
            value={boxReason}
            onChange={(e) => setBoxReason(e.target.value)}
            placeholder="Justificativa (obrigatória)"
            rows={2}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <button
            onClick={handleDeleteBox}
            disabled={isBusy || !boxNic || !boxId || !boxReason.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-40"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir caixa
          </button>
          <p className="text-slate-400 text-[10px] leading-snug">
            Se a Fase 1 já estiver assinada, isto reabre a fase automaticamente com esta justificativa — igual a
            qualquer outra correção pós-assinatura.
          </p>
        </div>

        {/* Excluir conjunto */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <FolderX className="w-3.5 h-3.5" /> Excluir um conjunto
          </div>
          <select
            value={collectionNic}
            onChange={(e) => { setCollectionNic(e.target.value); setCollectionConfirm(''); }}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="">Selecione o conjunto (COI)…</option>
            {collections.map((c) => (
              <option key={c.nic} value={c.nic}>{c.nic}</option>
            ))}
          </select>
          <textarea
            value={collectionReason}
            onChange={(e) => setCollectionReason(e.target.value)}
            placeholder="Justificativa (obrigatória)"
            rows={2}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          {collectionNic && (
            <input
              type="text"
              value={collectionConfirm}
              onChange={(e) => setCollectionConfirm(e.target.value)}
              placeholder={`Digite ${collectionNic} para confirmar`}
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            />
          )}
          <button
            onClick={handleDeleteCollection}
            disabled={isBusy || !collectionNic || !collectionReason.trim() || collectionConfirm !== collectionNic}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-40"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir conjunto
          </button>
        </div>

        {/* Excluir tudo */}
        <div className="p-4 rounded-xl border-2 border-rose-300 dark:border-rose-900 space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
            <Bomb className="w-3.5 h-3.5" /> Excluir todos os dados
          </div>
          <p className="text-slate-500 text-[10px] leading-snug">
            Esconde <strong>todos os {collections.length} conjuntos</strong> ativos de uma vez. Reversível — "Restaurar tudo" traz todos de volta.
          </p>
          <textarea
            value={allReason}
            onChange={(e) => setAllReason(e.target.value)}
            placeholder="Justificativa (obrigatória)"
            rows={2}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={allConfirm}
            onChange={(e) => setAllConfirm(e.target.value)}
            placeholder='Digite "EXCLUIR TUDO" para confirmar'
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
          />
          <button
            onClick={handleDeleteAll}
            disabled={isBusy || collections.length === 0 || !allReason.trim() || allConfirm !== 'EXCLUIR TUDO'}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold disabled:opacity-40"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bomb className="w-3.5 h-3.5" />}
            Excluir todos os dados
          </button>
        </div>
      </div>

      {/* Excluídos recentemente — restaurar */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Excluídos recentemente
          </h4>
          {deletedCollections.length > 0 && (
            <button
              onClick={handleRestoreAll}
              disabled={isBusy}
              className="text-sky-600 dark:text-sky-400 font-semibold hover:underline disabled:opacity-40"
            >
              Restaurar tudo
            </button>
          )}
        </div>

        {isLoadingTrail && <p className="text-slate-400">Carregando…</p>}

        {!isLoadingTrail && deletedCollections.length === 0 && deletedBoxes.length === 0 && (
          <p className="text-slate-400">Nada excluído no momento.</p>
        )}

        {deletedCollections.map((c) => (
          <div key={c.nic} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40">
            <div>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{c.nic}</span>
              <span className="text-slate-400 ml-2">conjunto · excluído por {c.deletedByName || 'desconhecido'} — {c.deletedReason}</span>
            </div>
            <button
              onClick={() => handleRestoreCollection(c.nic)}
              disabled={isBusy}
              className="px-2.5 py-1 rounded-lg border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-semibold disabled:opacity-40"
            >
              Restaurar
            </button>
          </div>
        ))}

        {deletedBoxes.map(({ nic, box }) => (
          <div key={`${nic}-${box.id}`} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40">
            <div>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{box.boxCode}</span>
              <span className="text-slate-400 ml-2">caixa de {nic} · excluída por {box.deletedByName || 'desconhecido'} — {box.deletedReason}</span>
            </div>
            <button
              onClick={() => handleRestoreBox(nic, box.id)}
              disabled={isBusy}
              className="px-2.5 py-1 rounded-lg border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-semibold disabled:opacity-40"
            >
              Restaurar
            </button>
          </div>
        ))}
      </div>

      {/* Trilha completa de ações administrativas */}
      {actions.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Trilha de ações administrativas
          </h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {actions.map((a) => (
              <div key={a.id} className="py-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-mono text-[10px] text-slate-400">
                  {new Date(a.performedAt).toLocaleString('pt-BR')}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  <strong>{a.actorName || 'Desconhecido'}</strong> {ACTION_LABELS[a.kind] || a.kind}
                  {a.nic && <> <span className="font-mono">{a.nic}</span></>}
                  {a.boxId && <> (caixa)</>}
                  {a.affectedCount > 1 && <> — {a.affectedCount} conjuntos</>}
                </span>
                {a.reason && <span className="text-slate-400">· {a.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
