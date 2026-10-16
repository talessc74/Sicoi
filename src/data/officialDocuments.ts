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

// Vazia por enquanto: a curadoria vai anexar os PDFs corretos da portaria da
// COI-INC, dos POPs e dos formulários (out/2026).
export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [];

export const officialDocumentUrl = (doc: OfficialDocument) => `/api/documentos/${doc.id}`;
