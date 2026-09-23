// SGCCCO - Sistema de Gerenciamento e Custódia de Coleções Osteológicas
// Modelos de Domínio, Tipagens Estritas e Estados de Transição (§1 a §16)

export type UserRole = 'tecnico' | 'curador' | 'administrador' | 'pesquisador' | 'estudante';

export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  institution: string;
  registrationNumber: string;
}

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
  legalProcessNumber?: string;
  courtDistrict?: string;
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

export interface Phase1Photo {
  id?: string;
  stepNumber?: number;
  description?: string;
  author?: string;
  timestamp?: string;
  category?: 'saco_lacrado' | 'abertura' | 'sedimento' | 'etiqueta_origem' | string;
  url: string;
  caption?: string;
  sha256Hash: string;
}

// Fase 1: Recebimento e Triagem Inicial
export interface Phase1Data {
  deliveryDocumentNumber: FieldWithAiSuggestion<any>;
  originInstitution: FieldWithAiSuggestion<any>;
  receivedBagsCount: FieldWithAiSuggestion<any>;
  bagSealNumbers: FieldWithAiSuggestion<any>;
  initialConditionNotes: FieldWithAiSuggestion<any>;
  apparentMni: FieldWithAiSuggestion<any>;
  preliminaryBonesNoted: FieldWithAiSuggestion<any>;
  preliminaryBoxes: PreliminaryBox[];
  initialPhotos: Phase1Photo[];
}

export interface PreliminaryBox {
  id: string;
  boxCode: string;
  presumedIndividualLabel: string;
  currentLocation: string;
  qrCode: string;
  cleaningStatus: 'pendente' | 'em_lavagem' | 'em_limpeza' | 'em_secagem' | 'seca';
  dryingStartedAt?: string;
  dryingDurationHours?: number;
}

// Fase 2: Limpeza e Secagem
export interface CleaningSession {
  id: string;
  boxId: string;
  startedAt: string;
  finishedAt: string;
  methodUsed: 'lavagem_mecanica_pinceis' | 'pincelamento_seco' | 'outro_justificado';
  waterTemperatureC?: number;
  operatorName: string;
  observations: FieldWithAiSuggestion<string>;
  photos: {
    stage: 'antes' | 'durante' | 'depois';
    url: string;
    caption: string;
  }[];
}

export interface Phase2Data {
  cleaningSessions: CleaningSession[];
  dryingConfirmationAllBoxes: boolean;
  dryingVerificationDate?: string;
  dryingTechnicianSignature?: string;
  dryingConfirmedAt?: string;
  dryingConfirmedBy?: string;
}

// Fase 3: Acondicionamento Provisório e Fila de Curadoria
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
}

// Grau de Certeza Biológica Forense (§8)
export type BiologicalConfidence = 'alto' | 'alta' | 'medio' | 'media' | 'baixo' | 'baixa' | 'inconclusivo' | 'inconclusiva';

// Fase 4: Curadoria Científica, MNI e Perfil Biológico
export type CurationVersionStatus = 'rascunho' | 'revisao' | 'aprovada_curador' | 'aprovada';

export interface IndividualHypothesis {
  id: string;
  code: string;
  nameOrLabel?: string;
  confidence: BiologicalConfidence;
  mniDiagnosticElement?: string;
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
}

export interface ToothRecord {
  toothNumberFdi: number;
  quadrant: 1 | 2 | 3 | 4;
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

export interface Phase4Data {
  curationVersionNumber: number;
  curationVersionStatus: CurationVersionStatus;
  curatorAuthor: string;
  individuals: IndividualHypothesis[];
  skeletalElements: SkeletalElement[];
  completeAssemblyPhotoApproved?: {
    photoUrl: string;
    capturedAt: string;
    approvedBy: string;
    approvedAt: string;
    sha256Hash: string;
    resolution: string;
  };
}

// Fase 5: Patologias, Exames e Marcação Óssea
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

export interface GraphNode {
  id: string;
  label: string;
  type: 'nic' | 'individuo' | 'elemento' | 'patologia' | 'caixa' | 'localizacao' | 'metodo' | 'exame';
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: 'possui_individuo' | 'contem_elemento' | 'apresenta_patologia' | 'armazenado_em' | 'analisado_por_metodo' | 'possui_exame';
  provenance: {
    recordId: string;
    field: string;
    version: number;
    createdAt: string;
  };
}

// Trilha de Auditoria e Rastreabilidade Completa (§Norma SENASP/DITEC)
export type AuditActionType =
  | 'criacao_nic'
  | 'recebimento_triagem'
  | 'limpeza_higienizacao'
  | 'secagem_concluida'
  | 'acondicionamento_provisorio'
  | 'curadoria_mni'
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
  sha256Hash: string; // Hash forense da operação
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
  phase1: Phase1Data;
  phase2: Phase2Data;
  phase3: Phase3Data;
  phase4: Phase4Data;
  phase5: Phase5Data;
  phase6: Phase6Data;
}
