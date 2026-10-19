// SIGCOI - Sistema de Gestão da Coleção Osteológica Identificada
// Modelos de Domínio, Tipagens Estritas e Estados de Transição (§1 a §16)

export type UserRole = 'tecnico' | 'curador' | 'administrador' | 'pesquisador' | 'estudante';

export type PhaseNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type BrazilianUf =
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA'
  | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR' | 'PE' | 'PI' | 'RJ' | 'RN'
  | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  institution: string;
  // E-mail é o identificador de login — único campo que identifica a pessoa.
  email: string;
  // Funções de Administrador somadas ao papel principal (ex.: Curadora que
  // também administra o sistema). `role` segue sendo o que vai nas assinaturas.
  adminAccess?: boolean;

  // Ajustes de acesso por pessoa (§13, out/2026) — cada um começa com o valor
  // padrão do papel (ver utils/permissions.ts) no momento em que a pessoa é
  // cadastrada ou tem o papel trocado, e pode ser ampliado ou reduzido
  // individualmente depois, na tela de Configurações, sem mudar o papel dela
  // nem afetar mais ninguém. Sempre um boolean explícito (nunca "herda do
  // papel" em tempo de execução) — mesmo padrão já usado em adminAccess acima.
  legalOriginAccess?: boolean; // Origem Legal / Cemitério (§7) — ver Fase 1
  curationAccess?: boolean; // Montagem e Inventário / Curadoria — ver Fase 4 (canEdit)
  phaseSigningAccess?: boolean; // Assinatura de Fases (Fases 0-3, Montagem da Fase 4, Física da Fase 5) — nunca o Inventário/Científica, exclusivos do Curador
  exportAccess?: boolean; // Exportação Científica — ver Fase 7
}

// Os 5 ajustes de acesso por pessoa (§13) juntos — reutilizado pelo cadastro/
// edição de pessoa (SettingsView, App.tsx, peopleService.ts) pra não repetir a
// mesma lista de 5 campos em cada assinatura de função.
export type PersonAccessOverrides = Pick<
  UserProfile,
  'adminAccess' | 'legalOriginAccess' | 'curationAccess' | 'phaseSigningAccess' | 'exportAccess'
>;

// Criptografia e Assinatura por Fase (§7)
export interface PhaseSignature {
  phaseNumber: PhaseNumber;
  signedBy: string; // User ID
  signedByName: string;
  signedByRole: UserRole;
  signedAt: string; // ISO 8601
  sha256Hash: string; // Hash SHA-256 do payload canônico da fase
  status: 'locked' | 'unlocked_for_revision';
  reopenJustification?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  // Cópia exata (JSON) do conteúdo da fase no momento da assinatura, sobre a qual o
  // hash foi calculado. Gravada pelo servidor; permite comparar versões depois de uma
  // reabertura e reconferir o lacre a qualquer momento. Assinaturas anteriores a
  // esta versão do sistema não têm a cópia.
  dataSnapshotJson?: string;
}

// Localização física hierárquica no acervo
export interface StorageLocation {
  facility: string;
  room: string;
  rack: string;
  shelf: string;
  boxSlot?: string;
}

// Trilha de Custódia e Movimentação Física (§7, §12, §14)
export interface CustodyMovement {
  id: string;
  timestamp: string;
  sourceLocation: string;
  targetLocation: string;
  carrierPerson: string;
  receiverPerson: string;
  carrierSignatureHash: string;
  receiverSignatureHash?: string;
  purpose: 'recebimento_externo' | 'secagem' | 'acondicionamento_provisorio' | 'curadoria_estudo' | 'transferencia_definitiva' | 'galpao_definitivo' | 'consulta_pesquisa' | 'recebimento_entrada';
  status: 'em_transito' | 'concluido';
  boxIds: string[];
}

// Fase 1: Dados Restritos de Origem Legal / Cemiterial (§7)
export interface LegalOriginData {
  deliveryDocumentNumber?: string;
  originInstitution?: string;
  cemeteryName?: string;
  cemeteryPlot?: string;
  deathDeclarationNumber?: string;
  notes?: string;
  sensitiveNotes?: string;
}

// Campo com sugestão de IA e transcrição POP (§15)
export interface FieldWithAiSuggestion<T> {
  value: T;
  isAiSuggested?: boolean;
  transcriptSnippet?: string;
  confirmedByUser?: boolean;
}

// Confirmação opcional do Pesquisador numa fase onde ele tem acesso (Fases 1, 2,
// 3, 4 e 5 — decisão de acesso out/2026). Nunca é a assinatura que destrava a
// fase: essa continua sendo exclusiva do Técnico (ou do Curador, agindo como
// técnico) — ver canSignAsTechnician em utils/permissions.ts. O Pesquisador
// pode ou não registrar esta confirmação; ela é só um registro de que revisou
// a fase, nunca bloqueia nem substitui a assinatura obrigatória.
export interface ResearcherReviewConfirmation {
  confirmedByName: string;
  confirmedAt: string;
  sha256Hash: string;
}

export interface Phase0ChildRecord {
  id: string;
  nome: string;
  idade: string;
}

/**
 * Fase 0: Recebimento — dados pessoais e do óbito transcritos da Declaração de
 * Óbito (D.O.) que acompanha o conjunto na entrada, antes da Fase 1 (Formulário
 * A.1). Responsabilidade do Técnico (ou Curador, agindo como técnico): a
 * assinatura única abaixo é quem trava a fase e libera a Fase 1 — não é um
 * modelo de dupla assinatura como Fase 4/5. Todo campo é opcional porque a D.O.
 * real frequentemente chega com partes em branco ou "IGN." (aprovado com o
 * Tales a partir da D.O. nº 21492, out/2026) — a fase trava com o que foi
 * possível preencher, nunca exige um campo específico pra assinar.
 */
export interface Phase0Data {
  nome?: string;
  sexo?: 'M' | 'F' | 'Ignorado';
  cor?: 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indígena' | 'Ignorada';
  nacionalidade?: string;
  naturalCidade?: string;
  naturalUf?: BrazilianUf;
  nascimento?: string; // ISO 8601 (data)
  // Calculada a partir de nascimento + dataFalecimento (ver calculateAgeAtDeath
  // em Phase0Recebimento.tsx) — nunca mais digitada à mão.
  idade?: number;
  estadoCivil?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | 'Separado(a) judicialmente' | 'Ignorado';
  profissao?: string;
  cpf?: string;
  rgNumero?: string;
  rgOrgaoExpedidor?: string;
  rgUfExpedidor?: BrazilianUf;

  paiNome?: string;
  paiNaoConsta?: boolean;
  paiFalecido?: boolean;
  paiNaturalCidade?: string;
  paiNaturalUf?: BrazilianUf;
  paiEstadoCivil?: string;
  paiProfissao?: string;

  maeNome?: string;
  maeNaoConsta?: boolean;
  maeFalecida?: boolean;
  maeNaturalCidade?: string;
  maeNaturalUf?: BrazilianUf;
  maeEstadoCivil?: string;
  maeProfissao?: string;

  conjugeNome?: string;
  conjugeNaoConsta?: boolean;
  conjugeNaturalCidade?: string;
  conjugeNaturalUf?: BrazilianUf;
  conjugeEstadoCivil?: string;
  conjugeProfissao?: string;

  localFalecimento?: string;
  obitoCidade?: string;
  obitoUf?: BrazilianUf;
  dataFalecimento?: string; // ISO 8601 (data)
  horaFalecimento?: string;
  medicoNome?: string;
  medicoCrm?: string;
  causaMorte?: string;

  cemiterio?: string;
  dataInumacao?: string; // ISO 8601 (data)
  dataExumacao?: string; // ISO 8601 (data)

  filhos: Phase0ChildRecord[];

  observacoes?: string;

  // A assinatura única do Técnico (ou Curador) que trava a Fase 0 e libera a
  // Fase 1 mora só em OsteologicalCollection.signatures (phaseNumber: 0) —
  // nunca dentro de phase0 em si. Diferente de Fase 4/5 (dupla assinatura,
  // guardada dentro da própria fase): embutir a assinatura aqui faria o hash
  // calculado antes dela nunca bater com o conteúdo já salvo com ela dentro
  // (bug real encontrado em produção — COI-146, out/2026). Mesmo padrão,
  // sem campo de assinatura embutido, de Phase1Data/Phase2Data/Phase3Data.

  // Confirmação opcional do Pesquisador (ver ResearcherReviewConfirmation) —
  // nunca substitui a assinatura do Técnico/Curador acima.
  researcherConfirmation?: ResearcherReviewConfirmation;

  // Marca colocada pelo SERVIDOR quando quem pede o conjunto não pode ver os
  // dados de identificação da DO (db/collectionRedaction.ts): o conteúdo real
  // não sai do banco, e o que chega no navegador é só { filhos: [], redacted }.
  // Nunca é gravado — ao salvar, o servidor devolve a Fase 0 guardada.
  redacted?: boolean;
}

// Categorias fixas do checklist fotográfico do Formulário A.1 (campos 5-9)
export type Phase1PhotoCategory =
  | 'foto1_saco_fechado'
  | 'foto2_placa_cemiterio'
  | 'foto3_remanescentes_materiais'
  | 'foto4_1_remanescentes_isolados'
  | 'foto4_2_materiais_isolados';

export interface Phase1Photo {
  id: string;
  // Nas 5 categorias fixas do checklist do A.1 (Fase 1) ou livre (Fase 2, sem checklist fotográfico formal).
  category: Phase1PhotoCategory | string;
  author: string;
  timestamp: string;
  url: string;
  caption?: string;
  sha256Hash: string;
}

// Formulário A.1 (POP-01 item 9.2-9.4) — Tipo de material presente no saco (campo 10)
export type MaterialType =
  | 'ossos'
  | 'dentes'
  | 'cabelo'
  | 'unha'
  | 'proteses'
  | 'vestes'
  | 'pertences'
  | 'tecidos_moles';

// Estado de preservação dos remanescentes (campo 16)
export type PreservationCharacteristic =
  | 'preservado_integro'
  | 'degradado'
  | 'fragmentacao'
  | 'friavel'
  | 'erosao'
  | 'umido'
  | 'seco'
  | 'fungo_visivel'
  | 'manchas'
  | 'perda_cortical'
  | 'carbonizacao'
  | 'insetos_pupas'
  | 'mumificado'
  | 'adipocera'
  | 'outros';

// Elemento de coleta para exame genético (campo 19), em ordem de prioridade do POP-01 §9.3.1
export type GeneticSampleElement = 'falange' | 'ossos_tarsais' | 'dente_higido' | 'primeira_costela' | 'patela' | 'outros' | 'nao_coletado';

// Material de coleta para análise isotópica (campo 26), POP-01 §9.3.2
export type IsotopicSampleMaterial = 'cabelo' | 'unha' | 'dente' | 'nao_coletado';

export type CleaningType = 'a_seco' | 'agua_fria' | 'agua_quente';

/**
 * Fase 1: Análise Preliminar e Limpeza dos Remanescentes Ósseos.
 * Campos fiéis ao Formulário A.1 (POP-01 v1, itens 9.1-9.4). O NIC do conjunto
 * (chave da collection) corresponde ao campo 1 do formulário e não é repetido aqui.
 */
export interface Phase1Data {
  // Introdução (campos 2-4)
  equipeEnvolvidaLimpeza: FieldWithAiSuggestion<string>;
  dataAnalise: FieldWithAiSuggestion<string>; // ISO 8601 (data)
  horaAnalise: FieldWithAiSuggestion<string>; // ex.: "11h20min"

  // Checklist de fotos (campos 5-9) — foto2, foto3 e foto4.2 são "se aplicável" (podem
  // não existir no caso). foto1 e foto4.1 são sempre esperadas, mas não travam a fase
  // pra sempre se não houver foto real: o operador pode registrar a foto de verdade
  // (value: 'sim') ou, perguntado explicitamente pelo sistema, confirmar que não há
  // foto pra guardar com justificativa obrigatória (value: 'sem_foto_justificado').
  foto1SacoFechado: FieldWithAiSuggestion<'sim' | 'sem_foto_justificado'>;
  foto1SacoFechadoJustificativaAusencia?: FieldWithAiSuggestion<string>;
  foto2PlacaCemiterio: FieldWithAiSuggestion<'sim' | 'nao_se_aplica'>;
  foto3RemanescentesMateriais: FieldWithAiSuggestion<'sim' | 'nao_se_aplica'>;
  foto4_1RemanescentesIsolados: FieldWithAiSuggestion<'sim' | 'sem_foto_justificado'>;
  foto4_1RemanescentesIsoladosJustificativaAusencia?: FieldWithAiSuggestion<string>;
  foto4_2MateriaisIsolados: FieldWithAiSuggestion<'sim' | 'nao_se_aplica'>;

  // Tipo de material (campo 10) + descrições condicionais (11-15)
  tipoMaterial: FieldWithAiSuggestion<MaterialType[]>;
  cabeloDescricao: FieldWithAiSuggestion<string>;
  protesesDescricao: FieldWithAiSuggestion<string>;
  vestesDescricao: FieldWithAiSuggestion<string>;
  pertencesDescricao: FieldWithAiSuggestion<string>;
  tecidosMolesDescricao: FieldWithAiSuggestion<string>;

  // Estado de preservação (campo 16) + outros/observações (17-18)
  estadoPreservacao: FieldWithAiSuggestion<PreservationCharacteristic[]>;
  estadoPreservacaoOutrosDescricao: FieldWithAiSuggestion<string>;
  observacoesGeraisPreservacao: FieldWithAiSuggestion<string>;

  // Coleta de amostra biológica — exame genético (campos 19-25)
  exameGenetico: FieldWithAiSuggestion<GeneticSampleElement[]>;
  geneticoFalangeDescricao: FieldWithAiSuggestion<string>;
  geneticoDenteHigidoDescricao: FieldWithAiSuggestion<string>;
  geneticoOssosTarsaisDescricao: FieldWithAiSuggestion<string>;
  geneticoOutrosDescricao: FieldWithAiSuggestion<string>;
  // Opcionais: acrescentados depois (pedido de pesquisador, set/2026). Conjuntos já
  // salvos não têm estes campos, e preenchê-los na carga mudaria o JSON sobre o qual
  // as assinaturas antigas foram calculadas.
  geneticoPrimeiraCostelaDescricao?: FieldWithAiSuggestion<string>;
  geneticoPatelaDescricao?: FieldWithAiSuggestion<string>;
  geneticoObservacoesGerais: FieldWithAiSuggestion<string>;
  geneticoResponsavelColeta: FieldWithAiSuggestion<string>;

  // Coleta de amostra biológica — análise isotópica (campos 26-31)
  analiseIsotopica: FieldWithAiSuggestion<IsotopicSampleMaterial[]>;
  isotopicaCabeloDescricao: FieldWithAiSuggestion<string>;
  isotopicaUnhaDescricao: FieldWithAiSuggestion<string>;
  isotopicaDenteDescricao: FieldWithAiSuggestion<string>;
  isotopicaObservacoes: FieldWithAiSuggestion<string>;
  isotopicaResponsavelColeta: FieldWithAiSuggestion<string>;

  // Limpeza (campos 32-33)
  corSacoLavagem: FieldWithAiSuggestion<string>;
  tipoLimpeza: FieldWithAiSuggestion<CleaningType>;

  // Danos (campos 34-35)
  houveDanos: FieldWithAiSuggestion<boolean>;
  descricaoDanos: FieldWithAiSuggestion<string>;

  preliminaryBoxes: PreliminaryBox[];
  photos: Phase1Photo[];

  // Não é campo do A.1 — confirmação opcional do Pesquisador (ver
  // ResearcherReviewConfirmation), nunca a assinatura que destrava a fase.
  researcherConfirmation?: ResearcherReviewConfirmation;
}

export interface PreliminaryBox {
  id: string;
  boxCode: string;
  presumedIndividualLabel: string;
  currentLocation: string;
  qrCode: string;
  // Exclusão administrativa reversível (§ Zona de Risco, Configurações): a caixa nunca
  // é removida da lista, só marcada — some das telas ativas, mas "Restaurar" limpa estes
  // quatro campos e ela volta exatamente como estava. Editar isto numa Fase 1 já
  // assinada passa pela mesma reabertura protegida de qualquer outro campo (historyGuard).
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  deletedReason?: string;
}

// Status de limpeza/secagem por caixa — pertence à Fase 2 (Maceração e Secagem), não à
// Fase 1. Mora aqui, e não em PreliminaryBox, porque a Fase 1 já está assinada e travada
// quando a Fase 2 começa a mexer nisso: se esses campos ficassem dentro de
// phase1.preliminaryBoxes, qualquer mudança de status quebraria o hash da assinatura da
// Fase 1 (o servidor recalcula o hash sobre o phase1 inteiro a cada gravação) e o
// salvamento seria sempre rejeitado com "Assinatura inválida".
export interface BoxDryingStatus {
  boxId: string;
  cleaningStatus: 'pendente' | 'em_lavagem' | 'em_limpeza' | 'em_secagem' | 'seca';
  dryingStartedAt?: string;
  dryingDurationHours?: number;
}

// Instrumento de limpeza empregado na maceração (Formulário A.2, campo 6)
export type CleaningInstrument =
  | 'esponja'
  | 'escova_dentes'
  | 'escova_grande'
  | 'lamina_bisturi'
  | 'faca'
  | 'pinca'
  | 'pinceis'
  | 'maquina_redutora_corpos'
  | 'panela_fogao'
  | 'outra';

// Forma de secagem (Formulário A.2, campo 10) — o formulário real pergunta o método,
// não uma temperatura.
export type DryingMethod = 'estufa' | 'aquecedor' | 'temperatura_ambiente';

/**
 * Fase 2: Análise Preliminar e Limpeza dos Remanescentes Ósseos — etapa de Maceração
 * e Secagem. Campos fiéis ao Formulário A.2 (POP-01 v1, itens 9.5-9.6). O NIC do
 * conjunto corresponde ao campo 1 do formulário e não é repetido aqui.
 */
export interface Phase2Data {
  // Introdução (campos 2-4)
  equipeEnvolvidaLimpeza: FieldWithAiSuggestion<string>;
  dataAnalise: FieldWithAiSuggestion<string>;
  horaAnalise: FieldWithAiSuggestion<string>;

  // Maceração (campos 5-7)
  maceracaoCiclosNecessarios: FieldWithAiSuggestion<number>;
  instrumentosUtilizados: FieldWithAiSuggestion<CleaningInstrument[]>;
  instrumentosOutraDescricao: FieldWithAiSuggestion<string>;

  // Danos durante a maceração (campos 8-9)
  houveDanosMaceracao: FieldWithAiSuggestion<boolean>;
  descricaoDanosMaceracao: FieldWithAiSuggestion<string>;

  // Secagem (campo 10)
  formaSecagem: FieldWithAiSuggestion<DryingMethod>;

  // Rastreamento operacional de secagem por caixa — não é campo do A.2, mas necessário
  // para o bloqueio de fase (§6): todas as caixas devem estar secas antes de assinar.
  // Uma caixa sem entrada aqui é considerada 'pendente' (ver Phase2Limpeza.tsx).
  boxDryingStatus: BoxDryingStatus[];
  dryingConfirmationAllBoxes: boolean;
  dryingConfirmedAt?: string;
  dryingConfirmedBy?: string;

  photos: Phase1Photo[];

  // Não é campo do A.2 — confirmação opcional do Pesquisador (ver
  // ResearcherReviewConfirmation), nunca a assinatura que destrava a fase.
  researcherConfirmation?: ResearcherReviewConfirmation;
}

// Fase 3: Acondicionamento Provisório e Fila de Montagem e Inventário
export interface Phase3Data {
  boxLocations: {
    boxId: string;
    location: StorageLocation;
    allocatedAt?: string;
    placedAt?: string;
    allocatedBy?: string;
    technicianName?: string;
    shelfQrScanned?: boolean;
    qrScannedConfirmation?: boolean;
  }[];
  enteredQueueAt?: string;

  // Confirmação opcional do Pesquisador (ver ResearcherReviewConfirmation),
  // nunca a assinatura/ação que destrava a fase.
  researcherConfirmation?: ResearcherReviewConfirmation;
}

// Grau de Certeza Biológica (§8)
export type BiologicalConfidence = 'alto' | 'alta' | 'medio' | 'media' | 'baixo' | 'baixa' | 'inconclusivo' | 'inconclusiva';

// Fase 4: Montagem e Inventário (NMI e Perfil Biológico)
export type CurationVersionStatus = 'rascunho' | 'revisao' | 'aprovada_curador' | 'aprovada';

export interface IndividualHypothesis {
  id: string;
  code: string;
  nameOrLabel?: string;
  confidence: BiologicalConfidence;
  nmiDiagnosticElement?: string;
  status?: 'valido' | 'preliminar' | 'revisao' | string;
  associatedBoxId?: string;
  justification?: string;
  biologicalProfile: {
    sexEstimate: {
      value: 'masculino' | 'provavel_masculino' | 'indeterminado' | 'provavel_feminino' | 'feminino';
      confidence?: BiologicalConfidence;
      methodCode: string;
      bibliographicRef: string;
      notes: string;
    };
    ageCategory: {
      value: 'jovem' | 'adulto_jovem' | 'adulto_medio' | 'adulto_maduro' | 'idoso';
      estimatedRangeYears: string;
      confidence?: BiologicalConfidence;
      methodCode: string;
      bibliographicRef: string;
      notes?: string;
    };
    statureCm: {
      estimatedValue: number;
      rangeMin?: number;
      rangeMax?: number;
      methodCode: string;
      bibliographicRef: string;
      marginErrorCm?: number;
      measuredElement?: string;
    };
    ancestryIndication: {
      traitsObserved: string;
      methodCode: string;
      bibliographicRef: string;
    };
  };
  odontogram: ToothRecord[];

  // Dentição em avaliação no Inventário Odontológico — "mista" é a única que
  // precisa saber, por par de quadrante anatômico (1↔5 sup. direito, 2↔6 sup.
  // esquerdo, 3↔7 inf. esquerdo, 4↔8 inf. direito), qual dos dois lados do par
  // está em uso agora; o outro lado do par fica travado pra nunca registrar os
  // dois ao mesmo tempo pra uma mesma posição anatômica. Ausente (undefined)
  // ou em "permanente"/"decídua" equivale a todos os pares no mesmo lado.
  denticao?: 'permanente' | 'mista' | 'decidua';
  denticaoQuadrantePares?: Partial<Record<1 | 2 | 3 | 4, 'permanente' | 'decidua'>>;

  // Dentes extras além das 32 posições FDI padrão — nunca ocupam uma posição
  // do odontogram, só descrevem onde foram observados.
  supernumeraryTeeth?: { id: string; descricaoPosicao: string }[];
}

export interface ToothRecord {
  toothNumberFdi: number;
  // 1-4: dentição permanente (ISO 3950). 5-8: dentição decídua, no mesmo
  // posicionamento anatômico do seu par (5↔1, 6↔2, 7↔3, 8↔4).
  quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  condition: 'higido' | 'ausente_ante_mortem' | 'ausente_post_mortem' | 'carie' | 'restauracao' | 'desgaste_severo' | 'raiz_residual' | 'nao_erupcionado';
  notes?: string;
}

export interface SkeletalElement {
  id: string;
  anatomicalCode: string;
  namePt: string;
  region: 'cranio' | 'axial' | 'membros_superiores' | 'membros_inferiores';
  side: 'direito' | 'esquerdo' | 'axial_unico';
  presence: 'completo' | 'parcial_maior_50' | 'fragmentado_menor_50' | 'ausente';
  preservationQuality: 'excelente' | 'boa' | 'regular' | 'erosao_cortical_severa';
  associatedIndividualId?: string;
  associationMethod: string;
  associationConfidence: BiologicalConfidence;
  associationJustification: string;
  observations: string;
}

// PR4 — Inventário Osteológico por Regiões Anatômicas (Fase 4)
export type OsteologicalPresenceCode = 'P' | 'F' | 'I' | 'A';

export type AlteracaoOsseaTipo =
  | 'lesao_ante_mortem'
  | 'lesao_peri_mortem'
  | 'alteracao_post_mortem'
  | 'patologia'
  | 'variacao_anatomica'
  | 'sem_alteracao'
  | 'alteracao';

export interface OsteologicalAlteracaoRegiao {
  id?: string;
  tipo: AlteracaoOsseaTipo;
  osso?: string;
  observacoes?: string;
}

export interface OsteologicalSectionCabecaPescoco {
  ossos: Record<string, OsteologicalPresenceCode>;
  cartilagensLaringe?: string[];
  ossiculosDireitos?: string[];
  ossiculosEsquerdos?: string[];
  alteracoes?: OsteologicalAlteracaoRegiao[];
}

// Contagem limitada (0..max, "+max" representado pelo valor max+1) e, quando
// aplicável, quais elementos foram individualmente identificados — mesmo
// padrão repetitivo pedido pelo Tales pra vértebras, costelas e falanges
// (out/2026). `identificadas` guarda rótulos como 'nenhuma_identificada',
// 'C1'..'C7'/'1ª'..'12ª' ou 'supranumeraria'.
export interface OsteologicalCountIdentifySelection {
  quantidade?: number;
  identificadas?: string[];
}

export interface OsteologicalSimpleBoneSection {
  ossos: Record<string, OsteologicalPresenceCode>;
  alteracoes?: OsteologicalAlteracaoRegiao[];
}

export interface OsteologicalSectionColunaVertebral {
  ossos: Record<string, OsteologicalPresenceCode>; // Sacro, Cóccix
  alteracoes?: OsteologicalAlteracaoRegiao[];
  cervicais?: OsteologicalCountIdentifySelection; // max 7
  toracicas?: OsteologicalCountIdentifySelection; // max 12
  lombares?: OsteologicalCountIdentifySelection; // max 5
}

export interface OsteologicalSectionTorax {
  ossos: Record<string, OsteologicalPresenceCode>; // Esterno - Manúbrio/Corpo/Processo xifóide
  alteracoes?: OsteologicalAlteracaoRegiao[];
  costelasDireitas?: OsteologicalCountIdentifySelection; // max 12
  costelasEsquerdas?: OsteologicalCountIdentifySelection; // max 12
}

// Falanges e sesamoides da mão/do pé — contados uma vez só (não por lado):
// decisão do Tales (out/2026), já que uma falange solta raramente dá pra
// lateralizar com segurança. Sesamoides não tem teto fixo (intervalo aberto).
export interface OsteologicalPooledCounts {
  falangesProximais?: number;
  falangesMedias?: number;
  falangesDistais?: number;
  sesamoides?: number;
}

export interface OsteologicalInventoryData {
  cabecaPescoco?: OsteologicalSectionCabecaPescoco;
  colunaVertebral?: OsteologicalSectionColunaVertebral;
  torax?: OsteologicalSectionTorax;
  membroSuperiorDireito?: OsteologicalSimpleBoneSection;
  membroSuperiorEsquerdo?: OsteologicalSimpleBoneSection;
  pelveBacia?: OsteologicalSimpleBoneSection;
  membroInferiorDireito?: OsteologicalSimpleBoneSection;
  membroInferiorEsquerdo?: OsteologicalSimpleBoneSection;
  maoPooled?: OsteologicalPooledCounts;
  pePooled?: OsteologicalPooledCounts;
  [key: string]: unknown;
}

export interface Phase4Data {
  curationVersionNumber: number;
  curationVersionStatus: CurationVersionStatus;
  curatorAuthor: string;
  individuals: IndividualHypothesis[];
  skeletalElements: SkeletalElement[];
  osteologicalInventory?: OsteologicalInventoryData;
  completeAssemblyPhotoApproved?: {
    photoUrl: string;
    capturedAt: string;
    approvedBy: string;
    approvedAt: string;
    sha256Hash: string;
    resolution: string;
  };
  // Confirmação do Técnico de que a Montagem está completa — precisa existir
  // junto com curatorInventorySign pra fase travar e avançar (mesmo padrão
  // de duas confirmações já usado em phase5.technicianPhysicalSign/
  // curatorScientificSign). Nenhuma das duas sozinha avança a fase.
  technicianAssemblySign?: {
    signedByName: string;
    signedAt: string;
    sha256Hash: string;
  };
  curatorInventorySign?: {
    signedByName: string;
    signedAt: string;
    sha256Hash: string;
  };

  // Confirmação opcional do Pesquisador (ver ResearcherReviewConfirmation) —
  // nunca substitui technicianAssemblySign, que continua sendo a assinatura
  // exclusiva de Técnico/Curador.
  researcherConfirmation?: ResearcherReviewConfirmation;

  // Confirmação explícita de que não há fotografia oficial de montagem pra
  // guardar agora — a câmera normalmente é obrigatória pra fechar a Fase 4,
  // mas o sistema pergunta em vez de travar pra sempre quando ela não está
  // disponível (mesmo padrão da Fase 1 — ver _local-adr-policy-301). Nunca
  // coexiste com completeAssemblyPhotoApproved: registrar uma foto real
  // sempre limpa esta justificativa (e vice-versa).
  assemblyPhotoJustification?: {
    justifiedByName: string;
    justifiedAt: string;
    reason: string;
  };
}

// Fase 5: Alterações Ósseas, Exames e Marcação Óssea
export interface BonePathology {
  id: string;
  elementId?: string;
  elementName?: string;
  individualId?: string;
  taxonomyCode?: string;
  taxonomyLabel?: string;
  isNotCataloged?: boolean;
  anatomicLocationOnBone?: string;
  timingEstimate?: 'ante_mortem' | 'peri_mortem' | 'nao_conclusivo';
  description?: string;
  classificationMethod?: string;
  referencesConsulted?: string[];
  reviewedAndApprovedBy?: string;
  category?: string;
  termControlled?: string;
  associatedElementCode?: string;
  associatedIndividualId?: string;
  notes?: string;
  isUncataloged?: boolean;
  uncatalogedJustification?: string;
  metricPhotos?: any[];
}

export interface ComplementaryExam {
  id: string;
  individualId: string;
  elementId?: string;
  examType: 'tomografia_computadorizada_dicom' | 'radiografia_digital' | 'analise_isotopica' | 'laudo_antropologico_externo' | string;
  date?: string;
  modalityCode?: string;
  fileUrl: string;
  fileName: string;
  parametersExtractedByMethodPrepop: {
    kVp?: number;
    sliceThicknessMm?: number;
    pixelSpacing?: string;
    hounsfieldMean?: number;
    normalizedMethodName: string;
    isDraftUntilConfirmed?: boolean;
  };
  dicomMetadata?: {
    patientPseudoId: string;
    studyDate: string;
    seriesDescription: string;
    slicesCount: number;
  };
}

export interface BoneMarkingRecord {
  elementId: string;
  elementName: string;
  appliedMarkCode: string;
  inkType: 'tinta_nanquim_indelevel_acrilica_paraloid_b72';
  appliedByTechnician: string;
  appliedAt: string;
  verified: boolean;
}

export interface CompletenessChecklist {
  totalApplicableItems: number;
  validCompletedItems: number;
  completenessPercentage: number;
  individualBreakdowns: {
    individualId: string;
    individualCode: string;
    percentage: number;
    pendingMandatoryItems: string[];
  }[];
  isEligibleForPhase6: boolean;
}

export interface Phase5Data {
  pathologies: BonePathology[];
  exams?: ComplementaryExam[];
  complementaryExams?: ComplementaryExam[];
  boneMarkings?: BoneMarkingRecord[];
  physicalBoneMarking?: {
    techniqueUsed: string;
    completed: boolean;
    completedBy?: string;
    completedAt?: string;
    elementsMarkedCount: number;
  };
  finalPackagingInertMaterial?: {
    materialUsed: string;
    boxesCompletedCount: number;
    packedBy?: string;
    packedAt?: string;
  };
  phase5Checklist?: {
    pathologiesReviewed: boolean;
    examsAttached: boolean;
    finalPhotosRegistered: boolean;
    boneMarkingCompleted: boolean;
    inertPackagingCompleted: boolean;
  };
  curatorScientificSign?: {
    signedByName: string;
    signedAt: string;
    sha256Hash: string;
  };
  technicianPhysicalSign?: {
    signedByName: string;
    signedAt: string;
    sha256Hash: string;
  };
  finalPhotos?: {
    category: 'detalhe_patologia' | 'marcacao_fisica' | 'odontograma_macrografia';
    url: string;
    caption: string;
    hash: string;
  }[];
  completenessChecklist?: CompletenessChecklist;

  // Confirmação opcional do Pesquisador (ver ResearcherReviewConfirmation) —
  // nunca substitui technicianPhysicalSign, que continua sendo a única
  // assinatura que trava e avança a fase.
  researcherConfirmation?: ResearcherReviewConfirmation;
}

// Fase 6: Armazenamento Definitivo no Galpão
export interface Phase6Data {
  transferStartedAt?: string;
  transferDispatchedByTechnician?: string;
  transferDispatchHash?: string;
  warehouseAcceptedBy?: string;
  warehouseAcceptedAt?: string;
  warehouseCustodyTermHash?: string;
  warehouseTermNotes?: string;
  deliveryReceiptCarrier?: {
    carrierName: string;
    dispatchedAt: string;
    sha256Hash: string;
  };
  acceptanceReceiptWarehouse?: {
    receiverName: string;
    receivedAt: string;
    sha256Hash: string;
  };
  finalLocations: {
    boxId: string;
    location: StorageLocation;
    shelfQrVerified?: boolean;
    storedAt?: string;
    finalizedAt?: string;
    warehouseOperator?: string;
  }[];
  publicQrActive: boolean;
  publicQrActivationDate?: string;
}

// Fase 7: Consulta e Pesquisa
export interface ResearchAuthorization {
  id: string;
  title: string;
  projectTitle?: string;
  principalInvestigator: string;
  researcherName?: string;
  researcherId?: string;
  investigatorEmail: string;
  institution: string;
  cepEthicsApprovalNumber: string;
  ethicsCommitteeApprovalNumber?: string;
  ethicsCommitteeName?: string;
  seiProcessNumber?: string;
  status: 'ativa' | 'expirada' | 'suspensa' | 'revogada' | 'aprovada';
  validFrom: string;
  validUntil: string;
  scope?: {
    allowedAnatomicalElements: string[];
    allowedCollectionsNic: string[];
    allowedVariables: ('perfil_biologico' | 'odontograma' | 'patologias' | 'exames_dicom' | 'inventario_geral')[];
    allowedMediaTypes: ('fotos_montagem' | 'dicom' | 'laudos')[];
    exportFormatAllowed: ('csv' | 'json' | 'pdf' | 'excel')[];
  };
  authorizedNics?: string[];
  signedByAdmin?: string;
  signedAt?: string;
}

export interface LoanRecord {
  id: string;
  collectionNic: string;
  borrowerName: string;
  borrowerInstitution: string;
  startDate: string;
  returnDeadline: string;
  status: 'ativo' | 'devolvido' | 'em_atraso';
  custodyTermSha256: string;
}

export type GraphNodeType =
  | 'nic'
  | 'individuo'
  | 'elemento'
  | 'patologia'
  | 'caixa'
  | 'localizacao'
  | 'metodo'
  | 'exame'
  | 'formulario_a1'
  | 'formulario_a2'
  | 'foto'
  | 'assinatura'
  | 'evento_custodia'
  // Nó temporário da busca por semelhança entre ossos (_local-adr-policy-103):
  // o osso descrito pelo usuário, fora do acervo — nunca persistido em
  // graph_nodes, só desenhado em memória no painel de busca.
  | 'osso_consultado';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  properties: Record<string, any>;
}

export type GraphEdgeRelation =
  | 'possui_individuo'
  | 'contem_elemento'
  | 'apresenta_patologia'
  | 'armazenado_em'
  | 'analisado_por_metodo'
  | 'possui_exame'
  | 'tem_formulario_a1'
  | 'tem_formulario_a2'
  | 'tem_foto'
  | 'contem_caixa'
  | 'assinado_por'
  | 'evento_de_custodia'
  // Liga o nó temporário 'osso_consultado' a um elemento real do acervo —
  // sempre confidence: 'INFERRED' (_local-adr-policy-103).
  | 'similar_a';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: GraphEdgeRelation;
  // Mesma semântica do Graphify: EXTRACTED = relação direta e explícita no dado
  // (todo o grafo persistido, calculado em graphSync.ts); INFERRED = deduzida por
  // uma análise posterior — usado pela primeira vez na busca por semelhança entre
  // ossos (_local-adr-policy-103), nunca persistido, só no resultado da busca.
  confidence: 'EXTRACTED' | 'INFERRED';
  provenance: {
    recordId: string;
    field: string;
    version: number;
    createdAt: string;
  };
}

// Trilha de Auditoria e Rastreabilidade Completa (§Norma INC/DITEC/PF)
export type AuditActionType =
  | 'criacao_nic'
  | 'recebimento_triagem'
  | 'limpeza_higienizacao'
  | 'secagem_concluida'
  | 'acondicionamento_provisorio'
  | 'curadoria_nmi'
  | 'pareamento_anatomico'
  | 'perfil_biologico'
  | 'patologia_registrada'
  | 'exame_dicom_anexado'
  | 'marcacao_ossea'
  | 'embalagem_inerte'
  | 'assinatura_fase'
  | 'reabertura_fase'
  | 'despacho_transporte'
  | 'aceite_galpao'
  | 'ativacao_qr_publico'
  | 'autorizacao_pesquisa_abac'
  | 'termo_emprestimo';

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  phaseNumber: PhaseNumber;
  actionType: AuditActionType;
  actionTitle: string;
  description: string;
  operatorId: string;
  operatorName: string;
  operatorRole: UserRole;
  operatorInstitution?: string;
  ipOrTerminal?: string;
  previousValueSnapshot?: string;
  newValueSnapshot?: string;
  sha256Hash: string; // Hash SHA-256 da operação
  verificationStatus: 'valido' | 'alerta_inconsistencia';
  boxIds?: string[];
  justification?: string;
  metadata?: Record<string, any>;
}

// Entidade mestre do Conjunto Osteológico
export interface OsteologicalCollection {
  id?: string;
  nic: string;
  createdAt: string;
  createdByTechnician: string;
  currentPhase: PhaseNumber;
  signatures: PhaseSignature[];
  custodyChain: CustodyMovement[];
  auditTrail?: AuditEvent[];
  
  // Dados de cada fase
  legalOrigin: LegalOriginData;
  // Opcional: conjuntos criados antes da Fase 0 existir (out/2026) nunca tiveram
  // este campo — a fase deles nasceu direto na Fase 1, e segue assim, sem ser
  // forçada retroativamente a passar pela Fase 0. Só conjuntos novos ganham
  // phase0 já no momento da criação (ver App.tsx).
  phase0?: Phase0Data;
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  phase4: Phase4Data;
  phase5: Phase5Data;
  phase6: Phase6Data;
}
