import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NORMATIVE_DOCUMENT_SECTIONS, DocumentSection } from '../data/normativeDocument';
import {
  Search,
  BookOpen,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  ArrowDown,
  ArrowUp,
  X,
  ExternalLink,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface DocumentSearchViewerProps {
  initialSearchQuery?: string;
  onNavigateToPhase?: (phase: number) => void;
}

export const DocumentSearchViewer: React.FC<DocumentSearchViewerProps> = ({
  initialSearchQuery = '',
  onNavigateToPhase
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedPhase, setSelectedPhase] = useState<string>('todas');
  const [selectedChapter, setSelectedChapter] = useState<number | 'todos'>('todos');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Expand first 3 by default
    const initial: Record<string, boolean> = {};
    NORMATIVE_DOCUMENT_SECTIONS.slice(0, 3).forEach(s => { initial[s.id] = true; });
    return initial;
  });
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fast search filter and matching calculation
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    
    return NORMATIVE_DOCUMENT_SECTIONS.filter(section => {
      // Phase filter
      if (selectedPhase !== 'todas') {
        const targetPhase = parseInt(selectedPhase, 10);
        if (section.phaseApplicable !== 'todas' && section.phaseApplicable !== targetPhase) {
          return false;
        }
      }

      // Chapter filter
      if (selectedChapter !== 'todos') {
        if (section.chapterNumber !== selectedChapter) {
          return false;
        }
      }

      // Text query match
      if (!trimmed) return true;

      const titleMatch = section.title.toLowerCase().includes(trimmed);
      const contentMatch = section.content.toLowerCase().includes(trimmed);
      const refMatch = section.regulatoryReference.toLowerCase().includes(trimmed);
      const sectionNumMatch = section.sectionNumber.toLowerCase().includes(trimmed);
      const tagMatch = section.keywords.some(k => k.toLowerCase().includes(trimmed));

      return titleMatch || contentMatch || refMatch || sectionNumMatch || tagMatch;
    });
  }, [searchQuery, selectedPhase, selectedChapter]);

  // Count total occurrences across all matching sections
  const totalMatchesCount = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return 0;

    let count = 0;
    searchResults.forEach(sec => {
      const fullText = `${sec.title} ${sec.content} ${sec.regulatoryReference} ${sec.keywords.join(' ')}`.toLowerCase();
      let pos = fullText.indexOf(trimmed);
      while (pos !== -1) {
        count++;
        pos = fullText.indexOf(trimmed, pos + trimmed.length);
      }
    });
    return count;
  }, [searchQuery, searchResults]);

  // When search query changes, expand all sections that matched to make findings visible
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const newExpanded: Record<string, boolean> = {};
      searchResults.forEach(s => { newExpanded[s.id] = true; });
      setExpandedSections(newExpanded);
      setCurrentMatchIndex(0);
    }
  }, [searchQuery, searchResults]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    NORMATIVE_DOCUMENT_SECTIONS.forEach(s => { all[s.id] = true; });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const handleCopyCitation = (section: DocumentSection) => {
    const citation = `[SIGCOI v3.2 - INC/DITEC/PF] ${section.sectionNumber} - ${section.title} (${section.regulatoryReference}):\n"${section.content}"`;
    navigator.clipboard.writeText(citation);
    setCopiedId(section.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportDocument = () => {
    const docText = NORMATIVE_DOCUMENT_SECTIONS.map(s => (
      `## ${s.chapterTitle}\n### ${s.sectionNumber} — ${s.title}\n*Referência: ${s.regulatoryReference}*\n\n${s.content}\n\n---\n`
    )).join('\n');

    const blob = new Blob([docText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIGCOI-Diretrizes-Normativas-v3.2.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Safe highlighted text renderer
  const renderHighlighted = (text: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return text;

    try {
      const regex = new RegExp(`(${trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-semibold px-1 py-0.5 rounded transition-colors"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const popularKeywords = [
    'Paraloid B-72',
    'MNI',
    'Phenice',
    'Suchey-Brooks',
    'DICOM',
    'SHA-256',
    'Segregação',
    '48 a 72 horas',
    'Galpão',
    'ABAC'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner and Document Identity */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold uppercase">
              <BookOpen className="w-4 h-4" />
              <span>Diretrizes Oficiais & Manual Técnico Normativo (v3.2)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              Protocolo Operacional Padrão SIGCOI / INC/DITEC/PF
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consolidação de normas técnicas, procedimentos das 7 fases, fórmulas antropométricas, regras de sigilo LGPD e segurança da informação.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDocument}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 shadow-xs"
              title="Baixar manual completo em formato Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Manual (.md)</span>
            </button>
          </div>
        </div>

        {/* Live In-Document Search Box (§User Request) */}
        <div className="mt-5 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar texto específico dentro do documento normativo (ex: Paraloid B-72, Phenice, MNI, lacres, 72 horas)..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Popular Term Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" /> Termos frequentes:
            </span>
            {popularKeywords.map(kw => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono transition-colors ${
                  searchQuery.toLowerCase() === kw.toLowerCase()
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar & Match Counters */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-[11px]">Fase Aplicável:</span>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
              >
                <option value="todas">Todas as Fases</option>
                <option value="1">Fase 1 · Recebimento</option>
                <option value="2">Fase 2 · Limpeza & Secagem</option>
                <option value="3">Fase 3 · Acondicionamento Provisório</option>
                <option value="4">Fase 4 · Curadoria & MNI</option>
                <option value="5">Fase 5 · Patologias & DICOM</option>
                <option value="6">Fase 6 · Galpão Definitivo</option>
                <option value="7">Fase 7 · Pesquisa & ABAC</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-[11px]">Capítulo:</span>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value, 10))}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
              >
                <option value="todos">Todos os Capítulos</option>
                <option value="1">Capítulo I · Princípios & LGPD</option>
                <option value="2">Capítulo II · Fase 1 Recebimento</option>
                <option value="3">Capítulo III · Fase 2 Higienização</option>
                <option value="4">Capítulo IV · Fase 3 Acondicionamento</option>
                <option value="5">Capítulo V · Fase 4 Curadoria & MNI</option>
                <option value="6">Capítulo VI · Fase 5 Patologias & Nanquim</option>
                <option value="7">Capítulo VII · Fase 6 Galpão Definitivo</option>
                <option value="8">Capítulo VIII · Fase 7 Pesquisa & ABAC</option>
                <option value="9">Capítulo IX · Criptografia & Bloqueio</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {searchQuery && (
              <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 text-sky-800 dark:text-sky-300">
                {totalMatchesCount} {totalMatchesCount === 1 ? 'ocorrência' : 'ocorrências'} em {searchResults.length} {searchResults.length === 1 ? 'seção' : 'seções'}
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px]"
              >
                Expandir Todos
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={collapseAll}
                className="px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px]"
              >
                Recolher Todos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div ref={containerRef} className="space-y-4">
        {searchResults.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Nenhuma seção normativa encontrada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhum artigo corresponde à busca "{searchQuery}" com os filtros selecionados. Tente termos sinônimos ou limpe o filtro de fases.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedPhase('todas'); setSelectedChapter('todos'); }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold"
            >
              Redefinir Busca
            </button>
          </div>
        ) : (
          searchResults.map((section) => {
            const isExpanded = expandedSections[section.id];

            return (
              <article
                key={section.id}
                id={section.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-all overflow-hidden"
              >
                {/* Section Header */}
                <div
                  onClick={() => toggleSection(section.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        {section.chapterTitle.split('—')[0].trim()} · {section.sectionNumber}
                      </span>
                      {section.phaseApplicable !== 'todas' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Fase {section.phaseApplicable}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ref: {section.regulatoryReference}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                      {renderHighlighted(section.title)}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCitation(section);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Copiar citação com referência jurídica"
                    >
                      {copiedId === section.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Expandir ou recolher artigo"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Section Content */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                      {renderHighlighted(section.content)}
                    </div>

                    {/* Keywords & Actions Bottom Ribbon */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 font-mono text-[10px] uppercase">Descritores:</span>
                        {section.keywords.map(kw => (
                          <span
                            key={kw}
                            onClick={() => setSearchQuery(kw)}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>

                      {section.phaseApplicable !== 'todas' && onNavigateToPhase && typeof section.phaseApplicable === 'number' && (
                        <button
                          onClick={() => onNavigateToPhase(section.phaseApplicable as number)}
                          className="text-sky-600 dark:text-sky-400 hover:underline font-mono text-xs font-semibold flex items-center gap-1"
                        >
                          <span>Abrir Fase {section.phaseApplicable} no Fluxo</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
