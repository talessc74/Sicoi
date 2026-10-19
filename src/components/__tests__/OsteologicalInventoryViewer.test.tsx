// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OsteologicalInventoryViewer, CABECA_PESCOCO_OSSOS } from '../OsteologicalInventoryViewer';

describe('OsteologicalInventoryViewer', () => {
  it('renderiza a barra das 8 seções e a lista corrida de Cabeça e Pescoço (sem prancha visual)', () => {
    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    expect(screen.getByText(/Inventário Osteológico por Regiões Anatômicas/i)).toBeInTheDocument();
    expect(screen.getByText('1. Cabeça e Pescoço')).toBeInTheDocument();
    expect(screen.getByText('2. Coluna Vertebral')).toBeInTheDocument();
    expect(screen.getByText('3. Tórax & Esterno')).toBeInTheDocument();
    expect(screen.getByText('4. Membro Superior Direito')).toBeInTheDocument();
    expect(screen.getByText('5. Membro Superior Esquerdo')).toBeInTheDocument();
    expect(screen.getByText('6. Ossos da Mão')).toBeInTheDocument();
    expect(screen.getByText('7. Pelve, Bacia e Membros Inferiores')).toBeInTheDocument();
    expect(screen.getByText('8. Ossos do Pé')).toBeInTheDocument();

    // Os 23 ossos de Cabeça e Pescoço aparecem direto, numa lista corrida —
    // sem sub-aba de prancha, sem imagem.
    for (const bone of CABECA_PESCOCO_OSSOS) {
      expect(screen.getByText(bone)).toBeInTheDocument();
    }
    expect(screen.queryByText(/Pranchas Anatômicas/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    // Legenda P/F/I/A + alterações
    expect(screen.getByText('Alterações ósseas')).toBeInTheDocument();

    // Estruturas complementares continuam existindo, só que sem a prancha ao lado.
    expect(screen.getByText('Cartilagens da laringe ossificadas / Ossículos da audição')).toBeInTheDocument();
    expect(screen.getByText('Ossículos da audição direitos')).toBeInTheDocument();
    expect(screen.getByText('Ossículos da audição esquerdos')).toBeInTheDocument();
  });

  it('permite marcar a presença de um osso com o código P/F/I/A em Cabeça e Pescoço', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

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

  it('permite marcar todos os ossos de uma seção como P em lote e limpar a seção', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByRole('button', { name: /Marcar Todos P/i }));
    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({
          ossos: expect.objectContaining({ Frontal: 'P', Mandíbula: 'P', Hióide: 'P' })
        })
      })
    );

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({ ossos: {} })
      })
    );
  });

  it('permite selecionar cartilagens e ossículos (estruturas complementares)', async () => {
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
        cabecaPescoco: expect.objectContaining({ cartilagensLaringe: ['cricoide'] })
      })
    );
  });

  it('marcar um osso como Ausente (A) limpa as alterações já registradas e desabilita o botão de alteração', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{
          cabecaPescoco: {
            ossos: { Frontal: 'P' },
            alteracoes: [{ id: 'alt-1', tipo: 'lesao_ante_mortem', osso: 'Frontal', observacoes: 'teste' }]
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

  it('clicar na linha do osso (fora dos botões) abre/recolhe a gaveta de alterações, sem interferir no clique dos botões P/F/I/A', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    expect(screen.queryByText('Alterações Ósseas — Frontal')).not.toBeInTheDocument();

    await user.click(screen.getByText('Frontal'));
    expect(screen.getByText('Alterações Ósseas — Frontal')).toBeInTheDocument();

    // Clicar no botão P não deve também fechar/alternar a gaveta (stopPropagation).
    await user.click(screen.getByTitle('Frontal — Presente sem fratura'));
    expect(screen.getByText('Alterações Ósseas — Frontal')).toBeInTheDocument();
    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        cabecaPescoco: expect.objectContaining({ ossos: { Frontal: 'P' } })
      })
    );

    await user.click(screen.getByText('Frontal'));
    expect(screen.queryByText('Alterações Ósseas — Frontal')).not.toBeInTheDocument();
  });

  it('desabilita o botão de alteração óssea quando o osso já está marcado como Ausente', () => {
    render(
      <OsteologicalInventoryViewer
        inventory={{ cabecaPescoco: { ossos: { Frontal: 'A' }, alteracoes: [] } }}
        onUpdateInventory={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Alterações ósseas — Frontal' })).toBeDisabled();
  });

  it('Coluna Vertebral lista cada vértebra como linha própria, cervicais→torácicas→lombares, Sacro e Cóccix por último', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByText('2. Coluna Vertebral'));

    expect(screen.getByText('C1')).toBeInTheDocument();
    expect(screen.getByText('C7')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('T12')).toBeInTheDocument();
    expect(screen.getByText('L1')).toBeInTheDocument();
    expect(screen.getByText('L5')).toBeInTheDocument();
    expect(screen.getByText('Sacro')).toBeInTheDocument();
    expect(screen.getByText('Cóccix')).toBeInTheDocument();

    const boneNames = screen.getAllByTitle(/^(C1|C7|T1|T12|L1|L5|Sacro|Cóccix)$/).map(el => el.getAttribute('title'));
    expect(boneNames.indexOf('C1')).toBeLessThan(boneNames.indexOf('T1'));
    expect(boneNames.indexOf('T1')).toBeLessThan(boneNames.indexOf('L1'));
    expect(boneNames.indexOf('L5')).toBeLessThan(boneNames.indexOf('Sacro'));
    expect(boneNames.indexOf('Sacro')).toBeLessThan(boneNames.indexOf('Cóccix'));

    await user.click(screen.getByTitle('T5 — Presente sem fratura'));
    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        colunaVertebral: expect.objectContaining({ ossos: { T5: 'P' } })
      })
    );
  });

  it('Tórax lista cada costela como linha própria, Direita e Esquerda', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByText('3. Tórax & Esterno'));

    expect(screen.getByText('Esterno - Manúbrio')).toBeInTheDocument();
    expect(screen.getByText('1ª Costela Direita')).toBeInTheDocument();
    expect(screen.getByText('12ª Costela Direita')).toBeInTheDocument();
    expect(screen.getByText('1ª Costela Esquerda')).toBeInTheDocument();
    expect(screen.getByText('12ª Costela Esquerda')).toBeInTheDocument();

    await user.click(screen.getByTitle('1ª Costela Direita — Presente sem fratura'));
    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({
        torax: expect.objectContaining({ ossos: { '1ª Costela Direita': 'P' } })
      })
    );
  });

  it('Membro Superior Direito/Esquerdo não têm mais ossos da mão', async () => {
    const user = userEvent.setup();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    await user.click(screen.getByText('4. Membro Superior Direito'));
    expect(screen.getByText('Clavícula Direita')).toBeInTheDocument();
    expect(screen.getByText('Úmero Direito - Diáfise')).toBeInTheDocument();
    expect(screen.queryByText('Escafóide Direito')).not.toBeInTheDocument();
    expect(screen.queryByText('1º Metacarpal Direito')).not.toBeInTheDocument();
  });

  it('Ossos da Mão reúne o carpo/metacarpo dos dois lados e o pooled de falanges/sesamoides', async () => {
    const user = userEvent.setup();
    const onUpdateInventory = vi.fn();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={onUpdateInventory}
      />
    );

    await user.click(screen.getByText('6. Ossos da Mão'));

    expect(screen.getByText('Escafóide Direito')).toBeInTheDocument();
    expect(screen.getByText('1º Metacarpal Direito')).toBeInTheDocument();
    expect(screen.getByText('Escafóide Esquerdo')).toBeInTheDocument();
    expect(screen.getByText('1º Metacarpal Esquerdo')).toBeInTheDocument();
    expect(screen.getByText(/Falanges e Sesamoides da Mão/i)).toBeInTheDocument();

    const sesamoidesInput = screen.getByPlaceholderText('Nº');
    await user.type(sesamoidesInput, '2');
    expect(onUpdateInventory).toHaveBeenCalledWith(
      expect.objectContaining({ maoPooled: expect.objectContaining({ sesamoides: 2 }) })
    );
  });

  it('Pelve, Bacia e Membros Inferiores vira uma seção só, com os dois lados, sem ossos do pé', async () => {
    const user = userEvent.setup();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    await user.click(screen.getByText('7. Pelve, Bacia e Membros Inferiores'));

    expect(screen.getByText('Ílio Direito')).toBeInTheDocument();
    expect(screen.getByText('Fêmur Direito - Diáfise')).toBeInTheDocument();
    expect(screen.getByText('Ílio Esquerdo')).toBeInTheDocument();
    expect(screen.getByText('Fêmur Esquerdo - Diáfise')).toBeInTheDocument();
    expect(screen.queryByText('Calcâneo Direito')).not.toBeInTheDocument();
    expect(screen.queryByText('1º Metatarsal Esquerdo')).not.toBeInTheDocument();
  });

  it('Ossos do Pé reúne o tarso/metatarso dos dois lados e o pooled de falanges/sesamoides', async () => {
    const user = userEvent.setup();

    render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    await user.click(screen.getByText('8. Ossos do Pé'));

    expect(screen.getByText('Calcâneo Direito')).toBeInTheDocument();
    expect(screen.getByText('1º Metatarsal Direito')).toBeInTheDocument();
    expect(screen.getByText('Calcâneo Esquerdo')).toBeInTheDocument();
    expect(screen.getByText('1º Metatarsal Esquerdo')).toBeInTheDocument();
    expect(screen.getByText(/Falanges e Sesamoides do Pé/i)).toBeInTheDocument();
  });

  it('a contagem de "catalogados" de Cabeça e Pescoço inclui ossículos (estribo) e cartilagens, não só os 23 ossos', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <OsteologicalInventoryViewer
        inventory={{}}
        onUpdateInventory={vi.fn()}
      />
    );

    expect(screen.getByText('0/31 catalogados')).toBeInTheDocument();

    rerender(
      <OsteologicalInventoryViewer
        inventory={{
          cabecaPescoco: {
            ossos: { Frontal: 'P' },
            ossiculosDireitos: ['estribo']
          }
        }}
        onUpdateInventory={vi.fn()}
      />
    );

    expect(screen.getByText('2/31 catalogados')).toBeInTheDocument();
  });

  it('"ausentes" marcado num grupo complementar conta como todos os itens do grupo determinados', () => {
    render(
      <OsteologicalInventoryViewer
        inventory={{
          cabecaPescoco: {
            ossos: {},
            cartilagensLaringe: ['ausentes'],
            ossiculosDireitos: ['ausentes'],
            ossiculosEsquerdos: ['ausentes']
          }
        }}
        onUpdateInventory={vi.fn()}
      />
    );

    // 2 (cartilagens) + 3 (ossículos direitos) + 3 (ossículos esquerdos) = 8
    expect(screen.getByText('8/31 catalogados')).toBeInTheDocument();
  });
});
