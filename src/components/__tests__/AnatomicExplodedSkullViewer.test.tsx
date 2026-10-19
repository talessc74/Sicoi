import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnatomicExplodedSkullViewer } from '../AnatomicExplodedSkullViewer';

describe('AnatomicExplodedSkullViewer', () => {
  it('renderiza o cabeçalho e elementos anatômicos essenciais incluindo Etmóide e Conchas', () => {
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

    expect(screen.getByText(/Crânio de Beauchêne & Cadeia Laríngea/i)).toBeInTheDocument();
    expect(screen.getByText('Frontal')).toBeInTheDocument();
    expect(screen.getByText('★ Etmóide (Profundo)')).toBeInTheDocument();
    expect(screen.getByText('Concha D.')).toBeInTheDocument();
    expect(screen.getByText('Concha E.')).toBeInTheDocument();
    expect(screen.getByText(/Cartilagem Tireóidea/i)).toBeInTheDocument();
    expect(screen.getByText(/Cartilagem Cricoide/i)).toBeInTheDocument();
  });

  it('chama onSelectBone ao clicar em um osso do mapa SVG', async () => {
    const user = userEvent.setup();
    const onSelectBone = vi.fn();

    render(
      <AnatomicExplodedSkullViewer
        ossos={{}}
        onSelectBone={onSelectBone}
      />
    );

    const etmoideText = screen.getByText('★ Etmóide (Profundo)');
    await user.click(etmoideText);

    expect(onSelectBone).toHaveBeenCalledWith('Etmóide');
  });

  it('chama onToggleCartilagem ao clicar na Cartilagem Tireóidea', async () => {
    const user = userEvent.setup();
    const onToggleCartilagem = vi.fn();

    render(
      <AnatomicExplodedSkullViewer
        ossos={{}}
        onSelectBone={vi.fn()}
        onToggleCartilagem={onToggleCartilagem}
      />
    );

    const tireoidea = screen.getByText(/Cartilagem Tireóidea/i);
    await user.click(tireoidea);

    expect(onToggleCartilagem).toHaveBeenCalledWith('tireoidea');
  });
});
