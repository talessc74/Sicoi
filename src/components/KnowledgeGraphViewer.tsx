import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { GraphNode, GraphNodeType, GraphEdge } from '../types/sgccco';
import {
  Network,
  Search,
  Info,
  Route,
  Loader2,
  RefreshCw,
  Bone,
  X,
  Move,
  Layers,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  PanelRightClose,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { searchSimilarBones, BoneSimilaritySearchResult } from '../services/geminiService';
import { ErrorNotice } from './ErrorNotice';
import { toAppError, AppError } from '../utils/errorMessages';
import { computeGraphLayout, computeHopDistances, DEFAULT_RADIUS_MAP } from '../utils/graphLayout';
import { INSTITUTION_CONFIG } from '../config/institutionConfig';

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
  nic: { fill: '#2563eb', stroke: '#1d4ed8', label: 'Conjunto (COI)', bg: 'bg-blue-100 text-blue-800' },
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
  conceito_biologico: { fill: '#0ea5e9', stroke: '#0284c7', label: 'Perfil Biológico (Hub)', bg: 'bg-sky-100 text-sky-800' },
  conceito_patologico: { fill: '#e11d48', stroke: '#9f1239', label: 'Patologia Compartilhada (Hub)', bg: 'bg-rose-100 text-rose-800' },
  osso_consultado: { fill: '#ec4899', stroke: '#db2777', label: 'Osso Consultado (temporário)', bg: 'bg-pink-100 text-pink-800' }
};

const radiusMap: Record<GraphNodeType, number> = DEFAULT_RADIUS_MAP;

const BONE_QUERY_NODE_ID = 'BONE-QUERY-TEMP';

// Quadro original do layout radial (viewBox "0 0 840 600" de sempre). Enquanto
// nenhum nó é arrastado pra fora dele, o SVG continua responsivo (width="100%",
// escala pra caber no painel) — igual a antes. Só quando um arrasto ultrapassa
// esta margem é que o SVG passa a ter tamanho real em pixels (sem escala) dentro
// de um contêiner com rolagem, pra dar como chegar até o nó movido.
const BASE_GRAPH_BOUNDS = { minX: 0, minY: 0, maxX: 840, maxY: 600 };
// Maior raio desenhado (nó "nic"/"osso_consultado", r=26) + folga pro rótulo de
// texto abaixo do nó não ficar cortado bem na borda do quadro.
const NODE_EDGE_MARGIN = 40;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || `Falha ao consultar ${url} (HTTP ${res.status})`), { code: data?.code });
  return data as T;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({ selectedNic }) => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [isLoadingGraph, setIsLoadingGraph] = useState(true);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [explainResult, setExplainResult] = useState<ExplainResult | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathResult, setPathResult] = useState<PathStep[] | null>(null);
  const [pathError, setPathError] = useState<AppError | null>(null);
  const [isFindingPath, setIsFindingPath] = useState(false);

  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<GraphNode[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const [boneFreeText, setBoneFreeText] = useState('');
  const [boneSearchResult, setBoneSearchResult] = useState<BoneSimilaritySearchResult | null>(null);
  const [boneSearchError, setBoneSearchError] = useState<AppError | null>(null);
  const [isSearchingBones, setIsSearchingBones] = useState(false);

  // Modos de Visualização e Camadas Semânticas (Cross-COI)
  const [viewMode, setViewMode] = useState<'focus' | 'global'>(selectedNic ? 'focus' : 'global');
  const [layerSex, setLayerSex] = useState(true);
  const [layerPathology, setLayerPathology] = useState(true);
  const [layerAge, setLayerAge] = useState(true);
  const [hideOperational, setHideOperational] = useState(true);

  // Posições que a pessoa arrastou manualmente — sobrescrevem o layout radial
  // calculado, só pra esta tela (não é gravado no banco: o grafo em si continua
  // vindo de computeGraphForCollection; isto é puramente de visualização).
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStateRef = useRef<{ id: string; moved: boolean; startClientX: number; startClientY: number; offsetX: number; offsetY: number } | null>(null);

  // Arrastar o fundo do grafo (não um nó) rola o próprio contêiner — o grafo
  // completo pode ser bem maior que a tela (ex.: a Rede Interconectada com
  // todos os COIs, centenas de nós), e depender só da barra de rolagem nativa
  // pra navegar nele é lento e nada natural. Um nó já chama e.stopPropagation()
  // no próprio mousedown, então esse handler só dispara mesmo em cima do fundo.
  const graphScrollRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Zoom do grafo — 1 = tamanho normal. Pinça no trackpad (Mac) chega como
  // evento wheel com ctrlKey=true; o navegador trataria isso como zoom da
  // PÁGINA INTEIRA se a gente não interceptasse com preventDefault (por isso
  // o listener é registrado "na unha" com addEventListener e passive:false,
  // não via onWheel do JSX, que o React mantém passivo). Zoom sempre volta a
  // 1 ao trocar de modo (Foco/Global), que é basicamente trocar de cena.
  const [zoom, setZoom] = useState(1);

  // Tela cheia do grafo — tenta a Fullscreen API nativa (esconde até a barra
  // do navegador) quando disponível, mas nunca depende só dela: o overlay CSS
  // abaixo (isFullscreen) dá a mesma experiência mesmo onde a API é recusada
  // ou não existe (ex.: Safari no iPad em certos contextos).
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Em tela cheia o grafo é o protagonista — o painel lateral (Explicar/Caminho/
  // Busca) vira uma gaveta sobreposta, recolhida por padrão, em vez de dividir a
  // largura da tela com o canvas o tempo todo. Fora da tela cheia este estado não
  // é consultado em lugar nenhum: o painel continua sempre visível, como sempre foi.
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        fullscreenContainerRef.current?.requestFullscreen?.().catch(() => {});
        setIsSidePanelOpen(false);
      } else if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);

  // Converte coordenada de tela (clientX/Y do evento de mouse) pra coordenada do
  // espaço interno do SVG (viewBox "0 0 840 600") — necessário porque o SVG é
  // renderizado numa área de tamanho variável (responsiva), então 1px de mouse na
  // tela não corresponde a 1 unidade do viewBox.
  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: clientX, y: clientY };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  // Carrega o grafo persistido — o conjunto todo, ou escopado ao NIC selecionado na tela.
  // Só refaz sozinho quando o NIC selecionado muda (ou ao montar a tela); uma mudança feita
  // em outra aba/tela enquanto esta já estava aberta não chega aqui sozinha — por isso o
  // botão "Atualizar" ao lado do título busca de novo sob demanda.
  const loadGraph = useCallback(() => {
    let cancelled = false;
    setIsLoadingGraph(true);
    setLoadError(null);
    const url = viewMode === 'focus' && selectedNic
      ? `/api/graph?nic=${encodeURIComponent(selectedNic)}`
      : '/api/graph';
    fetchJson<{ nodes: GraphNode[]; edges: GraphEdge[] }>(url)
      .then((data) => {
        if (!cancelled) setGraphData(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(toAppError(err, 'Erro ao carregar o grafo.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGraph(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNic, viewMode]);

  useEffect(() => loadGraph(), [loadGraph]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsExplaining(true);
    setExplainResult(null);
    // Em tela cheia, selecionar um nó é o próprio motivo de abrir a gaveta —
    // é a resposta à pergunta que a pessoa acabou de fazer clicando nele.
    setIsSidePanelOpen((prevOpen) => (isFullscreen ? true : prevOpen));
    fetchJson<ExplainResult>(`/api/graph/node/${encodeURIComponent(nodeId)}`)
      .then(setExplainResult)
      .catch(() => setExplainResult(null))
      .finally(() => setIsExplaining(false));
  }, [isFullscreen]);

  // Começa o arraste de um nó — guarda o deslocamento entre o ponto clicado e o
  // centro do nó, pra ele não "pular" pro cursor no primeiro movimento.
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, node: { id: string; x: number; y: number }) => {
      e.stopPropagation();
      const svgPoint = toSvgPoint(e.clientX, e.clientY);
      dragStateRef.current = {
        id: node.id,
        moved: false,
        startClientX: e.clientX,
        startClientY: e.clientY,
        offsetX: svgPoint.x - node.x,
        offsetY: svgPoint.y - node.y
      };
    },
    [toSvgPoint]
  );

  // Ouvintes globais (não só no próprio nó): o mouse costuma sair da área do nó
  // durante o arraste rápido, e o movimento/soltar precisam continuar sendo
  // percebidos mesmo assim. Um clique sem movimento (abaixo do limiar) ainda
  // seleciona o nó, igual a antes — só passa a ser arraste depois de um
  // deslocamento perceptível.
  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (!drag.moved && Math.hypot(dx, dy) > 3) {
        drag.moved = true;
      }
      if (drag.moved) {
        const svgPoint = toSvgPoint(e.clientX, e.clientY);
        setManualPositions((prev) => ({
          ...prev,
          [drag.id]: { x: svgPoint.x - drag.offsetX, y: svgPoint.y - drag.offsetY }
        }));
      }
    }
    function handleUp() {
      const drag = dragStateRef.current;
      if (drag && !drag.moved) {
        selectNode(drag.id);
      }
      dragStateRef.current = null;
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [toSvgPoint, selectNode]);

  // Começa o arraste do fundo (pan) — só dispara quando o mousedown não veio
  // de um nó (que já intercepta e para a propagação sozinho).
  const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    const container = graphScrollRef.current;
    if (!container) return;
    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    };
    setIsPanning(true);
  }, []);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const pan = panStateRef.current;
      const container = graphScrollRef.current;
      if (!pan || !container) return;
      container.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX);
      container.scrollTop = pan.scrollTop - (e.clientY - pan.startY);
    }
    function handleUp() {
      if (panStateRef.current) {
        panStateRef.current = null;
        setIsPanning(false);
      }
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  // Pinça do trackpad (Mac/Windows precision touchpad) chega como wheel com
  // ctrlKey=true — interceptamos só esse caso (ctrlKey) e damos preventDefault,
  // senão o navegador aplicaria zoom na página inteira em vez de só no grafo.
  // Scroll normal (sem ctrlKey, incl. o gesto de dois dedos) nunca é tocado
  // aqui — continua rolando o contêiner normalmente, como antes.
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.01);
    setZoom((z) => clampZoom(z * factor));
  }, []);

  // Callback ref, não useEffect com deps [] — este div some e volta (estado
  // de carregamento, "Atualizar"), e um useEffect de montagem só dispara na
  // primeira vez que o COMPONENTE aparece, não toda vez que ESTE div
  // específico (re)monta; sem isto, a pinça parava de funcionar depois do
  // primeiro carregamento.
  const attachGraphScrollNode = useCallback(
    (node: HTMLDivElement | null) => {
      graphScrollRef.current?.removeEventListener('wheel', handleWheel);
      graphScrollRef.current = node;
      node?.addEventListener('wheel', handleWheel, { passive: false });
    },
    [handleWheel]
  );

  // Trocar de modo (Foco ↔ Global) é essencialmente trocar de cena — um zoom
  // deixado de uma visualização anterior não faz sentido carregado pra outra.
  useEffect(() => {
    setZoom(1);
  }, [viewMode]);

  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z * 1.25)), []);
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z / 1.25)), []);
  const resetZoom = useCallback(() => setZoom(1), []);

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
      setPathError(toAppError(err, 'Nenhum caminho encontrado.'));
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
      setBoneSearchError(toAppError(err, 'Erro ao buscar ossos parecidos.'));
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
      // Filtros de camadas semânticas no Modo Global
      if (viewMode === 'global') {
        if (hideOperational) {
          const operationalTypes: GraphNodeType[] = [
            'formulario_a1',
            'formulario_a2',
            'assinatura',
            'evento_custodia',
            'foto',
            'exame'
          ];
          if (operationalTypes.includes(n.type)) return false;
        }

        if (!layerSex && n.id.startsWith('HUB-SEX-')) return false;
        if (!layerAge && n.id.startsWith('HUB-AGE-')) return false;
        if (!layerPathology && (n.type === 'conceito_patologico' || n.id.startsWith('HUB-PATH-'))) return false;
      }

      const matchType = filterType === 'all' || n.type === filterType;
      const matchSearch =
        searchTerm === '' ||
        n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [graphData.nodes, viewMode, hideOperational, layerSex, layerAge, layerPathology, filterType, searchTerm]);

  // Última posição calculada de cada nó — alimenta `previousPositions` na
  // próxima chamada, pra reorganização por seleção partir de onde cada nó já
  // estava em vez de do zero (continuidade; base pra animar a transição mais
  // adiante). Um ref porque é só memória de cálculo, nunca dispara re-render
  // sozinho — quem dispara é `selectedNodeId` mudando de verdade.
  const previousPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Layout híbrido: Radial no modo Foco (COI individual) e Multicêntrico Spring-Embedder no modo Global
  const layoutNodes = useMemo(() => {
    const computed = computeGraphLayout(filteredNodes, graphData.edges, {
      mode: viewMode,
      width: 840,
      height: 600,
      focusedNic: selectedNic,
      radiusMap,
      // Reorganização viva por seleção (ADR 118) — só faz sentido no modo
      // Global, onde "o que se conecta a isto" é a pergunta real.
      selectedNodeId: viewMode === 'global' ? selectedNodeId : null,
      previousPositions: previousPositionsRef.current
    });
    const snapshot: Record<string, { x: number; y: number }> = {};
    for (const node of computed) snapshot[node.id] = { x: node.x, y: node.y };
    previousPositionsRef.current = snapshot;
    return computed;
  }, [filteredNodes, graphData.edges, viewMode, selectedNic, selectedNodeId]);

  const visibleNodeIds = useMemo(() => new Set(layoutNodes.map((n) => n.id)), [layoutNodes]);

  // Grau de separação até o nó selecionado, sobre o grafo visível — alimenta
  // a opacidade "foco + contexto": perto de quem foi clicado fica no claro,
  // o resto esmaece (nunca some) na proporção da distância real no grafo.
  const hopDistancesFromSelection = useMemo(() => {
    if (viewMode !== 'global' || !selectedNodeId) return null;
    return computeHopDistances(filteredNodes, graphData.edges, selectedNodeId);
  }, [viewMode, selectedNodeId, filteredNodes, graphData.edges]);

  const hubNodeIds = useMemo(
    () => new Set(filteredNodes.filter((n) => n.type === 'conceito_biologico' || n.type === 'conceito_patologico').map((n) => n.id)),
    [filteredNodes]
  );

  // Hubs e o próprio nó selecionado nunca esmaecem — são a âncora estrutural
  // (PolarBear: sem isso, wayfinding se perde a cada seleção).
  const getSelectionOpacity = useCallback(
    (nodeId: string): number => {
      if (!hopDistancesFromSelection || !selectedNodeId) return 1;
      if (nodeId === selectedNodeId || hubNodeIds.has(nodeId)) return 1;
      const hops = hopDistancesFromSelection.get(nodeId);
      if (hops === undefined) return 0.3;
      if (hops <= 1) return 1;
      if (hops === 2) return 0.65;
      return 0.4;
    },
    [hopDistancesFromSelection, selectedNodeId, hubNodeIds]
  );

  const filteredEdges = useMemo(() => {
    return graphData.edges.filter((e) => {
      if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
      if (viewMode === 'global') {
        if (!layerSex && e.relation === 'perfil_sexo') return false;
        if (!layerAge && e.relation === 'perfil_etario') return false;
        if (!layerPathology && e.relation === 'instancia_patologia') return false;
      }
      return true;
    });
  }, [graphData.edges, visibleNodeIds, viewMode, layerSex, layerAge, layerPathology]);

  // Nós/arestas da busca por semelhança entram só no desenho (displayNodes/
  // displayEdges) — nunca em layoutNodes/filteredEdges, que refletem o que de
  // fato está em graph_nodes/graph_edges.
  const displayNodesBeforeDrag = useMemo(
    () => (boneOverlay ? [...layoutNodes, ...boneOverlay.nodes] : layoutNodes),
    [layoutNodes, boneOverlay]
  );
  // Posição arrastada manualmente sobrescreve a calculada — última camada antes
  // do desenho, pra sobreviver a filtro/busca mudando sem perder o que a pessoa
  // já organizou.
  const displayNodes = useMemo(
    () => displayNodesBeforeDrag.map((n) => (manualPositions[n.id] ? { ...n, ...manualPositions[n.id] } : n)),
    [displayNodesBeforeDrag, manualPositions]
  );
  const displayEdges = useMemo(() => (boneOverlay ? [...filteredEdges, ...boneOverlay.edges] : filteredEdges), [filteredEdges, boneOverlay]);

  // Quadro do SVG: começa igual ao de sempre (BASE_GRAPH_BOUNDS) e só cresce pra
  // incluir um nó que foi arrastado pra fora dele. Recalcula a cada posição —
  // inclusive durante o próprio arrasto, então o quadro (e a barra de rolagem)
  // cresce em tempo real conforme o nó passa da borda.
  const graphBounds = useMemo(() => {
    let { minX, minY, maxX, maxY } = BASE_GRAPH_BOUNDS;
    for (const n of displayNodes) {
      minX = Math.min(minX, n.x - NODE_EDGE_MARGIN);
      minY = Math.min(minY, n.y - NODE_EDGE_MARGIN);
      maxX = Math.max(maxX, n.x + NODE_EDGE_MARGIN);
      maxY = Math.max(maxY, n.y + NODE_EDGE_MARGIN);
    }
    return { minX, minY, maxX, maxY };
  }, [displayNodes]);

  const graphExceedsFrame =
    graphBounds.minX < BASE_GRAPH_BOUNDS.minX ||
    graphBounds.minY < BASE_GRAPH_BOUNDS.minY ||
    graphBounds.maxX > BASE_GRAPH_BOUNDS.maxX ||
    graphBounds.maxY > BASE_GRAPH_BOUNDS.maxY;

  const graphWidth = graphBounds.maxX - graphBounds.minX;
  const graphHeight = graphBounds.maxY - graphBounds.minY;

  // Zoom força o mesmo modo "tamanho real + contêiner rolável" que
  // graphExceedsFrame já usa pro grafo maior que o quadro — faz sentido: dar
  // zoom também é fazer o conteúdo não caber mais inteiro na área visível.
  const useScrollableCanvas = graphExceedsFrame || zoom !== 1;

  const getNodeCoords = (id: string) => {
    const n = displayNodes.find((item) => item.id === id);
    return n ? { x: n.x, y: n.y } : null;
  };

  // Clicar num nó centraliza a câmera nele — faz sentido sobretudo na Rede
  // Interconectada (centenas de nós espalhados bem além da tela): sem isto, o
  // nó selecionado podia ficar fora da área visível, exigindo rolar à mão pra
  // achá-lo de novo. Depende só de selectedNodeId de propósito — a posição já
  // está resolvida no momento do clique (o layout por grau de interesse da
  // _local-adr-policy-118 roda de uma vez só, não anima quadro a quadro) — e
  // nunca de displayNodes/graphBounds/zoom, o que faria a câmera pular
  // sozinha toda vez que o layout ou o zoom mudar por outro motivo (filtro,
  // busca, pinça), sem a pessoa ter clicado em nenhum nó. O zoom do momento
  // do clique entra na conta (1 unidade de viewBox = `zoom` px renderizados).
  useEffect(() => {
    if (!selectedNodeId) return;
    const container = graphScrollRef.current;
    const coords = getNodeCoords(selectedNodeId);
    if (!container || !coords) return;
    const targetLeft = (coords.x - graphBounds.minX) * zoom - container.clientWidth / 2;
    const targetTop = (coords.y - graphBounds.minY) * zoom - container.clientHeight / 2;
    container.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const selectedNode =
    graphData.nodes.find((n) => n.id === selectedNodeId) ||
    boneOverlay?.nodes.find((n) => n.id === selectedNodeId) ||
    explainResult?.node ||
    null;

  const crossCoiStats = useMemo(() => {
    const totalCoi = new Set(
      graphData.nodes.filter((n) => n.type === 'nic').map((n) => n.id)
    ).size;
    const totalHubs = graphData.nodes.filter(
      (n) => n.type === 'conceito_biologico' || n.type === 'conceito_patologico'
    ).length;
    return { totalCoi, totalHubs };
  }, [graphData.nodes]);

  return (
    <div
      ref={fullscreenContainerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col'
          : 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs'
      }
    >
      {/* Top Header & Filter Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Grafo de Conhecimento Osteológico ({INSTITUTION_CONFIG.institutionAcronym})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Interliga laudos, indivíduos, patologias e perfis biológicos. Arraste qualquer nó para reorganizar.
          </p>
        </div>

        {/* Switcher de Modo: Foco Individual vs Rede Global */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('focus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'focus'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🎯</span>
            <span>Foco {selectedNic ? `(${selectedNic})` : 'Individual'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('global')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'global'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🌐</span>
            <span>Rede Interconectada (Todos os COIs)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={loadGraph}
            disabled={isLoadingGraph}
            title="Recarregar o grafo agora"
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGraph ? 'animate-spin' : ''}`} />
          </button>
          {Object.keys(manualPositions).length > 0 && (
            <button
              onClick={() => setManualPositions({})}
              title="Desfazer os arrastos e voltar ao layout automático"
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Ver o grafo em tela cheia'}
            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {isFullscreen && (
            <button
              onClick={() => setIsSidePanelOpen((prev) => !prev)}
              title={isSidePanelOpen ? 'Fechar o painel e expandir o grafo' : 'Abrir o painel (explicar nó, caminho, busca)'}
              className={`p-1.5 rounded-lg border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                isSidePanelOpen
                  ? 'border-sky-400 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
              }`}
            >
              {isSidePanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            </button>
          )}
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

      {/* Barra de Camadas Semânticas no Modo Global */}
      {viewMode === 'global' && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white mr-1">
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Camadas de Conexão:
            </span>

            <label className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={layerSex}
                onChange={(e) => setLayerSex(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
              />
              <span className="text-sky-800 dark:text-sky-300 text-[11px] font-semibold">Sexo</span>
            </label>

            <label className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={layerAge}
                onChange={(e) => setLayerAge(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="text-indigo-800 dark:text-indigo-300 text-[11px] font-semibold">Faixa Etária</span>
            </label>

            <label className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={layerPathology}
                onChange={(e) => setLayerPathology(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
              />
              <span className="text-rose-800 dark:text-rose-300 text-[11px] font-semibold">Patologias</span>
            </label>

            <label className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer select-none ml-1">
              <input
                type="checkbox"
                checked={hideOperational}
                onChange={(e) => setHideOperational(e.target.checked)}
                className="rounded text-slate-600 focus:ring-slate-500 w-3.5 h-3.5"
              />
              <span className="text-slate-700 dark:text-slate-300 text-[11px]">Ocultar Operacionais (Formulários/Custódia)</span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>COIs: <strong className="text-slate-900 dark:text-slate-200">{crossCoiStats.totalCoi}</strong></span>
            <span>•</span>
            <span>Hubs Conectores: <strong className="text-sky-600 dark:text-sky-400">{crossCoiStats.totalHubs}</strong></span>
          </div>
        </div>
      )}

      {isLoadingGraph && (
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando grafo do banco de dados...
        </div>
      )}
      {loadError && (
        <div className="p-4">
          <ErrorNotice code={loadError.code} message={loadError.message} />
        </div>
      )}

      {!isLoadingGraph && !loadError && (
        <div
          className={
            isFullscreen
              ? 'flex flex-1 min-h-0'
              : 'grid grid-cols-1 lg:grid-cols-4 min-h-[520px]'
          }
        >
          {/* SVG Graph Viewport — em tela cheia ocupa o espaço inteiro e encolhe
              (flex-1) quando o painel abre, nunca fica por baixo dele: o SVG tem
              viewBox fixo e escala pra caber no espaço que sobra (preserveAspectRatio
              padrão "meet"), então o nó selecionado — e todo o resto — permanece
              visível e recentralizado, nunca escondido atrás da gaveta.
              Quando o grafo é maior que o quadro OU tem zoom aplicado
              (useScrollableCanvas), este mesmo contêiner vira a área rolável —
              arrastar o fundo (não um nó) pan-eia rolando ele
              (handleBackgroundMouseDown), pinça/ctrl+scroll dá zoom (ver o
              useEffect de wheel acima), e selecionar um nó centraliza a câmera
              nele sozinho (ver o useEffect de selectedNodeId acima). */}
          <div
            ref={attachGraphScrollNode}
            data-testid="graph-canvas"
            onMouseDown={handleBackgroundMouseDown}
            className={`${isFullscreen ? 'flex-1 min-w-0 h-full' : 'lg:col-span-3'} bg-slate-950 relative p-2 ${
              useScrollableCanvas
                ? `overflow-auto ${isFullscreen ? 'h-full' : 'max-h-[520px]'} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`
                : `overflow-hidden flex items-center justify-center ${isFullscreen ? 'h-full' : ''}`
            }`}
          >
            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-md bg-black/60 backdrop-blur-xs p-2 rounded-lg border border-slate-800 text-[10px] font-mono">
              {Object.entries(nodeColorMap).map(([type, meta]) => (
                <span key={type} className="flex items-center gap-1 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.fill }} />
                  <span>{meta.label.split('(')[0].trim()}</span>
                </span>
              ))}
            </div>
            {graphExceedsFrame && (
              <div className="absolute bottom-2 right-3 z-10 text-[10px] font-mono text-slate-500 bg-black/60 px-2 py-1 rounded">
                Nó movido pra fora do quadro original — use a barra de rolagem para alcançá-lo.
              </div>
            )}
            <div className="absolute bottom-2 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-1.5 py-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={zoomOut}
                title="Diminuir zoom"
                className="p-1 rounded text-slate-300 hover:bg-slate-700"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                title="Voltar o zoom a 100%"
                className="px-1.5 text-[10px] font-mono text-slate-300 hover:text-white"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                title="Aumentar zoom"
                className="p-1 rounded text-slate-300 hover:bg-slate-700"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <svg
              ref={svgRef}
              width={useScrollableCanvas ? graphWidth * zoom : '100%'}
              height={useScrollableCanvas ? graphHeight * zoom : isFullscreen ? '100%' : 520}
              viewBox={`${graphBounds.minX} ${graphBounds.minY} ${graphWidth} ${graphHeight}`}
              className="select-none"
            >
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
                const isCrossCoi =
                  e.relation === 'perfil_sexo' ||
                  e.relation === 'perfil_etario' ||
                  e.relation === 'instancia_patologia' ||
                  e.relation === 'mesmo_perfil_com';

                const strokeColor = isOnPath
                  ? '#facc15'
                  : isHighlighted
                    ? '#38bdf8'
                    : e.relation === 'perfil_sexo'
                      ? '#38bdf8'
                      : e.relation === 'perfil_etario'
                        ? '#818cf8'
                        : e.relation === 'instancia_patologia'
                          ? '#fb7185'
                          : e.relation === 'similar_a'
                            ? '#ec4899'
                            : '#334155';

                const strokeWidth = isOnPath
                  ? 3.2
                  : isHighlighted
                    ? 2.5
                    : isCrossCoi
                      ? 1.8
                      : 1.2;

                // Esmaece arestas cujas duas pontas estão fora do foco da seleção
                // ativa — nunca abaixo do que a própria ponta mais esmaecida já é.
                const selectionDim = Math.min(getSelectionOpacity(e.source), getSelectionOpacity(e.target));

                return (
                  <g key={e.id}>
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={e.confidence === 'INFERRED' ? '3 3' : isCrossCoi ? '4 2' : undefined}
                      markerEnd="url(#arrow)"
                      opacity={(isOnPath || isHighlighted ? 0.95 : isCrossCoi ? 0.85 : 0.55) * selectionDim}
                    />
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 4}
                      fill={isCrossCoi ? '#94a3b8' : '#64748b'}
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
                const isHub = node.type === 'conceito_biologico' || node.type === 'conceito_patologico';
                const r =
                  node.type === 'nic' || node.type === 'osso_consultado'
                    ? 26
                    : isHub
                      ? 24
                      : node.type === 'individuo'
                        ? 22
                        : 18;

                return (
                  // O posicionamento real (translate) fica só aqui, como atributo SVG — uma
                  // classe CSS de "transform" neste <g> (ex.: hover:scale) sobrescreveria esse
                  // translate em vez de somar a ele, fazendo o nó pular pro canto do SVG a cada
                  // hover (bug encontrado: nó ficava instável/impossível de clicar). O efeito de
                  // hover vive num <g> interno, que escala em torno do próprio centro
                  // (transform-box: fill-box) sem tocar na posição deste <g> externo.
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    opacity={getSelectionOpacity(node.id)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    className="cursor-grab active:cursor-grabbing transition-opacity duration-300"
                  >
                    <g
                      className="transition-transform duration-100 hover:scale-110"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    >
                      {isHub && (
                        <circle
                          r={r + 5}
                          fill="none"
                          stroke={meta.stroke}
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                          opacity={0.85}
                        />
                      )}
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
                        fontSize={node.type === 'nic' || isHub ? '10' : '9'}
                        fontWeight="600"
                        fontFamily="monospace"
                        className="pointer-events-none"
                      >
                        {isHub
                          ? node.label.length > 15
                            ? node.label.substring(0, 13) + '..'
                            : node.label
                          : node.label.length > 11
                            ? node.label.substring(0, 9) + '..'
                            : node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Painel lateral: Explicar / Caminho / Busca global — fora da tela
              cheia é sempre uma coluna fixa; em tela cheia vira uma gaveta que
              ENCOLHE o grafo ao abrir (flex-1 no SVG ao lado), nunca cobre por
              cima — o nó selecionado nunca fica escondido atrás do painel,
              porque não há nada "atrás": o grafo todo escala e recentraliza
              (preserveAspectRatio padrão do SVG) pra caber no espaço que sobra.
              Recolhida por padrão em tela cheia (ver isSidePanelOpen). */}
          <div
            className={`${
              isFullscreen
                ? `shrink-0 h-full overflow-y-auto overflow-x-hidden transition-[width] duration-300 ease-in-out ${
                    isSidePanelOpen ? 'w-[24rem]' : 'w-0'
                  }`
                : 'lg:col-span-1 max-h-[520px] overflow-y-auto'
            } p-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs flex flex-col gap-5`}
          >
            {isFullscreen && (
              <button
                onClick={() => setIsSidePanelOpen(false)}
                title="Fechar o painel e voltar ao grafo em tela cheia"
                className="self-end -mt-1 -mr-1 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}

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
                Caminho entre nós (Cross-COI)
              </h4>
              <p className="text-[10px] text-slate-400 mb-2">
                Descubra conexões entre laudos diferentes através de patologias ou perfis compartilhados.
              </p>
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="ID de origem (ex.: COI-001, HUB-SEX-FEMININO)"
                  value={pathFrom}
                  onChange={(e) => setPathFrom(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono"
                />
                <input
                  type="text"
                  placeholder="ID de destino (ex.: COI-002, HUB-PATH-ARTROSE)"
                  value={pathTo}
                  onChange={(e) => setPathTo(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono"
                />
                <button
                  onClick={runPathFinder}
                  disabled={isFindingPath}
                  className="px-2 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {isFindingPath ? 'Calculando caminho...' : 'Traçar caminho'}
                </button>
                {pathError && <ErrorNotice code={pathError.code} message={pathError.message} />}
                {pathResult && (
                  <div className="p-2 bg-white dark:bg-slate-950 rounded-lg border border-amber-300 dark:border-amber-800/60 mt-1">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">
                      Trajeto Encontrado ({pathResult.length} etapas):
                    </span>
                    <ol className="text-[11px] font-mono space-y-1">
                      {pathResult.map((step, idx) => (
                        <li key={step.nodeId} className="text-slate-700 dark:text-slate-300">
                          {idx > 0 && <span className="text-slate-400">↳ {step.viaRelation} → </span>}
                          <strong className={step.nodeId.startsWith('HUB-') ? 'text-sky-600 dark:text-sky-400' : ''}>
                            {step.nodeId}
                          </strong>
                        </li>
                      ))}
                    </ol>
                  </div>
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

              {boneSearchError && (
                <ErrorNotice className="mt-2" code={boneSearchError.code} message={boneSearchError.message} />
              )}

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
