import React, { useState, useEffect, useRef } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  UserRole,
  PhaseNumber,
  ResearchAuthorization
} from './types/sgccco';
import {
  MOCK_COLLECTIONS,
  MOCK_RESEARCH_AUTHORIZATIONS
} from './data/mockData';
import { createEmptyPhase1Data, createEmptyPhase2Data } from './data/phaseDefaults';
import { fetchCollections, createCollectionApi, saveCollectionApi, wipeAllCollectionsApi } from './services/collectionsService';
import { fetchPeople, createPersonApi, deletePersonApi } from './services/peopleService';
import { Header } from './components/Header';
import { FirstPersonSetup } from './components/FirstPersonSetup';
import { HomeDashboard } from './components/HomeDashboard';
import { DocumentSearchViewer } from './components/DocumentSearchViewer';
import { SettingsView } from './components/SettingsView';
import { HelpView } from './components/HelpView';
import { PhaseProgressRibbon } from './components/PhaseProgressRibbon';
import { Phase1Recebimento } from './components/Phase1Recebimento';
import { Phase2Limpeza } from './components/Phase2Limpeza';
import { Phase3Acondicionamento } from './components/Phase3Acondicionamento';
import { Phase4Curadoria } from './components/Phase4Curadoria';
import { Phase5Patologias } from './components/Phase5Patologias';
import { Phase6Galpao } from './components/Phase6Galpao';
import { Phase7ConsultaPesquisa } from './components/Phase7ConsultaPesquisa';
import { KnowledgeGraphViewer } from './components/KnowledgeGraphViewer';
import { WarehouseRackMap } from './components/WarehouseRackMap';
import { PublicQRInspectionModal } from './components/PublicQRInspectionModal';
import { AuditTimelineView } from './components/AuditTimelineView';
import { GeminiForensicChatModal } from './components/GeminiForensicChatModal';
import { Plus, ShieldCheck, Bot, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Sem login/senha ainda — currentUser é "quem está operando", escolhido entre as
  // pessoas cadastradas no banco (ver FirstPersonSetup / handleCreatePerson). Começa
  // null; só é preenchido depois que a lista de pessoas carrega.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [collections, setCollections] = useState<OsteologicalCollection[]>([]);
  const [authorizations, setAuthorizations] = useState<ResearchAuthorization[]>(MOCK_RESEARCH_AUTHORIZATIONS);
  const [selectedNic, setSelectedNic] = useState<string>('');
  const [activePhase, setActivePhase] = useState<PhaseNumber>(1);
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [documentSearchQuery, setDocumentSearchQuery] = useState<string>('');
  const [laboratoryMode, setLaboratoryMode] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState<boolean>(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Todo campo do formulário já salva sozinho a cada mudança (ver handleUpdateCollection) —
  // mas isso nunca aparecia na tela, então não havia como o operador confirmar que o
  // preenchimento estava sendo salvo. Só o erro era visível; o sucesso ficava silencioso.
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  // true só quando a carga inicial falhou de verdade (ex.: banco inacessível) — um
  // banco vazio por escolha (ninguém criou nada ainda, ou alguém limpou tudo pra
  // testar do zero) NÃO é uma falha e não deve travar a tela.
  const [initialLoadFailed, setInitialLoadFailed] = useState<boolean>(false);
  const [isResettingData, setIsResettingData] = useState<boolean>(false);

  // Carrega os conjuntos do Postgres ao abrir o app. O banco é sempre a fonte de
  // verdade — um banco vazio é um estado válido (ninguém criou conjunto ainda),
  // não é mais semeado automaticamente com dados de exemplo (isso escondia a
  // possibilidade de testar o app do zero). Ver handleSeedExampleData para
  // carregar os exemplos sob demanda.
  //
  // hasStartedRef evita que o StrictMode (que invoca efeitos duas vezes em
  // desenvolvimento de propósito) dispare o fetch duas vezes em paralelo.
  //
  // Importante: como hasStartedRef já garante uma única execução real do fetch,
  // NÃO usamos o padrão usual de "cancelled" no cleanup do efeito — o StrictMode
  // chama esse cleanup logo após a primeira montagem, antes do fetch terminar, o
  // que marcaria cancelled=true e faria o setCollections nunca rodar, travando a
  // tela em "Carregando..." para sempre (bug encontrado rodando o app de verdade).
  // O App raiz nunca desmonta de fato nesta SPA, então não há cancelamento real a
  // proteger aqui.
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    (async () => {
      try {
        const [loadedCollections, loadedPeople] = await Promise.all([fetchCollections(), fetchPeople()]);
        setCollections(loadedCollections);
        setSelectedNic(loadedCollections[0]?.nic || '');
        setActivePhase(loadedCollections[0]?.currentPhase || 1);
        setPeople(loadedPeople);
        setCurrentUser(loadedPeople[0] || null);
      } catch (err: any) {
        console.error('Falha ao carregar dados iniciais do banco:', err);
        setSyncError(err?.message || 'Não foi possível conectar ao banco de dados.');
        setInitialLoadFailed(true);
      } finally {
        setIsLoadingCollections(false);
      }
    })();
  }, []);

  // Cadastra uma nova pessoa (papel de acesso) — sem login/senha ainda. Se for a
  // primeira pessoa cadastrada, ela também vira o usuário ativo automaticamente.
  const handleCreatePerson = async (person: { name: string; role: UserRole; institution: string; registrationNumber: string }) => {
    const created = await createPersonApi(person);
    setPeople((prev) => [...prev, created]);
    if (!currentUser) setCurrentUser(created);
    setSyncError(null);
  };

  const handleDeletePerson = async (id: string) => {
    try {
      await deletePersonApi(id);
      const remaining = people.filter((p) => p.id !== id);
      setPeople(remaining);
      if (currentUser?.id === id) setCurrentUser(remaining[0] || null);
      setSyncError(null);
    } catch (err: any) {
      console.error('Falha ao remover pessoa:', err);
      setSyncError(err?.message || 'Não foi possível remover a pessoa.');
    }
  };

  // Apaga todos os conjuntos do banco — para testar o app do zero. A UI (Settings)
  // já pede confirmação antes de chamar isto.
  const handleWipeAllData = async () => {
    setIsResettingData(true);
    try {
      await wipeAllCollectionsApi();
      setCollections([]);
      setSelectedNic('');
      setActiveTab('inicio');
      setSyncError(null);
    } catch (err: any) {
      console.error('Falha ao limpar os dados:', err);
      setSyncError(err?.message || 'Não foi possível limpar os dados.');
    } finally {
      setIsResettingData(false);
    }
  };

  // Carrega os 3 conjuntos de demonstração sob demanda — nunca automaticamente.
  const handleSeedExampleData = async () => {
    setIsResettingData(true);
    try {
      const seeded: OsteologicalCollection[] = [];
      for (const mock of MOCK_COLLECTIONS) {
        seeded.push(await createCollectionApi(mock));
      }
      setCollections((prev) => [...seeded, ...prev]);
      setSelectedNic(seeded[0]?.nic || '');
      setSyncError(null);
    } catch (err: any) {
      console.error('Falha ao carregar dados de exemplo:', err);
      setSyncError(err?.message || 'Não foi possível carregar os dados de exemplo.');
    } finally {
      setIsResettingData(false);
    }
  };

  const currentCollection = collections.find(c => c.nic === selectedNic) || collections[0];

  const handleUpdateCollection = (updated: OsteologicalCollection) => {
    // Atualização otimista: a tela reflete a mudança na hora; se o servidor
    // rejeitar (ex.: hash de assinatura inválido), a mudança é revertida e o
    // erro é mostrado — o banco nunca fica divergente da tela silenciosamente.
    const previous = collections;
    setCollections(prev => prev.map(c => c.nic === updated.nic ? updated : c));
    setSyncError(null);
    setSaveStatus('saving');
    saveCollectionApi(updated)
      .then(() => {
        setSaveStatus('saved');
        setLastSavedAt(new Date().toISOString());
      })
      .catch((err: any) => {
        console.error('Falha ao salvar conjunto:', err);
        setCollections(previous);
        setSaveStatus('idle');
        setSyncError(err?.message || 'Não foi possível salvar a alteração no banco de dados.');
      });
  };

  const handleCreateNewCollection = async () => {
    if (!currentUser) return;
    const nextNum = String(collections.length + 841).padStart(4, '0');
    const newNic = `NIC-2026-${nextNum}`;
    const newCol: OsteologicalCollection = {
      id: `col-${Date.now()}`,
      nic: newNic,
      currentPhase: 1,
      createdAt: new Date().toISOString(),
      createdByTechnician: currentUser.name,
      signatures: [],
      legalOrigin: {
        deliveryDocumentNumber: `GUIA-REMESSA-INC-DITEC-PF-2026/${nextNum}`,
        originInstitution: 'IML Regional Metropolitano',
        cemeteryName: 'Cemitério Municipal São João',
        cemeteryPlot: `Quadra 12 - Jazigo ${nextNum}`,
        deathDeclarationNumber: `DO-2026-88${nextNum}`
      },
      phase1: {
        ...createEmptyPhase1Data(),
        preliminaryBoxes: [{
          id: `CX-${newNic}`,
          boxCode: `CX-${nextNum}`,
          presumedIndividualLabel: 'Caixa do conjunto',
          currentLocation: 'Bancada de Recepção',
          qrCode: `SIGCOI://BOX/CX-${newNic}`
        }]
      },
      phase2: createEmptyPhase2Data(),
      phase3: {
        boxLocations: []
      },
      phase4: {
        curationVersionNumber: 1,
        curationVersionStatus: 'rascunho',
        curatorAuthor: currentUser.name,
        individuals: [],
        skeletalElements: []
      },
      phase5: {
        pathologies: [],
        complementaryExams: [],
        physicalBoneMarking: {
          techniqueUsed: 'Tinta nanquim sobre Paraloid B-72',
          completed: false,
          elementsMarkedCount: 0
        },
        finalPackagingInertMaterial: {
          materialUsed: 'Ethafoam e papel pH neutro',
          boxesCompletedCount: 0
        },
        phase5Checklist: {
          pathologiesReviewed: false,
          examsAttached: false,
          finalPhotosRegistered: false,
          boneMarkingCompleted: false,
          inertPackagingCompleted: false
        }
      },
      phase6: {
        finalLocations: [],
        publicQrActive: false
      },
      custodyChain: [
        {
          id: `cst-init-${Date.now()}`,
          timestamp: new Date().toISOString(),
          sourceLocation: 'Entrada / Protocolo',
          targetLocation: 'Bancada de Triagem e Recepção Inicial',
          carrierPerson: currentUser.name,
          receiverPerson: currentUser.name,
          carrierSignatureHash: 'INIT-HASH-TOKEN',
          receiverSignatureHash: 'INIT-HASH-TOKEN',
          purpose: 'recebimento_entrada',
          status: 'concluido',
          boxIds: [`CX-${newNic}-A`]
        }
      ]
    };

    try {
      const created = await createCollectionApi(newCol);
      setCollections(prev => [created, ...prev]);
      setSelectedNic(newNic);
      setActivePhase(1);
      setActiveTab('fases');
      setSyncError(null);
    } catch (err: any) {
      console.error('Falha ao criar conjunto:', err);
      setSyncError(err?.message || 'Não foi possível criar o conjunto no banco de dados.');
    }
  };

  const handleReopenPhase = (phaseToReopen: PhaseNumber, justification: string) => {
    if (!currentCollection || !currentUser) return;
    const timestamp = new Date().toISOString();
    const updated = { ...currentCollection };
    // Preserva o registro de assinatura original (quem assinou, quando, hash) em vez de
    // apagá-lo — a reabertura fica marcada nele mesmo (status + justificativa + quem/quando
    // reabriu), o que a Linha do Tempo de Auditoria já sabe transformar automaticamente em
    // um evento "Reabertura Técnica Justificada" (ver getAuditTrailForCollection).
    updated.signatures = updated.signatures.map((s) =>
      s.phaseNumber === phaseToReopen && s.status === 'locked'
        ? {
            ...s,
            status: 'unlocked_for_revision' as const,
            reopenedBy: currentUser.name,
            reopenedAt: timestamp,
            reopenJustification: justification
          }
        : s
    );
    updated.currentPhase = phaseToReopen;

    handleUpdateCollection(updated);
    setActivePhase(phaseToReopen);
  };

  const handleQuickSearchFromHeader = (query: string) => {
    setDocumentSearchQuery(query);
    setActiveTab('documentos');
  };

  if (isLoadingCollections) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-sm font-mono">
        Carregando conjuntos do banco de dados...
      </div>
    );
  }

  if (initialLoadFailed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-sm text-center p-6">
        <p className="font-semibold">Não foi possível carregar os conjuntos do banco de dados.</p>
        {syncError && <p className="font-mono text-xs text-rose-600 dark:text-rose-400">{syncError}</p>}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!currentUser) {
    return <FirstPersonSetup onCreatePerson={handleCreatePerson} />;
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${laboratoryMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100'}`}>
      {syncError && (
        <div className="bg-rose-600 text-white text-xs font-mono px-4 py-2 flex items-center justify-between gap-3">
          <span>⚠ {syncError}</span>
          <button onClick={() => setSyncError(null)} className="underline shrink-0">Dispensar</button>
        </div>
      )}
      {/* Top Header with Main Navigation Menu (§User Request) */}
      <Header
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        people={people}
        onCreatePerson={handleCreatePerson}
        onOpenQrScanner={() => setIsQrModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        laboratoryMode={laboratoryMode}
        onToggleLaboratoryMode={() => setLaboratoryMode(!laboratoryMode)}
        onQuickSearchDocument={handleQuickSearchFromHeader}
        onOpenGeminiChat={() => setIsGeminiChatOpen(true)}
      />

      {/* Quick NIC Selector Ribbon (Visible on operational views) */}
      {['fases', 'auditoria', 'grafo', 'estantes', 'pesquisa'].includes(activeTab) && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-slate-400 font-semibold uppercase text-[10px]">
                Conjunto Selecionado:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {collections.map(c => (
                  <button
                    key={c.nic}
                    onClick={() => {
                      setSelectedNic(c.nic);
                      setActivePhase(c.currentPhase);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedNic === c.nic
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {c.nic}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Todo campo salva sozinho a cada mudança — este indicador é a única forma
                  de o operador confirmar isso, já que antes o sucesso era silencioso. */}
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </span>
              )}
              {saveStatus === 'saved' && lastSavedAt && (
                <span
                  className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
                  title="O preenchimento é salvo automaticamente a cada campo respondido — não é preciso clicar em nada para não perder o progresso."
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Salvo automaticamente às {new Date(lastSavedAt).toLocaleTimeString('pt-BR')}
                </span>
              )}
              <button
                onClick={handleCreateNewCollection}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1 transition-colors whitespace-nowrap"
                title="Cadastrar nova entrada de conjunto osteológico no acervo"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Conjunto (NIC)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequential Phase Ribbon if on 'fases' tab */}
      {activeTab === 'fases' && currentCollection && (
        <PhaseProgressRibbon
          collection={currentCollection}
          activePhase={activePhase}
          onSelectPhase={setActivePhase}
          currentUserRole={currentUser.role}
          onReopenPhase={handleReopenPhase}
          onNavigateToAudit={() => setActiveTab('auditoria')}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Início (Dashboard Principal) */}
        {activeTab === 'inicio' && (
          <HomeDashboard
            collections={collections}
            currentUser={currentUser}
            onSelectNic={(nic) => {
              setSelectedNic(nic);
              const targetCol = collections.find(c => c.nic === nic);
              if (targetCol) setActivePhase(targetCol.currentPhase);
            }}
            onNavigateToPhase={(phase) => {
              setActivePhase(phase as PhaseNumber);
              setActiveTab('fases');
            }}
            onNavigateToTab={setActiveTab}
            onCreateNewNic={handleCreateNewCollection}
          />
        )}

        {/* Documentos (Pesquisa Eficiente no Documento Normativo e POPs) */}
        {activeTab === 'documentos' && (
          <DocumentSearchViewer
            initialSearchQuery={documentSearchQuery}
            onNavigateToPhase={(phase) => {
              setActivePhase(phase as PhaseNumber);
              setActiveTab('fases');
            }}
          />
        )}

        {/* Configurações */}
        {activeTab === 'configuracoes' && (
          <SettingsView
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            people={people}
            onCreatePerson={handleCreatePerson}
            onDeletePerson={handleDeletePerson}
            laboratoryMode={laboratoryMode}
            onToggleLaboratoryMode={() => setLaboratoryMode(!laboratoryMode)}
            collectionsCount={collections.length}
            isResettingData={isResettingData}
            onWipeAllData={handleWipeAllData}
            onSeedExampleData={handleSeedExampleData}
          />
        )}

        {/* Ajuda */}
        {activeTab === 'ajuda' && (
          <HelpView
            onNavigateToTab={setActiveTab}
            onNavigateToDocumentQuery={(query) => {
              setDocumentSearchQuery(query);
              setActiveTab('documentos');
            }}
          />
        )}

        {/* Fluxo Operacional por Fases */}
        {activeTab === 'fases' && !currentCollection && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhum conjunto osteológico cadastrado ainda.</p>
            <p className="text-xs text-slate-500">Crie um novo conjunto (NIC) para começar, ou carregue os dados de exemplo em Configurações.</p>
            <button
              onClick={handleCreateNewCollection}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Conjunto (NIC)</span>
            </button>
          </div>
        )}
        {activeTab === 'fases' && currentCollection && (
          <>
            {activePhase === 1 && (
              <Phase1Recebimento
                collection={currentCollection}
                currentUser={currentUser}
                onUpdateCollection={handleUpdateCollection}
                laboratoryMode={laboratoryMode}
              />
            )}
            {activePhase === 2 && (
              <Phase2Limpeza
                collection={currentCollection}
                currentUser={currentUser}
                onUpdateCollection={handleUpdateCollection}
                laboratoryMode={laboratoryMode}
              />
            )}
            {activePhase === 3 && (
              <Phase3Acondicionamento
                collection={currentCollection}
                allCollections={collections}
                currentUser={currentUser}
                onUpdateCollection={handleUpdateCollection}
                onSelectCollectionToCurate={(nic) => {
                  setSelectedNic(nic);
                  setActivePhase(4);
                }}
              />
            )}
            {activePhase === 4 && (
              <Phase4Curadoria
                collection={currentCollection}
                currentUser={currentUser}
                onUpdateCollection={handleUpdateCollection}
                laboratoryMode={laboratoryMode}
              />
            )}
            {activePhase === 5 && (
              <Phase5Patologias
                collection={currentCollection}
                currentUser={currentUser}
                onUpdateCollection={handleUpdateCollection}
                laboratoryMode={laboratoryMode}
              />
            )}
            {activePhase === 6 && (
              <Phase6Galpao
                collection={currentCollection}
                currentUser={currentUser}
                onUpdateCollection={handleUpdateCollection}
                laboratoryMode={laboratoryMode}
              />
            )}
            {activePhase === 7 && (
              <Phase7ConsultaPesquisa
                collections={collections}
                currentUser={currentUser}
                authorizations={authorizations}
                onUpdateAuthorizations={setAuthorizations}
                onUpdateCollections={setCollections}
              />
            )}
          </>
        )}

        {/* Grafo de Conhecimento */}
        {activeTab === 'grafo' && (
          <KnowledgeGraphViewer selectedNic={selectedNic} />
        )}

        {/* Linha do Tempo de Auditoria (§Diretrizes INC/DITEC/PF) */}
        {activeTab === 'auditoria' && (
          <AuditTimelineView
            collections={collections}
            selectedNic={selectedNic}
            onSelectNic={(nic) => {
              setSelectedNic(nic);
              const targetCol = collections.find(c => c.nic === nic);
              if (targetCol) setActivePhase(targetCol.currentPhase);
            }}
            currentUser={currentUser}
            onNavigateToPhase={(phase) => {
              setActivePhase(phase as PhaseNumber);
              setActiveTab('fases');
            }}
          />
        )}

        {/* Consulta e Pesquisa Externa (ABAC) */}
        {activeTab === 'pesquisa' && (
          <Phase7ConsultaPesquisa
            collections={collections}
            currentUser={currentUser}
            authorizations={authorizations}
            onUpdateAuthorizations={setAuthorizations}
            onUpdateCollections={setCollections}
          />
        )}

        {/* Mapa Físico de Estantes do Galpão */}
        {activeTab === 'estantes' && (
          <WarehouseRackMap
            collections={collections}
            onSelectNic={(nic) => {
              setSelectedNic(nic);
              setActiveTab('fases');
            }}
          />
        )}
      </main>

      {/* Public QR Code Inspection Modal */}
      {isQrModalOpen && currentCollection && (
        <PublicQRInspectionModal
          collection={currentCollection}
          onClose={() => setIsQrModalOpen(false)}
          userRole={currentUser.role}
        />
      )}

      {/* Botão Flutuante de Acesso Rápido ao Assistente IA (Gemini) */}
      <button
        onClick={() => setIsGeminiChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 font-semibold text-xs border border-white/20 group cursor-pointer"
        title="Abrir Chat com o Assistente IA (Gemini) & Transcrição de Áudio"
      >
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </div>
        <Bot className="w-4 h-4 text-sky-200" />
        <span className="font-sans">Assistente IA</span>
        <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 bg-black/20 rounded-md">Gemini</span>
      </button>

      {/* Modal do Chatbot Multi-Turn Gemini com Transcrição de Voz */}
      <GeminiForensicChatModal
        isOpen={isGeminiChatOpen}
        onClose={() => setIsGeminiChatOpen(false)}
        activeCollection={currentCollection}
        currentUser={currentUser}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-xs text-slate-500 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>SIGCOI · Sistema de Gestão da Coleção Osteológica Identificada · INC/DITEC/PF</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
          <button onClick={() => setActiveTab('auditoria')} className="hover:text-slate-600 dark:hover:text-slate-200">
            Trilha de Auditoria
          </button>
          <span>·</span>
          <button onClick={() => setActiveTab('documentos')} className="hover:text-slate-600 dark:hover:text-slate-200">
            Manual Normativo
          </button>
          <span>·</span>
          <button onClick={() => setActiveTab('ajuda')} className="hover:text-slate-600 dark:hover:text-slate-200">
            Guia de Ajuda
          </button>
          <span>·</span>
          <span>SHA-256 Ativo</span>
        </div>
      </footer>
    </div>
  );
}
