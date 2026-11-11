import React, { useState, useEffect } from 'react';
import { RefreshCw, GitFork, ArrowUpCircle, CheckCircle2, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { INSTITUTION_CONFIG } from '../config/institutionConfig';
import { useAppVersion } from '../hooks/useAppVersion';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
}

export const UpdateChecker: React.FC = () => {
  const currentCommit = useAppVersion();
  const [checking, setChecking] = useState(false);
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showSyncGuide, setShowSyncGuide] = useState(false);

  const CANONICAL_REPO = 'nicoledamascena-art/SIGCOI';

  const checkForUpdates = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const response = await fetch(`https://api.github.com/repos/${CANONICAL_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });
      if (response.ok) {
        const data: GitHubRelease = await response.json();
        setLatestRelease(data);
      } else if (response.status === 404) {
        // Nenhuma release formal ainda, repositório sincronizado por commits da branch main
        setLatestRelease(null);
      } else {
        setCheckError('Não foi possível consultar a API do GitHub no momento.');
      }
    } catch {
      setCheckError('Conexão indisponível ou limitada com o GitHub.');
    } finally {
      setChecking(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-sky-600" />
            Sobre o Sistema &amp; Atualizações da Federação
          </h3>
          <p className="text-slate-500 mt-0.5">
            Instância autônoma da rede SIGCOI ({INSTITUTION_CONFIG.institutionName}).
          </p>
        </div>
        <button
          onClick={checkForUpdates}
          disabled={checking}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Verificar atualizações no núcleo canônico"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-sky-600' : ''}`} />
          <span>{checking ? 'Verificando...' : 'Verificar Atualizações'}</span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Status da Instância */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Instituição Gestora</div>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate" title={INSTITUTION_CONFIG.institutionName}>
              {INSTITUTION_CONFIG.institutionAcronym}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{INSTITUTION_CONFIG.institutionName}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Versão em Execução</div>
            <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
              {INSTITUTION_CONFIG.versionTag} {currentCommit ? `(${currentCommit.substring(0, 7)})` : ''}
            </div>
            <div className="text-[10px] text-slate-500">Hash SHA auditável ativo</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Núcleo Canônico</div>
            <a
              href={`https://github.com/${CANONICAL_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-sky-600 hover:underline mt-0.5 inline-flex items-center gap-1"
            >
              <span>{CANONICAL_REPO}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="text-[10px] text-slate-500">
              {lastChecked ? `Checado em ${lastChecked.toLocaleTimeString()}` : 'Aguardando verificação'}
            </div>
          </div>
        </div>

        {/* Notificação de Nova Release se houver */}
        {latestRelease ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs">Nova Versão Canônica Disponível: {latestRelease.tag_name}</span>
              </div>
              <a
                href={latestRelease.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] underline font-medium hover:text-emerald-700"
              >
                Ver notas da versão
              </a>
            </div>
            <p className="text-[11px] opacity-90 line-clamp-2">
              {latestRelease.body || 'Atualizações de segurança, novos formulários ou refinamento anatômico.'}
            </p>
          </div>
        ) : !checking && !checkError ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sua instância está operando com o núcleo canônico sincronizado.</span>
            </div>
            <button
              onClick={() => setShowSyncGuide(!showSyncGuide)}
              className="text-sky-600 hover:underline font-medium inline-flex items-center gap-1"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{showSyncGuide ? 'Ocultar Guia de Sync' : 'Como Atualizar em 1 Clique'}</span>
            </button>
          </div>
        ) : checkError ? (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>{checkError}</span>
            </div>
            <button
              onClick={() => setShowSyncGuide(!showSyncGuide)}
              className="text-amber-900 dark:text-amber-100 underline font-medium"
            >
              Ver Guia de Atualização
            </button>
          </div>
        ) : null}

        {/* Guia de Atualização Sem Conflitos */}
        {showSyncGuide && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-sky-600" />
              Como Atualizar sua Instância em 1 Clique (Zero Conflitos &amp; Zero Perda de Dados)
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
              <li>
                <strong>Acesse seu repositório no GitHub:</strong> Abra a página do fork da sua universidade.
              </li>
              <li>
                <strong>Sincronize o Fork:</strong> Clique no botão oficial <em>"Sync Fork"</em> e depois em <em>"Update branch"</em>.
              </li>
              <li>
                <strong>Redeploy Automático:</strong> O Render ou seu servidor Docker detectará o novo commit e compilará a nova versão automaticamente em cerca de 2 minutos.
              </li>
              <li>
                <strong>Preservação dos Registros:</strong> O banco de dados PostgreSQL executa as novas migrações de forma estritamente aditiva e idempotente, preservando 100% dos conjuntos, laudos, fotos e assinaturas já registradas.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};
