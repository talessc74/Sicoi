import { describe, it, expect } from 'vitest';
import { computeGraphLayout, DEFAULT_RADIUS_MAP } from '../graphLayout';
import { GraphNode, GraphEdge } from '../../types/sgccco';

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
