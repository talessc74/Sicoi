---
name: _local-adr-policy-301-fotos-reais-r2
description: Fotos de Fase 1 e Fase 2 passam de placeholder (URL fixa, hash de metadado) para captura real pela câmera, guardadas no Cloudflare R2 (compatível com S3). Use antes de tocar em qualquer coisa relacionada a foto, upload de arquivo, ou integração com armazenamento externo.
apply-to: db/migrations/018_photo_storage.sql, db/storage.ts, server.ts (rota de upload de foto), db/collectionsRepo.ts (syncPhotos), src/services/photoService.ts, src/components/Phase1Recebimento.tsx, src/components/Phase2Limpeza.tsx, src/components/PopConversationalConductor.tsx, src/types/sgccco.ts
valid-from: 2026-10-02
---

# _local-adr-policy-301: Fotos reais (Fase 1 e 2) via Cloudflare R2

## Context and Problem Statement

Em Fase 1 (Recebimento & Triagem) e Fase 2 (Limpeza & Secagem), "registrar
foto" nunca tirou foto nenhuma: o botão grava sempre a mesma URL fixa de um
banco de imagens de terceiros, e o campo `sha256_hash` é calculado sobre um
texto (`url|categoria|nic|usuário`), não sobre bytes reais — um placeholder
intencional enquanto o resto do sistema (login real, assinaturas, custódia)
era construído.

Question: como substituir isso por captura e guarda de verdade, sem abrir
mão das garantias já estabelecidas (servidor como fonte de verdade, nada
forense se apaga silenciosamente), sem repetir o "big bang" do lançamento do
login real (`_local-adr-policy-202`), e escolhendo onde guardar o arquivo em
si — decisão que importa tanto pra segurança quanto pra custo, dado que este
projeto já monitora de perto os custos do plano gratuito do Render.

## Decision Outcome

**Cloudflare R2** (armazenamento de objetos compatível com S3) guarda o
arquivo da foto; a captura é feita pela câmera do dispositivo na hora
(`<input type="file" accept="image/*" capture="environment">`), nunca
escolhendo um arquivo já salvo.

Firebase Storage foi considerado e descartado: ele traria um ecossistema de
identidade/banco próprio (Firebase Auth, Firestore) só para guardar arquivo
— peso desnecessário dado que este projeto já tem seu próprio login real
(`_local-adr-policy-202`) e não precisa de outro. R2 é só um "cofre de
arquivos", encaixando no backend atual sem tocar em nada disso.

### Details

- **Schema**: `db/migrations/018_photo_storage.sql` adiciona, em
  `phase1_photos`/`phase2_photos`: `storage_key` (chave do objeto no R2),
  `mimetype`, `size_bytes`, `width`, `height` — todas nullable. A coluna
  `url` existente permanece só para os registros antigos/fictícios; nenhum
  código novo escreve nela. `sha256_hash` passa a ser calculado sobre os
  bytes reais do arquivo, no servidor — nunca aceito do cliente, mesmo
  cuidado de "servidor como fonte de verdade" já documentado em
  `_local-adr-policy-202`.
- **Upload**: rota nova e dedicada (`POST /api/collections/:nic/photos`,
  multipart via `multer`, buffer em memória — sem gravar em disco, dado o
  volume baixo estimado: ~500 conjuntos × algumas fotos cada), `requireAuth`
  (qualquer papel pode registrar foto na bancada), passando pelo CSRF normal
  (não é rota pública, diferente de login/bootstrap/setup-password). O
  servidor calcula o hash real e sobe pro R2 antes de inserir a linha —
  sempre `INSERT`, nunca substituição.
- **Isto substitui, com o tempo, o `syncPhotos` em `db/collectionsRepo.ts`**:
  hoje ele apaga e reinsere todas as fotos de um conjunto a cada vez que
  qualquer campo da coleção é salvo (`full_state`) — frágil mesmo sem upload
  real, e incompatível com fotos de verdade (o cliente teria que ecoar de
  volta `storage_key`/hash que nunca calculou). A aposentadoria de
  `syncPhotos` é o ÚLTIMO passo da sequência de PRs, só depois do caminho
  novo provado em uso real nas duas fases — nunca uma janela onde uma foto
  possa ser perdida.
- **Exibição**: nunca um bucket público nem link permanente. O servidor
  gera um link assinado e temporário (5-15 min) por requisição, via
  `@aws-sdk/s3-request-presigner` — só quem já passou pelo login consegue
  pedir o link, e ele expira rápido mesmo copiado.
- **Credenciais**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` no mesmo grupo de
  `SESSION_SECRET`/`DATABASE_URL` — falha alto no boot em produção se
  ausente, em vez de a funcionalidade quebrar silenciosamente na primeira
  tentativa de foto.
- **Dependências novas**: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
  (R2 é compatível com a API do S3 — recomendação da própria Cloudflare,
  sem SDK proprietário concorrente) e `multer`. Sem biblioteca de
  processamento de imagem (`sharp`) — largura/altura são lidas no próprio
  navegador antes do envio, evitando dependência nativa no Render.
- **Testes**: uma interface pequena (`db/storage.ts`) separa "subir
  arquivo"/"gerar link assinado" da implementação real — nos testes, uma
  versão falsa em memória é injetada; nenhum teste automatizado toca o R2
  de verdade.
- **Fotos fictícias já existentes**: sem script dedicado para caçá-las —
  desaparecem junto com a limpeza pendente das pessoas/coleções fictícias
  (já registrada em `_local-adr-policy-202`), por `CASCADE` da chave
  estrangeira (`phase1_photos.nic REFERENCES collections(nic) ON DELETE
  CASCADE`).
- **Sequência de PRs** (pequenos, cada um revertível por si só — lição
  direta do episódio de lançamento do login real): (1) schema só; (2)
  camada de armazenamento (`db/storage.ts`, dependências novas), sem rota
  ainda; (3) rota de upload nova, convivendo com o `syncPhotos` antigo; (4)
  frontend da Fase 1; (5) frontend do condutor de voz (cobre Fase 1 e 2);
  (6) seção própria de foto na Fase 2 (hoje não tem nenhuma — só herdava
  fotos fictícias pelo condutor de voz); (7) aposentar `syncPhotos`, só
  depois dos outros provados em uso real.

## References

- Arquivos: `db/migrations/018_photo_storage.sql`, `db/storage.ts` (a
  partir do PR 2), `server.ts`, `db/collectionsRepo.ts`,
  `src/services/photoService.ts` (a partir do PR 4),
  `src/components/Phase1Recebimento.tsx`,
  `src/components/PopConversationalConductor.tsx`,
  `src/components/Phase2Limpeza.tsx`
- Policy relacionada: `_local-adr-policy-202` (servidor como fonte de
  verdade, lição do episódio de lançamento sobre PRs pequenos e
  revertíveis), `_local-adr-policy-201` (nada forense se apaga
  silenciosamente — mesmo princípio aplicado aqui ao não ter rota de
  exclusão de foto nesta primeira fase)
- Pendência seguinte (fora do escopo desta policy): exclusão/redação
  reversível de uma foto tirada por erro — precisa de sua própria decisão,
  no mesmo espírito de `_local-adr-policy-201`, quando for necessário.
