import React, { useState, useEffect } from 'react';
import { OsteologicalCollection, UserProfile, UserRole } from '../types/sgccco';
import { AdminDangerZone } from './AdminDangerZone';
import { getRoleTheme } from '../utils/roleTheme';
import { generateSetupLinkApi, fetchPendingPasswordResetRequestsApi, PendingPasswordResetRequest } from '../services/authService';
import {
  Settings,
  Volume2,
  Shield,
  Key,
  Lock,
  Moon,
  Sun,
  Eye,
  CheckCircle2,
  Sliders,
  Server,
  Trash2,
  AlertTriangle,
  Users,
  UserPlus,
  Link2,
  Copy,
  Loader2,
  Bell
} from 'lucide-react';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'curador', label: 'Curador' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'pesquisador', label: 'Pesquisador' },
  { value: 'estudante', label: 'Estudante' }
];

interface SettingsViewProps {
  currentUser: UserProfile;
  people: UserProfile[];
  onCreatePerson: (person: { name: string; role: UserRole; institution: string; email: string; registrationNumber?: string }) => Promise<void>;
  onDeletePerson: (id: string) => Promise<void>;
  laboratoryMode: boolean;
  onToggleLaboratoryMode: () => void;
  collections: OsteologicalCollection[];
  onRefreshCollections: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  people,
  onCreatePerson,
  onDeletePerson,
  laboratoryMode,
  onToggleLaboratoryMode,
  collections,
  onRefreshCollections
}) => {
  const [cryptographicSalt, setCryptographicSalt] = useState('INC-DITEC-PF-2026-PROD-V3');
  const [autoDryingHours, setAutoDryingHours] = useState(48);
  const [requireDualSignOnPhase5, setRequireDualSignOnPhase5] = useState(true);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<UserRole>('tecnico');
  const [newPersonInstitution, setNewPersonInstitution] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonRegistration, setNewPersonRegistration] = useState('');
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [personPendingDeletion, setPersonPendingDeletion] = useState<UserProfile | null>(null);
  const isAdmin = currentUser.role === 'administrador';

  // Link de definição de senha gerado por último — mostrado uma única vez (o
  // token só existe em texto puro nesta resposta; depois só o hash fica no banco).
  const [generatingLinkForId, setGeneratingLinkForId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ personId: string; url: string; expiresAt: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Fila de "esqueci a senha" — só o Administrador vê; gerar o link (abaixo)
  // resolve o pedido correspondente, que some da lista.
  const [pendingResetRequests, setPendingResetRequests] = useState<PendingPasswordResetRequest[]>([]);
  const [isLoadingResetRequests, setIsLoadingResetRequests] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoadingResetRequests(true);
    fetchPendingPasswordResetRequestsApi()
      .then(setPendingResetRequests)
      .catch(() => {
        // Falha silenciosa: a fila é um extra de conveniência, não bloqueia o resto da tela.
      })
      .finally(() => setIsLoadingResetRequests(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleGenerateSetupLink = async (person: { id: string; name: string }) => {
    setGeneratingLinkForId(person.id);
    setLinkError(null);
    setCopyFeedback(false);
    try {
      const { token, expiresAt } = await generateSetupLinkApi(person.id);
      const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
      setGeneratedLink({ personId: person.id, url, expiresAt });
      setPendingResetRequests((prev) => prev.filter((r) => r.personId !== person.id));
    } catch (err: any) {
      setLinkError(err?.message || 'Não foi possível gerar o link.');
    } finally {
      setGeneratingLinkForId(null);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // clipboard pode falhar (ex.: permissão do navegador) — o link continua
      // visível na tela para copiar manualmente.
    }
  };

  const handleCreatePersonSubmit = async () => {
    if (!newPersonName.trim() || !newPersonInstitution.trim() || !newPersonEmail.trim()) return;
    setIsCreatingPerson(true);
    try {
      await onCreatePerson({
        name: newPersonName.trim(),
        role: newPersonRole,
        institution: newPersonInstitution.trim(),
        email: newPersonEmail.trim(),
        registrationNumber: newPersonRegistration.trim() || undefined
      });
      setNewPersonName('');
      setNewPersonInstitution('');
      setNewPersonEmail('');
      setNewPersonRegistration('');
      setShowAddPersonForm(false);
    } finally {
      setIsCreatingPerson(false);
    }
  };

  const handleSavePreferences = () => {
    setShowSaveAlert(true);
    setTimeout(() => setShowSaveAlert(false), 2500);
  };

  const abacRolesMatrix: { role: UserRole; title: string; canViewLegal: boolean; canCurate: boolean; canSignPhases: boolean; canExport: boolean }[] = [
    { role: 'curador', title: 'Curador da COI-INC — acesso a todas as funções', canViewLegal: true, canCurate: true, canSignPhases: true, canExport: true },
    { role: 'administrador', title: 'Administrador do Sistema / DITEC', canViewLegal: true, canCurate: true, canSignPhases: true, canExport: true },
    { role: 'tecnico', title: 'Técnico de Laboratório', canViewLegal: false, canCurate: false, canSignPhases: true, canExport: false },
    { role: 'pesquisador', title: 'Pesquisador Externo (CEP)', canViewLegal: false, canCurate: false, canSignPhases: false, canExport: true },
    { role: 'estudante', title: 'Estudante Supervisionado', canViewLegal: false, canCurate: false, canSignPhases: false, canExport: false }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
          <Settings className="w-4 h-4" />
          <span>Painel de Parâmetros Operacionais & Segurança</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
          Configurações do Sistema SIGCOI (ALFA)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Ajustes de segurança criptográfica, matriz ABAC de atribuição de papéis, preferências laboratoriais e conformidade LGPD.
        </p>
      </div>

      {showSaveAlert && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Parâmetros de configuração salvos com sucesso na sessão do laboratório.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modo Laboratório e Interface */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold pb-2 border-b border-slate-200 dark:border-slate-800">
            <Volume2 className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm">Ambiente Laboratorial & Acessibilidade</h3>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block font-sans">
                Modo Laboratório / Luvas Estéreis
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                Amplia a área de toque dos botões na tela e ativa alertas com retorno de contraste para operação na bancada de lavagem e curadoria.
              </p>
            </div>
            <button
              onClick={onToggleLaboratoryMode}
              className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs transition-colors shrink-0 ${
                laboratoryMode
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {laboratoryMode ? 'ATIVO' : 'DESATIVADO'}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Tempo Padrão de Secagem Recomendado (POP-OSTEO-02):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={24}
                max={96}
                value={autoDryingHours}
                onChange={(e) => setAutoDryingHours(parseInt(e.target.value, 10))}
                className="w-24 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
              />
              <span className="text-slate-500">horas (Recomendado: 48h a 72h em circulação forçada)</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireDualSignOnPhase5}
                onChange={(e) => setRequireDualSignOnPhase5(e.target.checked)}
                className="rounded"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Exigir Dupla Assinatura Obrigatória (Curador + Técnico) na Fase 5 (§7)
              </span>
            </label>
          </div>
        </div>

        {/* Segurança Criptográfica & ICP-Brasil */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold pb-2 border-b border-slate-200 dark:border-slate-800">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm">Criptografia & Integridade dos Registros (§7)</h3>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Algoritmo de Hash Canônico:
            </label>
            <input
              type="text"
              readOnly
              value="SHA-256 (NIST FIPS 180-4 / Padrão ICP-Brasil)"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Salt de Normalização do Sistema:
            </label>
            <input
              type="text"
              value={cryptographicSalt}
              onChange={(e) => setCryptographicSalt(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
            />
            <span className="text-[11px] text-slate-400">
              Garante que as cadeias de custódia e termos de entrega não sofram colisão de assinatura.
            </span>
          </div>

          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
            <strong>Trilha de Auditoria Ativa:</strong> Todos os registros e transições de fase são imutáveis e auditados contra retificações não autorizadas.
          </div>
        </div>
      </div>

      {/* Pedidos de "esqueci a senha" pendentes — só o Administrador vê */}
      {isAdmin && (pendingResetRequests.length > 0 || isLoadingResetRequests) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900 shadow-xs overflow-hidden text-xs">
          <div className="p-5 border-b border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
            <h3 className="font-bold text-sm text-amber-800 dark:text-amber-300 font-mono flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Pedidos de Redefinição de Senha ({pendingResetRequests.length})
            </h3>
            <p className="text-amber-700/80 dark:text-amber-300/70 mt-0.5">
              Alguém clicou em "Esqueci minha senha" no login. Gere um novo link de acesso para resolver.
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoadingResetRequests && <p className="p-4 text-slate-400">Carregando...</p>}
            {pendingResetRequests.map((req) => (
              <div key={req.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{req.personName}</span>
                  <p className="text-slate-400 mt-0.5">
                    {req.email} · pediu em {new Date(req.requestedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => handleGenerateSetupLink({ id: req.personId, name: req.personName })}
                  disabled={generatingLinkForId === req.personId}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-40"
                >
                  {generatingLinkForId === req.personId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  Gerar novo link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pessoas cadastradas — só o Administrador vê ou gerencia (login real,
          ver _local-adr-policy-202): nome, papel, instituição e e-mail de
          quem tem acesso não é informação que qualquer pessoa logada precise
          ver, só quem gerencia contas. O servidor já recusa (403) esse dado
          para qualquer outro papel — isto só evita renderizar uma lista que
          chegaria vazia de qualquer forma. */}
      {isAdmin && (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              Pessoas Cadastradas ({people.length})
            </h3>
            <p className="text-slate-500 mt-0.5">
              Quem tem acesso ao sistema, por papel. Cada pessoa entra com e-mail e senha própria.
            </p>
          </div>
          <button
            onClick={() => setShowAddPersonForm((v) => !v)}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar pessoa
          </button>
        </div>

        {showAddPersonForm && (
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Nome completo"
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <select
              value={newPersonRole}
              onChange={(e) => setNewPersonRole(e.target.value as UserRole)}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newPersonInstitution}
              onChange={(e) => setNewPersonInstitution(e.target.value)}
              placeholder="Instituição"
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <input
              type="email"
              value={newPersonEmail}
              onChange={(e) => setNewPersonEmail(e.target.value)}
              placeholder="E-mail (login)"
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={newPersonRegistration}
              onChange={(e) => setNewPersonRegistration(e.target.value)}
              placeholder="Matrícula / registro profissional (opcional)"
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                onClick={() => setShowAddPersonForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePersonSubmit}
                disabled={isCreatingPerson || !newPersonName.trim() || !newPersonInstitution.trim() || !newPersonEmail.trim()}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-40"
              >
                {isCreatingPerson ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {isAdmin && linkError && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-mono">
            {linkError}
          </div>
        )}

        {isAdmin && generatedLink && (
          <div className="m-5 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 space-y-2">
            <p className="font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Link de definição de senha — envie por fora do sistema (WhatsApp, e-mail)
            </p>
            <p className="text-slate-500">
              Só aparece agora, uma única vez. Vale até {new Date(generatedLink.expiresAt).toLocaleString('pt-BR')} ou até ser usado.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={generatedLink.url}
                onFocus={(e) => e.target.select()}
                className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                {copyFeedback ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {people.length === 0 && (
            <p className="p-5 text-slate-400">Nenhuma pessoa cadastrada.</p>
          )}
          {people.map((person) => {
            const theme = getRoleTheme(person.role);
            const RoleIcon = theme.icon;
            return (
            <div key={person.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{person.name}</span>
                  <span className={`flex items-center gap-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                    <RoleIcon className="w-2.5 h-2.5" />
                    {person.role}
                  </span>
                  {currentUser.id === person.id && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      você
                    </span>
                  )}
                </div>
                <p className="text-slate-400 mt-0.5">
                  {person.institution} · {person.email}
                  {person.registrationNumber ? ` · ${person.registrationNumber}` : ''}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateSetupLink(person)}
                    disabled={generatingLinkForId === person.id}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 disabled:opacity-40"
                    title="Gerar link de uso único para esta pessoa definir (ou redefinir) a senha"
                  >
                    {generatingLinkForId === person.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    Gerar link de acesso
                  </button>
                  <button
                    onClick={() => setPersonPendingDeletion(person)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Remover pessoa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
      )}

      {personPendingDeletion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">Remover pessoa?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Remove <strong>{personPendingDeletion.name}</strong> da lista de responsáveis selecionáveis. Assinaturas já
              registradas por essa pessoa não são afetadas — o nome fica preservado nelas.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setPersonPendingDeletion(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await onDeletePerson(personPendingDeletion.id);
                  setPersonPendingDeletion(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matriz de Controle de Acesso Baseado em Atributos (ABAC) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-600" />
              Matriz de Permissões ABAC por Papel Institucional (§13)
            </h3>
            <p className="text-slate-500 mt-0.5">
              O Curador pode executar as funções de todos os papéis; suas ações continuam registradas com o papel Curador.
            </p>
          </div>
          <button
            onClick={handleSavePreferences}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold hover:opacity-95 transition-opacity"
          >
            Salvar Preferências
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 font-semibold">Papel (Role)</th>
                <th className="px-5 py-3 font-semibold">Descrição Funcional</th>
                <th className="px-5 py-3 font-semibold text-center">Origem Legal / Cemitério (§7)</th>
                <th className="px-5 py-3 font-semibold text-center">Curadoria Científica</th>
                <th className="px-5 py-3 font-semibold text-center">Assinatura de Fases</th>
                <th className="px-5 py-3 font-semibold text-center">Exportação Científica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
              {abacRolesMatrix.map(row => (
                <tr key={row.role} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono font-bold uppercase text-slate-900 dark:text-white">
                    {row.role}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {row.title}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      row.canViewLegal
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}>
                      {row.canViewLegal ? 'AUTORIZADO' : 'BLOQUEADO'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      row.canCurate ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {row.canCurate ? 'SIM' : 'NÃO'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      row.canSignPhases ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {row.canSignPhases ? 'SIM' : 'NÃO'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      row.canExport ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {row.canExport ? 'SIM' : 'NÃO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zona de Risco — só visível para quem está com o papel Administrador ativo.
          O servidor reconfere isto de novo a cada chamada (ver requireAdmin em
          server.ts); esta condição é só para não mostrar botões que seriam recusados. */}
      {currentUser.role === 'administrador' && (
        <AdminDangerZone currentUser={currentUser} collections={collections} onRefreshCollections={onRefreshCollections} />
      )}
    </div>
  );
};
