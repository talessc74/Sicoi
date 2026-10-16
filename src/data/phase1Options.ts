// Opções do Formulário A.1 (Fase 1) e as caixas de descrição obrigatórias de
// cada uma — compartilhadas entre a tela da Fase 1 e a lista de pendências do
// conjunto (utils/collectionPendencies.ts), para as duas usarem o mesmo critério.
import type {
  FieldWithAiSuggestion,
  MaterialType,
  PreservationCharacteristic,
  GeneticSampleElement,
  IsotopicSampleMaterial,
  Phase1Data
} from '../types/sgccco';

export const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: 'ossos', label: 'Ossos' },
  { value: 'dentes', label: 'Dentes' },
  { value: 'cabelo', label: 'Cabelo (solto ou aderido)' },
  { value: 'unha', label: 'Unha' },
  { value: 'proteses', label: 'Próteses' },
  { value: 'vestes', label: 'Vestes' },
  { value: 'pertences', label: 'Pertences' },
  { value: 'tecidos_moles', label: 'Tecidos moles e/ou mumificados' }
];

export const PRESERVATION_OPTIONS: { value: PreservationCharacteristic; label: string }[] = [
  { value: 'preservado_integro', label: 'Preservado/Íntegro' },
  { value: 'degradado', label: 'Degradado' },
  { value: 'fragmentacao', label: 'Fragmentação' },
  { value: 'friavel', label: 'Friável' },
  { value: 'erosao', label: 'Erosão' },
  { value: 'umido', label: 'Úmido' },
  { value: 'seco', label: 'Seco' },
  { value: 'fungo_visivel', label: 'Fungo visível' },
  { value: 'manchas', label: 'Manchas' },
  { value: 'perda_cortical', label: 'Perda de cortical' },
  { value: 'carbonizacao', label: 'Carbonização' },
  { value: 'insetos_pupas', label: 'Insetos/Pupas' },
  { value: 'mumificado', label: 'Mumificado' },
  { value: 'adipocera', label: 'Adipocera' },
  { value: 'outros', label: 'Outros' }
];

export const GENETIC_OPTIONS: { value: GeneticSampleElement; label: string }[] = [
  { value: 'falange', label: 'Falange' },
  { value: 'ossos_tarsais', label: 'Ossos tarsais' },
  { value: 'dente_higido', label: 'Dente hígido' },
  { value: 'primeira_costela', label: '1ª costela' },
  { value: 'patela', label: 'Patela' },
  { value: 'outros', label: 'Outros' },
  { value: 'nao_coletado', label: 'Não coletado' }
];

export const ISOTOPIC_OPTIONS: { value: IsotopicSampleMaterial; label: string }[] = [
  { value: 'cabelo', label: 'Cabelo' },
  { value: 'unha', label: 'Unha' },
  { value: 'dente', label: 'Dente' },
  { value: 'nao_coletado', label: 'Não coletado' }
];

// Campos de texto do Phase1Data (descrições condicionais).
export type Phase1DescriptionKey = {
  [K in keyof Phase1Data]-?: NonNullable<Phase1Data[K]> extends FieldWithAiSuggestion<string> ? K : never;
}[keyof Phase1Data];

// Opções que, quando marcadas, abrem uma caixa de descrição própria e obrigatória.
export const MATERIAL_DESCRIPTION_FIELDS: Partial<Record<MaterialType, Phase1DescriptionKey>> = {
  cabelo: 'cabeloDescricao',
  proteses: 'protesesDescricao',
  vestes: 'vestesDescricao',
  pertences: 'pertencesDescricao',
  tecidos_moles: 'tecidosMolesDescricao'
};

export const PRESERVATION_DESCRIPTION_FIELDS: Partial<Record<PreservationCharacteristic, Phase1DescriptionKey>> = {
  outros: 'estadoPreservacaoOutrosDescricao'
};

export const GENETIC_DESCRIPTION_FIELDS: Partial<Record<GeneticSampleElement, Phase1DescriptionKey>> = {
  falange: 'geneticoFalangeDescricao',
  ossos_tarsais: 'geneticoOssosTarsaisDescricao',
  dente_higido: 'geneticoDenteHigidoDescricao',
  primeira_costela: 'geneticoPrimeiraCostelaDescricao',
  patela: 'geneticoPatelaDescricao',
  outros: 'geneticoOutrosDescricao'
};

export const ISOTOPIC_DESCRIPTION_FIELDS: Partial<Record<IsotopicSampleMaterial, Phase1DescriptionKey>> = {
  cabelo: 'isotopicaCabeloDescricao',
  unha: 'isotopicaUnhaDescricao',
  dente: 'isotopicaDenteDescricao'
};
