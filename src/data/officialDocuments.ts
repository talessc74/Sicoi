/**
 * SIGCOI - Documentos Oficiais da COI-INC (arquivos reais, não resumos)
 *
 * Diferente de `normativeDocument.ts` (texto parafraseado, pesquisável, pra
 * consulta rápida), estas são cópias reais dos documentos originais — a
 * Portaria e os POPs/Formulários que a equipe nos enviou — servidas como
 * estáticas em /documentos-oficiais (ver docs/normativos/README.md pra
 * proveniência e hash SHA-256 de cada arquivo).
 */

export type OfficialDocumentType = 'portaria' | 'pop' | 'formulario';

export interface OfficialDocument {
  id: string;
  type: OfficialDocumentType;
  title: string;
  description: string;
  phaseApplicable: number[] | 'todas';
  format: 'PDF' | 'DOCX';
  path: string;
  sha256: string;
  receivedAt: string; // YYYY-MM-DD
}

export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  {
    id: 'portaria-1415-2024',
    type: 'portaria',
    title: 'Portaria DITEC/PF nº 1415/2024',
    description: 'Institui a Coleção Osteológica Identificada do Instituto Nacional de Criminalística (COI-INC). Inclui os Anexos 1 a 3 (termo de supervisão, formulário de acesso e termo de responsabilidade).',
    phaseApplicable: 'todas',
    format: 'PDF',
    path: '/documentos-oficiais/portaria-ditec-pf-1415-2024-coi-inc.pdf',
    sha256: 'ee9a06456f5448b3598d51528bfb8ebaf07220f84af2992c10033a073e88b9cd',
    receivedAt: '2026-09-25',
  },
  {
    id: 'pop-01',
    type: 'pop',
    title: 'POP-01 — Análise Preliminar, Preparação, Limpeza, Maceração, Secagem e Armazenamento',
    description: 'Procedimento padronizado de exame inicial, preparação, coleta prévia de amostras biológicas, maceração, limpeza, secagem e acondicionamento dos remanescentes ósseos da COI-INC.',
    phaseApplicable: [1, 2, 3],
    format: 'DOCX',
    path: '/documentos-oficiais/pop01-analise-preliminar-preparacao-limpeza-maceracao-secagem-armazenamento.docx',
    sha256: '6bb1ab3319d7a636a193c4a7b3a29a586d79f847e1916f68068010ba719c6305',
    receivedAt: '2026-10-16',
  },
  {
    id: 'pop-02',
    type: 'pop',
    title: 'POP-02 — Catalogação dos Remanescentes Ósseos',
    description: 'Montagem anatômica, marcação óssea, inventário osteológico/odontológico, patologias/lesões/alterações ósseas e acondicionamento em caixas ossuárias individualizadas.',
    phaseApplicable: [4, 5],
    format: 'DOCX',
    path: '/documentos-oficiais/pop02-catalogacao.docx',
    sha256: 'f5c309b95e9e0f324b9a8b774e54155f50f5936eae015271903bdb096390d889',
    receivedAt: '2026-10-16',
  },
  {
    id: 'pop-03',
    type: 'pop',
    title: 'POP-03 — Registro Fotográfico dos Remanescentes Ósseos',
    description: 'Orienta o registro fotográfico dos remanescentes ósseos destinados à curadoria da COI-INC — base do checklist fotográfico usado em várias fases.',
    phaseApplicable: 'todas',
    format: 'DOCX',
    path: '/documentos-oficiais/pop03-registro-fotografico.docx',
    sha256: 'a1a8b97875ece76b41790d9954fca73e237ce7fa2b39a24871e5f1bbc1623eac',
    receivedAt: '2026-10-16',
  },
  {
    id: 'formulario-a1',
    type: 'formulario',
    title: 'Formulário A.1 — Análise Preliminar e Limpeza dos Remanescentes Ósseos',
    description: 'Formulário real (Microsoft Forms) por trás dos campos da Fase 1 no sistema: checklist fotográfico, tipo de material, estado de preservação, coleta de amostra biológica, limpeza e danos.',
    phaseApplicable: [1],
    format: 'PDF',
    path: '/documentos-oficiais/formulario-a1-analise-preliminar-limpeza.pdf',
    sha256: '5b93e9b34194fc00a2da8d3d42cdc21af06ea142aa7f89d246d581170b068f79',
    receivedAt: '2026-10-16',
  },
  {
    id: 'formulario-a2',
    type: 'formulario',
    title: 'Formulário A.2 — Maceração e Secagem dos Remanescentes Ósseos',
    description: 'Formulário real (Microsoft Forms) por trás dos campos da Fase 2 no sistema: ciclos e instrumentos de maceração, danos e forma de secagem.',
    phaseApplicable: [2],
    format: 'PDF',
    path: '/documentos-oficiais/formulario-a2-maceracao-secagem.pdf',
    sha256: '3f553535e9aa650049d06b9a8df446e12e34e805e42c9521aa36196f139caf89',
    receivedAt: '2026-10-16',
  },
];
