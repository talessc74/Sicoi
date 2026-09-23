import React, { useState } from 'react';
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
  const [collections, setCollections] = useState<OsteologicalCollection[]>(MOCK_COLLECTIONS);
  const [authorizations, setAuthorizations] = useState<ResearchAuthorization[]>(MOCK_RESEARCH_AUTHORIZATIONS);
  const [selectedNic, setSelectedNic] = useState<string>(MOCK_COLLECTIONS[0].nic);
  const [activePhase, setActivePhase] = useState<PhaseNumber>(1);
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [documentSearchQuery, setDocumentSearchQuery] = useState<string>('');
  const [laboratoryMode, setLaboratoryMode] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState<boolean>(false);

  const currentCollection = collections.find(c => c.nic === selectedNic) || collections[0];

  const handleUpdateCollection = (updated: OsteologicalCollection) => {
    setCollections(prev => prev.map(c => c.nic === updated.nic ? updated : c));
  };

  const handleCreateNewCollection = () => {
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
        deliveryDocumentNumber: { value: `GUIA-REMESSA-SENASP-2026/${nextNum}`, isAiSuggested: false },
        originInstitution: { value: 'IML Regional Metropolitano', isAiSuggested: false },
        receivedBagsCount: { value: 1, isAiSuggested: false },
        bagSealNumbers: { value: `LACRE-${nextNum}A`, isAiSuggested: false },
        initialConditionNotes: { value: 'Material ósseo recebido em saco forense padronizado com resíduos terrosos.', isAiSuggested: false },
        apparentMni: { value: 1, isAiSuggested: false },
        preliminaryBonesNoted: { value: 'Crânio parcial, fêmures e arcos costais aparentes.', isAiSuggested: false },
        preliminaryBoxes: [
          {
            id: `CX-${newNic}-A`,
            boxCode: `CX-${nextNum}-A`,
            presumedIndividualLabel: 'Indivíduo Presumido A',
            currentLocation: 'Bancada de Recepção',
            qrCode: `SGCCCO://BOX/CX-${newNic}-A`,
            cleaningStatus: 'pendente'
          }
        ],
        initialPhotos: []
      },
      phase2: {
        cleaningSessions: [],
        dryingConfirmationAllBoxes: false
      },
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

    setCollections(prev => [newCol, ...prev]);
    setSelectedNic(newNic);
    setActivePhase(1);
    setActiveTab('fases');
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

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${laboratoryMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100'}`}>
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
