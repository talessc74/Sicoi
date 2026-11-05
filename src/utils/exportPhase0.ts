import { OsteologicalCollection, Phase0Data, UserProfile } from '../types/sgccco';
import { canExportPhase0Data } from './permissions';

/**
 * Mapeamento e exportação dos dados da Fase 0 (Identificação e Declaração de Óbito)
 * para formatos compatíveis com Microsoft Excel, LibreOffice Calc e softwares estatísticos (R / Python / SPSS).
 */

export interface Phase0ExportRow {
  nic: string;
  nome: string;
  sexo: string;
  cor: string;
  nacionalidade: string;
  naturalUf: string;
  naturalCidade: string;
  nascimento: string;
  idadeCalculada: string;
  estadoCivil: string;
  profissao: string;
  cpf: string;
  rgNumero: string;
  rgOrgaoExpedidor: string;
  rgUfExpedidor: string;
  maeNome: string;
  maeFalecida: string;
  maeNaturalUf: string;
  maeNaturalCidade: string;
  maeEstadoCivil: string;
  maeProfissao: string;
  paiNome: string;
  paiFalecido: string;
  paiNaturalUf: string;
  paiNaturalCidade: string;
  paiEstadoCivil: string;
  paiProfissao: string;
  conjugeNome: string;
  conjugeNaturalUf: string;
  conjugeNaturalCidade: string;
  conjugeEstadoCivil: string;
  conjugeProfissao: string;
  localFalecimento: string;
  obitoUf: string;
  obitoCidade: string;
  dataFalecimento: string;
  horaFalecimento: string;
  medicoNome: string;
  medicoCrm: string;
  causaMorte: string;
  cemiterio: string;
  dataInumacao: string;
  dataExumacao: string;
  filhosQtd: number;
  filhosNomes: string;
  observacoes: string;
  statusFase0: string;
  faseAtual: string;
  dataCriacao: string;
  assinadoPor: string;
  hashSha256: string;
}

export const PHASE0_CSV_HEADERS: { key: keyof Phase0ExportRow; label: string }[] = [
  { key: 'nic', label: 'Código do Conjunto (NIC)' },
  { key: 'nome', label: 'Nome Completo do Falecido' },
  { key: 'sexo', label: 'Sexo Biológico (D.O.)' },
  { key: 'cor', label: 'Cor / Raça' },
  { key: 'nacionalidade', label: 'Nacionalidade' },
  { key: 'naturalUf', label: 'Naturalidade (UF)' },
  { key: 'naturalCidade', label: 'Naturalidade (Cidade)' },
  { key: 'nascimento', label: 'Data de Nascimento' },
  { key: 'idadeCalculada', label: 'Idade ao Óbito (anos)' },
  { key: 'estadoCivil', label: 'Estado Civil' },
  { key: 'profissao', label: 'Profissão' },
  { key: 'cpf', label: 'CPF' },
  { key: 'rgNumero', label: 'RG (Número)' },
  { key: 'rgOrgaoExpedidor', label: 'RG (Órgão Expedidor)' },
  { key: 'rgUfExpedidor', label: 'RG (UF Expedidor)' },
  { key: 'maeNome', label: 'Nome da Mãe' },
  { key: 'maeFalecida', label: 'Mãe Falecida?' },
  { key: 'maeNaturalUf', label: 'Naturalidade Mãe (UF)' },
  { key: 'maeNaturalCidade', label: 'Naturalidade Mãe (Cidade)' },
  { key: 'maeEstadoCivil', label: 'Estado Civil Mãe' },
  { key: 'maeProfissao', label: 'Profissão Mãe' },
  { key: 'paiNome', label: 'Nome do Pai' },
  { key: 'paiFalecido', label: 'Pai Falecido?' },
  { key: 'paiNaturalUf', label: 'Naturalidade Pai (UF)' },
  { key: 'paiNaturalCidade', label: 'Naturalidade Pai (Cidade)' },
  { key: 'paiEstadoCivil', label: 'Estado Civil Pai' },
  { key: 'paiProfissao', label: 'Profissão Pai' },
  { key: 'conjugeNome', label: 'Nome do Cônjuge' },
  { key: 'conjugeNaturalUf', label: 'Naturalidade Cônjuge (UF)' },
  { key: 'conjugeNaturalCidade', label: 'Naturalidade Cônjuge (Cidade)' },
  { key: 'conjugeEstadoCivil', label: 'Estado Civil Cônjuge' },
  { key: 'conjugeProfissao', label: 'Profissão Cônjuge' },
  { key: 'localFalecimento', label: 'Local do Falecimento' },
  { key: 'obitoUf', label: 'UF do Óbito' },
  { key: 'obitoCidade', label: 'Cidade do Óbito' },
  { key: 'dataFalecimento', label: 'Data do Falecimento' },
  { key: 'horaFalecimento', label: 'Hora do Falecimento' },
  { key: 'medicoNome', label: 'Médico Atestante' },
  { key: 'medicoCrm', label: 'CRM do Médico' },
  { key: 'causaMorte', label: 'Causa da Morte (D.O.)' },
  { key: 'cemiterio', label: 'Cemitério de Inumação' },
  { key: 'dataInumacao', label: 'Data de Inumação / Sepultamento' },
  { key: 'dataExumacao', label: 'Data de Exumação' },
  { key: 'filhosQtd', label: 'Qtd Filhos' },
  { key: 'filhosNomes', label: 'Filhos Registrados' },
  { key: 'observacoes', label: 'Observações Gerais' },
  { key: 'statusFase0', label: 'Status da Fase 0' },
  { key: 'faseAtual', label: 'Fase Atual' },
  { key: 'dataCriacao', label: 'Data de Cadastro' },
  { key: 'assinadoPor', label: 'Assinatura Técnica' },
  { key: 'hashSha256', label: 'Hash Forense SHA-256' }
];

/**
 * Converte um registro de Coleção para a linha estruturada de exportação da Fase 0.
 */
export function collectionToPhase0Row(collection: OsteologicalCollection): Phase0ExportRow {
  const p0: Phase0Data = (collection.phase0 as Phase0Data) || {};

  const formatBoolean = (val?: boolean, naoConsta?: boolean) => {
    if (naoConsta) return 'Não consta';
    if (val === true) return 'Sim';
    if (val === false) return 'Não';
    return '';
  };

  const filhosList = p0.filhos || [];
  const filhosText = filhosList.map(f => `${f.nome || 'Sem nome'}${f.idade ? ` (${f.idade} anos)` : ''}`).join('; ');

  const sig0 = (collection.signatures || []).find(s => s.phaseNumber === 0);
  const statusFase0 = sig0 ? (sig0.status === 'locked' ? 'Assinada (Lacre Ativo)' : 'Reaberta para revisão') : 'Em preenchimento (Rascunho)';
  const assinadoPor = sig0 ? `${sig0.signedByName} (${sig0.signedAt ? sig0.signedAt.slice(0, 10) : ''})` : 'Não assinado';

  return {
    nic: collection.nic || '',
    nome: p0.nome || '',
    sexo: p0.sexo || '',
    cor: p0.cor || '',
    nacionalidade: p0.nacionalidade || '',
    naturalUf: p0.naturalUf || '',
    naturalCidade: p0.naturalCidade || '',
    nascimento: p0.nascimento || '',
    idadeCalculada: p0.idade !== undefined ? String(p0.idade) : '',
    estadoCivil: p0.estadoCivil || '',
    profissao: p0.profissao || '',
    cpf: p0.cpf || '',
    rgNumero: p0.rgNumero || '',
    rgOrgaoExpedidor: p0.rgOrgaoExpedidor || '',
    rgUfExpedidor: p0.rgUfExpedidor || '',
    maeNome: p0.maeNaoConsta ? 'Não consta' : (p0.maeNome || ''),
    maeFalecida: formatBoolean(p0.maeFalecida, p0.maeNaoConsta),
    maeNaturalUf: p0.maeNaturalUf || '',
    maeNaturalCidade: p0.maeNaturalCidade || '',
    maeEstadoCivil: p0.maeEstadoCivil || '',
    maeProfissao: p0.maeProfissao || '',
    paiNome: p0.paiNaoConsta ? 'Não consta' : (p0.paiNome || ''),
    paiFalecido: formatBoolean(p0.paiFalecido, p0.paiNaoConsta),
    paiNaturalUf: p0.paiNaturalUf || '',
    paiNaturalCidade: p0.paiNaturalCidade || '',
    paiEstadoCivil: p0.paiEstadoCivil || '',
    paiProfissao: p0.paiProfissao || '',
    conjugeNome: p0.conjugeNaoConsta ? 'Não consta' : (p0.conjugeNome || ''),
    conjugeNaturalUf: p0.conjugeNaturalUf || '',
    conjugeNaturalCidade: p0.conjugeNaturalCidade || '',
    conjugeEstadoCivil: p0.conjugeEstadoCivil || '',
    conjugeProfissao: p0.conjugeProfissao || '',
    localFalecimento: p0.localFalecimento || '',
    obitoUf: p0.obitoUf || '',
    obitoCidade: p0.obitoCidade || '',
    dataFalecimento: p0.dataFalecimento || '',
    horaFalecimento: p0.horaFalecimento || '',
    medicoNome: p0.medicoNome || '',
    medicoCrm: p0.medicoCrm || '',
    causaMorte: p0.causaMorte || '',
    cemiterio: p0.cemiterio || '',
    dataInumacao: p0.dataInumacao || '',
    dataExumacao: p0.dataExumacao || '',
    filhosQtd: filhosList.length,
    filhosNomes: filhosText,
    observacoes: p0.observacoes || '',
    statusFase0,
    faseAtual: `Fase ${collection.currentPhase ?? 0}`,
    dataCriacao: collection.createdAt || '',
    assinadoPor,
    hashSha256: sig0?.sha256Hash || ''
  };
}

/**
 * Escapa uma célula individual para CSV padrão Excel (pt-BR com delimitador ponto-e-vírgula).
 */
export function escapeCsvCell(value: any): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  // Se contiver ponto-e-vírgula, quebra de linha ou aspas, envolve com aspas e duplica aspas internas
  if (str.includes(';') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Gera string CSV estruturada com BOM UTF-8 (\uFEFF) para compatibilidade nativa com Microsoft Excel.
 */
export function generatePhase0Csv(collections: OsteologicalCollection[]): string {
  const headerLine = PHASE0_CSV_HEADERS.map(h => escapeCsvCell(h.label)).join(';');
  const dataLines = collections.map(col => {
    const row = collectionToPhase0Row(col);
    return PHASE0_CSV_HEADERS.map(h => escapeCsvCell(row[h.key])).join(';');
  });

  // \uFEFF é o Byte Order Mark (BOM) UTF-8 que faz o Excel abrir sem quebrar acentos (ç, ã, é, etc.)
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Dispara o download de um arquivo no navegador do usuário.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta o COI atual para CSV estruturado compatível com Excel.
 * Apenas usuários com papel de Curador (ou Administrador) têm autorização para exportar a lista da Fase 0.
 */
export function exportSingleCoiPhase0Csv(
  collection: OsteologicalCollection,
  currentUser?: Pick<UserProfile, 'role' | 'adminAccess'> | null
): void {
  if (currentUser && !canExportPhase0Data(currentUser)) {
    throw new Error('Acesso negado: a exportação da lista da Fase 0 é restrita exclusivamente a usuários com papel de Curador.');
  }
  const csvContent = generatePhase0Csv([collection]);
  const filename = `${collection.nic || 'COI'}-fase0-identificacao-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, filename);
}

/**
 * Exporta múltiplos COIs (ou todo o acervo com Fase 0) para CSV consolidado compatível com Excel.
 * Apenas usuários com papel de Curador (ou Administrador) têm autorização para exportar a lista da Fase 0.
 */
export function exportAllCollectionsPhase0Csv(
  collections: OsteologicalCollection[],
  currentUser?: Pick<UserProfile, 'role' | 'adminAccess'> | null
): void {
  if (currentUser && !canExportPhase0Data(currentUser)) {
    throw new Error('Acesso negado: a exportação da lista da Fase 0 é restrita exclusivamente a usuários com papel de Curador.');
  }
  const csvContent = generatePhase0Csv(collections);
  const filename = `SIGCOI-acervo-fase0-consolidado-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, filename);
}
