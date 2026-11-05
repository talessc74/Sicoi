import { describe, it, expect } from 'vitest';
import {
  collectionToPhase0Row,
  escapeCsvCell,
  generatePhase0Csv,
  PHASE0_CSV_HEADERS
} from '../exportPhase0';
import { OsteologicalCollection } from '../../types/sgccco';

describe('Exportação Estruturada da Fase 0 (CSV / Excel)', () => {
  const mockCollection: any = {
    id: 'col-072',
    nic: 'COI-072',
    currentPhase: 0,
    createdByTechnician: 'Técnico Fulano',
    legalOrigin: { legalProcessNumber: '001', entryDate: '2026-11-05' },
    custodyChain: [],
    signatures: [
      {
        phaseNumber: 0,
        signedBy: 'u1',
        signedByName: 'Técnico Fulano',
        signedByRole: 'technician',
        signedAt: '2026-11-05T10:00:00Z',
        sha256Hash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
        status: 'locked'
      }
    ],
    createdAt: '2026-11-05T10:00:00Z',
    updatedAt: '2026-11-05T12:00:00Z',
    phase0: {
      nome: 'NILTON MIRANDA FERREIRA PITON',
      sexo: 'M',
      cor: 'Parda',
      nacionalidade: 'Brasileira',
      naturalUf: 'BA',
      naturalCidade: 'Salvador',
      nascimento: '1971-12-14',
      idade: 46,
      estadoCivil: 'Solteiro(a)',
      cpf: '123.456.789-00',
      rgNumero: '1234567',
      rgOrgaoExpedidor: 'SSP',
      rgUfExpedidor: 'BA',
      maeNome: 'MARIA MIRANDA PITON',
      maeFalecida: true,
      paiNome: 'JOAO MIRANDA PITON',
      paiFalecido: false,
      conjugeNaoConsta: true,
      localFalecimento: 'HOSPITAL SAO VICENTE DE PAULO',
      obitoUf: 'SE',
      obitoCidade: 'Tobias Barreto',
      dataFalecimento: '2018-06-13',
      horaFalecimento: '21:00',
      medicoNome: 'GEORGE QUEIROZ',
      medicoCrm: '3185',
      causaMorte: 'CAUSA INDETERMINADA',
      cemiterio: 'Cemitério Municipal',
      dataInumacao: '2018-06-14',
      dataExumacao: '2020-07-06',
      filhos: [
        { id: 'f-1', nome: 'Filho 1', idade: '20' },
        { id: 'f-2', nome: 'Filho 2', idade: '15' }
      ],
      observacoes: 'Registro transcrito fielmente da certidão.'
    }
  };

  describe('collectionToPhase0Row', () => {
    it('extrai corretamente todos os dados da D.O. e metadados do conjunto', () => {
      const row = collectionToPhase0Row(mockCollection);
      expect(row.nic).toBe('COI-072');
      expect(row.nome).toBe('NILTON MIRANDA FERREIRA PITON');
      expect(row.sexo).toBe('M');
      expect(row.cor).toBe('Parda');
      expect(row.naturalCidade).toBe('Salvador');
      expect(row.idadeCalculada).toBe('46');
      expect(row.maeNome).toBe('MARIA MIRANDA PITON');
      expect(row.maeFalecida).toBe('Sim');
      expect(row.paiFalecido).toBe('Não');
      expect(row.conjugeNome).toBe('Não consta');
      expect(row.medicoNome).toBe('GEORGE QUEIROZ');
      expect(row.causaMorte).toBe('CAUSA INDETERMINADA');
      expect(row.filhosQtd).toBe(2);
      expect(row.filhosNomes).toContain('Filho 1 (20 anos)');
      expect(row.hashSha256).toBe('a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890');
      expect(row.faseAtual).toBe('Fase 0');
    });

    it('trata graciosamente coleções com phase0 vazio ou indefinido', () => {
      const emptyCol: any = {
        id: 'col-empty',
        nic: 'COI-999',
        currentPhase: 0,
        signatures: []
      };
      const row = collectionToPhase0Row(emptyCol);
      expect(row.nic).toBe('COI-999');
      expect(row.nome).toBe('');
      expect(row.filhosQtd).toBe(0);
      expect(row.filhosNomes).toBe('');
    });
  });

  describe('escapeCsvCell', () => {
    it('envolve com aspas e duplica aspas internas', () => {
      expect(escapeCsvCell('Texto com "aspas"')).toBe('"Texto com ""aspas"""');
      expect(escapeCsvCell('Texto; com; ponto e vírgula')).toBe('"Texto; com; ponto e vírgula"');
      expect(escapeCsvCell('Linha 1\nLinha 2')).toBe('"Linha 1\nLinha 2"');
      expect(escapeCsvCell(null)).toBe('""');
      expect(escapeCsvCell(undefined)).toBe('""');
    });
  });

  describe('generatePhase0Csv', () => {
    it('gera CSV com BOM UTF-8 (\\uFEFF) e separador ponto-e-vírgula para compatibilidade com Microsoft Excel', () => {
      const csv = generatePhase0Csv([mockCollection]);

      // Verifica presença do BOM UTF-8
      expect(csv.startsWith('\uFEFF')).toBe(true);

      // Verifica linha de cabeçalho
      const lines = csv.replace('\uFEFF', '').split('\r\n');
      expect(lines.length).toBe(2); // 1 header + 1 data line

      const headerCols = lines[0].split(';');
      expect(headerCols.length).toBe(PHASE0_CSV_HEADERS.length);
      expect(lines[0]).toContain('Código do Conjunto (NIC)');
      expect(lines[0]).toContain('Nome Completo do Falecido');
      expect(lines[0]).toContain('Causa da Morte (D.O.)');

      // Verifica linha de dados
      expect(lines[1]).toContain('COI-072');
      expect(lines[1]).toContain('NILTON MIRANDA FERREIRA PITON');
      expect(lines[1]).toContain('GEORGE QUEIROZ');
    });

    it('consolida múltiplos COIs gerando uma linha por conjunto', () => {
      const col2 = { ...mockCollection, id: 'col-073', nic: 'COI-073' };
      const csv = generatePhase0Csv([mockCollection, col2]);
      const lines = csv.replace('\uFEFF', '').split('\r\n');
      expect(lines.length).toBe(3); // 1 header + 2 data lines
      expect(lines[1]).toContain('COI-072');
      expect(lines[2]).toContain('COI-073');
    });
  });
});
