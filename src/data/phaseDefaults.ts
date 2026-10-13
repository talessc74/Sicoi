// Fábrica dos formulários vazios das Fases 1 e 2, fiéis ao Formulário A.1 e ao POP-01
// §9.5-9.7. Única fonte de verdade da "forma vazia" — reutilizada por App.tsx (novo
// conjunto) e pelos dados de exemplo (mockData.ts), em vez de repetir os ~35 campos
// em cada lugar que precisa criar um Phase1Data/Phase2Data do zero.
import { Phase1Data, Phase2Data } from '../types/sgccco';

function field<T>(value: T) {
  return { value, isAiSuggested: false as const };
}

export function createEmptyPhase1Data(): Phase1Data {
  return {
    equipeEnvolvidaLimpeza: field(''),
    dataAnalise: field(''),
    horaAnalise: field(''),

    foto1SacoFechado: field(undefined as any),
    foto2PlacaCemiterio: field(undefined as any),
    foto3RemanescentesMateriais: field(undefined as any),
    foto4_1RemanescentesIsolados: field(undefined as any),
    foto4_2MateriaisIsolados: field(undefined as any),

    tipoMaterial: field([]),
    cabeloDescricao: field(''),
    protesesDescricao: field(''),
    vestesDescricao: field(''),
    pertencesDescricao: field(''),
    tecidosMolesDescricao: field(''),

    estadoPreservacao: field([]),
    estadoPreservacaoOutrosDescricao: field(''),
    observacoesGeraisPreservacao: field(''),

    exameGenetico: field([]),
    geneticoFalangeDescricao: field(''),
    geneticoDenteHigidoDescricao: field(''),
    geneticoOssosTarsaisDescricao: field(''),
    geneticoOutrosDescricao: field(''),
    geneticoObservacoesGerais: field(''),
    geneticoResponsavelColeta: field(''),

    analiseIsotopica: field([]),
    isotopicaCabeloDescricao: field(''),
    isotopicaUnhaDescricao: field(''),
    isotopicaDenteDescricao: field(''),
    isotopicaObservacoes: field(''),
    isotopicaResponsavelColeta: field(''),

    corSacoLavagem: field(''),
    tipoLimpeza: field(undefined as any),

    houveDanos: field(undefined as any),
    descricaoDanos: field(''),

    preliminaryBoxes: [],
    photos: []
  };
}

export function createEmptyPhase2Data(): Phase2Data {
  return {
    equipeEnvolvidaLimpeza: field(''),
    dataAnalise: field(''),
    horaAnalise: field(''),

    maceracaoCiclosNecessarios: field(undefined as any),
    instrumentosUtilizados: field([]),
    instrumentosOutraDescricao: field(''),

    houveDanosMaceracao: field(undefined as any),
    descricaoDanosMaceracao: field(''),

    formaSecagem: field(undefined as any),

    boxDryingStatus: [],
    dryingConfirmationAllBoxes: false,

    photos: []
  };
}
