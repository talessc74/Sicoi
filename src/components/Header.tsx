import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types/sgccco';
import { useAppVersion } from '../hooks/useAppVersion';
import {
  Home,
  BookOpen,
  Settings,
  HelpCircle,
  Activity,
  Layers,
  MapPin,
  QrCode,
  User,
  UserPlus,
  Volume2,
  Menu,
  X,
  Search,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'curador', label: 'Curador' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'pesquisador', label: 'Pesquisador' },
  { value: 'estudante', label: 'Estudante' }
];

interface HeaderProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  people: UserProfile[];
  onCreatePerson: (person: { name: string; role: UserRole; institution: string; registrationNumber: string }) => Promise<void>;
  onOpenQrScanner: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  laboratoryMode: boolean;
  onToggleLaboratoryMode: () => void;
  onQuickSearchDocument?: (query: string) => void;
  onOpenGeminiChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  people,
  onCreatePerson,
  onOpenQrScanner,
  activeTab,
  onSelectTab,
  laboratoryMode,
  onToggleLaboratoryMode,
  onQuickSearchDocument,
  onOpenGeminiChat
}) => {
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<UserRole>('tecnico');
  const [newPersonInstitution, setNewPersonInstitution] = useState('');
  const [newPersonRegistration, setNewPersonRegistration] = useState('');
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);

  const handleCreatePersonSubmit = async () => {
    if (!newPersonName.trim() || !newPersonInstitution.trim() || !newPersonRegistration.trim()) return;
    setIsCreatingPerson(true);
    try {
      await onCreatePerson({
        name: newPersonName.trim(),
        role: newPersonRole,
        institution: newPersonInstitution.trim(),
        registrationNumber: newPersonRegistration.trim()
      });
      setNewPersonName('');
      setNewPersonInstitution('');
      setNewPersonRegistration('');
      setShowAddPerson(false);
    } finally {
      setIsCreatingPerson(false);
    }
  };
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [operationalSubmenuOpen, setOperationalSubmenuOpen] = useState(false);
  const commitRef = useAppVersion();

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'tecnico': return 'Técnico de Laboratório';
      case 'curador': return 'Curador Antropólogo';
      case 'administrador': return 'Administrador do Sistema';
      case 'pesquisador': return 'Pesquisador Externo (CEP)';
      case 'estudante': return 'Estudante (Supervisionado)';
    }
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearchInput.trim()) {
      if (onQuickSearchDocument) {
        onQuickSearchDocument(quickSearchInput.trim());
      }
      onSelectTab('documentos');
    }
  };

  const isOperationalActive = ['fases', 'auditoria', 'grafo', 'estantes', 'pesquisa'].includes(activeTab);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs w-full max-w-full">
      {/* Top Main Navigation Bar */}
      <div className="max-w-[1920px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('inicio')}
            className="text-left flex items-center gap-2 group focus:outline-hidden shrink-0"
          >
            <span className="bg-slate-900 text-yellow-400 text-xs font-mono font-bold px-2 py-1 rounded shadow-xs ring-1 ring-yellow-400/40 group-hover:bg-slate-800 transition-colors shrink-0">
              SIGCOI
            </span>
            <div className="hidden sm:block shrink-0">
              <span className="font-sans text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 transition-colors whitespace-nowrap">
                Coleções Osteológicas
              </span>
              <span className="text-[10px] text-slate-400 font-mono block -mt-0.5 whitespace-nowrap">
                INC/DITEC/PF · ALFA
              </span>
            </div>
          </button>
        </div>

        {/* Primary Navigation Links (Desktop: adaptativo de lg a 2xl) */}
        <nav className="hidden xl:flex items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-medium shrink-0">
          {/* Início */}
          <button
            onClick={() => onSelectTab('inicio')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'inicio'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="whitespace-nowrap">Início</span>
          </button>

          {/* Documentos */}
          <button
            onClick={() => onSelectTab('documentos')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'documentos'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="whitespace-nowrap">Documentos</span>
          </button>

          {/* Fluxo por Fases (Operacional) */}
          <button
            onClick={() => onSelectTab('fases')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'fases'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="whitespace-nowrap">Fases</span>
          </button>

          {/* Linha do Tempo de Auditoria (§INC/DITEC/PF) */}
          <button
            onClick={() => onSelectTab('auditoria')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'auditoria'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
            title="Linha do Tempo de Auditoria e Rastreabilidade Criptográfica INC/DITEC/PF"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">Auditoria</span>
          </button>

          {/* Submenu: Ferramentas Forenses (Grafo, Mapa de Estantes, Consulta, Config, Ajuda) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOperationalSubmenuOpen(!operationalSubmenuOpen)}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                ['grafo', 'estantes', 'pesquisa', 'configuracoes', 'ajuda'].includes(activeTab)
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="whitespace-nowrap">Ferramentas</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {operationalSubmenuOpen && (
              <div
                className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs"
                onClick={() => setOperationalSubmenuOpen(false)}
              >
                <button
                  onClick={() => onSelectTab('grafo')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeTab === 'grafo' ? 'font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Grafo de Conhecimento</span>
                </button>

                <button
                  onClick={() => onSelectTab('estantes')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeTab === 'estantes' ? 'font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Mapa de Estantes</span>
                </button>

                <button
                  onClick={() => onSelectTab('pesquisa')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeTab === 'pesquisa' ? 'font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Consulta & Pesquisa</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>

                <button
                  onClick={() => onSelectTab('configuracoes')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeTab === 'configuracoes' ? 'font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Configurações</span>
                </button>

                <button
                  onClick={() => onSelectTab('ajuda')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    activeTab === 'ajuda' ? 'font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Ajuda & POP</span>
                </button>
              </div>
            )}
          </div>

          {/* Links adicionais diretos só em telas bem largas (>= 1760px): entre 1536 e ~1750px eles não cabem e cortavam o menu à direita */}
          <div className="hidden min-[1760px]:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('configuracoes')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'configuracoes'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => onSelectTab('ajuda')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'ajuda'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Ajuda</span>
            </button>
          </div>
        </nav>

        {/* Right Tools & Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Search Shortcut em telas bem largas (>= 1760px) */}
          <form onSubmit={handleQuickSearchSubmit} className="hidden min-[1760px]:flex items-center relative w-40 shrink-0">
            <input
              type="text"
              value={quickSearchInput}
              onChange={(e) => setQuickSearchInput(e.target.value)}
              placeholder="Pesquisar manual..."
              className="w-full pl-7 pr-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
          </form>

          {/* Botão de busca rápida compacto em telas menores */}
          <button
            onClick={() => onSelectTab('documentos')}
            title="Pesquisar nos documentos e POPs"
            className="min-[1760px]:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Botão Perito IA Gemini */}
          {onOpenGeminiChat && (
            <button
              onClick={onOpenGeminiChat}
              title="Abrir Perito Forense IA Gemini"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-500 hover:to-indigo-500 transition-all shadow-xs shadow-sky-500/20 whitespace-nowrap shrink-0"
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Perito IA</span>
            </button>
          )}

          {/* Modo Laboratório */}
          <button
            onClick={onToggleLaboratoryMode}
            title="Modo Laboratório / Luvas: Botões ampliados e alto contraste"
            className={`flex items-center gap-1 p-1.5 xl:px-2.5 xl:py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              laboratoryMode
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Modo Lab</span>
          </button>

          {/* QR Scanner */}
          <button
            onClick={onOpenQrScanner}
            className="flex items-center gap-1 p-1.5 xl:px-2.5 xl:py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
            title="Escanear ou gerar QR Code oficial"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">QR Code</span>
          </button>

          {/* Role Switcher Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-95 transition-all shadow-xs whitespace-nowrap shrink-0"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-[110px] xl:max-w-none">{currentUser.name.split(' ')[0]}</span>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-xs max-h-[70vh] overflow-y-auto">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="font-semibold text-slate-900 dark:text-white">Perfil Ativo de Acesso</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.institution}</p>
                </div>
                <div className="space-y-1">
                  {people.map((usr) => (
                    <button
                      key={usr.id}
                      onClick={() => {
                        onUserChange(usr);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex flex-col transition-colors ${
                        currentUser.id === usr.id
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{usr.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                          {usr.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 truncate">{getRoleLabel(usr.role)}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {!showAddPerson ? (
                    <button
                      onClick={() => setShowAddPerson(true)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar nova pessoa
                    </button>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                      <select
                        value={newPersonRole}
                        onChange={(e) => setNewPersonRole(e.target.value as UserRole)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
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
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                      <input
                        type="text"
                        value={newPersonRegistration}
                        onChange={(e) => setNewPersonRegistration(e.target.value)}
                        placeholder="Matrícula / registro"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          onClick={handleCreatePersonSubmit}
                          disabled={isCreatingPerson || !newPersonName.trim() || !newPersonInstitution.trim() || !newPersonRegistration.trim()}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold"
                        >
                          {isCreatingPerson ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setShowAddPerson(false)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Abrir menu de navegação"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1 text-xs">
          <button
            onClick={() => { onSelectTab('inicio'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'inicio' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Home className="w-4 h-4 text-sky-600" />
            <span>Início</span>
          </button>

          <button
            onClick={() => { onSelectTab('documentos'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'documentos' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span>Documentos & Manual Normativo</span>
          </button>

          <button
            onClick={() => { onSelectTab('fases'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'fases' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4 text-sky-600" />
            <span>Fluxo de Fases Operacionais (1 a 7)</span>
          </button>

          <button
            onClick={() => { onSelectTab('auditoria'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'auditoria' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-emerald-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Linha do Tempo de Auditoria</span>
          </button>

          <button
            onClick={() => { onSelectTab('grafo'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'grafo' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Grafo de Conhecimento Forense</span>
          </button>

          <button
            onClick={() => { onSelectTab('estantes'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'estantes' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Mapa Físico de Estantes</span>
          </button>

          <button
            onClick={() => { onSelectTab('configuracoes'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'configuracoes' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Settings className="w-4 h-4 text-sky-600" />
            <span>Configurações</span>
          </button>

          <button
            onClick={() => { onSelectTab('ajuda'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 ${
              activeTab === 'ajuda' ? 'bg-sky-50 dark:bg-sky-950 font-bold text-sky-600' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-sky-600" />
            <span>Ajuda</span>
          </button>
        </div>
      )}

      {/* Faixa fixa de referência de versão — visível em toda tela, não só no Início */}
      {commitRef && (
        <div className="w-full bg-slate-950 text-slate-300 text-[11px] font-mono px-4 py-1 flex items-center justify-center gap-1.5 border-t border-slate-800">
          <span className="opacity-60">Versão em execução:</span>
          <span className="font-bold text-white">commit {commitRef}</span>
        </div>
      )}
    </header>
  );
};
