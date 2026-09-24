/**
 * SGCCCO - Documento Normativo e Manual Técnico Oficial v3.2
 * Portaria INC/DITEC/PF - Diretrizes para Gestão e Custódia de Coleções Osteológicas Forenses
 */

export interface DocumentSection {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  sectionNumber: string;
  title: string;
  phaseApplicable?: number | 'todas';
  regulatoryReference: string;
  keywords: string[];
  content: string;
}

export const NORMATIVE_DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    id: 'sec-1-finalidade',
    chapterNumber: 1,
    chapterTitle: 'Capítulo I — Princípios Gerais e Fundamentos Jurídicos',
    sectionNumber: 'Art. 1º',
    title: 'Finalidade e Âmbito de Aplicação',
    phaseApplicable: 'todas',
    regulatoryReference: 'Portaria Conjunta INC/DITEC/PF nº 14/2026, Art. 1º',
    keywords: ['finalidade', 'âmbito', 'senasp', 'ditec', 'osteologia forense', 'diretrizes'],
    content: `O Sistema de Gerenciamento e Custódia de Coleções Osteológicas (SGCCCO) tem por finalidade estabelecer as diretrizes técnicas, científicas e operacionais para a recepção, higienização, acondicionamento provisório, curadoria bioantropológica, catalogação de patologias, guarda definitiva em galpão e disponibilização para pesquisa de remanescentes ósseos humanos sob custódia do Estado.
Todos os procedimentos devem observar o princípio da dignidade da pessoa humana, o respeito aos restos mortais e o rigor metodológico forense previsto na legislação processual penal brasileira.`
  },
  {
    id: 'sec-2-segregacao-dados',
    chapterNumber: 1,
    chapterTitle: 'Capítulo I — Princípios Gerais e Fundamentos Jurídicos',
    sectionNumber: 'Art. 2º',
    title: 'Segregação Mandatória de Dados Sensíveis e Origem Legal (§7)',
    phaseApplicable: 1,
    regulatoryReference: 'Lei Federal 13.709/2018 (LGPD) e Resolução DITEC 08/2026',
    keywords: ['segregação', 'dados sensíveis', 'cemitério', 'origem legal', 'sigilo', 'curador', 'abac'],
    content: `Os dados relativos à procedência judicial, cemiterial e de registro civil dos remanescentes ósseos — incluindo número de processo penal, comarca judiciária, cemitério de exumação, quadra, jazigo e declaração de óbito — constituem informações de acesso estritamente restrito.
É terminantemente vedada a exibição desses dados em etiquetas externas de caixas, QR Codes de leitura pública, relatórios de pesquisa acadêmica ou telas acessíveis por operadores não curadores ou pesquisadores externos.
A visualização desses registros é permitida exclusivamente aos perfis de Curador e Administrador devidamente autenticados.`
  },
  {
    id: 'sec-3-recebimento-triagem',
    chapterNumber: 2,
    chapterTitle: 'Capítulo II — Recepção, Abertura e Triagem Inicial (Fase 1)',
    sectionNumber: 'Art. 3º',
    title: 'Protocolo de Recepção, Verificação de Lacres e Atribuição do NIC',
    phaseApplicable: 1,
    regulatoryReference: 'POP-OSTEO-01 (Recebimento Forense)',
    keywords: ['recebimento', 'triagem', 'lacre', 'nic', 'número de identificação', 'sacos forenses', 'caixas preliminares'],
    content: `Ao ingressar no laboratório, cada lote de remanescentes ósseos receberá de imediato um Número de Identificação do Conjunto (NIC) no formato padronizado "NIC-AAAA-XXXX", que permanecerá imutável por todo o ciclo de custódia.
O técnico receptor deverá conferir a integridade física do invólucro externo, registrar a numeração dos lacres invioláveis e efetuar registro fotográfico em alta resolução do saco lacrado e de sua abertura com escala métrica forense.
Os ossos serão distribuídos em caixas preliminares ventiladas, recebendo etiqueta com código provisório e código QR preliminar.`
  },
  {
    id: 'sec-4-higienizacao-secagem',
    chapterNumber: 3,
    chapterTitle: 'Capítulo III — Higienização e Controle de Secagem (Fase 2)',
    sectionNumber: 'Art. 4º',
    title: 'Protocolo Operacional Padrão de Lavagem e Secagem Controlada',
    phaseApplicable: 2,
    regulatoryReference: 'POP-OSTEO-02 (Lavagem Mecânica e Secagem Laboratorial)',
    keywords: ['higienização', 'lavagem mecânica', 'trincha', 'secagem', 'umidade', '48 horas', '72 horas', 'temperatura'],
    content: `A limpeza dos elementos ósseos deve priorizar a preservação das superfícies corticais e bordas de eventuais lesões traumáticas ou patológicas.
É permitida a lavagem mecânica com água destilada ou filtrada em temperatura ambiente (18°C a 24°C) utilizando trinchas de cerdas macias naturais, vedado o uso de escovas de cerdas rígidas, substâncias químicas corrosivas ou alvejantes clorados.
Em peças com severa fragilidade tafonômica, deve ser adotado pincelamento a seco.
Após a higienização, as caixas devem permanecer em ambiente com circulação forçada de ar por período mínimo de 48 a 72 horas.
A transição para a Fase 3 exige atestado formal de secura completa pelo técnico responsável.`
  },
  {
    id: 'sec-5-acondicionamento-provisorio',
    chapterNumber: 4,
    chapterTitle: 'Capítulo IV — Acondicionamento Provisório e Fila de Curadoria (Fase 3)',
    sectionNumber: 'Art. 5º',
    title: 'Endereçamento Físico em Estantes de Laboratório e Gestão da Fila',
    phaseApplicable: 3,
    regulatoryReference: 'POP-OSTEO-03 (Armazenamento Transitório)',
    keywords: ['acondicionamento provisório', 'estante de laboratório', 'endereçamento', 'sala b-10', 'leitura qr', 'fila de curadoria'],
    content: `As caixas contendo material limpo e seco serão alocadas na Sala de Armazenamento Provisório do Laboratório Central, em estantes identificadas por prateleira e vão.
O operador deverá obrigatoriamente escanear o QR Code afixado na prateleira para confirmar a localização física no sistema.
O sistema registrará o conjunto na Fila de Curadoria Antropológica segundo critérios objetivos de antiguidade de entrada, urgência pericial ou relevância de investigação criminal.`
  },
  {
    id: 'sec-6-curadoria-mni-perfil',
    chapterNumber: 5,
    chapterTitle: 'Capítulo V — Curadoria Científica, Pareamento e Perfil Biológico (Fase 4)',
    sectionNumber: 'Art. 6º',
    title: 'Determinação do Número Mínimo de Indivíduos (MNI) e Métodos Diagnósticos',
    phaseApplicable: 4,
    regulatoryReference: 'Protocolo Científico DITEC de Antropologia Forense v3.2',
    keywords: ['mni', 'número mínimo de indivíduos', 'curadoria', 'pareamento ósseo', 'duplicação', 'dimorfismo', 'phenice', 'suchey-brooks'],
    content: `A curadoria científica será realizada exclusivamente por Curador Antropólogo ou perito oficial habilitado.
O diagnóstico de MNI deve fundamentar-se em elementos anatômicos inequívocos, tais como: duplicação de estruturas homólogas (ex: dois terceiros molares inferiores esquerdos, duas patelas direitas), incompatibilidade biológica de desenvolvimento e maturação etária, ou acentuada discrepância métrica/morfológica de robustez.
Para cada indivíduo segregado (IND-01, IND-02), o curador aplicará métodos consolidados na literatura internacional:
1. Estimativa de Sexo: Phenice (1969) para morfologia da bacia e Walker (2008) para caracteres craniométricos;
2. Estimativa de Idade: Suchey-Brooks (1990) na sínfise púbica e Lovejoy (1985) na superfície auricular do ílio;
3. Estimativa de Estatura: Trotter & Gleser (1952) para ossos longos (fêmur e tíbia) com indicação expressa da margem de erro;
4. Afinidade Populacional: Hefner (2009) para análise morfológica de caracteres macromorfoscópicos;
5. Odontograma Forense: Notação dentária FDI (quadrantes 1 a 4) com status hígido, cárie, perda ante/post mortem e tratamentos restauradores.`
  },
  {
    id: 'sec-7-patologias-dicom-marcacao',
    chapterNumber: 6,
    chapterTitle: 'Capítulo VI — Patologias, Exames Complementares e Marcação Óssea (Fase 5)',
    sectionNumber: 'Art. 7º',
    title: 'Catálogo de Lesões, Integração DICOM e Marcação Museológica Indelével',
    phaseApplicable: 5,
    regulatoryReference: 'POP-OSTEO-05 (Marcação e Exames)',
    keywords: ['patologias', 'trauma ante-mortem', 'trauma peri-mortem', 'dicom', 'tomografia', 'nanquim', 'paraloid b-72', 'checklist'],
    content: `O registro de lesões patológicas, anomalias de desenvolvimento e traumatismos obedecerá à taxonomia controlada oficial da DITEC.
Caso seja identificada condição não catalogada, o curador poderá inseri-la mediante justificativa técnica formal.
Em casos de exames complementares de Tomografia Computadorizada (TC) ou Radiografia Digital, as imagens no formato DICOM devem ser acopladas ao registro com extração automática dos parâmetros radiológicos (kVp, espessura de corte milimétrica e unidades Hounsfield médias).
Marcação Física: Cada osso relevante deve receber a inscrição indelével do código SGCCCO (ex: "SGCCCO/NIC-2026-0841/IND-01/FEM-D") com tinta nanquim preta aplicada sobre camada base protetora de resina acrílica Paraloid B-72 a 20%, garantindo reversibilidade química e perenidade mecânica.
A finalização da Fase 5 exige a conclusão de 100% dos itens do Checklist Determinístico e a dupla assinatura digital (Curador Científico + Técnico de Embalagem).`
  },
  {
    id: 'sec-8-galpao-definitivo-custodia',
    chapterNumber: 7,
    chapterTitle: 'Capítulo VII — Armazenamento Definitivo no Galpão e QR Code (Fase 6)',
    sectionNumber: 'Art. 8º',
    title: 'Termo Duplo de Transferência de Custódia e Ativação do QR Code Público',
    phaseApplicable: 6,
    regulatoryReference: 'POP-OSTEO-06 (Custódia em Galpão Central)',
    keywords: ['galpão definitivo', 'termo duplo', 'aceite', 'transferência de custódia', 'qr code público', 'estante g-12', 'hash'],
    content: `O transporte do material curado para o Galpão Central de Custódia DITEC requer a emissão de Termo de Despacho com assinatura eletrônica do técnico transportador.
Na chegada ao Galpão, o operador do acervo realizará conferência física de todas as caixas seladas e efetuará a assinatura de Aceite de Custódia, alocando os recipientes em estantes definitivas de aço reforçado.
Somente após a validação mútua das assinaturas (geração de hash criptográfico SHA-256), a etiqueta com QR Code externo passa a ter status "Ativo", permitindo consultas operacionais autorizadas através de dispositivos móveis institucionais.
Por razões de integridade e segurança física, nenhuma decisão automatizada por modelo de inteligência artificial é empregada nesta fase.`
  },
  {
    id: 'sec-9-pesquisa-abac-emprestimos',
    chapterNumber: 8,
    chapterTitle: 'Capítulo VIII — Consulta, Acesso Científico ABAC e Empréstimos (Fase 7)',
    sectionNumber: 'Art. 9º',
    title: 'Controle de Acesso Baseado em Atributos (ABAC) e Termos de Empréstimo',
    phaseApplicable: 7,
    regulatoryReference: 'Resolução DITEC 12/2026 e Normas CONEP / Comitê de Ética',
    keywords: ['abac', 'pesquisa', 'comitê de ética', 'cep', 'autorização', 'empréstimo', 'exportação reprodutível', 'hash sha-256'],
    content: `O acesso aos dados do acervo por pesquisadores vinculados a universidades e centros científicos submete-se ao modelo de Controle de Acesso Baseado em Atributos (ABAC).
O pesquisador deve apresentar parecer de aprovação emitido por Comitê de Ética em Pesquisa (CEP/CONEP) e processo SEI institucional.
O Administrador do SGCCCO delimitará o escopo da autorização, vinculando os NICs específicos e as variáveis anatômicas autorizadas.
Qualquer exportação de dados analíticos gerará um cabeçalho de reprodutibilidade científica contendo versão do banco de dados, data/hora ISO 8601, parâmetros do filtro e hash SHA-256 dos dados exportados, garantindo a rastreabilidade em publicações científicas.
Saídas temporárias de peças para análises externas destrutivas (ex: datação radiocarbônica, isótopos estáveis ou DNA antigo) exigem termo formal de empréstimo com prazo determinado de retorno e vistoria prévia e posterior.`
  },
  {
    id: 'sec-10-trilha-criptografia-sha256',
    chapterNumber: 9,
    chapterTitle: 'Capítulo IX — Trilha de Auditoria, Criptografia e Bloqueio Sequencial',
    sectionNumber: 'Art. 10',
    title: 'Imutabilidade por Fase e Procedimento Excepcional de Reabertura',
    phaseApplicable: 'todas',
    regulatoryReference: 'Manual de Segurança da Informação INC/DITEC/PF / ICP-Brasil',
    keywords: ['criptografia', 'sha-256', 'assinatura digital', 'imutabilidade', 'bloqueio sequencial', 'reabertura justificada', 'auditoria'],
    content: `Cada fase do fluxo de trabalho é estritamente sequencial. A transição para a fase N+1 depende incondicionalmente da validação e bloqueio criptográfico da fase N.
A assinatura da fase consolida o payload canônico dos dados em um hash criptográfico SHA-256 registrado na trilha de auditoria indelével.
Caso seja detectada necessidade científica superveniente de retificação (ex: nova evidência morfológica durante curadoria que altera estimativa prévia), o sistema permite reabertura exclusivamente pelo perfil de Curador ou Administrador.
A reabertura exige o preenchimento de justificativa técnica pormenorizada, sendo registrada na trilha de custódia com identificador, horário e histórico da versão anterior.`
  }
];
