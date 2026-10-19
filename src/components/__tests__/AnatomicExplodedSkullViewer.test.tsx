// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnatomicExplodedSkullViewer } from '../AnatomicExplodedSkullViewer';

describe('AnatomicExplodedSkullViewer', () => {
  it('renderiza o cabeçalho, a imagem médica gravada e os hotspots anatômicos', () => {
    render(
      <AnatomicExplodedSkullViewer
        ossos={{
          'Frontal': 'P',
          'Etmóide': 'P',
          'Concha nasal inferior direita': 'F'
        }}
        onSelectBone={vi.fn()}
      />
    );

    expect(screen.getByText(/Placa Anatômica Gravada · Crânio de Beauchêne/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Crânio de Beauchêne e Estruturas Laríngeas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mapa Interativo sobre a Placa do Crânio/i)).toBeInTheDocument();
  });

  it('chama onSelectBone ao clicar no hotspot de um osso', () => {
    const onSelectBone = vi.fn();

    const { container } = render(
      <AnatomicExplodedSkullViewer
        ossos={{}}
        onSelectBone={onSelectBone}
      />
    );

    const frontalHotspot = container.querySelector('#hotspot-Frontal');
    expect(frontalHotspot).toBeInTheDocument();

    if (frontalHotspot) {
      fireEvent.click(frontalHotspot);
      expect(onSelectBone).toHaveBeenCalledWith('Frontal');
    }
  });

  it('exibe o badge com o código de presença correto quando o osso está marcado', () => {
    render(
      <AnatomicExplodedSkullViewer
        ossos={{
          'Frontal': 'P',
          'Temporal direito': 'F',
          'Esfenóide': 'I'
        }}
        onSelectBone={vi.fn()}
      />
    );

    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
  });
});
