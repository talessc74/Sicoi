import {
  OsteologicalCollection,
  ResearchAuthorization,
  ToothRecord
} from '../types/sgccco';
import { createEmptyPhase1Data, createEmptyPhase2Data } from './phaseDefaults';

export const CONTROLLED_PATHOLOGY_TAXONOMY = [
  { code: 'TRAUM_FRAT_ANTE_CICAT', label: 'Trauma - Fratura consolidada ante-mortem com calo ósseo', category: 'Traumática' },
  { code: 'TRAUM_FRAT_PERI_FRESCO', label: 'Trauma - Fratura peri-mortem sem reação osteogênica', category: 'Traumática' },
  { code: 'DEG_OSTEOART_MARG', label: 'Degenerativa - Osteoartrose com eburnação e lábio marginal', category: 'Degenerativa' },
  { code: 'DEG_OSTEOFITO_VERTEBRAL', label: 'Degenerativa - Espondilólise / Osteofitose vertebral difusa', category: 'Degenerativa' },
  { code: 'INFEC_TREP_TIBIA_SABRE', label: 'Infecciosa - Periostite tibial / Deformidade em lâmina de sabre', category: 'Infecciosa' },
  { code: 'INFEC_OSTEOMIELITE_CLOACA', label: 'Infecciosa - Osteomielite crônica com involucro e cloaca', category: 'Infecciosa' },
  { code: 'METAB_CRIBRA_ORBITALIA', label: 'Metabólica - Cribra Orbitalia (Porosidade do teto orbitário)', category: 'Metabólica' },
  { code: 'METAB_POROTIC_HYPEROSTOSIS', label: 'Metabólica - Hiperostose porótica da calvária', category: 'Metabólica' },
  { code: 'NEOPL_OSTEOMA_BOTAO', label: 'Neoplásica Benigna - Osteoma em botão na tábua externa', category: 'Neoplásica' },
  { code: 'NEOPL_LESAO_LITICA_MIELOMA', label: 'Neoplásica - Lesões líticas perfurantes circulares', category: 'Neoplásica' },
  { code: 'NAO_CATALOGADO', label: 'Alteração morfológica não catalogada na taxonomia oficial', category: 'Outros' }
];

export const CONTROLLED_BIOLOGICAL_METHODS = {
  sex: [
    { code: 'Phenice 1969', name: 'Phenice (1969) - Morfologia do Arco Subpúbico e Ramo Isquiopúbico', ref: 'Am. J. Phys. Anthropol. 30:297-301' },
    { code: 'Walker 2008', name: 'Walker (2008) - Traços Não-Métricos Cranianos (Nuchal, Mastóide, Margem Supraorbitária)', ref: 'Am. J. Phys. Anthropol. 136:39-50' },
    { code: 'Klales et al. 2012', name: 'Klales et al. (2012) - Escala Ordinal do Púbis e Sulco Pré-auricular', ref: 'Am. J. Phys. Anthropol. 149:104-114' }
  ],
  age: [
    { code: 'Suchey-Brooks 1990', name: 'Suchey-Brooks (1990) - Metamorfose da Sínfise Púbica (Fases I-VI)', ref: 'Skeletal Age Assessment, Wiley' },
    { code: 'Lovejoy et al. 1985', name: 'Lovejoy et al. (1985) - Superfície Auricular do Ílio', ref: 'Am. J. Phys. Anthropol. 68:15-28' },
    { code: 'Meindl & Lovejoy 1985', name: 'Meindl & Lovejoy (1985) - Obliteração das Suturas Cranianas', ref: 'Am. J. Phys. Anthropol. 68:57-66' },
    { code: 'Iscan et al. 1984', name: 'Iscan et al. (1984) - Extremidade Esternal da Quarta Costela', ref: 'J. Forensic Sci. 29:1094-1104' }
  ],
  stature: [
    { code: 'Trotter & Gleser 1952', name: 'Trotter & Gleser (1952) - Comprimento Máximo de Fêmur e Tíbia em Tábua Osteométrica', ref: 'Am. J. Phys. Anthropol. 10:463-514' },
    { code: 'Mendonça 2000', name: 'Mendonça (2000) - Regressão para Populações Brasileiras', ref: 'Rev. Bras. Med. Legal 4:12-19' }
  ],
  ancestry: [
    { code: 'Hefner 2009', name: 'Hefner (2009) - Análise de Traços Macromorfoscópicos Craniométricos', ref: 'J. Forensic Sci. 54:985-995' }
  ]
};

export const STANDARD_SKELETAL_INVENTORY_TEMPLATES = [
  // Crânio & Mandíbula
  { anatomicalCode: 'CRAN_CALV', namePt: 'Calvária Craniana (Frontal, Parietais, Occipital)', region: 'cranio', side: 'axial_unico' },
  { anatomicalCode: 'CRAN_FACE', namePt: 'Esqueleto Facial (Zigomáticos, Maxilas, Nasais)', region: 'cranio', side: 'axial_unico' },
  { anatomicalCode: 'CRAN_MAND', namePt: 'Mandíbula', region: 'cranio', side: 'axial_unico' },
  // Esqueleto Axial
  { anatomicalCode: 'AX_VERT_CERV', namePt: 'Vértebras Cervicais (C1-C7)', region: 'axial', side: 'axial_unico' },
  { anatomicalCode: 'AX_VERT_TORAC', namePt: 'Vértebras Torácicas (T1-T12)', region: 'axial', side: 'axial_unico' },
  { anatomicalCode: 'AX_VERT_LOMB', namePt: 'Vértebras Lombares (L1-L5)', region: 'axial', side: 'axial_unico' },
  { anatomicalCode: 'AX_SACRO', namePt: 'Sacro e Cóccix', region: 'axial', side: 'axial_unico' },
  { anatomicalCode: 'AX_ESTERNO', namePt: 'Esterno (Manúbrio, Corpo e Xifóide)', region: 'axial', side: 'axial_unico' },
  { anatomicalCode: 'AX_COST_DIR', namePt: 'Gradil Costal Direito (Costelas 1 a 12)', region: 'axial', side: 'direito' },
  { anatomicalCode: 'AX_COST_ESQ', namePt: 'Gradil Costal Esquerdo (Costelas 1 a 12)', region: 'axial', side: 'esquerdo' },
  // Membros Superiores
  { anatomicalCode: 'MS_CLAV_DIR', namePt: 'Clavícula Direita', region: 'membros_superiores', side: 'direito' },
  { anatomicalCode: 'MS_CLAV_ESQ', namePt: 'Clavícula Esquerda', region: 'membros_superiores', side: 'esquerdo' },
  { anatomicalCode: 'MS_ESCAP_DIR', namePt: 'Escápula Direita', region: 'membros_superiores', side: 'direito' },
  { anatomicalCode: 'MS_ESCAP_ESQ', namePt: 'Escápula Esquerda', region: 'membros_superiores', side: 'esquerdo' },
  { anatomicalCode: 'MS_UMER_DIR', namePt: 'Úmero Direito', region: 'membros_superiores', side: 'direito' },
  { anatomicalCode: 'MS_UMER_ESQ', namePt: 'Úmero Esquerdo', region: 'membros_superiores', side: 'esquerdo' },
  { anatomicalCode: 'MS_RADIO_DIR', namePt: 'Rádio Direito', region: 'membros_superiores', side: 'direito' },
  { anatomicalCode: 'MS_RADIO_ESQ', namePt: 'Rádio Esquerdo', region: 'membros_superiores', side: 'esquerdo' },
  { anatomicalCode: 'MS_ULNA_DIR', namePt: 'Ulna Direita', region: 'membros_superiores', side: 'direito' },
  { anatomicalCode: 'MS_ULNA_ESQ', namePt: 'Ulna Esquerda', region: 'membros_superiores', side: 'esquerdo' },
  { anatomicalCode: 'MS_MAO_DIR', namePt: 'Carpo, Metacarpos e Falanges da Mão Direita', region: 'membros_superiores', side: 'direito' },
  { anatomicalCode: 'MS_MAO_ESQ', namePt: 'Carpo, Metacarpos e Falanges da Mão Esquerda', region: 'membros_superiores', side: 'esquerdo' },
  // Membros Inferiores e Pelve
  { anatomicalCode: 'MI_COX_DIR', namePt: 'Osso Coxal Direito (Ílio, Ísquio, Púbis)', region: 'membros_inferiores', side: 'direito' },
  { anatomicalCode: 'MI_COX_ESQ', namePt: 'Osso Coxal Esquerdo (Ílio, Ísquio, Púbis)', region: 'membros_inferiores', side: 'esquerdo' },
  { anatomicalCode: 'MI_FEM_DIR', namePt: 'Fêmur Direito', region: 'membros_inferiores', side: 'direito' },
  { anatomicalCode: 'MI_FEM_ESQ', namePt: 'Fêmur Esquerdo', region: 'membros_inferiores', side: 'esquerdo' },
  { anatomicalCode: 'MI_PAT_DIR', namePt: 'Patela Direita', region: 'membros_inferiores', side: 'direito' },
  { anatomicalCode: 'MI_PAT_ESQ', namePt: 'Patela Esquerda', region: 'membros_inferiores', side: 'esquerdo' },
  { anatomicalCode: 'MI_TIB_DIR', namePt: 'Tíbia Direita', region: 'membros_inferiores', side: 'direito' },
  { anatomicalCode: 'MI_TIB_ESQ', namePt: 'Tíbia Esquerda', region: 'membros_inferiores', side: 'esquerdo' },
  { anatomicalCode: 'MI_FIB_DIR', namePt: 'Fíbula Direita', region: 'membros_inferiores', side: 'direito' },
  { anatomicalCode: 'MI_FIB_ESQ', namePt: 'Fíbula Esquerda', region: 'membros_inferiores', side: 'esquerdo' },
  { anatomicalCode: 'MI_PE_DIR', namePt: 'Tarso, Metatarsos e Falanges do Pé Direito', region: 'membros_inferiores', side: 'direito' },
  { anatomicalCode: 'MI_PE_ESQ', namePt: 'Tarso, Metatarsos e Falanges do Pé Esquerdo', region: 'membros_inferiores', side: 'esquerdo' }
] as const;

export function generateInitialOdontogram(): ToothRecord[] {
  const teeth: ToothRecord[] = [];
  const quadrants = [
    { q: 1, start: 11, end: 18 },
    { q: 2, start: 21, end: 28 },
    { q: 3, start: 31, end: 38 },
    { q: 4, start: 41, end: 48 }
  ];

  for (const quad of quadrants) {
    for (let t = quad.start; t <= quad.end; t++) {
      teeth.push({
        toothNumberFdi: t,
        quadrant: quad.q as 1 | 2 | 3 | 4,
        condition: 'higido',
        notes: ''
      });
    }
  }
  return teeth;
}

// 3 Coleções Sintéticas Ricas representando os momentos chave do fluxo
export const INITIAL_COLLECTIONS: OsteologicalCollection[] = [
  {
    nic: 'NIC-2026-0841',
    createdAt: '2026-06-10T08:30:00Z',
    createdByTechnician: 'Carlos Alberto Menezes',
    currentPhase: 6,
    signatures: [
      {
        phaseNumber: 1,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-06-10T11:45:00Z',
        sha256Hash: 'c6ed4abbfefcf8080e6038c9ccba40c25209fe42ae10e3b84e6d3fdcc5d51951',
        status: 'locked'
      },
      {
        phaseNumber: 2,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-06-15T16:20:00Z',
        sha256Hash: '2b9a54a9b3091d1b86c67beaeeb410439c2617a2cef03740f70bac6187c5d6b0',
        status: 'locked'
      },
      {
        phaseNumber: 3,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-06-16T09:10:00Z',
        sha256Hash: '20a918fca819028401928410294812bcba918230918209384019283019283019',
        status: 'locked'
      },
      {
        phaseNumber: 4,
        signedBy: 'usr-cur-01',
        signedByName: 'Dra. Helena Beatriz Siqueira',
        signedByRole: 'curador',
        signedAt: '2026-06-25T17:40:00Z',
        sha256Hash: 'f482019481029384019284019283019284019283019284019283019283019284',
        status: 'locked'
      },
      {
        phaseNumber: 5,
        signedBy: 'usr-cur-01',
        signedByName: 'Dra. Helena Beatriz Siqueira',
        signedByRole: 'curador',
        signedAt: '2026-07-02T15:00:00Z',
        sha256Hash: '9182049182039481029384019284019283019284019283019284019283019283',
        status: 'locked'
      },
      {
        phaseNumber: 6,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-07-05T14:30:00Z',
        sha256Hash: 'd7a1029384019284019283019284019283019284019283019284019283019284',
        status: 'locked'
      }
    ],
    custodyChain: [
      {
        id: 'cst-001',
        timestamp: '2026-06-10T08:30:00Z',
        sourceLocation: 'Exumação Administrativa Externa',
        targetLocation: 'Área de Triagem / Recepção Laboratório',
        carrierPerson: 'Oficial Funerário Reg. 4920',
        receiverPerson: 'Carlos Alberto Menezes',
        carrierSignatureHash: '8a910283019284019283019284019283',
        receiverSignatureHash: '9b019283019284019283019284019284',
        purpose: 'recebimento_externo',
        status: 'concluido',
        boxIds: ['CX-2026-0841-A', 'CX-2026-0841-B']
      },
      {
        id: 'cst-002',
        timestamp: '2026-06-16T09:00:00Z',
        sourceLocation: 'Bancada de Secagem',
        targetLocation: 'Laboratório Central - Sala B-10, Estante 04, Prateleira 02',
        carrierPerson: 'Carlos Alberto Menezes',
        receiverPerson: 'Carlos Alberto Menezes',
        carrierSignatureHash: '1c019283019284019283019284019285',
        receiverSignatureHash: '1c019283019284019283019284019285',
        purpose: 'acondicionamento_provisorio',
        status: 'concluido',
        boxIds: ['CX-2026-0841-A', 'CX-2026-0841-B']
      },
      {
        id: 'cst-003',
        timestamp: '2026-06-20T08:15:00Z',
        sourceLocation: 'Acondicionamento Provisório (Sala B-10)',
        targetLocation: 'Mesa de Curadoria e Montagem (Sala de Estudos A-02)',
        carrierPerson: 'Carlos Alberto Menezes',
        receiverPerson: 'Dra. Helena Beatriz Siqueira',
        carrierSignatureHash: '2d019283019284019283019284019286',
        receiverSignatureHash: '3e019283019284019283019284019287',
        purpose: 'curadoria_estudo',
        status: 'concluido',
        boxIds: ['CX-2026-0841-A', 'CX-2026-0841-B']
      },
      {
        id: 'cst-004',
        timestamp: '2026-07-05T14:00:00Z',
        sourceLocation: 'Sala de Estudos A-02',
        targetLocation: 'Galpão Definitivo Central - Prédio 3, Sala 01, Estante 12, Prateleira 04',
        carrierPerson: 'Carlos Alberto Menezes',
        receiverPerson: 'Dra. Helena Beatriz Siqueira',
        carrierSignatureHash: '4f019283019284019283019284019288',
        receiverSignatureHash: '5a019283019284019283019284019289',
        purpose: 'galpao_definitivo',
        status: 'concluido',
        boxIds: ['CX-2026-0841-A', 'CX-2026-0841-B']
      }
    ],
    legalOrigin: {
      cemeteryName: 'Cemitério Municipal da Saudade (Ala 4B)',
      cemeteryPlot: 'Quadra 12, Jazigo 84, Sepultura 02',
      deathDeclarationNumber: 'DO-2019-948102-SP',
      sensitiveNotes: 'Documento original de transferência cartorária anexado sob chave RSA-4096.'
    },
    phase1: {
      ...createEmptyPhase1Data(),
      equipeEnvolvidaLimpeza: { value: 'Técnico Carlos Alberto Menezes', isAiSuggested: false },
      dataAnalise: { value: '2026-06-10', isAiSuggested: false },
      horaAnalise: { value: '08h45min', isAiSuggested: false },
      foto1SacoFechado: { value: 'sim', isAiSuggested: false },
      foto2PlacaCemiterio: { value: 'nao_se_aplica', isAiSuggested: false },
      foto3RemanescentesMateriais: { value: 'sim', isAiSuggested: false },
      foto4_1RemanescentesIsolados: { value: 'sim', isAiSuggested: false },
      foto4_2MateriaisIsolados: { value: 'nao_se_aplica', isAiSuggested: false },
      tipoMaterial: { value: ['ossos', 'dentes'], isAiSuggested: false },
      estadoPreservacao: {
        value: ['seco', 'manchas'],
        isAiSuggested: true,
        transcriptSnippet: 'Sacos entregues com lacre íntegro, visualizo ossadas secas com terra, noto imediatamente dois crânios distintos confirmando no mínimo dois indivíduos.'
      },
      observacoesGeraisPreservacao: {
        value: 'Material esquelético seco, impregnado com resquício de sedimento argiloso. Sem tecidos moles remanescentes. Presença de dois crânios indicando NMI >= 2.',
        isAiSuggested: true
      },
      exameGenetico: { value: ['falange'], isAiSuggested: false },
      geneticoResponsavelColeta: { value: 'Carlos Alberto Menezes', isAiSuggested: false },
      analiseIsotopica: { value: ['dente'], isAiSuggested: false },
      isotopicaResponsavelColeta: { value: 'Carlos Alberto Menezes', isAiSuggested: false },
      corSacoLavagem: { value: 'Azul', isAiSuggested: false },
      tipoLimpeza: { value: 'agua_fria', isAiSuggested: false },
      houveDanos: { value: false, isAiSuggested: false },
      photos: [
        {
          id: 'p1-img-01',
          category: 'foto1_saco_fechado',
          author: 'Carlos Alberto Menezes',
          timestamp: '2026-06-10T08:45:00Z',
          sha256Hash: '4819a82019284019283019284019283019284019283019284019283019284019',
          url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80'
        },
        {
          id: 'p1-img-02',
          category: 'foto4_1_remanescentes_isolados',
          author: 'Carlos Alberto Menezes',
          timestamp: '2026-06-10T09:15:00Z',
          sha256Hash: '9182049182039481029384019284019283019284019283019284019283019284',
          url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80'
        }
      ],
      preliminaryBoxes: [
        {
          id: 'CX-2026-0841-A',
          boxCode: 'CX-0841-A',
          presumedIndividualLabel: 'Indivíduo Presumido A (Esqueleto maior)',
          currentLocation: 'Galpão Definitivo Central - Prédio 3, Sala 01, Estante 12, Prateleira 04',
          qrCode: 'SIGCOI://BOX/CX-2026-0841-A'
        },
        {
          id: 'CX-2026-0841-B',
          boxCode: 'CX-0841-B',
          presumedIndividualLabel: 'Indivíduo Presumido B (Crânio secundário e ossos menores)',
          currentLocation: 'Galpão Definitivo Central - Prédio 3, Sala 01, Estante 12, Prateleira 04',
          qrCode: 'SIGCOI://BOX/CX-2026-0841-B'
        }
      ]
    },
    phase2: {
      ...createEmptyPhase2Data(),
      equipeEnvolvidaLimpeza: { value: 'Técnico Carlos Alberto Menezes', isAiSuggested: false },
      dataAnalise: { value: '2026-06-11', isAiSuggested: false },
      horaAnalise: { value: '09h00min', isAiSuggested: false },
      maceracaoCiclosNecessarios: { value: 1, isAiSuggested: false },
      instrumentosUtilizados: {
        value: ['pinceis', 'esponja'],
        isAiSuggested: true,
        transcriptSnippet: 'Usando pincel de cerda macia e esponja para tirar a terra sem raspar a cortical do osso.'
      },
      houveDanosMaceracao: { value: false, isAiSuggested: false },
      formaSecagem: { value: 'estufa', isAiSuggested: false },
      boxDryingStatus: [
        { boxId: 'CX-2026-0841-A', cleaningStatus: 'seca', dryingStartedAt: '2026-06-12T10:00:00Z', dryingDurationHours: 72 },
        { boxId: 'CX-2026-0841-B', cleaningStatus: 'seca', dryingStartedAt: '2026-06-12T10:00:00Z', dryingDurationHours: 72 }
      ],
      dryingConfirmationAllBoxes: true,
      dryingConfirmedAt: '2026-06-15T16:00:00Z',
      dryingConfirmedBy: 'Carlos Alberto Menezes'
    },
    phase3: {
      boxLocations: [
        {
          boxId: 'CX-2026-0841-A',
          location: {
            facility: 'Laboratório Central',
            room: 'Sala B-10',
            rack: 'Estante 04',
            shelf: 'Prateleira 02',
            boxSlot: 'Vão 01'
          },
          placedAt: '2026-06-16T09:10:00Z',
          technicianName: 'Carlos Alberto Menezes',
          shelfQrScanned: true
        },
        {
          boxId: 'CX-2026-0841-B',
          location: {
            facility: 'Laboratório Central',
            room: 'Sala B-10',
            rack: 'Estante 04',
            shelf: 'Prateleira 02',
            boxSlot: 'Vão 02'
          },
          placedAt: '2026-06-16T09:12:00Z',
          technicianName: 'Carlos Alberto Menezes',
          shelfQrScanned: true
        }
      ],
      enteredQueueAt: '2026-06-16T09:15:00Z'
    },
    phase4: {
      curationVersionNumber: 2,
      curationVersionStatus: 'aprovada',
      curatorAuthor: 'Dra. Helena Beatriz Siqueira',
      completeAssemblyPhotoApproved: {
        photoUrl: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=1000&auto=format&fit=crop&q=80',
        capturedAt: '2026-06-25T14:30:00Z',
        approvedBy: 'Dra. Helena Beatriz Siqueira',
        approvedAt: '2026-06-25T17:35:00Z',
        sha256Hash: '39481a0291820491820394810293840192840192830192840192830192840192',
        resolution: '4032x3024'
      },
      individuals: [
        {
          id: 'IND-0841-01',
          code: 'IND-01',
          confidence: 'alta',
          justification: 'Esqueleto adulto quase completo com concordância morfológica, antimeria e robustez anatômica bilateral consistente.',
          associatedBoxId: 'CX-2026-0841-A',
          status: 'ativo',
          biologicalProfile: {
            sexEstimate: {
              value: 'masculino',
              methodCode: 'Phenice 1969',
              bibliographicRef: 'Phenice (1969) Am J Phys Anthropol 30:297-301; Walker (2008)',
              notes: 'Arco subpúbico estreito (<60°), ausência de concavidade subpúbica, crista isquiopúbica espessa. Crista nucal e glabela com pontuação 4 na escala de Walker.'
            },
            ageCategory: {
              value: 'adulto_medio',
              estimatedRangeYears: '40 - 48 anos',
              methodCode: 'Suchey-Brooks 1990',
              bibliographicRef: 'Suchey-Brooks (1990); Meindl & Lovejoy (1985)',
              notes: 'Sínfise púbica em Fase IV de Suchey-Brooks com rebordos bem delimitados e início de depressão na face sinfisária.'
            },
            statureCm: {
              estimatedValue: 174.5,
              marginErrorCm: 3.27,
              methodCode: 'Trotter & Gleser 1952',
              measuredElement: 'Fêmur direito (comprimento osteométrico máximo = 472 mm)',
              bibliographicRef: 'Trotter & Gleser (1952) Am J Phys Anthropol 10:463-514'
            },
            ancestryIndication: {
              traitsObserved: 'Abertura piriforme média com espinha nasal anterior proeminente (grau 3), perfil ortognata.',
              methodCode: 'Hefner 2009',
              bibliographicRef: 'Hefner (2009) J Forensic Sci 54:985-995'
            }
          },
          odontogram: [
            ...generateInitialOdontogram().map((t) => {
              if (t.toothNumberFdi === 16) return { ...t, condition: 'carie' as const, notes: 'Cárie oclusal extensa profunda' };
              if (t.toothNumberFdi === 36) return { ...t, condition: 'ausente_ante_mortem' as const, notes: 'Reabsorção alveolar óssea completa' };
              if (t.toothNumberFdi === 21) return { ...t, condition: 'restauracao' as const, notes: 'Amálgama distal' };
              if (t.toothNumberFdi === 48) return { ...t, condition: 'nao_erupcionado' as const, notes: 'Incluso no ramo mandibular' };
              return t;
            })
          ]
        },
        {
          id: 'IND-0841-02',
          code: 'IND-02',
          confidence: 'media',
          justification: 'Crânio e mandíbula secundários com morfologia grácil, compatíveis com indivíduo feminino distinto.',
          associatedBoxId: 'CX-2026-0841-B',
          status: 'ativo',
          biologicalProfile: {
            sexEstimate: {
              value: 'feminino',
              methodCode: 'Walker 2008',
              bibliographicRef: 'Walker (2008) Am J Phys Anthropol 136:39-50',
              notes: 'Processos mastóides gráceis (grau 2), margem supraorbitária fina e cortante (grau 1).'
            },
            ageCategory: {
              value: 'adulto_jovem',
              estimatedRangeYears: '22 - 30 anos',
              methodCode: 'Meindl & Lovejoy 1985',
              bibliographicRef: 'Meindl & Lovejoy (1985)',
              notes: 'Sutura sagital e coronal com abertura visível na tábua externa.'
            },
            statureCm: {
              estimatedValue: 158.0,
              marginErrorCm: 4.1,
              methodCode: 'Mendonça 2000',
              measuredElement: 'Úmero esquerdo fragmentar',
              bibliographicRef: 'Mendonça (2000)'
            },
            ancestryIndication: {
              traitsObserved: 'Raiz nasal achatada e fossa pré-nasal.',
              methodCode: 'Hefner 2009',
              bibliographicRef: 'Hefner (2009)'
            }
          },
          odontogram: generateInitialOdontogram()
        }
      ],
      skeletalElements: STANDARD_SKELETAL_INVENTORY_TEMPLATES.map((tpl, idx) => ({
        id: `elem-0841-${idx + 1}`,
        anatomicalCode: tpl.anatomicalCode,
        namePt: tpl.namePt,
        region: tpl.region,
        side: tpl.side,
        presence: idx === 10 ? 'ausente' : idx === 4 ? 'parcial_maior_50' : 'completo',
        preservationQuality: idx === 4 ? 'regular' : 'boa',
        associatedIndividualId: 'IND-0841-01',
        associationMethod: 'Articulação anatômica direta, antimeria e densidade óssea',
        associationConfidence: 'alta',
        associationJustification: 'Encaixe congruente das facetas articulares e correspondência dimensional.',
        observations: idx === 24 ? 'Fêmur direito com calo ósseo exuberante no terço médio da diáfise' : ''
      }))
    },
    phase5: {
      pathologies: [
        {
          id: 'path-001',
          elementId: 'elem-0841-25',
          elementName: 'Fêmur Direito (MI_FEM_DIR)',
          individualId: 'IND-0841-01',
          taxonomyCode: 'TRAUM_FRAT_ANTE_CICAT',
          taxonomyLabel: 'Trauma - Fratura consolidada ante-mortem com calo ósseo',
          isNotCataloged: false,
          anatomicLocationOnBone: 'Terço médio da diáfise femoral',
          timingEstimate: 'ante_mortem',
          description: 'Fratura oblíqua antiga da diáfise com calo ósseo remodelado extenso e desvio angular de aproximadamente 8 graus laterais. Ausência de sinais de infecção ativa.',
          classificationMethod: 'Inspeção macroscópica e tomografia computadorizada multislice',
          referencesConsulted: [
            'Ortner (2003) Identification of Pathological Conditions in Human Skeletal Remains, p. 132-140',
            'Grafo SIGCOI - Caso comparativo NIC-2025-0419'
          ],
          reviewedAndApprovedBy: 'Dra. Helena Beatriz Siqueira'
        },
        {
          id: 'path-002',
          elementId: 'elem-0841-6',
          elementName: 'Vértebras Lombares (L1-L5)',
          individualId: 'IND-0841-01',
          taxonomyCode: 'DEG_OSTEOFITO_VERTEBRAL',
          taxonomyLabel: 'Degenerativa - Espondilólise / Osteofitose vertebral difusa',
          isNotCataloged: false,
          anatomicLocationOnBone: 'Bordas anteriores e laterais dos corpos vertebrais de L3 e L4',
          timingEstimate: 'ante_mortem',
          description: 'Presença de lábios osteofíticos marginais proeminentes em bico de papagaio (grau 3 de Nathan) sem fusão óssea intervertebral completa.',
          classificationMethod: 'Critérios de Stewart (1958) e Rogers & Waldron (1995)',
          referencesConsulted: ['Waldron (2009) Palaeopathology, Cambridge University Press'],
          reviewedAndApprovedBy: 'Dra. Helena Beatriz Siqueira'
        }
      ],
      exams: [
        {
          id: 'exam-001',
          individualId: 'IND-0841-01',
          elementId: 'elem-0841-25',
          examType: 'tomografia_computadorizada_dicom',
          date: '2026-06-28',
          modalityCode: 'CT',
          fileUrl: '/mock/dicom/study-femur-0841.dcm',
          fileName: 'CT_OSTEOLOGY_FEMUR_R_0841.dcm',
          parametersExtractedByMethodPrepop: {
            kVp: 120,
            sliceThicknessMm: 0.625,
            pixelSpacing: '0.45\\0.45',
            hounsfieldMean: 1150,
            normalizedMethodName: 'Protocolo de Alta Resolução Óssea DICOM 3.0',
            isDraftUntilConfirmed: false
          },
          dicomMetadata: {
            patientPseudoId: 'ANON-SIGCOI-0841',
            studyDate: '2026-06-28',
            seriesDescription: 'Femur D Reconstruction Thin Bone Kernel',
            slicesCount: 64
          }
        }
      ],
      boneMarkings: [
        {
          elementId: 'elem-0841-25',
          elementName: 'Fêmur Direito',
          appliedMarkCode: 'SIGCOI/NIC-2026-0841/IND-01/FEM-D',
          inkType: 'tinta_nanquim_indelevel_acrilica_paraloid_b72',
          appliedByTechnician: 'Carlos Alberto Menezes',
          appliedAt: '2026-07-01T10:30:00Z',
          verified: true
        },
        {
          elementId: 'elem-0841-1',
          elementName: 'Calvária Craniana',
          appliedMarkCode: 'SIGCOI/NIC-2026-0841/IND-01/CRAN',
          inkType: 'tinta_nanquim_indelevel_acrilica_paraloid_b72',
          appliedByTechnician: 'Carlos Alberto Menezes',
          appliedAt: '2026-07-01T10:40:00Z',
          verified: true
        }
      ],
      finalPhotos: [
        {
          category: 'detalhe_patologia',
          url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
          caption: 'Macrografia com escala milimétrica do calo ósseo do fêmur direito',
          hash: '91823091820938401928401928301928'
        },
        {
          category: 'marcacao_fisica',
          url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&auto=format&fit=crop&q=80',
          caption: 'Aplicação da sigla institucional SIGCOI com verniz de proteção Paraloid B-72',
          hash: '48102938401928401928301928401928'
        }
      ],
      completenessChecklist: {
        totalApplicableItems: 34,
        validCompletedItems: 34,
        completenessPercentage: 100,
        individualBreakdowns: [
          {
            individualId: 'IND-0841-01',
            individualCode: 'IND-01',
            percentage: 100,
            pendingMandatoryItems: []
          },
          {
            individualId: 'IND-0841-02',
            individualCode: 'IND-02',
            percentage: 100,
            pendingMandatoryItems: []
          }
        ],
        isEligibleForPhase6: true
      }
    },
    phase6: {
      transferStartedAt: '2026-07-05T13:30:00Z',
      transferDispatchedByTechnician: 'Carlos Alberto Menezes',
      transferDispatchHash: '7a810293840192840192830192840192',
      warehouseAcceptedBy: 'Dra. Helena Beatriz Siqueira',
      warehouseAcceptedAt: '2026-07-05T14:30:00Z',
      warehouseCustodyTermHash: '8b910293840192840192830192840193',
      warehouseTermNotes: 'Conferidas as 2 caixas com lacres intactos e marcações legíveis. Acondicionamento definitivo efetuado.',
      finalLocations: [
        {
          boxId: 'CX-2026-0841-A',
          location: {
            facility: 'Galpão Definitivo Central',
            room: 'Prédio 3, Sala 01',
            rack: 'Estante 12',
            shelf: 'Prateleira 04',
            boxSlot: 'Box 0841-A'
          },
          shelfQrVerified: true,
          storedAt: '2026-07-05T14:35:00Z'
        },
        {
          boxId: 'CX-2026-0841-B',
          location: {
            facility: 'Galpão Definitivo Central',
            room: 'Prédio 3, Sala 01',
            rack: 'Estante 12',
            shelf: 'Prateleira 04',
            boxSlot: 'Box 0841-B'
          },
          shelfQrVerified: true,
          storedAt: '2026-07-05T14:38:00Z'
        }
      ],
      publicQrActive: true,
      publicQrActivationDate: '2026-07-05T14:40:00Z'
    }
  },
  {
    nic: 'NIC-2026-0914',
    createdAt: '2026-07-15T09:00:00Z',
    createdByTechnician: 'Carlos Alberto Menezes',
    currentPhase: 4,
    signatures: [
      {
        phaseNumber: 1,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-07-15T12:00:00Z',
        sha256Hash: '1ed3e2aa28d39f8ad358fadf59a1f8ffb6e1199224659ca2d890486abe6b7d10',
        status: 'locked'
      },
      {
        phaseNumber: 2,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-07-19T17:00:00Z',
        sha256Hash: '55a88894b84ee9f5e6c1bd451b4e106f791bff470ee182daa5f33d8a1af6548f',
        status: 'locked'
      },
      {
        phaseNumber: 3,
        signedBy: 'usr-tec-01',
        signedByName: 'Carlos Alberto Menezes',
        signedByRole: 'tecnico',
        signedAt: '2026-07-20T08:30:00Z',
        sha256Hash: '6130491820394810293840192840192830192840192830192840192830192840',
        status: 'locked'
      }
    ],
    custodyChain: [
      {
        id: 'cst-0914-1',
        timestamp: '2026-07-15T09:00:00Z',
        sourceLocation: 'Instituto de Medicina Legal - Custódia Regional',
        targetLocation: 'Área de Triagem Laboratorial',
        carrierPerson: 'Técnico de Transporte 3910',
        receiverPerson: 'Carlos Alberto Menezes',
        carrierSignatureHash: 'hash-cst-0914-1',
        receiverSignatureHash: 'hash-cst-0914-2',
        purpose: 'recebimento_externo',
        status: 'concluido',
        boxIds: ['CX-2026-0914-A']
      },
      {
        id: 'cst-0914-2',
        timestamp: '2026-07-20T08:30:00Z',
        sourceLocation: 'Bancada de Secagem',
        targetLocation: 'Laboratório Central - Sala B-10, Estante 02, Prateleira 01',
        carrierPerson: 'Carlos Alberto Menezes',
        receiverPerson: 'Carlos Alberto Menezes',
        carrierSignatureHash: 'hash-cst-0914-3',
        receiverSignatureHash: 'hash-cst-0914-3',
        purpose: 'acondicionamento_provisorio',
        status: 'concluido',
        boxIds: ['CX-2026-0914-A']
      }
    ],
    legalOrigin: {
      cemeteryName: 'Cemitério Parque das Flores',
      cemeteryPlot: 'Setor C, Jazigo 301',
      deathDeclarationNumber: 'DO-2020-554109-RJ',
      sensitiveNotes: 'Acompanha termo de doação para fins acadêmico-científicos.'
    },
    phase1: {
      ...createEmptyPhase1Data(),
      equipeEnvolvidaLimpeza: { value: 'Técnico Carlos Alberto Menezes', isAiSuggested: false },
      dataAnalise: { value: '2026-07-16', isAiSuggested: false },
      horaAnalise: { value: '08h00min', isAiSuggested: false },
      foto1SacoFechado: { value: 'sim', isAiSuggested: false },
      foto2PlacaCemiterio: { value: 'nao_se_aplica', isAiSuggested: false },
      foto3RemanescentesMateriais: { value: 'nao_se_aplica', isAiSuggested: false },
      foto4_1RemanescentesIsolados: { value: 'sim', isAiSuggested: false },
      foto4_2MateriaisIsolados: { value: 'nao_se_aplica', isAiSuggested: false },
      tipoMaterial: { value: ['ossos', 'dentes'], isAiSuggested: false },
      estadoPreservacao: { value: ['preservado_integro'], isAiSuggested: false },
      observacoesGeraisPreservacao: { value: 'Esqueleto único adulto em bom estado geral de conservação.', isAiSuggested: false },
      exameGenetico: { value: ['dente_higido'], isAiSuggested: false },
      geneticoResponsavelColeta: { value: 'Carlos Alberto Menezes', isAiSuggested: false },
      analiseIsotopica: { value: ['nao_coletado'], isAiSuggested: false },
      isotopicaResponsavelColeta: { value: 'Não aplicável', isAiSuggested: false },
      corSacoLavagem: { value: 'Vermelho', isAiSuggested: false },
      tipoLimpeza: { value: 'a_seco', isAiSuggested: false },
      houveDanos: { value: false, isAiSuggested: false },
      preliminaryBoxes: [
        {
          id: 'CX-2026-0914-A',
          boxCode: 'CX-0914-A',
          presumedIndividualLabel: 'Indivíduo Único A',
          currentLocation: 'Laboratório Central - Sala B-10, Estante 02, Prateleira 01',
          qrCode: 'SIGCOI://BOX/CX-2026-0914-A'
        }
      ]
    },
    phase2: {
      ...createEmptyPhase2Data(),
      equipeEnvolvidaLimpeza: { value: 'Técnico Carlos Alberto Menezes', isAiSuggested: false },
      dataAnalise: { value: '2026-07-16', isAiSuggested: false },
      horaAnalise: { value: '08h30min', isAiSuggested: false },
      maceracaoCiclosNecessarios: { value: 1, isAiSuggested: false },
      instrumentosUtilizados: { value: ['esponja', 'escova_dentes'], isAiSuggested: false },
      houveDanosMaceracao: { value: false, isAiSuggested: false },
      formaSecagem: { value: 'estufa', isAiSuggested: false },
      boxDryingStatus: [
        { boxId: 'CX-2026-0914-A', cleaningStatus: 'seca', dryingStartedAt: '2026-07-16T14:00:00Z', dryingDurationHours: 68 }
      ],
      dryingConfirmationAllBoxes: true,
      dryingConfirmedAt: '2026-07-19T16:30:00Z',
      dryingConfirmedBy: 'Carlos Alberto Menezes'
    },
    phase3: {
      boxLocations: [
        {
          boxId: 'CX-2026-0914-A',
          location: {
            facility: 'Laboratório Central',
            room: 'Sala B-10',
            rack: 'Estante 02',
            shelf: 'Prateleira 01',
            boxSlot: 'Box 01'
          },
          placedAt: '2026-07-20T08:30:00Z',
          technicianName: 'Carlos Alberto Menezes',
          shelfQrScanned: true
        }
      ],
      enteredQueueAt: '2026-07-20T08:35:00Z'
    },
    phase4: {
      curationVersionNumber: 1,
      curationVersionStatus: 'rascunho',
      curatorAuthor: 'Larissa Albuquerque Santos (Supervisão Dra. Helena)',
      individuals: [
        {
          id: 'IND-0914-01',
          code: 'IND-01',
          confidence: 'alta',
          justification: 'Esqueleto completo com simetria bilateral evidente.',
          associatedBoxId: 'CX-2026-0914-A',
          status: 'ativo',
          biologicalProfile: {
            sexEstimate: {
              value: 'feminino',
              methodCode: 'Phenice 1969',
              bibliographicRef: 'Phenice 1969',
              notes: 'Arco subpúbico aberto em U (>85 graus), sulco pré-auricular bem desenvolvido.'
            },
            ageCategory: {
              value: 'adulto_jovem',
              estimatedRangeYears: '25 - 32 anos',
              methodCode: 'Suchey-Brooks 1990',
              bibliographicRef: 'Suchey-Brooks 1990',
              notes: 'Face sinfisária com ondulações transversais preservadas (Fase II).'
            },
            statureCm: {
              estimatedValue: 162.0,
              marginErrorCm: 3.8,
              methodCode: 'Trotter & Gleser 1952',
              measuredElement: 'Fêmur esquerdo (430 mm)',
              bibliographicRef: 'Trotter & Gleser 1952'
            },
            ancestryIndication: {
              traitsObserved: 'Raiz nasal moderada, perfil reto.',
              methodCode: 'Hefner 2009',
              bibliographicRef: 'Hefner 2009'
            }
          },
          odontogram: generateInitialOdontogram()
        }
      ],
      skeletalElements: STANDARD_SKELETAL_INVENTORY_TEMPLATES.map((tpl, idx) => ({
        id: `elem-0914-${idx + 1}`,
        anatomicalCode: tpl.anatomicalCode,
        namePt: tpl.namePt,
        region: tpl.region,
        side: tpl.side,
        presence: 'completo',
        preservationQuality: 'boa',
        associatedIndividualId: 'IND-0914-01',
        associationMethod: 'Inspeção osteológica visual e antimeria',
        associationConfidence: 'alta',
        associationJustification: 'Compatibilidade anatômica total.',
        observations: ''
      }))
    },
    phase5: {
      pathologies: [],
      exams: [],
      boneMarkings: [],
      finalPhotos: [],
      completenessChecklist: {
        totalApplicableItems: 34,
        validCompletedItems: 20,
        completenessPercentage: 58.8,
        individualBreakdowns: [
          {
            individualId: 'IND-0914-01',
            individualCode: 'IND-01',
            percentage: 58.8,
            pendingMandatoryItems: ['Aprovação científica curatorial', 'Foto de montagem completa', 'Marcação física óssea']
          }
        ],
        isEligibleForPhase6: false
      }
    },
    phase6: {
      finalLocations: [],
      publicQrActive: false
    }
  },
  {
    nic: 'NIC-2026-0955',
    createdAt: '2026-09-22T10:00:00Z',
    createdByTechnician: 'Carlos Alberto Menezes',
    currentPhase: 1,
    signatures: [],
    custodyChain: [
      {
        id: 'cst-0955-1',
        timestamp: '2026-09-22T10:00:00Z',
        sourceLocation: 'Exumação Legal - Cemitério da Paz',
        targetLocation: 'Área de Recepção e Triagem Laboratorial',
        carrierPerson: 'Transportador Funerário Judiciário 102',
        receiverPerson: 'Carlos Alberto Menezes',
        carrierSignatureHash: 'hash-entry-0955-a',
        purpose: 'recebimento_externo',
        status: 'concluido',
        boxIds: ['CX-2026-0955-A', 'CX-2026-0955-B']
      }
    ],
    legalOrigin: {
      cemeteryName: 'Cemitério da Paz e Memória',
      cemeteryPlot: 'Quadra 07, Jazigo 190',
      deathDeclarationNumber: 'DO-2018-091244-DF',
      sensitiveNotes: 'Acondicionado sob sigilo nível 2.'
    },
    phase1: {
      ...createEmptyPhase1Data(),
      preliminaryBoxes: [
        {
          id: 'CX-2026-0955-A',
          boxCode: 'CX-0955-A',
          presumedIndividualLabel: 'Indivíduo A presumido',
          currentLocation: 'Bancada de Triagem e Recepção Inicial',
          qrCode: 'SIGCOI://BOX/CX-2026-0955-A'
        },
        {
          id: 'CX-2026-0955-B',
          boxCode: 'CX-0955-B',
          presumedIndividualLabel: 'Material esquelético fragmentar não dissociado',
          currentLocation: 'Bancada de Triagem e Recepção Inicial',
          qrCode: 'SIGCOI://BOX/CX-2026-0955-B'
        }
      ]
    },
    phase2: createEmptyPhase2Data(),
    phase3: {
      boxLocations: [],
      enteredQueueAt: ''
    },
    phase4: {
      curationVersionNumber: 1,
      curationVersionStatus: 'rascunho',
      curatorAuthor: '',
      individuals: [],
      skeletalElements: []
    },
    phase5: {
      pathologies: [],
      exams: [],
      boneMarkings: [],
      finalPhotos: [],
      completenessChecklist: {
        totalApplicableItems: 0,
        validCompletedItems: 0,
        completenessPercentage: 0,
        individualBreakdowns: [],
        isEligibleForPhase6: false
      }
    },
    phase6: {
      finalLocations: [],
      publicQrActive: false
    }
  }
];

export const INITIAL_RESEARCH_AUTHORIZATIONS: ResearchAuthorization[] = [
  {
    id: 'AUTH-2026-004',
    title: 'Variação Biométrica de Fêmures e Tíbias na População do Sudeste Brasileiro',
    principalInvestigator: 'Prof. Marcos Vinicius Prado',
    investigatorEmail: 'marcos.prado@universidade.edu.br',
    institution: 'Universidade Federal / Depto de Morfologia',
    cepEthicsApprovalNumber: 'Parecer Consubstanciado CEP/CONEP nº 5.891.204',
    ethicsCommitteeName: 'Comitê de Ética em Pesquisa Humana - UFMG',
    seiProcessNumber: 'SEI-08000.019481/2026-11',
    status: 'ativa',
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    scope: {
      allowedAnatomicalElements: ['Fêmur', 'Tíbia', 'Fíbula'],
      allowedCollectionsNic: ['*'],
      allowedVariables: ['perfil_biologico', 'inventario_geral', 'patologias'],
      allowedMediaTypes: ['fotos_montagem'],
      exportFormatAllowed: ['csv', 'excel', 'json']
    },
    signedByAdmin: 'Dr. Valdemar Fontes Filho',
    signedAt: '2026-01-05T10:00:00Z'
  },
  {
    id: 'AUTH-2026-009',
    title: 'Análise Paleopatológica de Lesões Traumáticas Consolidadas em Coleções Osteológicas Identificadas',
    principalInvestigator: 'Dra. Camila Nogueira Diniz',
    investigatorEmail: 'camila.diniz@fiocruz.br',
    institution: 'Fundação Oswaldo Cruz - Antropologia Biológica',
    cepEthicsApprovalNumber: 'Parecer CEP nº 6.102.492',
    ethicsCommitteeName: 'Comitê de Ética em Pesquisa Fiocruz',
    seiProcessNumber: 'SEI-08000.024910/2026-44',
    status: 'ativa',
    validFrom: '2026-03-01',
    validUntil: '2027-02-28',
    scope: {
      allowedAnatomicalElements: ['*'],
      allowedCollectionsNic: ['NIC-2026-0841'],
      allowedVariables: ['patologias', 'exames_dicom', 'perfil_biologico'],
      allowedMediaTypes: ['fotos_montagem', 'dicom'],
      exportFormatAllowed: ['csv', 'json', 'pdf']
    },
    signedByAdmin: 'Dr. Valdemar Fontes Filho',
    signedAt: '2026-03-02T14:15:00Z'
  }
];

// Fila da Fase 3 e Mapa de Estantes do Armazenamento
export const WAREHOUSE_STRUCTURE = {
  provisonal: {
    room: 'Sala B-10 (Armazenamento Provisório)',
    racks: [
      {
        rackCode: 'Estante 01',
        totalShelves: 4,
        shelves: [
          { shelfCode: 'Prateleira 01', capacity: 6, occupiedBoxes: ['CX-2025-0711-A', 'CX-2025-0711-B'] },
          { shelfCode: 'Prateleira 02', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 03', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 04', capacity: 6, occupiedBoxes: [] }
        ]
      },
      {
        rackCode: 'Estante 02',
        totalShelves: 4,
        shelves: [
          { shelfCode: 'Prateleira 01', capacity: 6, occupiedBoxes: ['CX-2026-0914-A'] },
          { shelfCode: 'Prateleira 02', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 03', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 04', capacity: 6, occupiedBoxes: [] }
        ]
      },
      {
        rackCode: 'Estante 04',
        totalShelves: 4,
        shelves: [
          { shelfCode: 'Prateleira 01', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 02', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 03', capacity: 6, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 04', capacity: 6, occupiedBoxes: [] }
        ]
      }
    ]
  },
  definitive: {
    warehouse: 'Galpão Definitivo Central',
    building: 'Prédio 3, Sala 01',
    racks: [
      {
        rackCode: 'Estante 12',
        totalShelves: 5,
        shelves: [
          { shelfCode: 'Prateleira 01', capacity: 8, occupiedBoxes: ['CX-2024-0012-A', 'CX-2024-0012-B'] },
          { shelfCode: 'Prateleira 02', capacity: 8, occupiedBoxes: ['CX-2025-0104-A'] },
          { shelfCode: 'Prateleira 03', capacity: 8, occupiedBoxes: ['CX-2025-0320-A', 'CX-2025-0320-B', 'CX-2025-0320-C'] },
          { shelfCode: 'Prateleira 04', capacity: 8, occupiedBoxes: ['CX-2026-0841-A', 'CX-2026-0841-B'] },
          { shelfCode: 'Prateleira 05', capacity: 8, occupiedBoxes: [] }
        ]
      },
      {
        rackCode: 'Estante 13',
        totalShelves: 5,
        shelves: [
          { shelfCode: 'Prateleira 01', capacity: 8, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 02', capacity: 8, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 03', capacity: 8, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 04', capacity: 8, occupiedBoxes: [] },
          { shelfCode: 'Prateleira 05', capacity: 8, occupiedBoxes: [] }
        ]
      }
    ]
  }
};

export const MOCK_COLLECTIONS = INITIAL_COLLECTIONS;
export const MOCK_RESEARCH_AUTHORIZATIONS = INITIAL_RESEARCH_AUTHORIZATIONS;
