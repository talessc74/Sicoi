---
name: _local-adr-policy-301-fotos-reais-postgres
description: Fotos de Fase 0, 1, 2 e 4 passam de placeholder para captura real pela câmera ou upload de galeria/arquivo, guardadas como bytes direto no Postgres já existente. Use antes de tocar em qualquer coisa relacionada a foto, upload de arquivo, ou armazenamento de dados binários.
apply-to: db/migrations/018_photo_storage.sql, db/migrations/019_photo_bytes_in_postgres.sql, db/migrations/021_foto1_foto4_1_justificativa.sql, db/migrations/022_phase4_assembly_photo.sql, server.ts (rota de upload/download de foto e foto de montagem), db/collectionsRepo.ts (syncPhotos, attachPhotoBytes, insertPhase4AssemblyPhotoMetadata), src/components/PhotoSourceModal.tsx, src/services/photoService.ts, src/components/Phase0Recebimento.tsx, src/components/Phase1Recebimento.tsx, src/components/Phase2Limpeza.tsx, src/components/Phase4Curadoria.tsx, src/components/PopConversationalConductor.tsx, src/types/sgccco.ts
valid-from: 2026-10-02
---

# _local-adr-policy-301: Fotos reais (Fases 0, 1, 2 e 4) guardadas no Postgres com escolha de câmera ou galeria

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
si — decisão que envolve não só custo e segurança, mas também **de quem é a
conta** que hospeda o arquivo.

## Decision Outcome

**O arquivo da foto é guardado direto no Postgres** (`sgcccco-db`, já
configurado desde o início do projeto) — não num serviço de armazenamento
externo. A captura continua sendo pela câmera do dispositivo na hora
(`<input type="file" accept="image/*" capture="environment">`), nunca
escolhendo um arquivo já salvo.

Duas alternativas foram avaliadas e descartadas:

- **Firebase Storage**: traria um ecossistema de identidade/banco próprio
  (Firebase Auth, Firestore) só para guardar arquivo — peso desnecessário,
  já que este projeto tem seu próprio login real (`_local-adr-policy-202`).
- **Cloudflare R2**: tecnicamente adequado (chegou a ser a primeira decisão,
  ver histórico desta policy), mas levantou uma questão de governança: o
  Tales é contribuinte do projeto, não o dono institucional — a conta do
  GitHub e a do Render já pertencem a quem é dona do projeto de fato
  (Nicole/INC-DITEC-PF), e criar a infraestrutura de armazenamento numa
  conta pessoal de um contribuinte quebraria essa consistência. A solução
  correta seria pedir pra Nicole criar a conta Cloudflare e adicionar o
  Tales como membro — mas isso significa mais uma conta, mais uma tela,
  mais uma credencial pra gerenciar, numa equipe que já está sobrecarregada
  com isso. Guardar no Postgres que já existe resolve o problema de
  propriedade por completo, sem precisar dessa conversa agora. R2 continua
  sendo uma migração possível no futuro, se o volume justificar.

### Details

- **Schema**: `db/migrations/018_photo_storage.sql` (primeira tentativa,
  pensada pro R2) adicionou `storage_key`, `mimetype`, `size_bytes`,
  `width`, `height` em `phase1_photos`/`phase2_photos` — nenhum código
  chegou a usar essas colunas. `db/migrations/019_photo_bytes_in_postgres.sql`
  corrige o rumo: remove `storage_key` (nunca usado, seguro remover) e
  adiciona `data BYTEA`, que guarda o arquivo em si. `mimetype`/
  `size_bytes`/`width`/`height` continuam fazendo sentido e são mantidas. A
  coluna `url` antiga permanece só para os registros antigos/fictícios;
  nenhum código novo escreve nela. `sha256_hash` passa a ser calculado
  sobre os bytes reais do arquivo, no servidor — nunca aceito do cliente,
  mesmo cuidado de "servidor como fonte de verdade" já documentado em
  `_local-adr-policy-202`.
- **Upload**: rota nova e dedicada (`POST /api/collections/:nic/photos`,
  multipart via `multer`, buffer em memória), `requireAuth` (qualquer papel
  pode registrar foto na bancada), passando pelo CSRF normal (não é rota
  pública). O servidor calcula o hash real sobre os bytes recebidos e
  insere a linha com `data` preenchido — sempre `INSERT`, nunca
  substituição.
- **Isto substitui, com o tempo, o `syncPhotos` em `db/collectionsRepo.ts`**:
  hoje ele apaga e reinsere todas as fotos de um conjunto a cada vez que
  qualquer campo da coleção é salvo (`full_state`) — frágil mesmo sem upload
  real, e incompatível com fotos de verdade (o cliente teria que ecoar de
  volta bytes/hash que nunca calculou). A aposentadoria de `syncPhotos` é o
  ÚLTIMO passo da sequência de PRs, só depois do caminho novo provado em uso
  real nas duas fases — nunca uma janela onde uma foto possa ser perdida.
- **Exibição**: rota de leitura dedicada (`GET
  /api/collections/:nic/photos/:photoId/file`), `requireAuth`, que lê
  `data`/`mimetype` do banco e devolve os bytes direto (`res.setHeader('Content-Type', ...)`)
  — sem gerar nenhum link separado, público ou temporário; o acesso é
  sempre mediado pela sessão de quem está pedindo, no mesmo request.
- **Volume e custo**: ~500 conjuntos × poucas fotos cada — baixa escala.
  Guardar binário no Postgres tem um custo de backup/armazenamento do banco
  maior do que num object storage dedicado, mas nesse volume é
  administrável sem problema; se crescer muito no futuro, migrar pra um
  armazenamento externo (R2 ou outro) é uma mudança isolada e revertível,
  não uma reescrita do sistema.
- **Dependências novas**: só `multer` (upload multipart). Sem
  `@aws-sdk/*` (não há mais serviço externo), sem `sharp` —
  largura/altura são lidas no próprio navegador antes do envio.
- **Testes**: a rota de upload/download é testada com um banco de teste
  real (mesmo padrão já usado em todo o projeto) — não precisa de nenhuma
  camada de abstração/fake adicional, porque não há mais serviço externo a
  mockar.
- **Fotos fictícias já existentes**: sem script dedicado para caçá-las —
  desaparecem junto com a limpeza pendente das pessoas/coleções fictícias
  (já registrada em `_local-adr-policy-202`), por `CASCADE` da chave
  estrangeira (`phase1_photos.nic REFERENCES collections(nic) ON DELETE
  CASCADE`).
- **Sequência de PRs** (pequenos, cada um revertível por si só — lição
  direta do episódio de lançamento do login real): (1) schema (concluído,
  018 + 019); (2) rota de upload e de leitura (concluído — ver
  "Round 2" abaixo), convivendo com o `syncPhotos` antigo; (3) frontend da
  Fase 1; (4) frontend do condutor de voz (cobre Fase 1 e 2); (5) seção
  própria de foto na Fase 2 (hoje não tem nenhuma — só herdava fotos
  fictícias pelo condutor de voz); (6) aposentar `syncPhotos`, só depois dos
  outros provados em uso real.

### Round 2 — rota de upload/leitura implementada (02/10/2026)

`POST /api/collections/:nic/photos` e `GET
/api/collections/:nic/photos/:photoId/file` foram implementadas exatamente
como descrito acima, com uma correção a mais que o desenho original não
tinha previsto:

- **O metadado da foto entra em `full_state` pelo próprio `saveCollection`**
  (não por uma gravação paralela) — a rota de upload carrega o conjunto
  atual, acrescenta a entrada nova em `phase{1,2}.photos` e chama
  `saveCollection` normalmente. Isso reaproveita de graça todo o histórico
  protegido já existente: uma foto não pode ser adicionada a uma fase já
  assinada e travada sem reabertura (mesma regra de qualquer outro campo),
  e a tentativa de foto vira um `HistoryViolationError` (409), não um bug
  novo. Os bytes só são gravados (`attachPhotoBytes`) depois que
  `saveCollection` confirma — se o save for recusado, não sobra nenhum byte
  órfão no banco.
- **Risco encontrado e corrigido antes de ir pra produção**: o `syncPhotos`
  existente (que roda dentro de todo `saveCollection`, inclusive o da
  própria foto nova) apagava (`DELETE FROM phase1_photos WHERE nic = $1`) e
  reinseria todas as fotos do conjunto a cada salvamento — sem nunca copiar
  `data`/`mimetype`/etc, porque `full_state` nunca carrega bytes. Sem
  ajuste, a PRIMEIRA edição de qualquer campo da Fase 1 ou 2 depois de uma
  foto real ter sido tirada apagaria os bytes dela silenciosamente (a
  entrada no histórico/metadado continuaria linda, mas o arquivo sumiria).
  Corrigido em `db/collectionsRepo.ts`: `syncPhotos` agora só apaga
  registros sem bytes (`AND data IS NULL`) e faz `ON CONFLICT (id) DO
  UPDATE` só nas colunas de metadado, nunca tocando `data`/`mimetype`/
  `size_bytes`/`width`/`height`. Verificado manualmente (upload de foto →
  edição de um campo qualquer da Fase 1 → download da foto de novo →
  bytes idênticos).
- Validado com a suíte completa (226 testes) e com um teste manual de ponta
  a ponta contra um Postgres local real: bootstrap de admin → criação de
  conjunto → upload (hash do servidor confere com o hash calculado
  localmente sobre os mesmos bytes) → download (bytes idênticos,
  `Content-Type` correto) → leitura sem sessão recusada (401) → upload sem
  token CSRF recusado (403) → edição de um campo qualquer da Fase 1 não
  apaga a foto já gravada.

### Round 3 — Escolha de câmera ou galeria e foto de montagem da Fase 4 (out/2026)

A implementação inicial previa captura exclusiva pela câmera do dispositivo. A experiência em laboratório revelou dois cenários indispensáveis que motivaram a expansão desta decisão:

1. **Escolha de fonte (Câmera ou Galeria/Arquivo)**: Em tablets e estações desktop de laboratório pericial, muitas vezes as fotos já foram capturadas por câmeras DSLR periciais dedicadas ou scanner de bancada. O modal `PhotoSourceModal.tsx` e o serviço unificado `photoService.ts` foram introduzidos em todas as fases com registro de imagem (Fases 0, 1, 2 e 4), perguntando explicitamente ao operador: "Tirar foto agora (Câmera)" ou "Escolher da galeria/arquivo".
2. **Foto de Montagem da Fase 4 (Curadoria & NMI)**: A migração `022_phase4_assembly_photo.sql` introduziu a tabela dedicada `phase4_assembly_photos` para armazenar a foto do esqueleto montado em posição anatômica. A aprovação desta foto é pré-requisito mandatório para a assinatura da Fase 4, seguindo o mesmo padrão de bytes no Postgres (`BYTEA`) e cálculo de hash SHA-256 no servidor.
3. **Fotos da Fase 0 (Identificação e DO)**: Permite anexar a imagem da Declaração de Óbito original com extração automatizada de campos via IA (Gemini), persistida com o mesmo padrão.

## References

- Arquivos: `db/migrations/018_photo_storage.sql`,
  `db/migrations/019_photo_bytes_in_postgres.sql`,
  `db/migrations/021_foto1_foto4_1_justificativa.sql`,
  `db/migrations/022_phase4_assembly_photo.sql`,
  `server.ts`,
  `db/collectionsRepo.ts` (`attachPhotoBytes`, `insertPhase4AssemblyPhotoMetadata`),
  `src/components/PhotoSourceModal.tsx`,
  `src/services/photoService.ts`,
  `src/components/Phase0Recebimento.tsx`,
  `src/components/Phase1Recebimento.tsx`,
  `src/components/Phase2Limpeza.tsx`,
  `src/components/Phase4Curadoria.tsx`,
  `src/components/PopConversationalConductor.tsx`
- Policy relacionada: `_local-adr-policy-202` (servidor como fonte de
  verdade, lição do episódio de lançamento sobre PRs pequenos e
  revertíveis), `_local-adr-policy-201` (nada forense se apaga
  silenciosamente — mesmo princípio aplicado aqui ao não ter rota de
  exclusão de foto nesta primeira fase)
- Pendência seguinte (fora do escopo desta policy): exclusão/redação
  reversível de uma foto tirada por erro — precisa de sua própria decisão,
  no mesmo espírito de `_local-adr-policy-201`, quando for necessário.
