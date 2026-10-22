import { describe, it, expect } from 'vitest';
import { computeGraphLayout, computeHopDistances, DEFAULT_RADIUS_MAP } from '../graphLayout';
import { GraphNode, GraphEdge } from '../../types/sgccco';

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('computeGraphLayout', () => {
  const mockNodes: GraphNode[] = [
    { id: 'COI-001', type: 'nic', label: 'COI-001', properties: {} },
    { id: 'COI-002', type: 'nic', label: 'COI-002', properties: {} },
    { id: 'IND-01', type: 'individuo', label: 'IND-01', properties: {} },
    { id: 'HUB-SEX-FEMININO', type: 'conceito_biologico', label: 'Sexo: Feminino', properties: {} },
    { id: 'HUB-PATH-ARTROSE', type: 'conceito_patologico', label: 'Patologia: Artrose', properties: {} }
  ];

  const mockEdges: GraphEdge[] = [
    { id: 'e1', source: 'COI-001', target: 'IND-01', relation: 'possui_individuo', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e2', source: 'IND-01', target: 'HUB-SEX-FEMININO', relation: 'perfil_sexo', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e3', source: 'IND-01', target: 'HUB-PATH-ARTROSE', relation: 'instancia_patologia', confidence: 'EXTRACTED', provenance: {} as any }
  ];

  it('calcula posições em modo foco com o conjunto centralizado', () => {
    const layout = computeGraphLayout(mockNodes, mockEdges, {
      mode: 'focus',
      focusedNic: 'COI-001',
      radiusMap: DEFAULT_RADIUS_MAP
    });

    expect(layout).toHaveLength(mockNodes.length);
    const coi = layout.find((n) => n.id === 'COI-001');
    expect(coi).toBeDefined();
    expect(coi?.x).toBe(420);
    expect(coi?.y).toBe(300);
  });

  it('calcula posições em modo global sem colisão e com nós finitos', () => {
    const layout = computeGraphLayout(mockNodes, mockEdges, {
      mode: 'global',
      radiusMap: DEFAULT_RADIUS_MAP
    });

    expect(layout).toHaveLength(mockNodes.length);
    layout.forEach((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    });

    // Hub Feminino deve estar na âncora esquerda
    const hubFem = layout.find((n) => n.id === 'HUB-SEX-FEMININO');
    expect(hubFem?.x).toBe(200); // 420 - 220
    expect(hubFem?.y).toBe(300);
  });

  it('devolve lista vazia para entradas vazias', () => {
    const layout = computeGraphLayout([], [], {
      mode: 'global',
      radiusMap: DEFAULT_RADIUS_MAP
    });
    expect(layout).toEqual([]);
  });
});

describe('computeHopDistances', () => {
  const chainNodes: GraphNode[] = [
    { id: 'COI-001', type: 'nic', label: 'COI-001', properties: {} },
    { id: 'IND-01', type: 'individuo', label: 'IND-01', properties: {} },
    { id: 'ELEM-A', type: 'elemento', label: 'Elemento A', properties: {} },
    { id: 'ELEM-B', type: 'elemento', label: 'Elemento B', properties: {} },
    { id: 'ELEM-Z', type: 'elemento', label: 'Elemento Z (isolado)', properties: {} }
  ];
  const chainEdges: GraphEdge[] = [
    { id: 'e1', source: 'COI-001', target: 'IND-01', relation: 'possui_individuo', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e2', source: 'IND-01', target: 'ELEM-A', relation: 'contem_elemento', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e3', source: 'ELEM-A', target: 'ELEM-B', relation: 'contem_elemento', confidence: 'EXTRACTED', provenance: {} as any }
  ];

  it('calcula o grau de separação a partir da origem, não-direcionado', () => {
    const distances = computeHopDistances(chainNodes, chainEdges, 'IND-01');
    expect(distances.get('IND-01')).toBe(0);
    expect(distances.get('COI-001')).toBe(1);
    expect(distances.get('ELEM-A')).toBe(1);
    expect(distances.get('ELEM-B')).toBe(2);
    expect(distances.has('ELEM-Z')).toBe(false);
  });
});

describe('computeGraphLayout — reorganização viva por seleção (modo global)', () => {
  const chainNodes: GraphNode[] = [
    { id: 'COI-001', type: 'nic', label: 'COI-001', properties: {} },
    { id: 'IND-01', type: 'individuo', label: 'IND-01', properties: {} },
    { id: 'ELEM-A', type: 'elemento', label: 'Elemento A', properties: {} },
    { id: 'ELEM-B', type: 'elemento', label: 'Elemento B', properties: {} },
    { id: 'ELEM-Z', type: 'elemento', label: 'Elemento Z (isolado)', properties: {} },
    { id: 'HUB-SEX-FEMININO', type: 'conceito_biologico', label: 'Sexo: Feminino', properties: {} }
  ];
  const chainEdges: GraphEdge[] = [
    { id: 'e1', source: 'COI-001', target: 'IND-01', relation: 'possui_individuo', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e2', source: 'IND-01', target: 'ELEM-A', relation: 'contem_elemento', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e3', source: 'ELEM-A', target: 'ELEM-B', relation: 'contem_elemento', confidence: 'EXTRACTED', provenance: {} as any },
    { id: 'e4', source: 'IND-01', target: 'HUB-SEX-FEMININO', relation: 'perfil_sexo', confidence: 'EXTRACTED', provenance: {} as any }
  ];

  it('afasta nós progressivamente conforme o grau de separação até o nó selecionado', () => {
    const layout = computeGraphLayout(chainNodes, chainEdges, {
      mode: 'global',
      radiusMap: DEFAULT_RADIUS_MAP,
      selectedNodeId: 'IND-01'
    });

    const selected = layout.find((n) => n.id === 'IND-01')!;
    const directNeighbor = layout.find((n) => n.id === 'ELEM-A')!; // 1 grau
    const twoHops = layout.find((n) => n.id === 'ELEM-B')!; // 2 graus
    const unreachable = layout.find((n) => n.id === 'ELEM-Z')!; // sem caminho

    const distA = dist(selected, directNeighbor);
    const distB = dist(selected, twoHops);
    const distZ = dist(selected, unreachable);

    expect(distA).toBeLessThan(distB);
    expect(distB).toBeLessThan(distZ);
  });

  it('mantém o nó selecionado fixo onde já estava (não teleporta o que você acabou de clicar)', () => {
    const previousPositions = { 'IND-01': { x: 123, y: 456 } };
    const layout = computeGraphLayout(chainNodes, chainEdges, {
      mode: 'global',
      radiusMap: DEFAULT_RADIUS_MAP,
      selectedNodeId: 'IND-01',
      previousPositions
    });

    const selected = layout.find((n) => n.id === 'IND-01')!;
    expect(selected.x).toBe(123);
    expect(selected.y).toBe(456);
  });

  it('nunca move um hub, mesmo com uma seleção ativa (wayfinding estrutural)', () => {
    const layout = computeGraphLayout(chainNodes, chainEdges, {
      mode: 'global',
      radiusMap: DEFAULT_RADIUS_MAP,
      selectedNodeId: 'ELEM-B'
    });

    const hub = layout.find((n) => n.id === 'HUB-SEX-FEMININO')!;
    expect(hub.x).toBe(200); // 420 - 220, mesma âncora de sempre
    expect(hub.y).toBe(300);
  });

  it('ignora um selectedNodeId que não existe entre os nós (sem erro, comportamento igual ao padrão)', () => {
    const layout = computeGraphLayout(chainNodes, chainEdges, {
      mode: 'global',
      radiusMap: DEFAULT_RADIUS_MAP,
      selectedNodeId: 'NAO-EXISTE'
    });

    expect(layout).toHaveLength(chainNodes.length);
    layout.forEach((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    });
  });
});
