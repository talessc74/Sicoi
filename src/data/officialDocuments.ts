/**
 * Documentos oficiais da COI-INC (originais, sem alteração) mostrados no topo da
 * aba Documentos. Os arquivos ficam em docs/normativos/ — fora da pasta pública —
 * e só são entregues pela rota GET /api/documentos/:id, que exige login
 * (_local-adr-policy-203). Para incluir um documento novo (POPs, formulários A.1
 * e A.2): coloque o PDF em docs/normativos/, registre-o no README da pasta e
 * acrescente uma entrada aqui.
 */
export interface OfficialDocument {
  id: string;
  title: string;
  description: string;
  kind: 'Portaria' | 'POP' | 'Formulário';
  fileName: string; // dentro de docs/normativos/
}

// Preenchida com os 6 documentos reais recebidos do Tales (out/2026) — hash
// SHA-256 de cada arquivo conferido em docs/normativos/README.md.
export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  {
    id: 'portaria-1415-2024',
    title: 'Portaria DITEC/PF nº 1415/2024',
    description:
      'Institui a Coleção Osteológica Identificada do INC (COI-INC) e define finalidade, curadoria e regras de acesso. Inclui os Anexos 1 a 3 (termo de supervisão, formulário de acesso e termo de responsabilidade).',
    kind: 'Portaria',
    fileName: 'portaria-ditec-pf-1415-2024-coi-inc.pdf'
  },
  {
    id: 'pop-01',
    title: 'POP-01 — Análise Preliminar, Preparação, Limpeza, Maceração, Secagem e Armazenamento',
    description:
      'Procedimento padronizado de exame inicial, preparação, coleta prévia de amostras biológicas, maceração, limpeza, secagem e acondicionamento dos remanescentes ósseos da COI-INC (Fases 1 a 3).',
    kind: 'POP',
    fileName: 'pop01-analise-preliminar-preparacao-limpeza-maceracao-secagem-armazenamento.docx'
  },
  {
    id: 'pop-02',
    title: 'POP-02 — Catalogação dos Remanescentes Ósseos',
    description:
      'Montagem anatômica, marcação óssea, inventário osteológico/odontológico, patologias/lesões/alterações ósseas e acondicionamento em caixas ossuárias individualizadas (Fases 4 e 5).',
    kind: 'POP',
    fileName: 'pop02-catalogacao.docx'
  },
  {
    id: 'pop-03',
    title: 'POP-03 — Registro Fotográfico dos Remanescentes Ósseos',
    description:
      'Orienta o registro fotográfico dos remanescentes ósseos destinados à curadoria da COI-INC — base do checklist fotográfico usado em várias fases.',
    kind: 'POP',
    fileName: 'pop03-registro-fotografico.docx'
  },
  {
    id: 'formulario-a1',
    title: 'Formulário A.1 — Análise Preliminar e Limpeza dos Remanescentes Ósseos',
    description:
      'Formulário real (Microsoft Forms) por trás dos campos da Fase 1 no sistema: checklist fotográfico, tipo de material, estado de preservação, coleta de amostra biológica, limpeza e danos.',
    kind: 'Formulário',
    fileName: 'formulario-a1-analise-preliminar-limpeza.pdf'
  },
  {
    id: 'formulario-a2',
    title: 'Formulário A.2 — Maceração e Secagem dos Remanescentes Ósseos',
    description:
      'Formulário real (Microsoft Forms) por trás dos campos da Fase 2 no sistema: ciclos e instrumentos de maceração, danos e forma de secagem.',
    kind: 'Formulário',
    fileName: 'formulario-a2-maceracao-secagem.pdf'
  }
];

export const officialDocumentUrl = (doc: OfficialDocument) => `/api/documentos/${doc.id}`;
