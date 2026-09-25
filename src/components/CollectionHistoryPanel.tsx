import React, { useEffect, useMemo, useState } from 'react';
import { History, GitCompare, RefreshCw, ShieldCheck, ShieldAlert, Unlock, Lock, UserRound } from 'lucide-react';
import type { OsteologicalCollection, PhaseSignature } from '../types/sgccco';
import { fetchCollectionHistory, CollectionHistory } from '../services/collectionsService';
import { diffValues } from '../utils/historyDiff';
import { fieldPathLabel, formatHistoryValue, phaseLabel } from '../utils/fieldLabels';

interface CollectionHistoryPanelProps {
  collection: OsteologicalCollection;
}

type ChangeRow = CollectionHistory['changes'][number];

interface GroupedChange extends ChangeRow {
  firstOldValue: unknown;
  count: number;
  lastChangedAt: string;
}

const KIND_LABEL: Record<ChangeRow['kind'], string> = {
  criacao: 'Cadastro',
  campo: 'Alteração',
  assinatura: 'Assinatura',
  reabertura: 'Reabertura',
  custodia: 'Custódia'
};

const KIND_STYLE: Record<ChangeRow['kind'], string> = {
  criacao: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  campo: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  assinatura: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  reabertura: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  custodia: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
};

// Digitação gera uma gravação por tecla. Para leitura, alterações seguidas do mesmo
// campo pela mesma pessoa (até 5 min entre elas) aparecem numa linha só, do primeiro
// valor anterior ao último valor novo. O registro no banco continua completo.
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function groupChanges(changes: ChangeRow[]): GroupedChange[] {
  const groups: GroupedChange[] = [];
  for (const change of changes) {
    const last = groups[groups.length - 1];
    if (
      last &&
      change.kind === 'campo' &&
      last.kind === 'campo' &&
      last.path === change.path &&
      last.actorId === change.actorId &&
      new Date(change.changedAt).getTime() - new Date(last.lastChangedAt).getTime() <= GROUP_WINDOW_MS
    ) {
      last.newValue = change.newValue;
      last.lastChangedAt = change.changedAt;
      last.count += 1;
      continue;
    }
    groups.push({ ...change, firstOldValue: change.oldValue, count: 1, lastChangedAt: change.changedAt });
  }
  return groups;
}

const ROLE_LABEL: Record<string, string> = {
  tecnico: 'Técnico',
  curador: 'Curador',
  administrador: 'Administrador',
  pesquisador: 'Pesquisador',
  estudante: 'Estudante'
};
const roleText = (role: string | null | undefined) => (role ? ROLE_LABEL[role] || role : '');

const actorText = (row: { actorName: string | null; actorRole: string | null }) =>
  row.actorName ? `${row.actorName}${row.actorRole ? ` (${roleText(row.actorRole)})` : ''}` : 'não identificado';

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

export const CollectionHistoryPanel: React.FC<CollectionHistoryPanelProps> = ({ collection }) => {
  const [history, setHistory] = useState<CollectionHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(60);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchCollectionHistory(collection.nic)
      .then(setHistory)
      .catch((err: any) => setError(err?.message || 'Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [collection.nic]);

  const grouped = useMemo(() => {
    if (!history) return [];
    const filtered = history.changes.filter((c) =>
      phaseFilter === 'all' ? true : phaseFilter === 'outros' ? c.phaseNumber === null : String(c.phaseNumber) === phaseFilter
    );
    return groupChanges(filtered).reverse();
  }, [history, phaseFilter]);

  const signaturesByPhase = useMemo(() => {
    const map = new Map<number, PhaseSignature[]>();
    for (const sig of history?.signatures || []) {
      map.set(sig.phaseNumber, [...(map.get(sig.phaseNumber) || []), sig]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [history]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-6 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" />
            Histórico completo do conjunto
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Versões assinadas de cada fase e todas as alterações gravadas, com quem fez e quando. Nada aqui pode ser
            apagado ou reescrito: o servidor e o banco recusam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {history &&
            (history.chain.ok ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Registro íntegro ({history.changes.length} entradas)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Registro adulterado a partir da entrada #{history.chain.brokenAtId}
              </span>
            ))}
          <button
            onClick={load}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Versões assinadas por fase */}
      <section className="space-y-3">
        <h3 className="font-mono uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <GitCompare className="w-3.5 h-3.5" />
          Versões assinadas
        </h3>
        {signaturesByPhase.length === 0 && <p className="text-slate-400 italic">Nenhuma fase assinada ainda.</p>}
        {signaturesByPhase.map(([phase, versions]) => (
          <PhaseVersions key={phase} phase={phase} versions={versions} currentData={(collection as any)[`phase${phase}`]} />
        ))}
      </section>

      {/* Registro de alterações */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono uppercase text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <UserRound className="w-3.5 h-3.5" />
            Registro de alterações
          </h3>
          <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            Mostrar
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="all">Todas as fases</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={String(n)}>
                  {phaseLabel(n)}
                </option>
              ))}
              <option value="outros">Cadastro, custódia e procedência</option>
            </select>
          </label>
        </div>

        {history && grouped.length === 0 && <p className="text-slate-400 italic">Nenhuma alteração registrada para este filtro.</p>}

        {grouped.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Quem</th>
                  <th className="px-3 py-2">O quê</th>
                  <th className="px-3 py-2">Antes</th>
                  <th className="px-3 py-2">Depois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {grouped.slice(0, visibleCount).map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {formatDateTime(row.lastChangedAt)}
                      {row.count > 1 && <span className="block text-[10px] text-slate-400">{row.count} gravações seguidas</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">{actorText(row)}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1.5 ${KIND_STYLE[row.kind]}`}>
                        {KIND_LABEL[row.kind]}
                      </span>
                      {row.kind === 'campo' && row.path ? fieldPathLabel(row.path) : row.note}
                      {row.kind === 'campo' && row.note && <span className="block text-[10px] text-slate-400">{row.note}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500 max-w-[220px] break-words">
                      {row.kind === 'campo' ? <ValueText value={row.firstOldValue} /> : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-white max-w-[220px] break-words">
                      {row.kind === 'campo' ? <ValueText value={row.newValue} /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {grouped.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((n) => n + 100)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Mostrar mais ({grouped.length - visibleCount} restantes)
          </button>
        )}
      </section>
    </div>
  );
};

const ValueText: React.FC<{ value: unknown }> = ({ value }) => {
  const text = formatHistoryValue(value);
  const short = text.length > 140 ? `${text.slice(0, 140)}…` : text;
  return (
    <span title={text} className={text === '(vazio)' ? 'italic text-slate-400' : ''}>
      {short}
    </span>
  );
};

const CURRENT = 'atual';

const PhaseVersions: React.FC<{ phase: number; versions: PhaseSignature[]; currentData: unknown }> = ({
  phase,
  versions,
  currentData
}) => {
  const latest = versions[versions.length - 1];
  const underRevision = latest?.status === 'unlocked_for_revision';
  const options = versions.map((v, idx) => ({ key: String(idx), label: `Versão ${idx + 1}`, sig: v }));
  const withCopy = options.filter((o) => o.sig.dataSnapshotJson);
  const canCompare = withCopy.length >= 2 || (withCopy.length >= 1 && underRevision);

  const [left, setLeft] = useState<string>(withCopy.length >= 2 ? withCopy[withCopy.length - 2].key : withCopy[0]?.key ?? '');
  const [right, setRight] = useState<string>(withCopy.length >= 2 ? withCopy[withCopy.length - 1].key : CURRENT);

  const dataFor = (key: string): unknown => {
    if (key === CURRENT) return currentData;
    const sig = options.find((o) => o.key === key)?.sig;
    return sig?.dataSnapshotJson ? JSON.parse(sig.dataSnapshotJson) : undefined;
  };

  const differences = useMemo(() => {
    if (!canCompare || !left || !right || left === right) return [];
    const a = dataFor(left);
    const b = dataFor(right);
    if (a === undefined || b === undefined) return [];
    return diffValues(a, b, `phase${phase}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, canCompare, versions, currentData]);

  return (
    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
      <div className="font-semibold text-slate-900 dark:text-white">{phaseLabel(phase)}</div>
      <ol className="space-y-1.5">
        {versions.map((v, idx) => (
          <li key={`${v.signedAt}-${v.sha256Hash}`} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              {v.status === 'locked' ? (
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <strong>Versão {idx + 1}</strong> — assinada por {v.signedByName} ({roleText(v.signedByRole)}) em {formatDateTime(v.signedAt)}
              <span className="font-mono text-[10px] text-slate-400" title={v.sha256Hash}>
                lacre {v.sha256Hash.slice(0, 12)}…
              </span>
            </span>
            {v.status === 'unlocked_for_revision' && (
              <span className="ml-5 text-amber-800 dark:text-amber-300">
                Reaberta{v.reopenedBy ? ` por ${v.reopenedBy}` : ''}
                {v.reopenedAt ? ` em ${formatDateTime(v.reopenedAt)}` : ''}
                {v.reopenJustification ? ` — "${v.reopenJustification}"` : ''}
              </span>
            )}
            {!v.dataSnapshotJson && (
              <span className="ml-5 text-slate-400 italic">
                Cópia do conteúdo não disponível (assinada antes de o sistema guardar as versões).
              </span>
            )}
          </li>
        ))}
      </ol>

      {canCompare && (
        <div className="pt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
            <span>Comparar</span>
            <VersionSelect value={left} onChange={setLeft} options={withCopy} includeCurrent={underRevision} />
            <span>com</span>
            <VersionSelect value={right} onChange={setRight} options={withCopy} includeCurrent={underRevision} />
          </div>
          {left === right ? (
            <p className="text-slate-400 italic">Escolha duas versões diferentes.</p>
          ) : differences.length === 0 ? (
            <p className="text-slate-500">Nenhuma diferença de conteúdo entre as duas.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left">
                <thead className="bg-white dark:bg-slate-900 text-slate-500 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-1.5">Campo</th>
                    <th className="px-3 py-1.5">{left === CURRENT ? 'Atual' : `Versão ${Number(left) + 1}`}</th>
                    <th className="px-3 py-1.5">{right === CURRENT ? 'Atual' : `Versão ${Number(right) + 1}`}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {differences.map((d) => (
                    <tr key={d.path} className="align-top">
                      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{fieldPathLabel(d.path)}</td>
                      <td className="px-3 py-1.5 text-slate-500 max-w-[260px] break-words">
                        <ValueText value={d.before} />
                      </td>
                      <td className="px-3 py-1.5 text-slate-900 dark:text-white max-w-[260px] break-words">
                        <ValueText value={d.after} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const VersionSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  includeCurrent: boolean;
}> = ({ value, onChange, options, includeCurrent }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
  >
    {options.map((o) => (
      <option key={o.key} value={o.key}>
        {o.label}
      </option>
    ))}
    {includeCurrent && <option value={CURRENT}>Conteúdo atual (em revisão)</option>}
  </select>
);
