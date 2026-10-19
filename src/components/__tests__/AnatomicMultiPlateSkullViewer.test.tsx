// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AnatomicMultiPlateSkullViewer,
  SKULL_SUBGROUPS_CONFIG
} from '../AnatomicMultiPlateSkullViewer';

describe('AnatomicMultiPlateSkullViewer', () => {
  it('renderiza o cabeçalho e os hotspots da prancha de Calota Craniana', () => {
    render(
      <AnatomicMultiPlateSkullViewer
        activeSubgroup="calota"
        onSelectSubgroup={vi.fn()}
        ossos={{
          'Frontal': 'P',
          'Parietal direito': 'F'
        }}
        onSelectBone={vi.fn()}
      />
    );

    expect(screen.getByText(/Calota Craniana/i)).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('chama onSelectBone ao clicar no hotspot de um osso da prancha', () => {
    const onSelectBone = vi.fn();
    const { container } = render(
      <AnatomicMultiPlateSkullViewer
        activeSubgroup="base_profunda"
        onSelectSubgroup={vi.fn()}
        ossos={{}}
        onSelectBone={onSelectBone}
      />
    );

    const hotspotEtmoide = container.querySelector('#hotspot-Etmóide');
    expect(hotspotEtmoide).toBeInTheDocument();

    if (hotspotEtmoide) {
      fireEvent.click(hotspotEtmoide);
      expect(onSelectBone).toHaveBeenCalledWith('Etmóide');
    }
  });

  it('chama onSelectSubgroup ao clicar nas abas do seletor superior', () => {
    const onSelectSubgroup = vi.fn();
    render(
      <AnatomicMultiPlateSkullViewer
        activeSubgroup="calota"
        onSelectSubgroup={onSelectSubgroup}
        ossos={{}}
        onSelectBone={vi.fn()}
      />
    );

    const baseProfundaBtn = screen.getByText(/Base Craniana/i);
    expect(baseProfundaBtn).toBeInTheDocument();
    fireEvent.click(baseProfundaBtn);

    expect(onSelectSubgroup).toHaveBeenCalledWith('base_profunda');
  });
});
