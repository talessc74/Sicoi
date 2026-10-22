// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KnowledgeGraphViewer } from '../KnowledgeGraphViewer';
import type { GraphNode, GraphEdge } from '../../types/sgccco';

// jsdom não implementa a API de geometria de SVG usada pra converter
// coordenada de mouse em coordenada do viewBox durante o arraste — só pra
// o clique (sem movimento) não quebrar ao calcular isso, simulamos um
// transform identidade. A posição exata não importa aqui: só queremos que
// mousedown + mouseup sem deslocamento chame selectNode normalmente.
(SVGSVGElement.prototype as any).getScreenCTM = function () {
  return { inverse: () => ({}) };
};
(SVGSVGElement.prototype as any).createSVGPoint = function () {
  return {
    x: 0,
    y: 0,
    matrixTransform(this: { x: number; y: number }) {
      return { x: this.x, y: this.y };
    }
  };
};

const mockNodes: GraphNode[] = [
  { id: 'COI-001', type: 'nic', label: 'COI-001', properties: {} },
  { id: 'IND-01', type: 'individuo', label: 'IND-01', properties: {} },
  { id: 'ELEM-A', type: 'elemento', label: 'Elemento A', properties: {} },
  { id: 'ELEM-B', type: 'elemento', label: 'Elemento B', properties: {} },
  { id: 'HUB-SEX-FEMININO', type: 'conceito_biologico', label: 'Sexo: Feminino', properties: {} }
];

const mockEdges: GraphEdge[] = [
  { id: 'e1', source: 'COI-001', target: 'IND-01', relation: 'possui_individuo', confidence: 'EXTRACTED', provenance: {} as any },
  { id: 'e2', source: 'IND-01', target: 'ELEM-A', relation: 'contem_elemento', confidence: 'EXTRACTED', provenance: {} as any },
  { id: 'e3', source: 'ELEM-A', target: 'ELEM-B', relation: 'contem_elemento', confidence: 'EXTRACTED', provenance: {} as any },
  { id: 'e4', source: 'IND-01', target: 'HUB-SEX-FEMININO', relation: 'perfil_sexo', confidence: 'EXTRACTED', provenance: {} as any }
];

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.startsWith('/api/graph/node/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ node: mockNodes[0], incoming: [], outgoing: [] })
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ nodes: mockNodes, edges: mockEdges })
      } as Response);
    })
  );
}

// Simula um clique real no nó: mousedown no <g> seguido de mouseup na window
// sem movimento — é exatamente o que distingue "selecionar" de "arrastar"
// no próprio componente (ver handleNodeMouseDown/handleUp).
function clickNode(nodeGroup: Element) {
  fireEvent.mouseDown(nodeGroup, { clientX: 100, clientY: 100 });
  fireEvent.mouseUp(window);
}

describe('KnowledgeGraphViewer', () => {
  it('alterna pra tela cheia e volta, trocando o ícone e o título do botão', async () => {
    stubFetch();
    const { container } = render(<KnowledgeGraphViewer />);

    await waitFor(() => expect(screen.queryByText(/Consultando/i)).not.toBeInTheDocument());

    const toggleButton = screen.getByTitle('Ver o grafo em tela cheia');
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(screen.getByTitle('Sair da tela cheia')).toBeInTheDocument();
    expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Sair da tela cheia'));
    expect(screen.getByTitle('Ver o grafo em tela cheia')).toBeInTheDocument();
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('selecionar um nó no modo Global esmaece nós distantes e mantém o hub e o vizinho direto no claro', async () => {
    stubFetch();
    const { container } = render(<KnowledgeGraphViewer />);

    await waitFor(() => {
      expect(container.querySelector('[transform*="translate"]')).toBeTruthy();
    });

    // Antes de qualquer seleção, nenhum nó está esmaecido.
    const getNodeGroup = (label: string) =>
      Array.from(container.querySelectorAll('svg > g')).find((g) => g.textContent?.includes(label))!;

    expect(getNodeGroup('Elemento B').getAttribute('opacity')).toBe('1');

    clickNode(getNodeGroup('IND-01'));

    await waitFor(() => {
      // Vizinho direto (ELEM-A, 1 grau) continua no claro.
      expect(getNodeGroup('Elemento A').getAttribute('opacity')).toBe('1');
      // 2 graus de distância: esmaecido, mas não escondido.
      const elemBOpacity = Number(getNodeGroup('Elemento B').getAttribute('opacity'));
      expect(elemBOpacity).toBeLessThan(1);
      expect(elemBOpacity).toBeGreaterThan(0);
      // Hub nunca esmaece, mesmo longe da seleção.
      expect(getNodeGroup('Sexo: Fem').getAttribute('opacity')).toBe('1');
    });
  });
});
