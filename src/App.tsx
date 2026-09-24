import React, { useState, useEffect, useRef } from 'react';
import {
  OsteologicalCollection,
  UserProfile,
  PhaseNumber,
  ResearchAuthorization
} from './types/sgccco';
import {
  MOCK_COLLECTIONS,
  MOCK_USERS,
  MOCK_RESEARCH_AUTHORIZATIONS
} from './data/mockData';
import { createEmptyPhase1Data, createEmptyPhase2Data } from './data/phaseDefaults';
import { fetchCollections, createCollectionApi, saveCollectionApi } from './services/collectionsService';
import { Header } from './components/Header';
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
import { Plus, ShieldCheck, Bot, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS[1]); // Default to Dra. Helena (Curadora)
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

  // Carrega os conjuntos do Postgres ao abrir o app. Se o banco estiver vazio
  // (primeira execução), semeia com os dados sintéticos de demonstração — só
  // nessa situação; depois disso o banco é sempre a fonte de verdade.
  //
  // hasStartedRef evita que o StrictMode (que invoca efeitos duas vezes em
  // desenvolvimento de propósito) dispare a semeadura duas vezes em paralelo —
  // sem essa trava, a segunda chamada tenta criar o mesmo NIC e falha.
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
        let loaded = await fetchCollections();
        if (loaded.length === 0) {
          const seeded: OsteologicalCollection[] = [];
          for (const mock of MOCK_COLLECTIONS) {
            seeded.push(await createCollectionApi(mock));
          }
          loaded = seeded;
        }
        setCollections(loaded);
        setSelectedNic(loaded[0]?.nic || '');
        setActivePhase(loaded[0]?.currentPhase || 1);
      } catch (err: any) {
        console.error('Falha ao carregar conjuntos do banco:', err);
        setSyncError(err?.message || 'Não foi possível conectar ao banco de dados.');
      } finally {
        setIsLoadingCollections(false);
      }
    })();
  }, []);

  const currentCollection = collections.find(c => c.nic === selectedNic) || collections[0];

  const handleUpdateCollection = (updated: OsteologicalCollection) => {
    // Atualização otimista: a tela reflete a mudança na hora; se o servidor
    // rejeitar (ex.: hash de assinatura inválido), a mudança é revertida e o
    // erro é mostrado — o banco nunca fica divergente da tela silenciosamente.
    const previous = collections;
    setCollections(prev => prev.map(c => c.nic === updated.nic ? updated : c));
    setSyncError(null);
    saveCollectionApi(updated).catch((err: any) => {
      console.error('Falha ao salvar conjunto:', err);
      setCollections(previous);
      setSyncError(err?.message || 'Não foi possível salvar a alteração no banco de dados.');
    });
  };

  const handleCreateNewCollection = async () => {
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
        deliveryDocumentNumber: `GUIA-REMESSA-SENASP-2026/${nextNum}`,
        originInstitution: 'IML Regional Metropolitano',
        legalProcessNumber: `PROC-2026-00${nextNum}`,
        courtDistrict: '1ª Vara Criminal da Capital',
        cemeteryName: 'Cemitério Municipal São João',
        cemeteryPlot: `Quadra 12 - Jazigo ${nextNum}`,
        deathDeclarationNumber: `DO-2026-88${nextNum}`
      },
      phase1: {
        ...createEmptyPhase1Data(),
        preliminaryBoxes: [
          {
            id: `CX-${newNic}-A`,
            boxCode: `CX-${nextNum}-A`,
            presumedIndividualLabel: 'Indivíduo Presumido A',
            currentLocation: 'Bancada de Recepção',
            qrCode: `SGCCCO://BOX/CX-${newNic}-A`,
            cleaningStatus: 'pendente'
          }
        ]
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
    const updated = { ...currentCollection };
    updated.signatures = updated.signatures.filter(s => s.phaseNumber !== phaseToReopen);
    updated.currentPhase = phaseToReopen;

    updated.custodyChain.push({
      id: `cst-reopen-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceLocation: `Fase ${phaseToReopen} (Travada)`,
      targetLocation: `Fase ${phaseToReopen} (Reaberta)`,
      carrierPerson: currentUser.name,
      receiverPerson: currentUser.name,
      carrierSignatureHash: 'REOPEN-AUTH',
      receiverSignatureHash: 'REOPEN-AUTH',
      purpose: 'consulta_pesquisa',
      status: 'concluido',
      boxIds: updated.phase1.preliminaryBoxes.map(b => b.id)
    });

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

  if (!currentCollection) {
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

            <div className="flex items-center gap-2 shrink-0">
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
      {activeTab === 'fases' && (
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
            laboratoryMode={laboratoryMode}
            onToggleLaboratoryMode={() => setLaboratoryMode(!laboratoryMode)}
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
        {activeTab === 'fases' && (
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

        {/* Grafo de Conhecimento Forense */}
        {activeTab === 'grafo' && (
          <KnowledgeGraphViewer
            collections={collections}
            selectedNic={selectedNic}
          />
        )}

        {/* Linha do Tempo de Auditoria (§Diretrizes SENASP / DITEC) */}
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
      {isQrModalOpen && (
        <PublicQRInspectionModal
          collection={currentCollection}
          onClose={() => setIsQrModalOpen(false)}
          userRole={currentUser.role}
        />
      )}

      {/* Botão Flutuante de Acesso Rápido ao Perito IA Gemini */}
      <button
        onClick={() => setIsGeminiChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 font-semibold text-xs border border-white/20 group cursor-pointer"
        title="Abrir Chat com Perito IA Gemini & Transcrição de Áudio"
      >
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </div>
        <Bot className="w-4 h-4 text-sky-200" />
        <span className="font-sans">Perito IA</span>
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
          <span>SGCCCO · Sistema de Gerenciamento e Custódia de Coleções Osteológicas · SENASP / DITEC</span>
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
