// Nomes legíveis para os caminhos de campo usados no registro de alterações e na
// comparação de versões (ex.: "phase1.corSacoLavagem" → "Fase 1 · Cor do saco de lavagem").

const PHASE_NAMES: Record<string, string> = {
  phase1: 'Fase 1 · Análise Preliminar (A.1)',
  phase2: 'Fase 2 · Limpeza e secagem (A.2)',
  phase3: 'Fase 3 · Acondicionamento',
  phase4: 'Fase 4 · Montagem e Inventário',
  phase5: 'Fase 5 · Alterações Ósseas',
  phase6: 'Fase 6 · Galpão',
  legalOrigin: 'Procedência (restrito)',
  currentPhase: 'Fase atual'
};

const FIELD_NAMES: Record<string, string> = {
  equipeEnvolvidaLimpeza: 'Equipe envolvida',
  dataAnalise: 'Data',
  horaAnalise: 'Hora',
  foto1SacoFechado: 'Foto 1 — saco fechado',
  foto2PlacaCemiterio: 'Foto 2 — placa do cemitério',
  foto3RemanescentesMateriais: 'Foto 3 — remanescentes e materiais',
  foto4_1RemanescentesIsolados: 'Foto 4.1 — remanescentes isolados',
  foto4_2MateriaisIsolados: 'Foto 4.2 — materiais isolados',
  tipoMaterial: 'Tipo de material',
  cabeloDescricao: 'Descrição — cabelo',
  protesesDescricao: 'Descrição — próteses',
  vestesDescricao: 'Descrição — vestes',
  pertencesDescricao: 'Descrição — pertences',
  tecidosMolesDescricao: 'Descrição — tecidos moles',
  estadoPreservacao: 'Estado de preservação',
  estadoPreservacaoOutrosDescricao: 'Descrição — outros (preservação)',
  observacoesGeraisPreservacao: 'Observações sobre a preservação',
  exameGenetico: 'Exame genético',
  geneticoFalangeDescricao: 'Descrição — falange',
  geneticoDenteHigidoDescricao: 'Descrição — dente hígido',
  geneticoOssosTarsaisDescricao: 'Descrição — ossos tarsais',
  geneticoPrimeiraCostelaDescricao: 'Descrição — 1ª costela',
  geneticoPatelaDescricao: 'Descrição — patela',
  geneticoOutrosDescricao: 'Descrição — outros (genético)',
  geneticoObservacoesGerais: 'Observações da coleta genética',
  geneticoResponsavelColeta: 'Responsável pela coleta genética',
  analiseIsotopica: 'Análise isotópica',
  isotopicaCabeloDescricao: 'Descrição — cabelo (isotópica)',
  isotopicaUnhaDescricao: 'Descrição — unha (isotópica)',
  isotopicaDenteDescricao: 'Descrição — dente (isotópica)',
  isotopicaObservacoes: 'Observações da análise isotópica',
  isotopicaResponsavelColeta: 'Responsável pela coleta isotópica',
  corSacoLavagem: 'Cor do saco de lavagem',
  tipoLimpeza: 'Tipo de limpeza',
  houveDanos: 'Houve danos',
  descricaoDanos: 'Descrição dos danos',
  preliminaryBoxes: 'Caixas',
  photos: 'Fotos',
  maceracaoCiclosNecessarios: 'Ciclos de maceração',
  instrumentosUtilizados: 'Instrumentos utilizados',
  instrumentosOutraDescricao: 'Outro instrumento',
  houveDanosMaceracao: 'Houve danos na maceração',
  descricaoDanosMaceracao: 'Descrição dos danos na maceração',
  formaSecagem: 'Forma de secagem',
  boxDryingStatus: 'Secagem por caixa',
  dryingConfirmationAllBoxes: 'Secagem completa',
  dryingConfirmedAt: 'Secagem confirmada em',
  dryingConfirmedBy: 'Secagem confirmada por',
  cleaningStatus: 'Situação',
  boxLocations: 'Local das caixas',
  location: 'Local',
  facility: 'Local',
  room: 'Sala',
  rack: 'Estante',
  shelf: 'Prateleira',
  boxSlot: 'Vão',
  placedAt: 'Guardada em',
  technicianName: 'Responsável',
  enteredQueueAt: 'Entrada na fila de montagem e inventário',
  curationVersionStatus: 'Situação da montagem e inventário',
  curatorAuthor: 'Curador responsável',
  individuals: 'Indivíduos',
  skeletalElements: 'Elementos ósseos',
  pathologies: 'Alterações ósseas',
  finalLocations: 'Local definitivo',
  publicQrActive: 'QR público ativo',
  cemeteryName: 'Cemitério',
  cemeteryPlot: 'Jazigo / sepultura',
  deathDeclarationNumber: 'Declaração de óbito',
  deliveryDocumentNumber: 'Documento de entrega',
  originInstitution: 'Instituição de origem'
};

// "camposEmCamelCase" → "campos em camel case" (para o que não está na lista acima).
function humanize(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function phaseLabel(phaseNumber: number): string {
  return PHASE_NAMES[`phase${phaseNumber}`] || `Fase ${phaseNumber}`;
}

export function fieldPathLabel(path: string): string {
  const parts = path.split('.');
  const [root, ...rest] = parts;
  const rootLabel = PHASE_NAMES[root] || humanize(root);
  const restLabel = rest.map((part) => {
    const m = part.match(/^([^[]+)(\[(.+)\])?$/);
    if (!m) return part;
    const name = FIELD_NAMES[m[1]] || humanize(m[1]);
    return m[3] ? `${name} [${m[3]}]` : name;
  });
  return [rootLabel, ...restLabel].join(' · ');
}

/** Valor para exibição: listas separadas por vírgula, booleanos como Sim/Não, vazio explícito. */
export function formatHistoryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(vazio)';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length === 0 ? '(vazio)' : value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  // Datas ISO completas viram data e hora local.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    const d = new Date(text);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('pt-BR');
  }
  return text;
}
