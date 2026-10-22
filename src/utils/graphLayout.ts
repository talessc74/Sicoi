import { GraphNode, GraphEdge, GraphNodeType } from '../types/sgccco';

export interface LayoutNode extends GraphNode {
  x: number;
  y: number;
}

export interface ComputeLayoutOptions {
  mode: 'focus' | 'global';
  width?: number;
  height?: number;
  focusedNic?: string;
  radiusMap: Record<GraphNodeType, number>;
  // Reorganização viva por seleção (Galera de UX, out/2026) — só no modo
  // 'global'. O nó selecionado vira âncora fixa (como os hubs já são);
  // o resto se redistribui por grau de separação a partir dele: vizinho
  // direto fica perto, 2 graus numa faixa intermediária, o que não tem
  // caminho até ele vai pra borda. `previousPositions` faz a simulação
  // começar de onde cada nó já estava (continuidade), não do zero —
  // essencial pra depois animar a transição em vez de teleportar.
  selectedNodeId?: string | null;
  previousPositions?: Record<string, { x: number; y: number }>;
}

export const DEFAULT_RADIUS_MAP: Record<GraphNodeType, number> = {
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
  conceito_biologico: 280,
  conceito_patologico: 290,
  osso_consultado: 0
};

// Grau de separação (BFS não-direcionado) de cada nó até `sourceId`. Nós sem
// caminho até a origem ficam de fora do mapa — tratados como "mais distante
// que qualquer grau alcançado" por quem usa o resultado.
export function computeHopDistances(nodes: GraphNode[], edges: GraphEdge[], sourceId: string): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }

  const distances = new Map<string, number>();
  if (!adjacency.has(sourceId)) return distances;

  distances.set(sourceId, 0);
  const queue: string[] = [sourceId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentDist = distances.get(current)!;
    for (const neighbor of adjacency.get(current) || []) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }
  return distances;
}

/**
 * Calcula posições (x, y) de cada nó do grafo.
 * - Modo 'focus': layout radial centrado no conjunto selecionado.
 * - Modo 'global': layout multicêntrico baseado em forças, onde hubs conceituais
 *   (sexo, idade, patologias) servem como centros de gravidade conectando múltiplos COIs.
 */
export function computeGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ComputeLayoutOptions
): LayoutNode[] {
  const width = options.width ?? 840;
  const height = options.height ?? 600;
  const cx = width / 2;
  const cy = height / 2;

  if (nodes.length === 0) return [];

  // Modo Foco: layout radial em torno do conjunto ativo
  if (options.mode === 'focus') {
    const focusedId = options.focusedNic || nodes.find((n) => n.type === 'nic')?.id;
    return nodes.map((node, index) => {
      if (node.id === focusedId || node.type === 'nic') {
        return { ...node, x: cx, y: cy };
      }
      const radius = options.radiusMap[node.type] ?? 200;
      const angle = (index * 2 * Math.PI) / Math.max(1, nodes.length);
      const jitter = (index % 3) * 12;
      return {
        ...node,
        x: cx + Math.cos(angle) * (radius + jitter),
        y: cy + Math.sin(angle) * (radius + jitter)
      };
    });
  }

  // Modo Global (Multicêntrico): Inicializa posições estratégicas por Hub
  const nodeMap = new Map<string, { x: number; y: number; vx: number; vy: number; isHub: boolean }>();

  // Âncoras para os principais Hubs
  const hubAnchors: Record<string, { x: number; y: number }> = {
    'HUB-SEX-FEMININO': { x: cx - 220, y: cy },
    'HUB-SEX-MASCULINO': { x: cx + 220, y: cy },
    'HUB-SEX-INDETERMINADO': { x: cx, y: cy + 180 },
    'HUB-AGE-ADULTO_JOVEM': { x: cx - 120, y: cy - 180 },
    'HUB-AGE-ADULTO_MEDIO': { x: cx, y: cy - 200 },
    'HUB-AGE-ADULTO_MADURO': { x: cx + 120, y: cy - 180 },
    'HUB-AGE-JOVEM': { x: cx - 200, y: cy - 140 },
    'HUB-AGE-IDOSO': { x: cx + 200, y: cy - 140 }
  };

  const selectedNodeId = options.selectedNodeId && nodes.some((n) => n.id === options.selectedNodeId) ? options.selectedNodeId : null;
  const previousPositions = options.previousPositions;

  // Posicionamento inicial — usa a posição anterior do nó quando disponível
  // (continuidade pra quem for animar a transição depois), senão cai no
  // mesmo posicionamento determinístico de sempre.
  let pathCount = 0;
  nodes.forEach((node, idx) => {
    const previous = previousPositions?.[node.id];
    if (previous) {
      nodeMap.set(node.id, { x: previous.x, y: previous.y, vx: 0, vy: 0, isHub: false });
    } else if (hubAnchors[node.id]) {
      nodeMap.set(node.id, { ...hubAnchors[node.id], vx: 0, vy: 0, isHub: true });
    } else if (node.type === 'conceito_patologico') {
      const angle = Math.PI * 0.2 + (pathCount * 0.45);
      pathCount++;
      const px = cx + Math.cos(angle) * 220;
      const py = cy + Math.sin(angle) * 190;
      nodeMap.set(node.id, { x: px, y: py, vx: 0, vy: 0, isHub: true });
    } else if (node.type === 'nic') {
      const angle = (idx * 2 * Math.PI) / Math.max(1, nodes.length);
      const r = 240 + (idx % 2) * 40;
      nodeMap.set(node.id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: 0, vy: 0, isHub: false });
    } else {
      const angle = (idx * 2 * Math.PI) / Math.max(1, nodes.length);
      const r = 160 + (idx % 3) * 30;
      nodeMap.set(node.id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: 0, vy: 0, isHub: false });
    }
  });

  // Hubs continuam fixos mesmo partindo da posição anterior (uma posição
  // "herdada" não pode apagar a âncora estrutural — PolarBear: sem isso,
  // wayfinding se perde a cada seleção).
  for (const id of Object.keys(hubAnchors)) {
    const pos = nodeMap.get(id);
    if (pos) pos.isHub = true;
  }
  for (const node of nodes) {
    if (node.type === 'conceito_patologico') {
      const pos = nodeMap.get(node.id);
      if (pos) pos.isHub = true;
    }
  }

  // O nó selecionado vira âncora fixa temporária — exatamente onde já
  // estava (Compass: a coisa que você acabou de clicar não pode teleportar;
  // é o resto do universo que se reorganiza em volta dela).
  let hopDistances: Map<string, number> | null = null;
  if (selectedNodeId) {
    const selPos = nodeMap.get(selectedNodeId);
    if (selPos) selPos.isHub = true;
    hopDistances = computeHopDistances(nodes, edges, selectedNodeId);
  }

  // Simulação física de relaxamento (Spring-Embedder / Force Layout)
  const iterations = 35;
  const kRepulsion = 18000;
  const kSpring = 0.04;
  const targetDist = 90;
  const kGravity = 0.035;

  // Grau de Interesse (reorganização viva por seleção) — distância-alvo até
  // o nó selecionado cresce 130px a cada grau de separação, partindo de 90px
  // pro vizinho direto; quem não tem caminho nenhum até ele vai pra borda.
  const kDegreeOfInterest = 0.05;
  const kDegreeOfInterestBaseDist = 90;
  const kDegreeOfInterestStep = 130;
  const kDegreeOfInterestMaxDist = 380;

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Repulsão entre todos os pares
    for (let i = 0; i < nodes.length; i++) {
      const idA = nodes[i].id;
      const posA = nodeMap.get(idA)!;
      for (let j = i + 1; j < nodes.length; j++) {
        const idB = nodes[j].id;
        const posB = nodeMap.get(idB)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distSq = dx * dx + dy * dy + 100;
        const dist = Math.sqrt(distSq);

        const force = kRepulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!posA.isHub) {
          posA.vx -= fx;
          posA.vy -= fy;
        }
        if (!posB.isHub) {
          posB.vx += fx;
          posB.vy += fy;
        }
      }
    }

    // 2. Atração por aresta
    for (const e of edges) {
      const posSrc = nodeMap.get(e.source);
      const posTgt = nodeMap.get(e.target);
      if (!posSrc || !posTgt) continue;

      const dx = posTgt.x - posSrc.x;
      const dy = posTgt.y - posSrc.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const displacement = dist - targetDist;
      const force = displacement * kSpring;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!posSrc.isHub) {
        posSrc.vx += fx;
        posSrc.vy += fy;
      }
      if (!posTgt.isHub) {
        posTgt.vx -= fx;
        posTgt.vy -= fy;
      }
    }

    // 3. Grau de Interesse: com um nó selecionado, todo outro nó mira uma
    // distância-alvo até ele que cresce com o grau de separação — vizinho
    // direto fica perto, quem não tem caminho nenhum até lá vai pra borda.
    // Substitui a gravidade central (4) pra esse nó enquanto durar a seleção:
    // as duas juntas puxariam em direções diferentes sempre que o nó
    // selecionado não estiver bem no centro do canvas.
    if (selectedNodeId && hopDistances) {
      const selPos = nodeMap.get(selectedNodeId);
      if (selPos) {
        for (const node of nodes) {
          if (node.id === selectedNodeId) continue;
          const pos = nodeMap.get(node.id)!;
          if (pos.isHub) continue;

          const hops = hopDistances.get(node.id);
          const idealDist = hops === undefined ? kDegreeOfInterestMaxDist : kDegreeOfInterestBaseDist + hops * kDegreeOfInterestStep;

          const dx = pos.x - selPos.x;
          const dy = pos.y - selPos.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const displacement = dist - idealDist;
          const force = displacement * kDegreeOfInterest;

          pos.vx -= (dx / dist) * force;
          pos.vy -= (dy / dist) * force;
        }
      }
    }

    // 4. Gravidade suave em direção ao centro (só sem seleção ativa) e amortecimento
    for (const [, pos] of nodeMap) {
      if (pos.isHub) continue;

      if (!selectedNodeId) {
        const gx = (cx - pos.x) * kGravity;
        const gy = (cy - pos.y) * kGravity;
        pos.vx += gx;
        pos.vy += gy;
      }

      // Atualiza posição
      pos.x += pos.vx;
      pos.y += pos.vy;

      // Amortecimento
      pos.vx *= 0.65;
      pos.vy *= 0.65;
    }
  }

  return nodes.map((node) => {
    const pos = nodeMap.get(node.id)!;
    return {
      ...node,
      x: Math.round(pos.x),
      y: Math.round(pos.y)
    };
  });
}
