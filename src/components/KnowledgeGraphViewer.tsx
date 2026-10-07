import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GraphNode, GraphNodeType, GraphEdge } from '../types/sgccco';
import { Network, Search, Info, Route, Loader2, RefreshCw, Bone, X } from 'lucide-react';
import { searchSimilarBones, BoneSimilaritySearchResult } from '../services/geminiService';

interface KnowledgeGraphViewerProps {
  selectedNic?: string;
}

interface ExplainResult {
  node: GraphNode;
  incoming: GraphEdge[];
  outgoing: GraphEdge[];
}

interface PathStep {
  nodeId: string;
  viaRelation: string | null;
}

const nodeColorMap: Record<GraphNodeType, { fill: string; stroke: string; label: string; bg: string }> = {
  nic: { fill: '#2563eb', stroke: '#1d4ed8', label: 'Conjunto (NIC)', bg: 'bg-blue-100 text-blue-800' },
  individuo: { fill: '#10b981', stroke: '#059669', label: 'Indivíduo (Hipótese)', bg: 'bg-emerald-100 text-emerald-800' },
  elemento: { fill: '#64748b', stroke: '#475569', label: 'Elemento Ósseo', bg: 'bg-slate-100 text-slate-800' },
  patologia: { fill: '#e11d48', stroke: '#be123c', label: 'Patologia / Lesão', bg: 'bg-rose-100 text-rose-800' },
  caixa: { fill: '#f59e0b', stroke: '#d97706', label: 'Caixa de Custódia', bg: 'bg-amber-100 text-amber-800' },
  localizacao: { fill: '#8b5cf6', stroke: '#7c3aed', label: 'Localização Física', bg: 'bg-purple-100 text-purple-800' },
  metodo: { fill: '#06b6d4', stroke: '#0891b2', label: 'Método Bioantropológico', bg: 'bg-cyan-100 text-cyan-800' },
  exame: { fill: '#6366f1', stroke: '#4f46e5', label: 'Exame Complementar / DICOM', bg: 'bg-indigo-100 text-indigo-800' },
  formulario_a1: { fill: '#0ea5e9', stroke: '#0284c7', label: 'Formulário A.1', bg: 'bg-sky-100 text-sky-800' },
  formulario_a2: { fill: '#14b8a6', stroke: '#0d9488', label: 'Formulário A.2', bg: 'bg-teal-100 text-teal-800' },
  foto: { fill: '#a855f7', stroke: '#9333ea', label: 'Foto', bg: 'bg-fuchsia-100 text-fuchsia-800' },
  assinatura: { fill: '#22c55e', stroke: '#16a34a', label: 'Assinatura (Responsável)', bg: 'bg-green-100 text-green-800' },
  evento_custodia: { fill: '#f97316', stroke: '#ea580c', label: 'Evento de Custódia', bg: 'bg-orange-100 text-orange-800' },
  osso_consultado: { fill: '#ec4899', stroke: '#db2777', label: 'Osso Consultado (temporário)', bg: 'bg-pink-100 text-pink-800' }
};

const radiusMap: Record<GraphNodeType, number> = {
  nic: 0,
  caixa: 110,
  individuo: 180,
  localizacao: 150,
  elemento: 240,
  metodo: 250,
  patologia: 230,
  exame: 220,
  formulario_a1: 90,
  formulario_a2: 95,
  foto: 260,
  assinatura: 130,
  evento_custodia: 170,
  // Não usado no layout radial principal — o nó e seus candidatos ganham
  // posição própria, fora do grafo persistido (ver `boneOverlay`).
  osso_consultado: 0
};

const BONE_QUERY_NODE_ID = 'BONE-QUERY-TEMP';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Falha ao consultar ${url} (HTTP ${res.status})`);
  return data as T;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ selectedNic }) => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [isLoadingGraph, setIsLoadingGraph] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathResult, setPathResult] = useState<PathStep[] | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [isFindingPath, setIsFindingPath] = useState(false);

  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<GraphNode[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const [boneFreeText, setBoneFreeText] = useState('');
  const [boneSearchResult, setBoneSearchResult] = useState<BoneSimilaritySearchResult | null>(null);
  const [boneSearchError, setBoneSearchError] = useState<string | null>(null);
  const [isSearchingBones, setIsSearchingBones] = useState(false);

  // Carrega o grafo persistido — o conjunto todo, ou escopado ao NIC selecionado na tela.
  // Só refaz sozinho quando o NIC selecionado muda (ou ao montar a tela); uma mudança feita
  // em outra aba/tela enquanto esta já estava aberta não chega aqui sozinha — por isso o
  // botão "Atualizar" ao lado do título busca de novo sob demanda.
  const loadGraph = useCallback(() => {
    let cancelled = false;
    setIsLoadingGraph(true);
    setLoadError(null);
    const url = selectedNic ? `/api/graph?nic=${encodeURIComponent(selectedNic)}` : '/api/graph';
    fetchJson<{ nodes: GraphNode[]; edges: GraphEdge[] }>(url)
      .then((data) => {
        if (!cancelled) setGraphData(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Erro ao carregar o grafo.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGraph(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNic]);

  useEffect(() => loadGraph(), [loadGraph]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsExplaining(true);
    setExplainResult(null);
    fetchJson<ExplainResult>(`/api/graph/node/${encodeURIComponent(nodeId)}`)
      .then(setExplainResult)
      .catch(() => setExplainResult(null))
      .finally(() => setIsExplaining(false));
  }, []);

  const runPathFinder = useCallback(async () => {
    if (!pathFrom.trim() || !pathTo.trim()) return;
    setIsFindingPath(true);
    setPathError(null);
    setPathResult(null);
    try {
      const data = await fetchJson<{ path: PathStep[] }>(
        `/api/graph/path?from=${encodeURIComponent(pathFrom.trim())}&to=${encodeURIComponent(pathTo.trim())}`
      );
      setPathResult(data.path);
    } catch (err: any) {
      setPathError(err.message || 'Nenhum caminho encontrado.');
    } finally {
      setIsFindingPath(false);
    }
  }, [pathFrom, pathTo]);

  const runGlobalSearch = useCallback(async () => {
    if (!globalQuery.trim()) return;
    setIsSearchingGlobal(true);
    try {
      const data = await fetchJson<{ nodes: GraphNode[] }>(`/api/graph/search?q=${encodeURIComponent(globalQuery.trim())}`);
      setGlobalResults(data.nodes);
    } catch {
      setGlobalResults([]);
    } finally {
      setIsSearchingGlobal(false);
    }
  }, [globalQuery]);

  const runBoneSimilaritySearch = useCallback(async () => {
    if (!boneFreeText.trim()) return;
    setIsSearchingBones(true);
    setBoneSearchError(null);
    try {
      const result = await searchSimilarBones({ freeText: boneFreeText.trim() });
      setBoneSearchResult(result);
    } catch (err: any) {
      setBoneSearchResult(null);
      setBoneSearchError(err.message || 'Erro ao buscar ossos parecidos.');
    } finally {
      setIsSearchingBones(false);
    }
  }, [boneFreeText]);

  const clearBoneSearch = useCallback(() => {
    setBoneSearchResult(null);
    setBoneSearchError(null);
    setBoneFreeText('');
  }, []);

  // Grafo sintético da busca por semelhança: nó temporário (o osso descrito) +
  // os candidatos reais, nunca escritos em graph_nodes/graph_edges — só desenhado
  // em memória, com posição própria (fora do layout radial do grafo persistido),
  // pra não competir com o grafo do conjunto carregado (_local-adr-policy-103).
  const boneOverlay = useMemo(() => {
    if (!boneSearchResult || boneSearchResult.candidates.length === 0) return null;
    const center = { x: 690, y: 480 };
    const radius = 95;

    const queryNode = {
      id: BONE_QUERY_NODE_ID,
      label: 'Osso consultado',
      type: 'osso_consultado' as GraphNodeType,
      properties: { descricaoLivre: boneFreeText || 'critério estruturado' },
      x: center.x,
      y: center.y
    };

    const candidateNodes = boneSearchResult.candidates.map((c, i) => {
      const angle = (i * 2 * Math.PI) / boneSearchResult.candidates.length;
      const properties: Record<string, any> = {
        conjunto: c.nic,
        lado: c.element.side,
        presenca: c.element.presence,
        preservacao: c.element.preservationQuality
      };
      if (c.similarity) {
        properties.semelhanca = `${Math.round(c.similarity.similarityScore * 100)}% (confiança ${c.similarity.confidence}) — ${c.similarity.explanation}`;
      }
      return {
        id: `ELEM-${c.nic}-${c.element.anatomicalCode}`,
        label: c.element.namePt,
        type: 'elemento' as GraphNodeType,
        properties,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };
    });

    const edges: GraphEdge[] = boneSearchResult.candidates.map((c) => ({
      id: `sim-${c.nic}-${c.element.id}`,
      source: BONE_QUERY_NODE_ID,
      target: `ELEM-${c.nic}-${c.element.anatomicalCode}`,
      relation: 'similar_a',
      confidence: 'INFERRED',
      provenance: { recordId: c.element.id, field: 'bone-similarity-search', version: 1, createdAt: new Date().toISOString() }
    }));

    return { nodes: [queryNode, ...candidateNodes], edges };
  }, [boneSearchResult, boneFreeText]);

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((n) => {
      const matchType = filterType === 'all' || n.type === filterType;
      const matchSearch =
        searchTerm === '' ||
        n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [graphData.nodes, filterType, searchTerm]);

  // Layout radial (estável, sem física de simulação)
  const layoutNodes = useMemo(() => {
    const center = { x: 420, y: 300 };
    return filteredNodes.map((node, index) => {
      const radius = radiusMap[node.type] ?? 200;
      if (radius === 0) {
        return { ...node, x: center.x + (index * 80 - 80), y: center.y };
      }
      const angle = (index * 2 * Math.PI) / Math.max(1, filteredNodes.length);
      const jitter = (index % 3) * 12;
      return {
        ...node,
        x: center.x + Math.cos(angle) * (radius + jitter),
        y: center.y + Math.sin(angle) * (radius + jitter)
      };
    });
  }, [filteredNodes]);

  const visibleNodeIds = new Set(layoutNodes.map((n) => n.id));

  const filteredEdges = useMemo(() => {
    return graphData.edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [graphData.edges, visibleNodeIds]);

  // Nós/arestas da busca por semelhança entram só no desenho (displayNodes/
  // displayEdges) — nunca em layoutNodes/filteredEdges, que refletem o que de
  // fato está em graph_nodes/graph_edges.
  const displayNodes = useMemo(() => (boneOverlay ? [...layoutNodes, ...boneOverlay.nodes] : layoutNodes), [layoutNodes, boneOverlay]);
  const displayEdges = useMemo(() => (boneOverlay ? [...filteredEdges, ...boneOverlay.edges] : filteredEdges), [filteredEdges, boneOverlay]);

  const getNodeCoords = (id: string) => {
    const n = displayNodes.find((item) => item.id === id);
    return n ? { x: n.x, y: n.y } : null;
  };

  const selectedNode =
    graphData.nodes.find((n) => n.id === selectedNodeId) ||
    boneOverlay?.nodes.find((n) => n.id === selectedNodeId) ||
    explainResult?.node ||
    null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Top Header & Filter Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Grafo de Conhecimento Osteológico (INC/DITEC/PF)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Persistido no banco a cada gravação. Cobre todo campo coletado nas fases, caixas, localização, assinaturas e custódia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={loadGraph}
            disabled={isLoadingGraph}
            title="Recarregar o grafo agora (uma mudança feita em outra aba/tela não aparece aqui sozinha)"
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGraph ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar nós visíveis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
          >
            <option value="all">Todos os Nós ({graphData.nodes.length})</option>
            {Object.entries(nodeColorMap).map(([type, meta]) => (
              <option key={type} value={type}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingGraph && (
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando grafo do banco de dados...
        </div>
      )}
      {loadError && <div className="p-4 text-sm text-rose-600 dark:text-rose-400">{loadError}</div>}

      {!isLoadingGraph && !loadError && (
        <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[520px]">
          {/* SVG Graph Viewport */}
          <div className="lg:col-span-3 bg-slate-950 relative overflow-hidden flex items-center justify-center p-2">
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-md bg-black/60 backdrop-blur-xs p-2 rounded-lg border border-slate-800 text-[10px] font-mono">
              {Object.entries(nodeColorMap).map(([type, meta]) => (
                <span key={type} className="flex items-center gap-1 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.fill }} />
                  <span>{meta.label.split('(')[0].trim()}</span>
                </span>
              ))}
            </div>

            <svg width="100%" height="520" viewBox="0 0 840 600" className="select-none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </defs>

              {displayEdges.map((e) => {
                const src = getNodeCoords(e.source);
                const tgt = getNodeCoords(e.target);
                if (!src || !tgt) return null;
                const isHighlighted = selectedNode && (selectedNode.id === e.source || selectedNode.id === e.target);
                const isOnPath =
                  pathResult && pathResult.some((s, i) => s.nodeId === e.source && pathResult[i + 1]?.nodeId === e.target);

                return (
                  <g key={e.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={isOnPath ? '#facc15' : isHighlighted ? '#38bdf8' : e.relation === 'similar_a' ? '#ec4899' : '#334155'}
                      strokeWidth={isOnPath ? 3 : isHighlighted ? 2.5 : 1.2}
                      strokeDasharray={e.confidence === 'INFERRED' ? '3 3' : undefined}
                      markerEnd="url(#arrow)"
                      opacity={isOnPath || isHighlighted ? 0.95 : 0.55}
                    />
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 4}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {e.relation}
                    </text>
                  </g>
                );
              })}

              {displayNodes.map((node) => {
                const meta = nodeColorMap[node.type];
                const isSelected = selectedNode?.id === node.id;
                const isOnPath = pathResult?.some((s) => s.nodeId === node.id);
                const r = node.type === 'nic' || node.type === 'osso_consultado' ? 26 : node.type === 'individuo' ? 22 : 18;

                return (
                  // O posicionamento real (translate) fica só aqui, como atributo SVG — uma
                  // classe CSS de "transform" neste <g> (ex.: hover:scale) sobrescreveria esse
                  // translate em vez de somar a ele, fazendo o nó pular pro canto do SVG a cada
                  // hover (bug encontrado: nó ficava instável/impossível de clicar). O efeito de
                  // hover vive num <g> interno, que escala em torno do próprio centro
                  // (transform-box: fill-box) sem tocar na posição deste <g> externo.
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => selectNode(node.id)} className="cursor-pointer">
                    <g
                      className="transition-transform duration-100 hover:scale-110"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    >
                      <circle
                        r={r}
                        fill={meta.fill}
                        stroke={isSelected ? '#ffffff' : isOnPath ? '#facc15' : meta.stroke}
                        strokeWidth={isSelected || isOnPath ? 3 : 1.5}
                        className="drop-shadow-md"
                      />
                      <text
                        textAnchor="middle"
                        dy="4"
                        fill="#ffffff"
                        fontSize={node.type === 'nic' ? '10' : '9'}
                        fontWeight="600"
                        fontFamily="monospace"
                        className="pointer-events-none"
                      >
                        {node.label.length > 11 ? node.label.substring(0, 9) + '..' : node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Painel lateral: Explicar / Caminho / Busca global */}
          <div className="p-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs flex flex-col gap-5 overflow-y-auto max-h-[520px]">
            {/* Explicar nó (mirrors `graphify explain`) */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
                <Info className="w-4 h-4 text-sky-600" />
                Explicar Nó
              </h4>

              {isExplaining && (
                <div className="text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando arestas...
                </div>
              )}

              {!isExplaining && selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${nodeColorMap[selectedNode.type].bg}`}>
                      {nodeColorMap[selectedNode.type].label}
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white font-mono mt-1">{selectedNode.label}</h5>
                    <p className="text-[11px] font-mono text-slate-400">ID: {selectedNode.id}</p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block">Propriedades:</span>
                    {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between font-mono text-[11px] gap-2">
                        <span className="text-slate-500 shrink-0">{key}:</span>
                        <span className="text-slate-900 dark:text-slate-200 font-medium truncate max-w-[150px]" title={String(val)}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {explainResult && (
                    <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase block">
                        Ligações ({explainResult.outgoing.length + explainResult.incoming.length}):
                      </span>
                      {explainResult.outgoing.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => selectNode(e.target)}
                          className="w-full text-left flex justify-between font-mono text-[11px] hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          <span>→ {e.relation}</span>
                          <span className="text-slate-400">
                            {e.target} <em className="not-italic text-[9px]">({e.confidence})</em>
                          </span>
                        </button>
                      ))}
                      {explainResult.incoming.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => selectNode(e.source)}
                          className="w-full text-left flex justify-between font-mono text-[11px] hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          <span>← {e.relation}</span>
                          <span className="text-slate-400">
                            {e.source} <em className="not-italic text-[9px]">({e.confidence})</em>
                          </span>
                        </button>
                      ))}
                      {explainResult.outgoing.length + explainResult.incoming.length === 0 && (
                        <p className="text-slate-400 text-[11px]">Nenhuma ligação registrada para este nó.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                !isExplaining && (
                  <div className="text-center py-6 text-slate-400 space-y-2">
                    <Network className="w-8 h-8 mx-auto opacity-40" />
                    <p>Clique em qualquer nó do grafo para explicar suas ligações.</p>
                  </div>
                )
              )}
            </div>

            {/* Caminho entre dois nós (mirrors `graphify path`) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                <Route className="w-4 h-4 text-amber-600" />
                Caminho entre dois nós
              </h4>
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="ID do nó de origem (ex.: BOX-...)"
                  value={pathFrom}
                  onChange={(e) => setPathFrom(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono"
                />
                <input
                  type="text"
                  placeholder="ID do nó de destino"
                  value={pathTo}
                  onChange={(e) => setPathTo(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono"
                />
                <button
                  onClick={runPathFinder}
                  disabled={isFindingPath}
                  className="px-2 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {isFindingPath ? 'Calculando...' : 'Traçar caminho'}
                </button>
                {pathError && <p className="text-rose-500 text-[11px]">{pathError}</p>}
                {pathResult && (
                  <ol className="text-[11px] font-mono space-y-1 mt-1">
                    {pathResult.map((step, idx) => (
                      <li key={step.nodeId} className="text-slate-700 dark:text-slate-300">
                        {idx > 0 && <span className="text-slate-400">↳ {step.viaRelation} → </span>}
                        {step.nodeId}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Busca global (mirrors `graphify query`) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                <Search className="w-4 h-4 text-sky-600" />
                Buscar em toda a base
              </h4>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="ex.: consulta_pesquisa, CX-001..."
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runGlobalSearch()}
                  className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono"
                />
                <button
                  onClick={runGlobalSearch}
                  disabled={isSearchingGlobal}
                  className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  Buscar
                </button>
              </div>
              {globalResults.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {globalResults.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => selectNode(n.id)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 font-mono text-[11px] flex justify-between"
                      >
                        <span>{n.label}</span>
                        <span className={`text-[9px] px-1.5 rounded ${nodeColorMap[n.type].bg}`}>{n.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Busca por semelhança entre ossos (_local-adr-policy-103) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                <Bone className="w-4 h-4 text-pink-600" />
                Busca por Semelhança (osso em mãos)
              </h4>
              <p className="text-slate-400 text-[11px] mb-2">
                Descreva livremente o osso que você tem em mãos — a IA interpreta a descrição e compara com elementos reais já cadastrados no acervo.
              </p>
              <textarea
                placeholder='ex.: "fêmur de 37cm com características femininas"'
                value={boneFreeText}
                onChange={(e) => setBoneFreeText(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono resize-none"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={runBoneSimilaritySearch}
                  disabled={isSearchingBones || !boneFreeText.trim()}
                  className="flex-1 px-2 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {isSearchingBones ? 'Comparando...' : 'Buscar semelhantes'}
                </button>
                {(boneSearchResult || boneSearchError) && (
                  <button
                    onClick={clearBoneSearch}
                    title="Limpar busca e voltar ao grafo normal"
                    className="px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {boneSearchError && <p className="text-rose-500 text-[11px] mt-2">{boneSearchError}</p>}

              {boneSearchResult && (
                <div className="mt-2 space-y-2">
                  {boneSearchResult.explanationError && (
                    <p className="text-amber-500 text-[11px]">
                      A IA não conseguiu explicar a semelhança ({boneSearchResult.explanationError}) — os resultados abaixo são reais, só sem o comentário.
                    </p>
                  )}
                  {boneSearchResult.candidates.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">Nenhum elemento parecido encontrado no acervo.</p>
                  ) : (
                    <>
                      <p className="text-pink-600 dark:text-pink-400 text-[10px] font-mono uppercase font-semibold">
                        {boneSearchResult.candidates.length} candidato(s) real(is) no acervo:
                      </p>
                      <ul className="space-y-1.5">
                        {boneSearchResult.candidates.map((c) => (
                          <li
                            key={`${c.nic}-${c.element.id}`}
                            className="p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]"
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">{c.element.namePt}</span>
                              <span className="text-slate-400 shrink-0">{c.nic}</span>
                            </div>
                            {c.similarity && (
                              <p className="text-slate-500 dark:text-slate-400 mt-1">
                                {Math.round(c.similarity.similarityScore * 100)}% parecido (confiança {c.similarity.confidence}) — {c.similarity.explanation}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-slate-400 italic">
                        Conexões pontilhadas no grafo são sugestão da IA sobre dados reais do acervo — não são identificação confirmada.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
              Regra §7: Dados restritos de cemitério/óbito nunca são inseridos no grafo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
