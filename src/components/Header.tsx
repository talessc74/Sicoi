import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserProfile, UserRole, OsteologicalCollection } from '../types/sgccco';
import { useAppVersion } from '../hooks/useAppVersion';
import { getRoleTheme } from '../utils/roleTheme';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Home,
  BookOpen,
  Settings,
  HelpCircle,
  Activity,
  Layers,
  MapPin,
  QrCode,
  Volume2,
  Menu,
  X,
  Search,
  ChevronDown,
  ShieldCheck,
  LogOut,
  KeyRound,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onOpenQrScanner: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  laboratoryMode: boolean;
  onToggleLaboratoryMode: () => void;
  onQuickSearchDocument?: (query: string) => void;
  onOpenGeminiChat?: () => void;
  collections?: OsteologicalCollection[];
  onSelectCoi?: (nic: string) => void;
  isAiFabHidden?: boolean;
  onRestoreAiFab?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenQrScanner,
  activeTab,
  onSelectTab,
  laboratoryMode,
  onToggleLaboratoryMode,
  onQuickSearchDocument,
  onOpenGeminiChat,
  collections,
  onSelectCoi,
  isAiFabHidden,
  onRestoreAiFab
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [coiSearchInput, setCoiSearchInput] = useState('');
  const [coiDropdownOpen, setCoiDropdownOpen] = useState(false);
  const [mobileCoiSearchOpen, setMobileCoiSearchOpen] = useState(false);
  const coiSearchContainerRef = useRef<HTMLDivElement>(null);
  const [operationalSubmenuOpen, setOperationalSubmenuOpen] = useState(false);
  const commitRef = useAppVersion();

  // Fecha dropdown de COI ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coiSearchContainerRef.current && !coiSearchContainerRef.current.contains(event.target as Node)) {
        setCoiDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCollections = useMemo(() => {
    if (!collections || !coiSearchInput.trim()) return [];
    const q = coiSearchInput.trim().toLowerCase();
    return collections.filter(c => c.nic.toLowerCase().includes(q)).slice(0, 8);
  }, [collections, coiSearchInput]);

  const handleCoiSelect = (nic: string) => {
    if (onSelectCoi) {
      onSelectCoi(nic);
    }
    setCoiSearchInput('');
    setCoiDropdownOpen(false);
    setMobileCoiSearchOpen(false);
  };

  const handleCoiSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredCollections.length > 0) {
      handleCoiSelect(filteredCollections[0].nic);
    } else if (collections && coiSearchInput.trim()) {
      const q = coiSearchInput.trim().toLowerCase();
      const match = collections.find(c => c.nic.toLowerCase().includes(q));
      if (match) {
        handleCoiSelect(match.nic);
      }
    }
  };

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

  // Identidade visual do papel ativo (§ Zona de UX) — só na faixa do topo e no
  // selo do menu de perfil, nunca em botões ou bordas de formulário.
  const activeRoleTheme = getRoleTheme(currentUser.role);
  const ActiveRoleIcon = activeRoleTheme.icon;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs w-full max-w-full">
      {/* Faixa de identidade do papel ativo — 3px, só um indicador visual */}
      <div className={`h-[7px] w-full ${activeRoleTheme.bar}`} title={`Papel ativo: ${activeRoleTheme.label}`} />

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

          {/* Submenu: Ferramentas (Grafo, Mapa de Estantes, Consulta, Config, Ajuda) */}
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
          {/* Campo de Busca de COI (pedido dos técnicos, out/2026) */}
          <div ref={coiSearchContainerRef} className="relative hidden md:block">
            <form onSubmit={handleCoiSearchSubmit} className="flex items-center relative w-36 lg:w-48 xl:w-56">
              <input
                type="text"
                value={coiSearchInput}
                onFocus={() => setCoiDropdownOpen(true)}
                onChange={(e) => {
                  setCoiSearchInput(e.target.value);
                  setCoiDropdownOpen(true);
                }}
                placeholder="Buscar COI..."
                className="w-full pl-7 pr-6 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              {coiSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCoiSearchInput('');
                    setCoiDropdownOpen(false);
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Dropdown de sugestões de COI */}
            {coiDropdownOpen && coiSearchInput.trim() && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs max-h-64 overflow-y-auto">
                {filteredCollections.length > 0 ? (
                  filteredCollections.map(c => (
                    <button
                      key={c.nic}
                      type="button"
                      onClick={() => handleCoiSelect(c.nic)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {c.nic}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                        Fase {c.currentPhase}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-slate-400 text-center text-[11px] font-mono">
                    Nenhum COI encontrado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botão de busca de COI em telas mobile */}
          <button
            onClick={() => setMobileCoiSearchOpen(!mobileCoiSearchOpen)}
            title="Buscar conjunto (COI)"
            className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Botão Assistente IA (Gemini) */}
          {onOpenGeminiChat && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onOpenGeminiChat}
                title="Abrir o Assistente IA (Gemini)"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 text-white hover:from-sky-500 hover:to-indigo-500 transition-all shadow-xs shadow-sky-500/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Assistente IA</span>
              </button>
              {isAiFabHidden && onRestoreAiFab && (
                <button
                  type="button"
                  onClick={onRestoreAiFab}
                  title="Restaurar o botão flutuante do Assistente IA na tela"
                  className="p-1.5 rounded-lg text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline text-[11px] font-medium">Reativar flutuante</span>
                </button>
              )}
            </div>
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

          {/* Usuário logado + Sair (login real — ver _local-adr-policy-202; substitui
              o antigo troca-de-perfil de um clique) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title={`Logado como: ${currentUser.name} (${activeRoleTheme.label})`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs whitespace-nowrap shrink-0 ${activeRoleTheme.badgeBg} ${activeRoleTheme.badgeBorder} ${activeRoleTheme.badgeText} hover:opacity-90`}
            >
              <ActiveRoleIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-[110px] xl:max-w-none">{currentUser.name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{currentUser.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {getRoleLabel(currentUser.role)}{currentUser.adminAccess ? ' + Administração' : ''} · {currentUser.institution}
                  </p>
                  <p className="text-slate-400 mt-0.5 font-mono">{currentUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setShowChangePassword(true);
                  }}
                  className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Trocar minha senha
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            )}
          </div>

          {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

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

      {/* Mobile COI Search Drawer */}
      {mobileCoiSearchOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <form onSubmit={handleCoiSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={coiSearchInput}
                onChange={(e) => setCoiSearchInput(e.target.value)}
                placeholder="Buscar COI por número ou nome..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="button"
              onClick={() => setMobileCoiSearchOpen(false)}
              className="px-3 py-2 text-xs text-slate-500 font-mono"
            >
              Fechar
            </button>
          </form>

          {coiSearchInput.trim() && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {filteredCollections.length > 0 ? (
                filteredCollections.map(c => (
                  <button
                    key={c.nic}
                    type="button"
                    onClick={() => handleCoiSelect(c.nic)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{c.nic}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      Fase {c.currentPhase}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-2 text-slate-400 text-xs text-center font-mono">
                  Nenhum COI encontrado
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            <span>Grafo de Conhecimento</span>
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

      {/* Segunda faixa de identidade, embaixo do cabeçalho — o topo e o rodapé do
          cabeçalho ficam emoldurados pela cor do papel ativo, não só uma linha isolada. */}
      <div className={`h-[3px] w-full ${activeRoleTheme.bar}`} />
    </header>
  );
};
