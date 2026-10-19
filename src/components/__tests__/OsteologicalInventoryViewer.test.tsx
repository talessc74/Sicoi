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

    // Verifica que a legenda possui os códigos P/F/I/A e Alterações ósseas
    expect(screen.getByText('Alterações ósseas')).toBeInTheDocument();
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

  it('abre gaveta de alterações ósseas ao clicar no botão de exclamação do osso', async () => {
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

    // Verifica que o badge de alteração aparece no osso
    expect(screen.getByText(/1 alteração/i)).toBeInTheDocument();

    // Clica no botão vermelho de exclamação para abrir o drawer do osso Frontal
    const altButton = screen.getByRole('button', { name: 'Alterações ósseas — Frontal' });
    await user.click(altButton);

    expect(screen.getByText('Alterações Ósseas — Frontal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fratura cicatrizada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar outro item nesta categoria/i })).toBeInTheDocument();
  });

  it('permite adicionar outro item na mesma categoria usando o botão de mais (+)', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    const initialInventory: OsteologicalInventoryData = {
      cabecaPescoco: {
        ossos: {},
        alteracoes: [{ id: 'alt-1', tipo: 'lesao_ante_mortem', osso: 'Frontal', observacoes: 'Primeira fratura' }]
      }
    };

    render(
      <OsteologicalInventoryViewer
        inventory={initialInventory}
        onUpdateInventory={onUpdateInventory}
      />
    );

    // Abre o drawer de alterações do osso Frontal
    const altButton = screen.getByRole('button', { name: 'Alterações ósseas — Frontal' });
    await user.click(altButton);

    const addMoreBtn = screen.getByRole('button', { name: /Adicionar outro item nesta categoria/i });
    await user.click(addMoreBtn);

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          alteracoes: expect.arrayContaining([
            expect.objectContaining({ tipo: 'lesao_ante_mortem', osso: 'Frontal' }),
            expect.objectContaining({ tipo: 'lesao_ante_mortem', osso: 'Frontal' })
          ])
        })
      })
    );
  });

  it('permite selecionar "Sem alteração" desmarcando outras alterações do osso', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    const initialInventory: OsteologicalInventoryData = {
      cabecaPescoco: {
        ossos: {},
        alteracoes: [{ id: 'alt-1', tipo: 'lesao_ante_mortem', osso: 'Frontal', observacoes: 'Lesão' }]
      }
    };

    render(
      <OsteologicalInventoryViewer
        inventory={initialInventory}
        onUpdateInventory={onUpdateInventory}
      />
    );

    // Abre o drawer de alterações do osso Frontal
    const altButton = screen.getByRole('button', { name: 'Alterações ósseas — Frontal' });
    await user.click(altButton);

    const semAltCheckbox = screen.getByRole('checkbox', { name: /Sem alteração/i });
    await user.click(semAltCheckbox);

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          alteracoes: [expect.objectContaining({ tipo: 'sem_alteracao', osso: 'Frontal' })]
        })
      })
    );
  });

  it('ao clicar em outra seção exibe os ossos e os campos de contagem/identificação daquela região', async () => {
    const user = userEvent.setup();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    const colunaBtn = screen.getByText('2. Coluna Vertebral');
    await user.click(colunaBtn);

    expect(screen.getByText('Sacro')).toBeInTheDocument();
    expect(screen.getByText('Cóccix')).toBeInTheDocument();
    expect(screen.getByText('Cervicais')).toBeInTheDocument();
    expect(screen.getByText('Torácicas')).toBeInTheDocument();
    expect(screen.getByText('Lombares')).toBeInTheDocument();
  });

  it('permite marcar a presença de um osso numa seção genérica (Coluna Vertebral)', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByText('2. Coluna Vertebral'));
    await user.click(screen.getByTitle('Sacro — Presente sem fratura'));

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        colunaVertebral: expect.objectContaining({
          ossos: { Sacro: 'P' }
        })
      })
    );
  });

  it('marcar um osso como Ausente (A) limpa as alterações ósseas já registradas (regra retroativa)', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{
          cabecaPescoco: {
            ossos: { Frontal: 'P' },
            alteracoes: [{ id: 'alt-1', tipo: 'fratura', osso: 'Frontal', observacoes: 'teste' }]
          }
        }}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByTitle('Frontal — Ausente'));

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          ossos: expect.objectContaining({ Frontal: 'A' }),
          alteracoes: []
        })
      })
    );
  });

  it('desabilita o botão de alteração óssea quando o osso já está marcado como Ausente', () => {
    render(
      <OsteologicalInventoryViewer
        inventory={{ cabecaPescoco: { ossos: { Frontal: 'A' }, alteracoes: [] } }}
        onUpdateInventory={vi.fn()}
      />
    );

    const altButton = screen.getByRole('button', { name: 'Alterações ósseas — Frontal' });
    expect(altButton).toBeDisabled();
  });

  it('a contagem de falanges e sesamoides da Mão é compartilhada entre as abas Direita e Esquerda', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByText('4. Membro Superior Direito'));
    expect(screen.getByText(/Falanges e Sesamoides da Mão/i)).toBeInTheDocument();

    await user.click(screen.getByText('5. Membro Superior Esquerdo'));
    expect(screen.getByText(/Falanges e Sesamoides da Mão/i)).toBeInTheDocument();

    const sesamoidesInput = screen.getByPlaceholderText('Nº');
    await user.type(sesamoidesInput, '2');

    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        maoPooled: expect.objectContaining({ sesamoides: 2 })
      })
    );
  });
});
