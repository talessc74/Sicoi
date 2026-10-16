// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OsteologicalInventoryViewer, CABECA_PESCOCO_OSSOS } from '../OsteologicalInventoryViewer';
import type { OsteologicalInventoryData } from '../../types/sgccco';

describe('OsteologicalInventoryViewer', () => {
  it('renderiza os 23 ossos de Cabeça e Pescoço e a barra de seções', () => {
    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    expect(screen.getByText(/Inventário Osteológico por Regiões Anatômicas/i)).toBeInTheDocument();
    expect(screen.getByText('1. Cabeça e Pescoço')).toBeInTheDocument();
    expect(screen.getByText('2. Coluna Vertebral')).toBeInTheDocument();

    // Verifica se os 23 ossos estão na tela
    for (const bone of CABECA_PESCOCO_OSSOS) {
      expect(screen.getByText(bone)).toBeInTheDocument();
    }
  });

  it('permite marcar a presença de um osso com o código P/F/I/A', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    // Clica no botão 'P' do osso Frontal
    const pButton = screen.getByTitle('Frontal — Presente sem fratura');
    await user.click(pButton);

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          ossos: { Frontal: 'P' }
        })
      })
    );
  });

  it('permite marcar todos os ossos da seção como P em lote', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    const markAllP = screen.getByRole('button', { name: /Marcar Todos P/i });
    await user.click(markAllP);

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          ossos: expect.objectContaining({
            Frontal: 'P',
            Mandíbula: 'P',
            Hióide: 'P'
          })
        })
      })
    );
  });

  it('permite selecionar estruturas complementares (cartilagens e ossículos)', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    const cricoideCheckbox = screen.getByRole('checkbox', { name: /Cricoide/i });
    await user.click(cricoideCheckbox);

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          cartilagensLaringe: ['cricoide']
        })
      })
    );
  });

  it('abre campo de seleção de osso ao marcar uma alteração óssea', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    const initialInventory: OsteologicalInventoryData = {
      cabecaPescoco: {
        ossos: {},
        alteracoes: [{ tipo: 'lesao_ante_mortem', osso: 'Frontal', observacoes: 'Fratura cicatrizada' }]
      }
    };

    render(
      <OsteologicalInventoryViewer
        inventory={initialInventory}
        onUpdateInventory={onUpdateInventory}
      />
    );

    expect(screen.getByText('Osso afetado:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fratura cicatrizada')).toBeInTheDocument();
  });

  it('ao clicar em outra seção exibe aviso de aguardo de especificações técnicas', async () => {
    const user = userEvent.setup();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    const colunaBtn = screen.getByText('2. Coluna Vertebral');
    await user.click(colunaBtn);

    expect(screen.getByText(/Aguardando parâmetros periciais/i)).toBeInTheDocument();
  });
});
