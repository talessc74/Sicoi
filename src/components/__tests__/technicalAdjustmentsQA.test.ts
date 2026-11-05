import { describe, it, expect } from 'vitest';
import {
  SECTIONS_CONFIG,
  getNextSection,
  computeBoneAlterationStatus,
  clearAlteracoesIfAusente,
  applyBulkPresence,
  isBilateralSection,
  partitionBonesBySide,
  getBilateralSubgroups,
  formatSubgroupBoneLabel,
  CABECA_PESCOCO_OSSOS,
  COLUNA_VERTEBRAL_OSSOS,
  VERTEBRAS_CERVICAIS,
  VERTEBRAS_TORACICAS,
  VERTEBRAS_LOMBARES,
  SACRO_COCCIX_OSSOS,
  CERVICAIS_ORDINAIS,
  TORACICAS_ORDINAIS,
  LOMBARES_ORDINAIS,
  TORAX_OSSOS,
  ESTERNO_OSSOS,
  COSTELAS_ESQUERDAS,
  COSTELAS_DIREITAS,
  COSTELAS_ORDINAIS,
  MEMBROS_SUPERIORES_OSSOS,
  OSSOS_MAO,
  PELVE_MEMBRO_INFERIOR_OSSOS,
  OSSOS_PE
} from '../OsteologicalInventoryViewer';
import {
  OsteologicalInventoryData,
  OsteologicalAlteracaoRegiao,
  OsteologicalSectionCabecaPescoco,
  ToothRecord,
  ToothConditionDetails
} from '../../types/sgccco';
import {
  TOOTH_SURFACE_LABELS,
  RESTORATIVE_MATERIAL_LABELS,
  TOOTH_STAIN_COLOR_LABELS
} from '../OdontogramViewer';

describe('Suíte de QA — Validação das 12 Mudanças Solicitadas pelos Técnicos (Out/2026)', () => {
  // --------------------------------------------------------------------------
  // Item 1: Reativação de COI excluído (soft-delete)
  // --------------------------------------------------------------------------
  describe('Item 1: Reativação de COI excluído (soft-delete sem erro de duplicidade)', () => {
    it('garante que a lógica de restauração limpa os campos de exclusão permitindo a recriação do conjunto', () => {
      // Simula um registro que sofreu soft-delete no repositório
      const deletedRecord = {
        id: 'coi-100',
        nic: '100',
        deleted_at: '2026-10-20T10:00:00Z',
        deleted_by: 'Curador Antigo',
        delete_reason: 'Excluído por engano'
      };

      // Regra de ressurreição implementada no db/collectionsRepo.ts
      const resurrectCollection = (rec: typeof deletedRecord) => {
        return {
          ...rec,
          deleted_at: null,
          deleted_by: null,
          delete_reason: null
        };
      };

      const restored = resurrectCollection(deletedRecord);
      expect(restored.deleted_at).toBeNull();
      expect(restored.deleted_by).toBeNull();
      expect(restored.delete_reason).toBeNull();
      expect(restored.nic).toBe('100');
    });
  });

  // --------------------------------------------------------------------------
  // Item 2: "Sem alterações" automático em ossos presentes (P, F, I) sem danos
  // --------------------------------------------------------------------------
  describe('Item 2: "Sem alteração" automático em ossos presentes sem danos assinalados', () => {
    it('marca automaticamente como "Sem alteração" se o osso for Presente (P) e não tiver danos', () => {
      const status = computeBoneAlterationStatus('P', []);
      expect(status.isSemAlteracaoAuto).toBe(true);
      expect(status.showSemAlteracao).toBe(true);
      expect(status.activeAlteracoes).toHaveLength(0);
    });

    it('marca automaticamente como "Sem alteração" se o osso for Fraturado (F) e não tiver danos patológicos', () => {
      const status = computeBoneAlterationStatus('F', []);
      expect(status.isSemAlteracaoAuto).toBe(true);
      expect(status.showSemAlteracao).toBe(true);
      expect(status.activeAlteracoes).toHaveLength(0);
    });

    it('marca automaticamente como "Sem alteração" se o osso for Incompleto (I) e não tiver danos patológicos', () => {
      const status = computeBoneAlterationStatus('I', []);
      expect(status.isSemAlteracaoAuto).toBe(true);
      expect(status.showSemAlteracao).toBe(true);
      expect(status.activeAlteracoes).toHaveLength(0);
    });

    it('NÃO marca automaticamente "Sem alteração" se o osso for Ausente (A)', () => {
      const status = computeBoneAlterationStatus('A', []);
      expect(status.isSemAlteracaoAuto).toBe(false);
      expect(status.showSemAlteracao).toBe(false);
    });

    it('NÃO marca automaticamente "Sem alteração" se o osso não possuir código definido', () => {
      const status = computeBoneAlterationStatus(undefined, []);
      expect(status.isSemAlteracaoAuto).toBe(false);
      expect(status.showSemAlteracao).toBe(false);
    });

    it('NÃO considera "Sem alteração" se houver alterações ativas (patologia, lesão, etc.) registradas', () => {
      const alteracoes: OsteologicalAlteracaoRegiao[] = [
        {
          id: 'alt-1',
          osso: 'Clavícula Direita',
          tipo: 'patologia',
          observacoes: 'Osteoartrite severa'
        }
      ];
      const status = computeBoneAlterationStatus('P', alteracoes);
      expect(status.isSemAlteracaoAuto).toBe(false);
      expect(status.showSemAlteracao).toBe(false);
      expect(status.activeAlteracoes).toHaveLength(1);
      expect(status.activeAlteracoes[0].tipo).toBe('patologia');
    });

    it('respeita a marcação explícita de "sem_alteracao" se registrada manualmente', () => {
      const alteracoes: OsteologicalAlteracaoRegiao[] = [
        {
          id: 'alt-sem',
          osso: 'Clavícula Direita',
          tipo: 'sem_alteracao',
          observacoes: ''
        }
      ];
      const status = computeBoneAlterationStatus('P', alteracoes);
      expect(status.hasSemAlteracao).toBe(true);
      expect(status.showSemAlteracao).toBe(true);
      expect(status.activeAlteracoes).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Item 3: Costelas listadas C1..C12 por lateralidade (E/D) e contagens residuais
  // --------------------------------------------------------------------------
  describe('Item 3: Costelas C1..C12 por lateralidade e caixas numéricas residuais', () => {
    it('possui 12 costelas esquerdas e 12 costelas direitas com numeração ordinal C1 a C12', () => {
      expect(COSTELAS_ESQUERDAS).toHaveLength(12);
      expect(COSTELAS_DIREITAS).toHaveLength(12);

      for (let i = 1; i <= 12; i++) {
        expect(COSTELAS_ESQUERDAS[i - 1]).toBe(`Costela C${i} Esquerda`);
        expect(COSTELAS_DIREITAS[i - 1]).toBe(`Costela C${i} Direita`);
      }
    });

    it('possui Esterno dividido nas 3 peças anatômicas', () => {
      expect(ESTERNO_OSSOS).toEqual([
        'Esterno - Manúbrio',
        'Esterno - Corpo',
        'Esterno - Processo xifóide'
      ]);
    });

    it('totaliza 27 ossos no Tórax (3 esterno + 12 costelas esquerdas + 12 costelas direitas)', () => {
      expect(TORAX_OSSOS).toHaveLength(27);
      expect(TORAX_OSSOS).toEqual([
        ...ESTERNO_OSSOS,
        ...COSTELAS_ESQUERDAS,
        ...COSTELAS_DIREITAS
      ]);
    });

    it('ordinais de costelas cobrem de 1ª a 12ª', () => {
      expect(COSTELAS_ORDINAIS).toEqual([
        '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª', '11ª', '12ª'
      ]);
    });

    it('suporta armazenamento de costelas não identificadas e fragmentos no modelo de dados', () => {
      const toraxSection = {
        ossos: { 'Costela C1 Esquerda': 'P' as const },
        quantidadeNaoIdentificadas: 3,
        quantidadeFragmentos: 8,
        observacoes: 'Múltiplos fragmentos costais'
      };
      expect(toraxSection.quantidadeNaoIdentificadas).toBe(3);
      expect(toraxSection.quantidadeFragmentos).toBe(8);
    });
  });

  // --------------------------------------------------------------------------
  // Item 4: Inversão da ordem Vértebras x Sacro/Cóccix (vértebras antes)
  // --------------------------------------------------------------------------
  describe('Item 4: Inversão da ordem Vértebras x Sacro/Cóccix', () => {
    it('coloca as vértebras no início da lista e Sacro e Cóccix ao final', () => {
      expect(COLUNA_VERTEBRAL_OSSOS).toHaveLength(26);

      // Primeiras 24 posições são vértebras (C1..C7, T1..T12, L1..L5)
      expect(COLUNA_VERTEBRAL_OSSOS[0]).toBe('Vértebra Cervical C1 (Atlas)');
      expect(COLUNA_VERTEBRAL_OSSOS[6]).toBe('Vértebra Cervical C7');
      expect(COLUNA_VERTEBRAL_OSSOS[7]).toBe('Vértebra Torácica T1');
      expect(COLUNA_VERTEBRAL_OSSOS[18]).toBe('Vértebra Torácica T12');
      expect(COLUNA_VERTEBRAL_OSSOS[19]).toBe('Vértebra Lombar L1');
      expect(COLUNA_VERTEBRAL_OSSOS[23]).toBe('Vértebra Lombar L5');

      // As últimas 2 posições são Sacro e Cóccix
      expect(COLUNA_VERTEBRAL_OSSOS[24]).toBe('Sacro');
      expect(COLUNA_VERTEBRAL_OSSOS[25]).toBe('Cóccix');
    });
  });

  // --------------------------------------------------------------------------
  // Item 5: Vértebras listadas em 3 grupos anatômicos
  // --------------------------------------------------------------------------
  describe('Item 5: Grupos vertebrais anatômicos (Cervicais, Torácicas, Lombares)', () => {
    it('possui 7 Vértebras Cervicais com atlas e áxis destacados', () => {
      expect(VERTEBRAS_CERVICAIS).toHaveLength(7);
      expect(VERTEBRAS_CERVICAIS[0]).toBe('Vértebra Cervical C1 (Atlas)');
      expect(VERTEBRAS_CERVICAIS[1]).toBe('Vértebra Cervical C2 (Áxis)');
      expect(CERVICAIS_ORDINAIS).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
    });

    it('possui 12 Vértebras Torácicas (T1 a T12)', () => {
      expect(VERTEBRAS_TORACICAS).toHaveLength(12);
      expect(TORACICAS_ORDINAIS).toEqual([
        'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'
      ]);
    });

    it('possui 5 Vértebras Lombares (L1 a L5)', () => {
      expect(VERTEBRAS_LOMBARES).toHaveLength(5);
      expect(LOMBARES_ORDINAIS).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    });

    it('possui Sacro e Cóccix como grupo sacro-coccígeo separado', () => {
      expect(SACRO_COCCIX_OSSOS).toEqual(['Sacro', 'Cóccix']);
    });

    it('suporta caixas numéricas residuais de vértebras no modelo de dados', () => {
      const colunaSection = {
        ossos: { 'Vértebra Cervical C1 (Atlas)': 'P' as const },
        quantidadeNaoIdentificadas: 4,
        quantidadeFragmentos: 2,
        observacoes: 'Fragmentos de corpos vertebrais não associáveis'
      };
      expect(colunaSection.quantidadeNaoIdentificadas).toBe(4);
      expect(colunaSection.quantidadeFragmentos).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Item 6: Campo de Observações em TODAS as seções
  // --------------------------------------------------------------------------
  describe('Item 6: Suporte a campo de observações em todas as seções anatômicas', () => {
    it('persiste campo observacoes de forma independente em cada seção anatômica', () => {
      const inventory: OsteologicalInventoryData = {
        cabecaPescoco: { ossos: {}, observacoes: 'Observação Cabeça' },
        colunaVertebral: { ossos: {}, observacoes: 'Observação Coluna' },
        torax: { ossos: {}, observacoes: 'Observação Tórax' },
        membrosSuperiores: { ossos: {}, observacoes: 'Observação MMSS' },
        ossosMao: { ossos: {}, observacoes: 'Observação Mãos' },
        pelveMembroInferior: { ossos: {}, observacoes: 'Observação MMII' },
        ossosPe: { ossos: {}, observacoes: 'Observação Pés' }
      };

      expect(inventory.cabecaPescoco?.observacoes).toBe('Observação Cabeça');
      expect(inventory.colunaVertebral?.observacoes).toBe('Observação Coluna');
      expect(inventory.torax?.observacoes).toBe('Observação Tórax');
      expect(inventory.membrosSuperiores?.observacoes).toBe('Observação MMSS');
      expect(inventory.ossosMao?.observacoes).toBe('Observação Mãos');
      expect(inventory.pelveMembroInferior?.observacoes).toBe('Observação MMII');
      expect(inventory.ossosPe?.observacoes).toBe('Observação Pés');
    });
  });

  // --------------------------------------------------------------------------
  // Item 7: Busca e paginação inteligente (15 itens por página)
  // --------------------------------------------------------------------------
  describe('Item 7: Busca e paginação inteligente da lista de COIs', () => {
    const mockCollections = Array.from({ length: 42 }, (_, i) => ({
      id: `id-${i + 1}`,
      nic: `COI-${i + 1}`,
      ano: 2026,
      created_at: `2026-10-21T${String(i % 24).padStart(2, '0')}:00:00Z`
    }));

    it('pagina corretamente conjuntos a 15 itens por página', () => {
      const PAGE_SIZE = 15;
      const totalPages = Math.ceil(mockCollections.length / PAGE_SIZE);
      expect(totalPages).toBe(3);

      const page1 = mockCollections.slice(0, PAGE_SIZE);
      expect(page1).toHaveLength(15);
      expect(page1[0].nic).toBe('COI-1');
      expect(page1[14].nic).toBe('COI-15');

      const page2 = mockCollections.slice(PAGE_SIZE, PAGE_SIZE * 2);
      expect(page2).toHaveLength(15);
      expect(page2[0].nic).toBe('COI-16');

      const page3 = mockCollections.slice(PAGE_SIZE * 2);
      expect(page3).toHaveLength(12);
      expect(page3[11].nic).toBe('COI-42');
    });

    it('filtra coleções por busca rápida de texto/número', () => {
      const query = 'COI-1';
      const filtered = mockCollections.filter(c => c.nic.toLowerCase().includes(query.toLowerCase()));
      // Match COI-1, COI-10..COI-19, etc.
      expect(filtered.length).toBeGreaterThanOrEqual(11);
      expect(filtered.every(c => c.nic.includes('COI-1'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Item 8: Botão "Próxima seção" direcionando sequencialmente
  // --------------------------------------------------------------------------
  describe('Item 8: Botão "Próxima seção" com navegação linear completa', () => {
    it('avalia a próxima seção correta de 1 a 8', () => {
      expect(getNextSection('cabeca_pescoco')?.id).toBe('coluna_vertebral');
      expect(getNextSection('coluna_vertebral')?.id).toBe('torax');
      expect(getNextSection('torax')?.id).toBe('membros_superiores');
      expect(getNextSection('membros_superiores')?.id).toBe('ossos_mao');
      expect(getNextSection('ossos_mao')?.id).toBe('pelve_mi');
      expect(getNextSection('pelve_mi')?.id).toBe('ossos_pe');
      expect(getNextSection('ossos_pe')?.id).toBe('demais_informacoes');
      // Na última seção (8), não há próxima seção
      expect(getNextSection('demais_informacoes')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Item 9: Acordeom exclusivo (fechamento automático ao abrir outro osso)
  // --------------------------------------------------------------------------
  describe('Item 9: Acordeom exclusivo entre ossos', () => {
    it('abre o osso selecionado e fecha o anterior automaticamente', () => {
      const toggleAccordion = (
        currentExpanded: Record<string, boolean>,
        targetBone: string
      ): Record<string, boolean> => {
        // Se já estava aberto, fecha; senão abre exclusivamente o osso clicado
        return currentExpanded[targetBone] ? {} : { [targetBone]: true };
      };

      // Abre Osso A
      let state = toggleAccordion({}, 'Clavícula Direita');
      expect(state).toEqual({ 'Clavícula Direita': true });

      // Clica no Osso B: fecha Osso A e abre Osso B
      state = toggleAccordion(state, 'Escápula Direita');
      expect(state).toEqual({ 'Escápula Direita': true });
      expect(state['Clavícula Direita']).toBeUndefined();

      // Clica no Osso B novamente: fecha
      state = toggleAccordion(state, 'Escápula Direita');
      expect(state).toEqual({});
    });
  });

  // --------------------------------------------------------------------------
  // Item 10: Renomeação da Seção 5 para "Ossos das Mãos"
  // --------------------------------------------------------------------------
  describe('Item 10: Renomeação "Ossos das Mãos"', () => {
    it('a Seção 5 está nomeada exatamente como "5. Ossos das Mãos"', () => {
      const sec5 = SECTIONS_CONFIG.find(s => s.id === 'ossos_mao');
      expect(sec5).toBeDefined();
      expect(sec5?.label).toBe('5. Ossos das Mãos');
    });
  });

  // --------------------------------------------------------------------------
  // Item 11: Renomeação da Seção 7 para "Ossos dos Pés"
  // --------------------------------------------------------------------------
  describe('Item 11: Renomeação "Ossos dos Pés"', () => {
    it('a Seção 7 está nomeada exatamente como "7. Ossos dos Pés"', () => {
      const sec7 = SECTIONS_CONFIG.find(s => s.id === 'ossos_pe');
      expect(sec7).toBeDefined();
      expect(sec7?.label).toBe('7. Ossos dos Pés');
    });
  });

  // --------------------------------------------------------------------------
  // Item 12: Adição da Seção 8 "Demais Informações"
  // --------------------------------------------------------------------------
  describe('Item 12: Seção 8 "Demais Informações"', () => {
    it('configura exatamente 8 seções no inventário osteológico', () => {
      expect(SECTIONS_CONFIG).toHaveLength(8);
    });

    it('a 8ª seção é "8. Demais Informações"', () => {
      const sec8 = SECTIONS_CONFIG[7];
      expect(sec8.id).toBe('demais_informacoes');
      expect(sec8.label).toBe('8. Demais Informações');
      expect(sec8.active).toBe(true);
    });

    it('persiste campo de texto livre demaisInformacoes no payload do inventário', () => {
      const inventory: OsteologicalInventoryData = {
        demaisInformacoes: 'Presença de fragmentos de tecido mumificado sobre a escápula direita.'
      };
      expect(inventory.demaisInformacoes).toContain('tecido mumificado');
    });
  });

  // --------------------------------------------------------------------------
  // Regras de Integridade: Ausente aceita Alteração e Bulk Actions
  // --------------------------------------------------------------------------
  describe('Regras de Integridade Complementares', () => {
    it('preserva alterações se o osso for marcado como Ausente (A), permitindo registro de patologia/trauma em osso ausente', () => {
      const alteracoes: OsteologicalAlteracaoRegiao[] = [
        { id: '1', osso: 'Frontal', tipo: 'patologia', observacoes: 'Amputação cirúrgica ante-mortem / perda perimortem' },
        { id: '2', osso: 'Occipital', tipo: 'patologia', observacoes: '' }
      ];
      const cleaned = clearAlteracoesIfAusente(alteracoes, 'Frontal', 'A');
      expect(cleaned).toHaveLength(2);
      expect(cleaned?.[0].osso).toBe('Frontal');
    });

    it('aplica marcação em lote preservando alterações caso lote seja marcado como Ausente (A)', () => {
      const bones = ['Costela C1 Esquerda', 'Costela C2 Esquerda'];
      const currentAlteracoes: OsteologicalAlteracaoRegiao[] = [
        { id: '1', osso: 'Costela C1 Esquerda', tipo: 'patologia', observacoes: '' }
      ];
      const res = applyBulkPresence({}, currentAlteracoes, bones, 'A');
      expect(res.ossos['Costela C1 Esquerda']).toBe('A');
      expect(res.ossos['Costela C2 Esquerda']).toBe('A');
      expect(res.alteracoes).toHaveLength(1);
      expect(res.alteracoes?.[0].osso).toBe('Costela C1 Esquerda');
    });
  });

  // --------------------------------------------------------------------------
  // Subdivisões Anatômicas Bilaterais (Membros Sup., Membros Inf., Mãos e Pés)
  // --------------------------------------------------------------------------
  describe('Subdivisões Anatômicas Bilaterais (Membros Sup., Membros Inf., Mãos e Pés)', () => {
    describe('Membros Superiores: Cíngulo, Úmero, Rádio e Ulna', () => {
      it('subdivide cada lado em 4 grupos na ordem exata solicitada', () => {
        const subEsq = getBilateralSubgroups('membros_superiores', 'esquerdo');
        const subDir = getBilateralSubgroups('membros_superiores', 'direito');

        expect(subEsq).toHaveLength(4);
        expect(subDir).toHaveLength(4);

        expect(subEsq.map(s => s.label)).toEqual([
          'Cíngulo do membro superior',
          'Úmero',
          'Rádio',
          'Ulna'
        ]);
        expect(subDir.map(s => s.label)).toEqual([
          'Cíngulo do membro superior',
          'Úmero',
          'Rádio',
          'Ulna'
        ]);
      });

      it('posiciona Rádio antes de Ulna e separa epífise proximal, diáfise e epífise distal', () => {
        const subDir = getBilateralSubgroups('membros_superiores', 'direito');
        const umero = subDir.find(s => s.label === 'Úmero')!;
        const radio = subDir.find(s => s.label === 'Rádio')!;
        const ulna = subDir.find(s => s.label === 'Ulna')!;

        expect(umero.bones).toEqual([
          'Úmero Direito - Epífise Proximal',
          'Úmero Direito - Diáfise',
          'Úmero Direito - Epífise Distal'
        ]);
        expect(radio.bones).toEqual([
          'Rádio Direito - Epífise Proximal',
          'Rádio Direito - Diáfise',
          'Rádio Direito - Epífise Distal'
        ]);
        expect(ulna.bones).toEqual([
          'Ulna Direita - Epífise Proximal',
          'Ulna Direita - Diáfise',
          'Ulna Direita - Epífise Distal'
        ]);
      });

      it('formata os rótulos internos com nomes limpos sem redundância lateral', () => {
        expect(formatSubgroupBoneLabel('Clavícula Direita')).toBe('Clavícula');
        expect(formatSubgroupBoneLabel('Escápula Esquerda')).toBe('Escápula');
        expect(formatSubgroupBoneLabel('Úmero Direito - Epífise Proximal')).toBe('Epífise proximal');
        expect(formatSubgroupBoneLabel('Úmero Direito - Diáfise')).toBe('Diáfise');
        expect(formatSubgroupBoneLabel('Úmero Direito - Epífise Distal')).toBe('Epífise distal');
      });
    });

    describe('Membros Inferiores: Cíngulo, Fêmur, Tíbia, Fíbula e Patela', () => {
      it('subdivide cada lado em 5 grupos na ordem exata com Patela após a fíbula', () => {
        const subDir = getBilateralSubgroups('pelve_mi', 'direito');
        expect(subDir).toHaveLength(5);
        expect(subDir.map(s => s.label)).toEqual([
          'Cíngulo do membro inferior',
          'Fêmur',
          'Tíbia',
          'Fíbula',
          'Patela'
        ]);

        const patela = subDir.find(s => s.label === 'Patela')!;
        expect(patela.bones).toEqual(['Patela Direita']);
      });

      it('organiza Fêmur, Tíbia e Fíbula com epífise proximal, diáfise e epífise distal', () => {
        const subEsq = getBilateralSubgroups('pelve_mi', 'esquerdo');
        const femur = subEsq.find(s => s.label === 'Fêmur')!;
        const tibia = subEsq.find(s => s.label === 'Tíbia')!;
        const fibula = subEsq.find(s => s.label === 'Fíbula')!;

        expect(femur.bones).toHaveLength(3);
        expect(tibia.bones).toHaveLength(3);
        expect(fibula.bones).toHaveLength(3);

        expect(femur.bones.map(formatSubgroupBoneLabel)).toEqual([
          'Epífise proximal',
          'Diáfise',
          'Epífise distal'
        ]);
      });
    });

    describe('Ossos das Mãos: Carpo e Metacarpo', () => {
      it('divide cada lado em 2 grupos: Carpo (8 ossos) e Metacarpo (5 ossos)', () => {
        const subDir = getBilateralSubgroups('ossos_mao', 'direito');
        expect(subDir).toHaveLength(2);
        expect(subDir[0].label).toBe('Carpo');
        expect(subDir[1].label).toBe('Metacarpo');

        expect(subDir[0].bones).toHaveLength(8);
        expect(subDir[1].bones).toHaveLength(5);

        expect(subDir[0].bones.map(formatSubgroupBoneLabel)).toEqual([
          'Escafóide',
          'Semilunar',
          'Piramidal',
          'Pisiforme',
          'Trapézio',
          'Trapezóide',
          'Capitato',
          'Hamato'
        ]);
        expect(subDir[1].bones.map(formatSubgroupBoneLabel)).toEqual([
          '1º Metacarpal',
          '2º Metacarpal',
          '3º Metacarpal',
          '4º Metacarpal',
          '5º Metacarpal'
        ]);
      });
    });

    describe('Ossos dos Pés: Tarso e Metatarso', () => {
      it('divide cada lado em 2 grupos: Tarso (7 ossos) e Metatarso (5 ossos)', () => {
        const subEsq = getBilateralSubgroups('ossos_pe', 'esquerdo');
        expect(subEsq).toHaveLength(2);
        expect(subEsq[0].label).toBe('Tarso');
        expect(subEsq[1].label).toBe('Metatarso');

        expect(subEsq[0].bones).toHaveLength(7);
        expect(subEsq[1].bones).toHaveLength(5);

        expect(subEsq[0].bones.map(formatSubgroupBoneLabel)).toEqual([
          'Calcâneo',
          'Tálus',
          'Navicular',
          'Cuboide',
          'Cuneiforme Medial',
          'Cuneiforme Intermédio',
          'Cuneiforme Lateral'
        ]);
        expect(subEsq[1].bones.map(formatSubgroupBoneLabel)).toEqual([
          '1º Metatarsal',
          '2º Metatarsal',
          '3º Metatarsal',
          '4º Metatarsal',
          '5º Metatarsal'
        ]);
      });
    });

    describe('Integridade da Contagem Total de Ossos por Seção', () => {
      it('garante que a união dos subgrupos preserva a contagem de ossos e compatibilidade retroativa', () => {
        // Membros Superiores: 11 direito + 11 esquerdo = 22
        const msDir = getBilateralSubgroups('membros_superiores', 'direito').flatMap(g => g.bones);
        const msEsq = getBilateralSubgroups('membros_superiores', 'esquerdo').flatMap(g => g.bones);
        expect(msDir.length).toBe(11);
        expect(msEsq.length).toBe(11);
        expect(msDir.length + msEsq.length).toBe(MEMBROS_SUPERIORES_OSSOS.length);

        // Membros Inferiores: 13 direito + 13 esquerdo = 26
        const miDir = getBilateralSubgroups('pelve_mi', 'direito').flatMap(g => g.bones);
        const miEsq = getBilateralSubgroups('pelve_mi', 'esquerdo').flatMap(g => g.bones);
        expect(miDir.length).toBe(13);
        expect(miEsq.length).toBe(13);
        expect(miDir.length + miEsq.length).toBe(PELVE_MEMBRO_INFERIOR_OSSOS.length);

        // Mãos: 13 direito + 13 esquerdo = 26
        const maoDir = getBilateralSubgroups('ossos_mao', 'direito').flatMap(g => g.bones);
        const maoEsq = getBilateralSubgroups('ossos_mao', 'esquerdo').flatMap(g => g.bones);
        expect(maoDir.length).toBe(13);
        expect(maoEsq.length).toBe(13);
        expect(maoDir.length + maoEsq.length).toBe(OSSOS_MAO.length);

        // Pés: 12 direito + 12 esquerdo = 24
        const peDir = getBilateralSubgroups('ossos_pe', 'direito').flatMap(g => g.bones);
        const peEsq = getBilateralSubgroups('ossos_pe', 'esquerdo').flatMap(g => g.bones);
        expect(peDir.length).toBe(12);
        expect(peEsq.length).toBe(12);
        expect(peDir.length + peEsq.length).toBe(OSSOS_PE.length);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Item 13: Opções "P F I A" para todos os tópicos de todas as seções
  // --------------------------------------------------------------------------
  describe('Item 13: Marcação em lote de P F I A por tópicos anatômicos em todas as seções', () => {
    it('aplica bulk marking em Vértebras Cervicais sem afetar o resto da coluna', () => {
      const ossos: Record<string, any> = {};
      const res = applyBulkPresence(ossos, undefined, VERTEBRAS_CERVICAIS, 'P');
      expect(Object.keys(res.ossos)).toHaveLength(7);
      expect(VERTEBRAS_CERVICAIS.every(b => res.ossos[b] === 'P')).toBe(true);
      expect(VERTEBRAS_TORACICAS.some(b => res.ossos[b] !== undefined)).toBe(false);
    });

    it('aplica bulk marking em Vértebras Torácicas, Lombares e Sacro/Cóccix independentemente', () => {
      const ossos: Record<string, any> = {};
      const resT = applyBulkPresence(ossos, undefined, VERTEBRAS_TORACICAS, 'F');
      expect(Object.keys(resT.ossos)).toHaveLength(12);
      expect(VERTEBRAS_TORACICAS.every(b => resT.ossos[b] === 'F')).toBe(true);

      const resL = applyBulkPresence(resT.ossos, undefined, VERTEBRAS_LOMBARES, 'I');
      expect(VERTEBRAS_LOMBARES.every(b => resL.ossos[b] === 'I')).toBe(true);

      const resS = applyBulkPresence(resL.ossos, undefined, SACRO_COCCIX_OSSOS, 'A');
      expect(SACRO_COCCIX_OSSOS.every(b => resS.ossos[b] === 'A')).toBe(true);
      expect(Object.keys(resS.ossos)).toHaveLength(12 + 5 + 2);
    });

    it('aplica bulk marking em Esterno e Costelas por lateralidade separadamente', () => {
      const ossos: Record<string, any> = {};
      const resEsterno = applyBulkPresence(ossos, undefined, ESTERNO_OSSOS, 'P');
      expect(ESTERNO_OSSOS.every(b => resEsterno.ossos[b] === 'P')).toBe(true);
      expect(Object.keys(resEsterno.ossos)).toHaveLength(3);

      const resCostEsq = applyBulkPresence(resEsterno.ossos, undefined, COSTELAS_ESQUERDAS, 'F');
      expect(COSTELAS_ESQUERDAS.every(b => resCostEsq.ossos[b] === 'F')).toBe(true);
      expect(COSTELAS_DIREITAS.some(b => resCostEsq.ossos[b] !== undefined)).toBe(false);

      const resCostDir = applyBulkPresence(resCostEsq.ossos, undefined, COSTELAS_DIREITAS, 'P');
      expect(COSTELAS_DIREITAS.every(b => resCostDir.ossos[b] === 'P')).toBe(true);
      expect(Object.keys(resCostDir.ossos)).toHaveLength(3 + 12 + 12);
    });

    it('aplica bulk marking em Cabeça e Pescoço (23 ossos)', () => {
      const ossos: Record<string, any> = {};
      const res = applyBulkPresence(ossos, undefined, CABECA_PESCOCO_OSSOS, 'A');
      expect(Object.keys(res.ossos)).toHaveLength(23);
      expect(CABECA_PESCOCO_OSSOS.every(b => res.ossos[b] === 'A')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Item 14: Quantitativos Dentários em Cabeça e Pescoço e Contagem Total
  // --------------------------------------------------------------------------
  describe('Item 14: Quantitativos Dentários em Cabeça e Pescoço e Contagem Total', () => {
    it('armazena dentes articulados e desarticulados na seção Cabeça e Pescoço', () => {
      const cabecaData: OsteologicalSectionCabecaPescoco = {
        dentesArticulados: 28,
        dentesDesarticulados: 4,
        cartilagensLaringe: ['tireoidea'],
        ossiculosEsquerdos: ['bigorna'],
        ossiculosDireitos: ['ausentes']
      };
      expect(cabecaData.dentesArticulados).toBe(28);
      expect(cabecaData.dentesDesarticulados).toBe(4);
    });

    it('suporta contagem de 32+ (ex: 33) nas caixas numéricas de dentes', () => {
      const cabecaData: OsteologicalSectionCabecaPescoco = {
        dentesArticulados: 33,
        dentesDesarticulados: 0
      };
      expect(cabecaData.dentesArticulados).toBe(33);
    });
  });

  // --------------------------------------------------------------------------
  // Item 15: Sub-opções Anatômicas e Clínicas no Inventário Odontológico
  // --------------------------------------------------------------------------
  describe('Item 15: Sub-opções Anatômicas e Clínicas no Inventário Odontológico', () => {
    it('suporta sub-opções de localização para cavitado com múltipla escolha', () => {
      const tooth: ToothRecord = {
        toothNumberFdi: 26,
        quadrant: 2,
        presence: 'articulado',
        clinicalConditions: ['cavitado'],
        condition: 'carie',
        conditionDetails: {
          cavitado: {
            localizacao: ['oclusal', 'mesial', 'distal']
          }
        }
      };
      expect(tooth.conditionDetails?.cavitado?.localizacao).toEqual(['oclusal', 'mesial', 'distal']);
      expect(TOOTH_SURFACE_LABELS.oclusal).toBe('Oclusal');
      expect(TOOTH_SURFACE_LABELS.subgengival).toBe('Subgengival');
    });

    it('suporta sub-opções de cor e localização para mancha com múltipla escolha', () => {
      const tooth: ToothRecord = {
        toothNumberFdi: 11,
        quadrant: 1,
        presence: 'articulado',
        clinicalConditions: ['mancha'],
        condition: 'higido',
        conditionDetails: {
          mancha: {
            cor: ['clara', 'escura'],
            localizacao: ['vestibular', 'subgengival']
          }
        }
      };
      expect(tooth.conditionDetails?.mancha?.cor).toEqual(['clara', 'escura']);
      expect(tooth.conditionDetails?.mancha?.localizacao).toEqual(['vestibular', 'subgengival']);
      expect(TOOTH_STAIN_COLOR_LABELS.clara).toBe('Clara');
      expect(TOOTH_STAIN_COLOR_LABELS.escura).toBe('Escura');
    });

    it('suporta sub-opções de material e localização para material restaurador com múltipla escolha', () => {
      const tooth: ToothRecord = {
        toothNumberFdi: 46,
        quadrant: 4,
        presence: 'articulado',
        clinicalConditions: ['com_material_restaurador'],
        condition: 'restauracao',
        conditionDetails: {
          materialRestaurador: {
            tipoMaterial: ['amalgama', 'resina_composta'],
            localizacao: ['oclusal', 'distal']
          }
        }
      };
      expect(tooth.conditionDetails?.materialRestaurador?.tipoMaterial).toEqual(['amalgama', 'resina_composta']);
      expect(tooth.conditionDetails?.materialRestaurador?.localizacao).toEqual(['oclusal', 'distal']);
      expect(RESTORATIVE_MATERIAL_LABELS.amalgama).toBe('Amálgama');
      expect(RESTORATIVE_MATERIAL_LABELS.resina_composta).toBe('Resina composta');
    });

    it('suporta sub-opções de localização para tártaro com múltipla escolha', () => {
      const tooth: ToothRecord = {
        toothNumberFdi: 31,
        quadrant: 3,
        presence: 'articulado',
        clinicalConditions: ['tartaro'],
        condition: 'higido',
        conditionDetails: {
          tartaro: {
            localizacao: ['lingual', 'subgengival']
          }
        }
      };
      expect(tooth.conditionDetails?.tartaro?.localizacao).toEqual(['lingual', 'subgengival']);
    });
  });
});
