import React, { useState, useMemo } from 'react';
import { OsteologicalCollection, GraphNode, GraphEdge } from '../types/sgccco';
import { buildKnowledgeGraph } from '../services/graphEngine';
import { Network, Filter, Search, Info, ShieldAlert, Sparkles } from 'lucide-react';

interface KnowledgeGraphViewerProps {
  collections: OsteologicalCollection[];
  selectedNic?: string;
}

export const KnowledgeGraphViewer: React.FC<KnowledgeGraphViewerProps> = ({
  collections,
  selectedNic
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const graphData = useMemo(() => {
    return buildKnowledgeGraph(collections);
  }, [collections]);

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(n => {
      const matchType = filterType === 'all' || n.type === filterType;
      const matchSearch = searchTerm === '' || n.label.toLowerCase().includes(searchTerm.toLowerCase()) || n.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [graphData.nodes, filterType, searchTerm]);

  const nodeColorMap: Record<GraphNode['type'], { fill: string; stroke: string; label: string; bg: string }> = {
    nic: { fill: '#2563eb', stroke: '#1d4ed8', label: 'Conjunto (NIC)', bg: 'bg-blue-100 text-blue-800' },
    individuo: { fill: '#10b981', stroke: '#059669', label: 'Indivíduo (Hipótese)', bg: 'bg-emerald-100 text-emerald-800' },
    elemento: { fill: '#64748b', stroke: '#475569', label: 'Elemento Ósseo', bg: 'bg-slate-100 text-slate-800' },
    patologia: { fill: '#e11d48', stroke: '#be123c', label: 'Patologia / Lesão', bg: 'bg-rose-100 text-rose-800' },
    caixa: { fill: '#f59e0b', stroke: '#d97706', label: 'Caixa de Custódia', bg: 'bg-amber-100 text-amber-800' },
    localizacao: { fill: '#8b5cf6', stroke: '#7c3aed', label: 'Localização Física', bg: 'bg-purple-100 text-purple-800' },
    metodo: { fill: '#06b6d4', stroke: '#0891b2', label: 'Método Bioantropológico', bg: 'bg-cyan-100 text-cyan-800' },
    exame: { fill: '#6366f1', stroke: '#4f46e5', label: 'Exame Complementar / DICOM', bg: 'bg-indigo-100 text-indigo-800' }
  };

  // Node position layout calculation (radial circular layout for stability)
  const layoutNodes = useMemo(() => {
    const center = { x: 420, y: 300 };
    const radiusMap: Record<GraphNode['type'], number> = {
      nic: 0,
      caixa: 110,
      individuo: 180,
      localizacao: 150,
      elemento: 240,
      metodo: 250,
      patologia: 230,
      exame: 220
    };

    return filteredNodes.map((node, index) => {
      const radius = radiusMap[node.type] || 200;
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

  const visibleNodeIds = new Set(layoutNodes.map(n => n.id));

  const filteredEdges = useMemo(() => {
    return graphData.edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [graphData.edges, visibleNodeIds]);

  const getNodeCoords = (id: string) => {
    const n = layoutNodes.find(item => item.id === id);
    return n ? { x: n.x, y: n.y } : null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Top Header & Filter Controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Grafo de Conhecimento Osteológico (DITEC / SENASP)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nasce na Fase 1 e cresce a cada etapa. Integra NIC, indivíduos, elementos, patologias e rastreamento de custódia.
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar no grafo..."
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
            <option value="nic">Conjuntos (NIC)</option>
            <option value="individuo">Indivíduos</option>
            <option value="patologia">Patologias</option>
            <option value="caixa">Caixas / Custódia</option>
            <option value="localizacao">Localizações Físicas</option>
            <option value="metodo">Métodos</option>
            <option value="exame">Exames Complementares</option>
          </select>
        </div>
      </div>

      {/* Main Canvas & Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[520px]">
        {/* SVG Graph Viewport */}
        <div className="lg:col-span-3 bg-slate-950 relative overflow-hidden flex items-center justify-center p-2">
          {/* Legend */}
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
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
            </defs>

            {/* Edges */}
            {filteredEdges.map((edge) => {
              const src = getNodeCoords(edge.source);
              const tgt = getNodeCoords(edge.target);
              if (!src || !tgt) return null;
              const isHighlighted = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

              return (
                <g key={edge.id}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isHighlighted ? '#38bdf8' : '#334155'}
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeDasharray={edge.relation === 'apresenta_patologia' ? '3 3' : undefined}
                    markerEnd="url(#arrow)"
                    opacity={isHighlighted ? 0.9 : 0.6}
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
                    {edge.relation}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {layoutNodes.map((node) => {
              const meta = nodeColorMap[node.type];
              const isSelected = selectedNode?.id === node.id;
              const r = node.type === 'nic' ? 26 : node.type === 'individuo' ? 22 : 18;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer transition-transform duration-100 hover:scale-110"
                >
                  <circle
                    r={r}
                    fill={meta.fill}
                    stroke={isSelected ? '#ffffff' : meta.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
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
              );
            })}
          </svg>
        </div>

        {/* Node Inspection & Provenance Panel */}
        <div className="p-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
              <Info className="w-4 h-4 text-sky-600" />
              Inspeção de Vértice e Proveniência
            </h4>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold ${nodeColorMap[selectedNode.type].bg}`}>
                    {nodeColorMap[selectedNode.type].label}
                  </span>
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white font-mono mt-1">
                    {selectedNode.label}
                  </h5>
                  <p className="text-[11px] font-mono text-slate-400">ID: {selectedNode.id}</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block">
                    Propriedades Estruturadas:
                  </span>
                  {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-500">{key}:</span>
                      <span className="text-slate-900 dark:text-slate-200 font-medium truncate max-w-[150px]">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Provenance details (§7) */}
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase block mb-1">
                    Rastreabilidade DITEC (§6, §7):
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    Este nó é alimentado pelas assinaturas validadas do fluxo. Todas as arestas registram versão científica e usuário responsável.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Network className="w-8 h-8 mx-auto opacity-40" />
                <p>Clique em qualquer nó do grafo para inspecionar relações, métodos aplicados e custódia.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
            Regra §7: Dados restritos de cemitério/óbito nunca são inseridos no grafo.
          </div>
        </div>
      </div>
    </div>
  );
};
