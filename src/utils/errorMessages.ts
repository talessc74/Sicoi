/**
 * Tradutor de erros (§ pedido do Tales, out/2026): quem usa o SIGCOI no dia a
 * dia não é técnico e não entende frases como "hash não confere" ou
 * "HistoryViolationError". Todo erro que o servidor sabe identificar manda
 * um `code` estável (além da frase técnica, que continua existindo pra quem
 * precisa diagnosticar) — este arquivo é o dicionário único que traduz esse
 * código pra uma frase clara, em português, dizendo o que aconteceu e (onde
 * fizer sentido) o que fazer a respeito.
 *
 * Código desconhecido ou ausente (erro de rede, exceção não prevista) nunca
 * aparece cru pra quem usa — cai no fallback genérico abaixo, e a frase
 * técnica original continua disponível em "Ver detalhes técnicos" na tela.
 */

export type ErrorCode =
  // Autenticação e sessão
  | 'AUTH_CAMPOS_OBRIGATORIOS'
  | 'AUTH_SENHA_CURTA'
  | 'AUTH_CREDENCIAIS_INVALIDAS'
  | 'AUTH_MUITAS_TENTATIVAS'
  | 'AUTH_SESSAO_EXPIRADA'
  | 'AUTH_CSRF_INVALIDO'
  | 'AUTH_PAPEL_INSUFICIENTE'
  | 'AUTH_LINK_INVALIDO'
  | 'AUTH_SENHA_ATUAL_INCORRETA'
  | 'AUTH_CODIGO_ATIVACAO_INVALIDO'
  | 'AUTH_ADMIN_PENDENTE_NAO_ENCONTRADO'
  | 'AUTH_BOOTSTRAP_JA_FEITO'
  | 'AUTH_ERRO_INTERNO'
  // Assinatura e histórico protegido
  | 'HIST_HASH_INVALIDO'
  | 'HIST_ASSINATURA_NAO_REMOVIVEL'
  | 'HIST_ASSINATURA_DEVE_CHEGAR_TRAVADA'
  | 'HIST_ASSINANTE_IMUTAVEL'
  | 'HIST_ASSINATURA_SUBSTITUIDA_IMUTAVEL'
  | 'HIST_JUSTIFICATIVA_REABERTURA_IMUTAVEL'
  | 'HIST_FASE_TRAVADA'
  | 'HIST_CUSTODIA_IMUTAVEL'
  // Conjuntos (coleções)
  | 'CONJUNTO_NAO_ENCONTRADO'
  | 'CONJUNTO_EXCLUIDO'
  | 'CONJUNTO_ERRO_INTERNO'
  // Pessoas e administração
  | 'PESSOA_CAMPOS_OBRIGATORIOS'
  | 'PESSOA_EMAIL_INVALIDO'
  | 'PESSOA_PAPEL_INVALIDO'
  | 'PESSOA_EMAIL_DUPLICADO'
  | 'PESSOA_AUTOBLOQUEIO_ADMIN'
  | 'PESSOA_NAO_ENCONTRADA'
  | 'PESSOA_ERRO_INTERNO'
  | 'ADMIN_JUSTIFICATIVA_OBRIGATORIA'
  | 'ADMIN_CAIXA_NAO_ENCONTRADA'
  | 'ADMIN_CAIXA_JA_EXCLUIDA'
  | 'ADMIN_CAIXA_NAO_EXCLUIDA'
  | 'ADMIN_ERRO_INTERNO'
  // Fotos
  | 'FOTO_ARQUIVO_AUSENTE'
  | 'FOTO_ARQUIVO_INVALIDO'
  | 'FOTO_MUITO_GRANDE'
  | 'FOTO_FASE_INVALIDA'
  | 'FOTO_CATEGORIA_OBRIGATORIA'
  | 'FOTO_NAO_ENCONTRADA'
  | 'FOTO_ERRO_INTERNO'
  // Grafo de conhecimento
  | 'GRAFO_ERRO_INTERNO'
  | 'GRAFO_NO_NAO_ENCONTRADO'
  | 'GRAFO_CAMINHO_NAO_ENCONTRADO'
  | 'GRAFO_PARAMETRO_OBRIGATORIO'
  // IA (Gemini) — chat, condutor por voz, extração de D.O., busca por semelhança
  | 'IA_CHAVE_AUSENTE'
  | 'IA_ENTRADA_VAZIA'
  | 'IA_AUDIO_AUSENTE'
  | 'IA_TEXTO_MUITO_LONGO'
  | 'IA_IMAGEM_MUITO_GRANDE'
  | 'IA_RESPOSTA_VAZIA'
  | 'IA_RESPOSTA_INVALIDA'
  | 'IA_ERRO_INTERNO'
  | 'IA_MICROFONE_NEGADO'
  | 'IA_AUDIO_NAO_DETECTADO'
  | 'IA_TRANSCRICAO_FALHOU'
  // Rede / genérico
  | 'REDE_SEM_RESPOSTA'
  | 'ERRO_DESCONHECIDO';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_CAMPOS_OBRIGATORIOS: 'Preencha e-mail e senha para entrar.',
  AUTH_SENHA_CURTA: 'A senha precisa ter pelo menos 8 caracteres.',
  AUTH_CREDENCIAIS_INVALIDAS: 'E-mail ou senha incorretos. Confira os dois e tente de novo.',
  AUTH_MUITAS_TENTATIVAS: 'Muitas tentativas erradas seguidas. Espere alguns minutos antes de tentar de novo.',
  AUTH_SESSAO_EXPIRADA: 'Sua sessão expirou. Faça login de novo para continuar.',
  AUTH_CSRF_INVALIDO: 'A página ficou tempo demais aberta sem uso. Atualize a página e tente de novo.',
  AUTH_PAPEL_INSUFICIENTE: 'Seu papel de acesso não permite fazer isso. Peça a um Administrador.',
  AUTH_LINK_INVALIDO: 'Este link para definir senha não é mais válido — pode já ter sido usado ou vencido. Peça um novo link a um Administrador.',
  AUTH_SENHA_ATUAL_INCORRETA: 'A senha atual digitada está incorreta.',
  AUTH_CODIGO_ATIVACAO_INVALIDO: 'Código de ativação incorreto.',
  AUTH_ADMIN_PENDENTE_NAO_ENCONTRADO: 'Não há nenhum Administrador esperando ativação com esse e-mail.',
  AUTH_BOOTSTRAP_JA_FEITO: 'O sistema já tem gente cadastrada — esta tela de configuração inicial só funciona uma vez.',
  AUTH_ERRO_INTERNO: 'Não foi possível entrar agora. Tente de novo em instantes.',

  HIST_HASH_INVALIDO:
    'Não foi possível confirmar esta assinatura — o conteúdo pode ter mudado entre a tela e o salvamento. Recarregue a página e assine de novo.',
  HIST_ASSINATURA_NAO_REMOVIVEL: 'Esta fase já tem uma assinatura registrada, que não pode ser apagada.',
  HIST_ASSINATURA_DEVE_CHEGAR_TRAVADA: 'Não foi possível registrar esta assinatura. Recarregue a página e tente assinar de novo.',
  HIST_ASSINANTE_IMUTAVEL: 'Quem assinou esta fase não pode ser trocado depois.',
  HIST_ASSINATURA_SUBSTITUIDA_IMUTAVEL: 'Esta fase precisa ser assinada de novo antes de continuar.',
  HIST_JUSTIFICATIVA_REABERTURA_IMUTAVEL: 'A justificativa já registrada para reabrir esta fase não pode ser alterada.',
  HIST_FASE_TRAVADA: 'Esta fase já está assinada e travada. Para mudar algo nela, é preciso reabri-la (Curador ou Administrador, com justificativa).',
  HIST_CUSTODIA_IMUTAVEL: 'Este registro de movimentação já está confirmado e não pode ser alterado.',

  CONJUNTO_NAO_ENCONTRADO: 'Não foi possível encontrar este conjunto (COI). Ele pode ter sido removido ou o número pode estar errado.',
  CONJUNTO_EXCLUIDO: 'Este conjunto está na Zona de Risco (excluído). Restaure-o em Configurações antes de continuar editando.',
  CONJUNTO_ERRO_INTERNO: 'Não foi possível salvar o conjunto agora. Tente de novo em instantes.',

  PESSOA_CAMPOS_OBRIGATORIOS: 'Preencha nome, papel, instituição e e-mail.',
  PESSOA_EMAIL_INVALIDO: 'Digite um e-mail válido.',
  PESSOA_PAPEL_INVALIDO: 'Escolha um papel válido: Técnico, Curador, Administrador, Pesquisador ou Estudante.',
  PESSOA_EMAIL_DUPLICADO: 'Já existe uma pessoa cadastrada com esse e-mail.',
  PESSOA_AUTOBLOQUEIO_ADMIN: 'Você não pode tirar o seu próprio acesso de Administrador. Peça a outro Administrador para fazer essa troca.',
  PESSOA_NAO_ENCONTRADA: 'Não foi possível encontrar esta pessoa cadastrada.',
  PESSOA_ERRO_INTERNO: 'Não foi possível salvar os dados desta pessoa agora. Tente de novo em instantes.',
  ADMIN_JUSTIFICATIVA_OBRIGATORIA: 'Escreva uma justificativa antes de confirmar esta exclusão.',
  ADMIN_CAIXA_NAO_ENCONTRADA: 'Não foi possível encontrar esta caixa no conjunto.',
  ADMIN_CAIXA_JA_EXCLUIDA: 'Esta caixa já está excluída.',
  ADMIN_CAIXA_NAO_EXCLUIDA: 'Esta caixa não está excluída — não há o que restaurar.',
  ADMIN_ERRO_INTERNO: 'Não foi possível concluir esta ação de administração agora. Tente de novo em instantes.',

  FOTO_ARQUIVO_AUSENTE: 'Nenhuma foto foi enviada. Selecione uma foto e tente de novo.',
  FOTO_ARQUIVO_INVALIDO: 'O arquivo enviado não é uma imagem. Envie uma foto em formato comum (JPG, PNG).',
  FOTO_MUITO_GRANDE: 'Esta foto é grande demais (máx. 20MB). Tente uma foto com menos resolução.',
  FOTO_FASE_INVALIDA: 'Não foi possível registrar esta foto nesta tela. Recarregue a página e tente de novo.',
  FOTO_CATEGORIA_OBRIGATORIA: 'Não foi possível identificar a que a foto se refere. Recarregue a página e tente de novo.',
  FOTO_NAO_ENCONTRADA: 'Não foi possível encontrar esta foto.',
  FOTO_ERRO_INTERNO: 'Não foi possível salvar a foto agora. Verifique sua conexão e tente de novo.',

  GRAFO_ERRO_INTERNO: 'Não foi possível carregar o grafo de conhecimento agora. Tente de novo em instantes.',
  GRAFO_NO_NAO_ENCONTRADO: 'Não foi possível encontrar este item no grafo.',
  GRAFO_CAMINHO_NAO_ENCONTRADO: 'Não foi encontrado nenhum caminho entre esses dois itens no grafo.',
  GRAFO_PARAMETRO_OBRIGATORIO: 'Preencha os campos de busca antes de continuar.',

  IA_CHAVE_AUSENTE: 'O assistente de IA não está configurado neste servidor no momento. Avise um Administrador.',
  IA_ENTRADA_VAZIA: 'Escreva ou grave algo antes de enviar.',
  IA_AUDIO_AUSENTE: 'Não foi possível captar o áudio gravado. Tente gravar de novo.',
  IA_TEXTO_MUITO_LONGO: 'O texto é longo demais. Resuma um pouco e tente de novo.',
  IA_IMAGEM_MUITO_GRANDE: 'Esta imagem é grande demais para enviar. Tente uma foto com menos resolução.',
  IA_RESPOSTA_VAZIA: 'O assistente de IA não conseguiu responder desta vez. Tente de novo.',
  IA_RESPOSTA_INVALIDA: 'O assistente de IA deu uma resposta que o sistema não conseguiu entender. Tente de novo.',
  IA_ERRO_INTERNO: 'O assistente de IA está indisponível no momento. Tente de novo em instantes.',
  IA_MICROFONE_NEGADO: 'Permissão de microfone negada ou não suportada. Conceda acesso ao microfone no navegador.',
  IA_AUDIO_NAO_DETECTADO: 'Áudio recebido, mas nenhuma fala clara foi detectada.',
  IA_TRANSCRICAO_FALHOU: 'Não foi possível transcrever o áudio gravado. Tente de novo ou escreva a mensagem.',

  REDE_SEM_RESPOSTA: 'Não foi possível falar com o servidor. Verifique sua internet e tente de novo.',
  ERRO_DESCONHECIDO: 'Ocorreu um problema inesperado. Se continuar acontecendo, mostre os detalhes técnicos abaixo a um Administrador.'
};

function isKnownErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && code in ERROR_MESSAGES;
}

/**
 * Frase clara pra mostrar na tela. `code` vem do servidor (ou de um serviço
 * do cliente, pros erros de rede); quando ausente ou desconhecido, cai no
 * fallback genérico — nunca na mensagem técnica crua.
 */
export function friendlyMessage(code: string | undefined | null): string {
  return isKnownErrorCode(code) ? ERROR_MESSAGES[code] : ERROR_MESSAGES.ERRO_DESCONHECIDO;
}

// Forma mínima guardada nos ~16 estados de erro da tela: a frase técnica
// original (pro "Ver detalhes técnicos") e o código estável (pra tradução).
export interface AppError {
  message: string;
  code?: string;
}

// `err` é o que cada service lança (um Error com `.code` anexado quando o
// servidor mandou um, ou puro erro de rede sem `.code`).
export function toAppError(err: any, fallbackMessage: string): AppError {
  return { message: err?.message || fallbackMessage, code: err?.code };
}
