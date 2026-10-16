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

export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  {
    id: 'portaria-1415-2024',
    title: 'Portaria DITEC/PF nº 1415/2024',
    description:
      'Institui a Coleção Osteológica Identificada do INC (COI-INC) e define finalidade, curadoria e regras de acesso. Inclui os Anexos 1 a 3 (termo de supervisão, formulário de acesso e termo de responsabilidade).',
    kind: 'Portaria',
    fileName: 'portaria-ditec-pf-1415-2024-coi-inc.pdf'
  }
];

export const officialDocumentUrl = (doc: OfficialDocument) => `/api/documentos/${doc.id}`;
