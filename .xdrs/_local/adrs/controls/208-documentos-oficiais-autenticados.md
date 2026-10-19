---
name: _local-adr-policy-208-documentos-oficiais-autenticados
description: Os documentos oficiais da COI-INC (Portaria, POPs, Formulários) ficam só em docs/normativos/, fora da pasta pública, e só saem por GET /api/documentos/:id (requireAuth), restrito aos ids da lista em src/data/officialDocuments.ts — nunca um caminho vindo da URL. Use antes de anexar um documento oficial novo ou de mudar como ele é servido.
apply-to: docs/normativos/ (arquivo original + README.md com proveniência/hash), src/data/officialDocuments.ts, server.ts (GET /api/documentos/:id), src/components/DocumentSearchViewer.tsx
valid-from: 2026-10-17
---

# _local-adr-policy-208: Documentos oficiais da COI-INC servidos autenticados

## Context and Problem Statement

A aba Documentos só tinha texto parafraseado (`normativeDocument.ts`),
nenhum documento real anexado — nem a Portaria DITEC/PF nº 1415/2024, já
arquivada em `docs/normativos/` desde antes, mas nunca servida ao site. O
Tales enviou os arquivos reais que faltavam (POP-01, POP-02, POP-03,
Formulários A.1 e A.2). Duas implementações concorrentes chegaram nesta
mesma janela: uma copiando os arquivos pra uma pasta pública estática
(`public/documentos-oficiais/`, servida sem exigir login), outra com uma
rota autenticada. A pasta pública foi descartada — bypassava o login do
app inteiro pra quem soubesse/adivinhasse a URL direta do arquivo,
mesmo esses documentos não sendo dados pessoais de nenhum indivíduo da
coleção.

## Decision Outcome

1. **Arquivo de origem**: cada documento fica só em `docs/normativos/`
   (nunca copiado pra `public/`), com ficha de proveniência e SHA-256 no
   `README.md` da pasta.
2. **Catálogo fechado**: `src/data/officialDocuments.ts` lista
   `{ id, title, description, kind, fileName }` — só esses ids existem.
3. **Saída autenticada**: `GET /api/documentos/:id` (`requireAuth`) busca
   o `fileName` cadastrado pro `id` pedido e serve o arquivo de
   `docs/normativos/` — nunca um caminho vindo da URL. `Content-Type`/
   `Content-Disposition` variam por extensão: PDF abre inline, DOCX
   (POPs recebidos em Word, sem conversão — "arquivo original, sem
   alteração") baixa, sem viewer nativo no navegador.
4. **Tela**: `DocumentSearchViewer.tsx` lista os documentos oficiais no
   topo da aba, acima do texto parafraseado, com link "Abrir PDF"/"Baixar
   DOCX" conforme o tipo.

### Details

- Mesmo princípio de policy-203 (leitura de conjuntos exige sessão) e
  policy-207 (dados restritos só saem pra quem pode ver): nenhum arquivo
  sai sem login, mesmo não sendo dado sensível de um indivíduo específico.
- Cobertura: `src/components/__tests__/DocumentSearchViewer.test.tsx`.
