import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import crypto from 'crypto';
import session from 'express-session';
import pgSessionFactory from 'connect-pg-simple';
import { GoogleGenAI } from '@google/genai';
import { getPool } from './db/pool';
import { runMigrations } from './db/migrate';
import { listCollections, getCollection, createCollection, saveCollection, listChangeLog, verifyChangeLogChain, Actor } from './db/collectionsRepo';
import { HistoryViolationError } from './db/historyGuard';
import {
  listAdminActions,
  listDeletedCollections,
  softDeleteCollection,
  restoreCollection,
  softDeleteAllCollections,
  restoreAllCollections,
  adminDeleteBox,
  adminRestoreBox
} from './db/adminRepo';
import { getGraph, getNodeWithEdges, findPath, searchNodes } from './db/graphRepo';
import { listPeople, createPerson, updatePerson, deletePerson, countPeople } from './db/peopleRepo';
import {
  verifyLogin,
  getPersonWithAuthStatus,
  createPasswordSetupToken,
  consumePasswordSetupToken,
  createFirstAdmin,
  requestPasswordReset,
  listPendingPasswordResetRequests,
  resolvePendingPasswordResetRequests,
  changeOwnPassword,
  isLoginLocked,
  recordFailedLogin,
  clearLoginAttempts,
  hasUnactivatedAdministrator,
  claimAdministratorAccount
} from './db/authRepo';
import type { Pool } from 'pg';

// Sessão de login guarda só o id da pessoa autenticada — tudo o mais (nome,
// papel) é buscado no banco a cada requisição, nunca confiado do cookie.
declare module 'express-session' {
  interface SessionData {
    personId?: string;
    // Token de sincronização anti-CSRF (padrão double-submit): gerado quando a
    // sessão é criada, devolvido ao cliente uma vez, e conferido contra o
    // cabeçalho X-CSRF-Token em toda requisição que muda estado com sessão
    // autenticada. Ver csrfProtection, abaixo.
    csrfToken?: string;
  }
}

// Quem está gravando: vem da sessão autenticada (req.currentPerson, anexada pelo
// middleware requireAuth) — nunca de um actorId que o navegador declara no corpo ou
// na query (essa era a falha que a auditoria de segurança encontrou: qualquer um
// sabendo o UUID de um administrador podia agir como ele). Ver _local-adr-policy-202.
// Validação de formato só — a unicidade real é garantida pelo índice
// case-insensitive em Postgres (db/migrations/012_email_identity.sql).
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function actorFromSession(req: Request): Actor {
  const person = (req as any).currentPerson;
  return person ? { id: person.id, name: person.name, role: person.role } : { id: null, name: null, role: null };
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Render (e qualquer PaaS por trás de proxy reverso) termina o HTTPS na borda
// e encaminha para este processo por HTTP simples — sem isto, o Express nunca
// sabe que a conexão original era segura. Necessário para o cookie de sessão
// funcionar corretamente em produção (cookie.secure abaixo) e para qualquer
// lógica futura baseada em req.ip/X-Forwarded-*.
if (isProduction) {
  app.set('trust proxy', 1);
}

// CORS restrito (achado da Galera de Segurança, set/2026 — ver
// _local-edr-policy-102): o '*' de antes vinha de quando este app rodava
// embutido num iframe do AI Studio, num domínio diferente. Hoje o Express serve o
// front-end (dist/) e a API no mesmo domínio (ver app.use(express.static(...)) mais
// abaixo) — uma requisição do próprio site nunca precisa de cabeçalho CORS, porque
// não é cross-origin. Só ecoa Access-Control-Allow-Origin para origens conhecidas:
// APP_URL (produção, se configurado) e localhost/127.0.0.1 em qualquer porta (dev).
// Sem isso, um site de terceiros não consegue mais ler a resposta destas rotas a
// partir do navegador de quem estiver com o SIGCOI aberto.
const allowedOrigins = new Set([process.env.APP_URL].filter((v): v is string => Boolean(v)));
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.has(origin) || (!isProduction && localOriginPattern.test(origin)))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Permitir payloads de áudio e dados até 40MB
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

// Login real (Fase 1 — § Segurança). SESSION_SECRET nunca tem default de
// produção, mesmo princípio de DATABASE_URL: falha alto no boot, em vez de
// silenciosamente assinar sessões com um segredo previsível.
const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && !sessionSecret) {
  throw new Error('SESSION_SECRET não configurada. Defina no ambiente antes de subir em produção.');
}

// Código de ativação para migrar Administradores dos dados antigos (cadastrados
// antes do login real, sem senha) — nunca obrigatório: só existe se alguém
// configurar ADMIN_BOOTSTRAP_SECRET no ambiente. Diferente de SESSION_SECRET,
// não falha o boot se estiver ausente — sem ele, a rota de ativação (abaixo)
// simplesmente fica indisponível (404), o que é seguro por padrão. Ver
// _local-adr-policy-202 e o manual do Administrador para o passo a passo.
const adminBootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET || null;
const PgSessionStore = pgSessionFactory(session);
app.use(
  session({
    store: new PgSessionStore({ pool: getPool(), tableName: 'session', createTableIfMissing: false }),
    secret: sessionSecret || 'dev-only-session-secret-nao-usar-em-producao',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000 // 12h, renovado a cada requisição (rolling)
    }
  })
);

// Garante que a sessão tem um token anti-CSRF, gerando um se ainda não tiver
// (sessão nova, ou sessão de antes desta proteção existir).
function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

// Proteção anti-CSRF (padrão double-submit token): toda requisição que muda
// estado (POST/PUT/DELETE/PATCH) COM sessão autenticada precisa devolver, no
// cabeçalho X-CSRF-Token, o mesmo valor que só quem já leu a resposta de
// login/bootstrap/"quem sou eu" tem — um site de terceiros não consegue ler
// essa resposta (bloqueado por CORS), então não consegue forjar o cabeçalho.
// Rotas sem sessão (login, bootstrap do 1º admin, ativação de Administrador
// pré-existente, esqueci a senha, definir senha) não passam por aqui: cada
// uma já prova quem pode agir por senha ou por token de uso único — não há
// cookie de sessão alheia para um CSRF explorar nelas. Isentas pelo caminho,
// não só por ausência de sessão: um Administrador testando o próprio link de
// convite no mesmo navegador em que já está logado (bem comum) tem sessão
// ativa, mas a rota continua pública do mesmo jeito.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/bootstrap-admin',
  '/api/auth/claim-admin',
  '/api/auth/setup-password',
  '/api/auth/forgot-password'
]);
function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || !req.session.personId || CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }
  const headerToken = req.headers['x-csrf-token'];
  if (typeof headerToken !== 'string' || !req.session.csrfToken || headerToken !== req.session.csrfToken) {
    res.status(403).json({ error: 'Token CSRF ausente ou inválido. Recarregue a página e tente de novo.' });
    return;
  }
  next();
}
app.use(csrfProtection);

// Freio de força bruta no login: N tentativas falhas seguidas pelo mesmo
// e-mail trava por um tempo. Persistente em Postgres (db/authRepo.ts) —
// sobrevive a reinício do servidor e só existe para e-mail que corresponde
// a uma pessoa real, então não cresce sem limite com e-mails inventados.

// Rota protegida "de verdade": exige sessão válida — nunca um actorId que o
// corpo da requisição declara. Anexa a pessoa autenticada em req.currentPerson.
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const personId = req.session.personId;
  if (!personId) {
    res.status(401).json({ error: 'Sessão expirada ou inexistente. Faça login novamente.' });
    return;
  }
  const person = await getPersonWithAuthStatus(getPool(), personId);
  if (!person) {
    req.session.personId = undefined;
    res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    return;
  }
  (req as any).currentPerson = person;
  next();
}

function requireSessionRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const person = (req as any).currentPerson;
    if (!person || person.role !== role) {
      res.status(403).json({ error: `Esta ação exige o papel ${role}.` });
      return;
    }
    next();
  };
}

// Obter chave de API limpa e atualizada a cada requisição
function getCleanApiKey(): string {
  const key = process.env.GEMINI_API_KEY || '';
  return key.trim().replace(/^["']|["']$/g, '');
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getCleanApiKey();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint de diagnóstico de status da API e autenticação
// Commit atual (4 primeiros dígitos), calculado uma vez no boot e cacheado —
// referência visual de qual versão do código está rodando, mostrada no dashboard.
let cachedCommitShort: string | null = null;
function getCommitShort(): string | null {
  if (cachedCommitShort !== null) return cachedCommitShort;
  try {
    cachedCommitShort = execSync('git rev-parse HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .slice(0, 4);
  } catch {
    cachedCommitShort = '';
  }
  return cachedCommitShort || null;
}

// Endpoint de versão: referência de qual commit está rodando neste servidor
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({ commit: getCommitShort() });
});

app.get('/api/status', (_req: Request, res: Response) => {
  const apiKey = getCleanApiKey();
  const hasKey = Boolean(apiKey && apiKey.length > 5);
  res.json({
    status: 'online',
    hasApiKey: hasKey,
    keyMasked: hasKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'NÃO CONFIGURADA',
    supportedModels: {
      general: 'gemini-3.5-flash',
      complex: 'gemini-3.1-pro-preview',
      fast: 'gemini-3.1-flash-lite',
      transcribe: 'gemini-3.5-transcribe',
    },
  });
});

// Função auxiliar resiliente para geração de conteúdo com pool de modelos disponíveis
async function generateWithResilience(
  ai: GoogleGenAI,
  primaryModel: string,
  formattedContents: any[],
  systemInstruction: string
): Promise<{ reply: string; modelUsed: string; fallbackNotice?: string }> {
  // Pool de modelos testados e disponíveis na API
  const availablePool = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
  ];

  // Organizar a fila de tentativas: primeiro o modelo solicitado, seguido pelos modelos disponíveis
  const candidateModels: string[] = [primaryModel];
  for (const m of availablePool) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];

    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text?.trim();
      if (replyText) {
        return {
          reply: replyText,
          modelUsed: currentModel,
          fallbackNotice:
            currentModel !== primaryModel
              ? `O modelo ${primaryModel} estava temporariamente indisponível. Consulta atendida via ${currentModel}.`
              : undefined,
        };
      }
    } catch (err: any) {
      console.warn(`[Gemini] Modelo ${currentModel} indisponível (${err?.status || err?.message}). Alternando para o próximo modelo do pool...`);

      // Se for erro de autenticação 401 geral de chave
      if (err?.status === 401 || (err?.message && err.message.includes('401'))) {
        throw err;
      }
    }
  }

  // Se todos os modelos retornaram 503 (sobrecarga temporária na infraestrutura Google Gemini)
  return {
    reply: `⚠️ **Aviso de Sobrecarga Temporária na Nuvem Google (HTTP 503):**\nOs servidores da API do Google Gemini estão com picos temporários de demanda neste exato minuto.\n\nEnquanto a conexão se restabelece, as diretrizes procedimentais do SIGCOI permanecem ativas:\n- **Cadeia de Custódia:** Mantenha a integridade física de todos os lacres e registros no Termo de Recebimento (Art. 158 do CPP).\n- **Fases Operacionais:** As etapas de lavagem em água deionizada, secagem em estufa a 37°C e acondicionamento em polipropileno continuam sem interrupção.\n\n*Dica: Você pode reenviar sua pergunta agora ou alternar para o modelo gemini-3.1-flash-lite.*`,
    modelUsed: 'SIGCOI Protocolo de Resiliência',
    fallbackNotice: 'Serviço do Google temporariamente em alta demanda (503). Retentativa automática configurada.',
  };
}

// Endpoint de Chat Multi-turn com Gemini (gemini-3.1-flash-lite, gemini-3.5-flash, gemini-3.1-pro-preview)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const apiKey = getCleanApiKey();
    if (!apiKey) {
      return res.status(401).json({
        error: 'Chave GEMINI_API_KEY não foi encontrada no ambiente do servidor. Verifique o painel Settings > Secrets no AI Studio.',
        code: 401,
      });
    }

    const ai = getGeminiClient();

    const {
      messages = [],
      model = 'gemini-3.1-flash-lite',
      systemInstruction = 'Você é o assistente de curadoria do SIGCOI, sistema de gestão da Coleção Osteológica Identificada do INC (COI-INC/DITEC/PF) — biobanco e coleção de referência para pesquisa aplicada, capacitação e ensino em antropologia forense, instituída pela Portaria DITEC/PF nº 1415/2024, sem finalidade de resolução de casos criminais. Auxilie com precisão científica e técnica na análise de remanescentes ósseos, controle e rastreabilidade do acervo, estimativa de sexo, idade, estatura, ancestralidade, traumatologia e patologias ósseas segundo os protocolos científicos da coleção.',
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem fornecida para a conversa.' });
    }

    // Validação e seleção de modelo conforme especificação
    let targetModel = model;
    if (model === 'fast' || model === 'lite') targetModel = 'gemini-3.1-flash-lite';
    else if (model === 'complex' || model === 'pro') targetModel = 'gemini-3.1-pro-preview';
    else if (model === 'general' || model === 'flash') targetModel = 'gemini-3.5-flash';

    // Mapear histórico multi-turn para o formato do @google/genai
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    try {
      const result = await generateWithResilience(
        ai,
        targetModel,
        formattedContents,
        systemInstruction
      );

      return res.json(result);
    } catch (modelError: any) {
      if (modelError?.status === 401 || (modelError?.message && modelError.message.includes('401'))) {
        return res.status(401).json({
          error: 'Erro 401: Chave de API não autorizada ou expirada. Gere uma nova chave no Google AI Studio (Settings > Secrets).',
          code: 401,
          details: modelError.message,
        });
      }

      // Em qualquer outro erro inesperado, retornar resposta graciosa sem derrubar a UI com 500/503
      return res.json({
        reply: `⚠️ Ocorreu uma oscilação na resposta do modelo (${modelError?.message || 'indisponível'}). Por favor, reenvie a consulta utilizando o modelo gemini-3.1-flash-lite.`,
        modelUsed: 'SIGCOI Assistente de Contingência',
        fallbackNotice: 'Oscilação temporária na API detectada.',
      });
    }
  } catch (error: any) {
    console.error('Erro na rota /api/chat:', error);
    return res.json({
      reply: '⚠️ Erro temporário ao comunicar com o servidor de IA. Por favor, tente novamente.',
      modelUsed: 'SIGCOI Falha Recuperável',
    });
  }
});

// Endpoint de Extração Estruturada por Passo do POP (condução por voz)
// Diferente de /api/chat: aqui o Gemini não devolve texto livre, devolve um JSON
// obrigatório com o que foi extraído e se o PASSO ESTÁ CONFIRMADO — quem decide
// isso é o julgamento da IA sobre a fala (intenção), não uma palavra-chave fixa.
// Erros voltam com status HTTP real (não escondidos em res.json 200) para o
// cliente cair no motor determinístico de fallback corretamente.
const POP_STEP_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    extractedFieldsJson: {
      type: 'STRING',
      description:
        'JSON.stringify de um objeto {"nomeDoCampo": valor} só com os campos deste passo que a fala do usuário efetivamente preencheu ou alterou, usando exatamente os nomes de campo fornecidos no contexto. Nunca inclua um campo que a fala não mencionou.'
    },
    missingRequiredFields: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Lista, em português, do que ainda falta para este passo ficar completo. Vazio se nada falta.'
    },
    stepConfirmed: {
      type: 'BOOLEAN',
      description:
        'true somente se TODOS os campos obrigatórios do passo estão preenchidos (considerando o que já estava preenchido antes mais o que foi extraído agora) E a fala do usuário indica, pelo sentido, que o passo está concluído e pronto para avançar. false em qualquer outro caso — inclusive se faltar dado, mesmo que o usuário diga "confirmado".'
    },
    conductorReplyText: {
      type: 'STRING',
      description:
        'O que o condutor deve narrar de volta ao usuário: se stepConfirmed=false, pergunte objetivamente pelo que falta; se true, confirme o que foi anotado e avise que vai avançar.'
    }
  },
  required: ['extractedFieldsJson', 'missingRequiredFields', 'stepConfirmed', 'conductorReplyText']
};

app.post('/api/pop-step', async (req: Request, res: Response) => {
  try {
    const apiKey = getCleanApiKey();
    if (!apiKey) {
      return res.status(401).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.', code: 401 });
    }

    const { transcript, stepContext, model = 'gemini-3.1-flash-lite' } = req.body;
    if (!transcript || !stepContext) {
      return res.status(400).json({ error: 'Requisição deve conter { transcript, stepContext }.' });
    }

    const ai = getGeminiClient();
    const systemInstruction = `Você é o Condutor do POP-01 (COI-INC), conduzindo por voz o preenchimento de um formulário oficial de gestão da Coleção Osteológica Identificada do INC (COI-INC), coleção de referência para pesquisa e ensino. Sua única tarefa é interpretar a fala do usuário dentro do contexto do passo atual e devolver o JSON estruturado pedido. Nunca invente valor que não foi falado. Nunca decida stepConfirmed=true se um campo obrigatório continua faltando.

Contexto do passo atual:
${stepContext}`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: POP_STEP_RESPONSE_SCHEMA as any
      }
    });

    const raw = response.text?.trim();
    if (!raw) {
      return res.status(502).json({ error: 'Resposta vazia do Gemini para o passo do POP.' });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: 'Resposta do Gemini não é um JSON válido conforme o schema pedido.' });
    }

    let extractedFields: Record<string, any> = {};
    try {
      extractedFields = parsed.extractedFieldsJson ? JSON.parse(parsed.extractedFieldsJson) : {};
    } catch {
      extractedFields = {};
    }

    return res.json({
      extractedFields,
      missingRequiredFields: Array.isArray(parsed.missingRequiredFields) ? parsed.missingRequiredFields : [],
      stepConfirmed: parsed.stepConfirmed === true,
      conductorReplyText: parsed.conductorReplyText || '',
      modelUsed: model
    });
  } catch (error: any) {
    console.error('Erro na rota /api/pop-step:', error);
    if (error?.status === 401 || (error?.message && error.message.includes('401'))) {
      return res.status(401).json({ error: 'Erro 401: Chave de API não autorizada.', code: 401 });
    }
    return res.status(502).json({ error: error?.message || 'Erro ao consultar o Gemini para o passo do POP.' });
  }
});

// Endpoint de Transcrição de Áudio com gemini-3.5-transcribe
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const apiKey = getCleanApiKey();
    if (!apiKey) {
      return res.status(401).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor (401).',
        code: 401,
      });
    }

    const ai = getGeminiClient();
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Nenhum áudio codificado em base64 foi enviado.' });
    }

    // Limpar prefixo data: se presente
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType.split(';')[0], // ex: audio/webm ou audio/mp4
                data: cleanBase64,
              },
            },
            {
              text: 'Transcreva com máxima fidelidade todas as palavras ditadas neste áudio em português do Brasil. Preserve termos técnicos antropológicos, médicos e anatômicos. Retorne apenas o texto transcrito, sem introduções.',
            },
          ],
        },
      });

      const transcript = response.text?.trim() || '';
      return res.json({
        transcript,
        modelUsed: 'gemini-3.5-transcribe',
      });
    } catch (transcribeError: any) {
      console.warn('gemini-3.5-transcribe falhou, tentando fallback com gemini-3.1-flash-lite...', transcribeError);
      
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType.split(';')[0],
                data: cleanBase64,
              },
            },
            {
              text: 'Transcreva em português do Brasil todas as palavras faladas neste áudio. Retorne apenas a transcrição direta.',
            },
          ],
        },
      });

      const transcript = fallbackResponse.text?.trim() || '';
      return res.json({
        transcript,
        modelUsed: 'gemini-3.1-flash-lite (fallback)',
      });
    }
  } catch (error: any) {
    console.error('Erro na transcrição de áudio:', error);
    if (error?.status === 401) {
      return res.status(401).json({
        error: 'Erro 401: Chave de API não autorizada para transcrição.',
        code: 401,
      });
    }
    return res.status(500).json({
      error: error?.message || 'Erro ao transcrever áudio via Gemini.',
    });
  }
});

// --- Persistência (§ Postgres — conjuntos, formulários A.1/A.2, assinaturas, custódia) ---

// Lista todos os conjuntos osteológicos (dashboard, seletor de NIC)
app.get('/api/collections', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const collections = await listCollections(pool);
    return res.json({ collections });
  } catch (error: any) {
    console.error('Erro ao listar conjuntos:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao listar conjuntos.' });
  }
});

// Carrega um conjunto específico pelo NIC
app.get('/api/collections/:nic', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const collection = await getCollection(pool, req.params.nic);
    if (!collection) {
      return res.status(404).json({ error: `Conjunto ${req.params.nic} não encontrado.` });
    }
    return res.json({ collection });
  } catch (error: any) {
    console.error('Erro ao carregar conjunto:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao carregar conjunto.' });
  }
});

// Cria um novo conjunto (NIC de entrada) — exige sessão autenticada (qualquer papel)
app.post('/api/collections', requireAuth, async (req: Request, res: Response) => {
  try {
    const collection = req.body?.collection;
    if (!collection?.nic) {
      return res.status(400).json({ error: 'Corpo da requisição deve conter { collection } com um NIC válido.' });
    }
    const pool = getPool();
    const persisted = await createCollection(pool, collection, actorFromSession(req));
    return res.status(201).json({ collection: persisted });
  } catch (error: any) {
    console.error('Erro ao criar conjunto:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao criar conjunto.' });
  }
});

// Salva um conjunto existente (qualquer atualização de fase, assinatura, custódia, etc.)
// — exige sessão autenticada (qualquer papel)
app.put('/api/collections/:nic', requireAuth, async (req: Request, res: Response) => {
  try {
    const collection = req.body?.collection;
    if (!collection || collection.nic !== req.params.nic) {
      return res.status(400).json({ error: 'NIC do corpo da requisição não confere com o NIC da URL.' });
    }
    const pool = getPool();
    const saved = await saveCollection(pool, collection, actorFromSession(req));
    return res.json({ collection: saved });
  } catch (error: any) {
    console.error('Erro ao salvar conjunto:', error);
    // Tentativa de mexer no histórico (ou hash de assinatura nova que não confere) é
    // recusa do servidor, não falha dele.
    if (error instanceof HistoryViolationError) {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: error?.message || 'Erro ao salvar conjunto.' });
  }
});

// Histórico completo de um conjunto: assinaturas (com a cópia de cada versão
// assinada) e registro de alterações, com a conferência da corrente de hashes.
app.get('/api/collections/:nic/history', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const collection = await getCollection(pool, req.params.nic);
    if (!collection) {
      return res.status(404).json({ error: `Conjunto ${req.params.nic} não encontrado.` });
    }
    const changes = await listChangeLog(pool, req.params.nic);
    return res.json({
      signatures: collection.signatures,
      changes,
      chain: verifyChangeLogChain(changes, req.params.nic)
    });
  } catch (error: any) {
    console.error('Erro ao carregar histórico:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao carregar histórico.' });
  }
});

// --- Zona de Risco do Administrador: exclusão reversível (§ Configurações) ---
// Toda rota abaixo exige sessão autenticada com papel Administrador (requireAuth +
// requireSessionRole — nunca um actorId que o navegador declara) e grava em
// admin_actions quem fez o quê — ver db/adminRepo.ts para as garantias. Fase 2 do
// login real (_local-adr-policy-202): cutover das rotas que antes confiavam em
// requireAdmin(pool, actorId).

function handleAdminError(res: Response, error: any, fallbackMessage: string) {
  const status = error?.statusCode || (error instanceof HistoryViolationError ? 409 : 500);
  return res.status(status).json({ error: error?.message || fallbackMessage });
}

const requireAdminSession = [requireAuth, requireSessionRole('administrador')];

// Itens excluídos e o log de ações — para a lista "Restaurar" e a trilha da Zona de Risco.
app.get('/api/admin/deleted-collections', requireAdminSession, async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    return res.json({ collections: await listDeletedCollections(pool) });
  } catch (error: any) {
    console.error('Erro ao listar conjuntos excluídos:', error);
    return handleAdminError(res, error, 'Erro ao listar conjuntos excluídos.');
  }
});

app.get('/api/admin/actions', requireAdminSession, async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    return res.json({ actions: await listAdminActions(pool) });
  } catch (error: any) {
    console.error('Erro ao listar ações administrativas:', error);
    return handleAdminError(res, error, 'Erro ao listar ações administrativas.');
  }
});

app.post('/api/admin/collections/:nic/delete', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const actor = actorFromSession(req);
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Justificativa obrigatória para excluir um conjunto.' });
    await softDeleteCollection(pool, req.params.nic, actor, reason);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao excluir conjunto:', error);
    return handleAdminError(res, error, 'Erro ao excluir conjunto.');
  }
});

app.post('/api/admin/collections/:nic/restore', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const actor = actorFromSession(req);
    await restoreCollection(pool, req.params.nic, actor);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao restaurar conjunto:', error);
    return handleAdminError(res, error, 'Erro ao restaurar conjunto.');
  }
});

app.post('/api/admin/collections/delete-all', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const actor = actorFromSession(req);
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Justificativa obrigatória para excluir todos os dados.' });
    const affectedCount = await softDeleteAllCollections(pool, actor, reason);
    return res.json({ affectedCount });
  } catch (error: any) {
    console.error('Erro ao excluir todos os conjuntos:', error);
    return handleAdminError(res, error, 'Erro ao excluir todos os conjuntos.');
  }
});

app.post('/api/admin/collections/restore-all', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const actor = actorFromSession(req);
    const affectedCount = await restoreAllCollections(pool, actor);
    return res.json({ affectedCount });
  } catch (error: any) {
    console.error('Erro ao restaurar todos os conjuntos:', error);
    return handleAdminError(res, error, 'Erro ao restaurar todos os conjuntos.');
  }
});

app.post('/api/admin/collections/:nic/boxes/:boxId/delete', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const actor = actorFromSession(req);
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Justificativa obrigatória para excluir uma caixa.' });
    const collection = await adminDeleteBox(pool, req.params.nic, req.params.boxId, actor, reason);
    return res.json({ collection });
  } catch (error: any) {
    console.error('Erro ao excluir caixa:', error);
    return handleAdminError(res, error, 'Erro ao excluir caixa.');
  }
});

app.post('/api/admin/collections/:nic/boxes/:boxId/restore', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const actor = actorFromSession(req);
    const collection = await adminRestoreBox(pool, req.params.nic, req.params.boxId, actor);
    return res.json({ collection });
  } catch (error: any) {
    console.error('Erro ao restaurar caixa:', error);
    return handleAdminError(res, error, 'Erro ao restaurar caixa.');
  }
});

// --- Login real (Fase 1 — sessão no servidor é a única fonte de identidade) ---

// Cria a sessão de login (regenerando o id de sessão contra fixation) e responde
// com a pessoa autenticada. Usado pelo login normal e pelo bootstrap do primeiro
// Administrador — os dois terminam do mesmo jeito: uma sessão válida.
function startSession(req: Request, res: Response, person: Awaited<ReturnType<typeof verifyLogin>>, statusCode = 200) {
  req.session.regenerate((err) => {
    if (err) {
      console.error('Erro ao criar sessão de login:', err);
      return res.status(500).json({ error: 'Erro ao criar sessão de login.' });
    }
    req.session.personId = person!.id;
    const csrfToken = ensureCsrfToken(req);
    return res.status(statusCode).json({ person, csrfToken });
  });
}

// Bootstrap do primeiro Administrador (Fase 3): só funciona com o sistema vazio —
// depois que existe pelo menos uma pessoa, some (409) e todo cadastro passa a ser
// feito por um Administrador autenticado em POST /api/people.
//
// needsAdminClaim cobre o outro caso real: um sistema migrado do modelo antigo,
// com gente já cadastrada (inclusive Administradores) mas sem senha nenhuma —
// aí o banco não está vazio, então needsBootstrap nunca vira true, e sem isto
// ninguém jamais conseguiria logar. Só aparece se ADMIN_BOOTSTRAP_SECRET estiver
// configurado (senão a migração precisa ser feita direto no banco).
app.get('/api/auth/bootstrap-status', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const total = await countPeople(pool);
    const needsAdminClaim = Boolean(adminBootstrapSecret) && (await hasUnactivatedAdministrator(pool));
    return res.json({ needsBootstrap: total === 0, needsAdminClaim });
  } catch (error: any) {
    console.error('Erro ao conferir status de bootstrap:', error);
    return res.status(500).json({ error: 'Erro ao conferir status de bootstrap.' });
  }
});

app.post('/api/auth/bootstrap-admin', async (req: Request, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    const institution = String(req.body?.institution || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    if (!name || !institution || !email || !password) {
      return res.status(400).json({ error: 'Nome, instituição, e-mail e senha são obrigatórios.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }
    const person = await createFirstAdmin(getPool(), { name, institution, email, password });
    return startSession(req, res, person, 201);
  } catch (error: any) {
    console.error('Erro no bootstrap do primeiro Administrador:', error);
    return res.status(409).json({ error: error?.message || 'Erro no bootstrap do primeiro Administrador.' });
  }
});

// Ativa o acesso de um Administrador que já existia nos dados antigos (papel
// cadastrado, sem senha) — nunca cria pessoa nova. Pública, mas exige o código
// de ativação (ADMIN_BOOTSTRAP_SECRET) em comparação de tempo constante, para
// não abrir uma brecha de "sou Administrador, confia" na porta de entrada do
// site — exatamente o tipo de falha que a auditoria original encontrou.
app.post('/api/auth/claim-admin', async (req: Request, res: Response) => {
  try {
    if (!adminBootstrapSecret) {
      return res.status(404).json({ error: 'Recurso não disponível.' });
    }
    const providedSecret = String(req.body?.bootstrapSecret || '');
    const email = String(req.body?.email || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!providedSecret || !email || !newPassword) {
      return res.status(400).json({ error: 'E-mail, código de ativação e nova senha são obrigatórios.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }
    const expected = Buffer.from(adminBootstrapSecret);
    const provided = Buffer.from(providedSecret);
    const secretMatches = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
    if (!secretMatches) {
      return res.status(403).json({ error: 'Código de ativação inválido.' });
    }
    const person = await claimAdministratorAccount(getPool(), email, newPassword);
    return startSession(req, res, person, 200);
  } catch (error: any) {
    console.error('Erro ao ativar conta de Administrador:', error);
    return res.status(400).json({ error: error?.message || 'Erro ao ativar conta de Administrador.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    const pool = getPool();
    if (await isLoginLocked(pool, email)) {
      return res.status(429).json({ error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' });
    }
    const person = await verifyLogin(pool, email, password);
    if (!person) {
      await recordFailedLogin(pool, email);
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    await clearLoginAttempts(pool, email);
    return startSession(req, res, person);
  } catch (error: any) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no login.' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao encerrar sessão:', err);
      return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
    }
    res.clearCookie('connect.sid');
    return res.status(204).send();
  });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const personId = req.session.personId;
  if (!personId) return res.status(401).json({ error: 'Não autenticado.' });
  const person = await getPersonWithAuthStatus(getPool(), personId);
  if (!person) {
    req.session.personId = undefined;
    return res.status(401).json({ error: 'Sessão inválida.' });
  }
  // Recarregar a página não passa pelo login de novo — quem já está logado
  // (sessão restaurada pelo cookie) também precisa do token anti-CSRF para
  // continuar fazendo ações que mudam estado.
  const csrfToken = ensureCsrfToken(req);
  return res.json({ person, csrfToken });
});

// Quem já está logado troca a própria senha — exige a senha atual (não basta
// a sessão), justamente para o caso de sessão aberta num computador
// compartilhado.
app.post('/api/auth/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    }
    const personId = (req as any).currentPerson.id;
    await changeOwnPassword(getPool(), personId, currentPassword, newPassword);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Erro ao trocar a própria senha:', error);
    return res.status(400).json({ error: error?.message || 'Erro ao trocar a senha.' });
  }
});

// Só o Administrador (via sessão autenticada) gera links de "definir senha".
// Também resolve qualquer pedido de "esqueci a senha" pendente para a mesma
// pessoa — gerar o link é exatamente o jeito de atender esse pedido.
app.post('/api/auth/setup-links', requireAuth, requireSessionRole('administrador'), async (req: Request, res: Response) => {
  try {
    const personId = String(req.body?.personId || '').trim();
    if (!personId) return res.status(400).json({ error: 'personId é obrigatório.' });
    const createdBy = (req as any).currentPerson?.name || null;
    const result = await createPasswordSetupToken(getPool(), personId, createdBy);
    await resolvePendingPasswordResetRequests(getPool(), personId, createdBy);
    return res.json(result);
  } catch (error: any) {
    console.error('Erro ao gerar link de definição de senha:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao gerar link de definição de senha.' });
  }
});

// Pública (o token é a própria autenticação): quem recebeu o link, por fora do sistema, define a senha.
app.post('/api/auth/setup-password', async (req: Request, res: Response) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }
    const person = await consumePasswordSetupToken(getPool(), token, newPassword);
    return res.json({ person });
  } catch (error: any) {
    console.error('Erro ao definir senha:', error);
    return res.status(400).json({ error: error?.message || 'Erro ao definir senha.' });
  }
});

// "Esqueci a senha": pública, sem revelar se o e-mail existe (mesmo cuidado
// do login) — sem envio automático de e-mail configurado, o pedido só fica
// visível para o Administrador resolver (ver GET /api/auth/password-reset-requests).
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }
    await requestPasswordReset(getPool(), email);
    return res.json({
      message: 'Se esse e-mail estiver cadastrado, o Administrador foi avisado e vai gerar um novo link de acesso.'
    });
  } catch (error: any) {
    console.error('Erro ao registrar pedido de redefinição de senha:', error);
    return res.status(500).json({ error: 'Erro ao registrar o pedido. Tente novamente.' });
  }
});

// Só o Administrador vê a fila de pedidos de "esqueci a senha" pendentes.
app.get('/api/auth/password-reset-requests', requireAuth, requireSessionRole('administrador'), async (_req: Request, res: Response) => {
  try {
    const requests = await listPendingPasswordResetRequests(getPool());
    return res.json({ requests });
  } catch (error: any) {
    console.error('Erro ao listar pedidos de redefinição de senha:', error);
    return res.status(500).json({ error: 'Erro ao listar pedidos de redefinição de senha.' });
  }
});

// --- Cadastro de pessoas (papéis de acesso) ---
// Login real, Fase 3 (_local-adr-policy-202): listar, cadastrar e remover
// exigem sessão de Administrador — o nome, papel, instituição e e-mail
// (o identificador de login) de cada pessoa não é informação que qualquer
// pessoa logada precise ver, só quem gerencia contas. A única exceção é o
// bootstrap do primeiro Administrador (POST /api/auth/bootstrap-admin,
// acima), que só funciona uma vez, com o sistema vazio.

app.get('/api/people', requireAdminSession, async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const people = await listPeople(pool);
    return res.json({ people });
  } catch (error: any) {
    console.error('Erro ao listar pessoas:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao listar pessoas.' });
  }
});

const VALID_PEOPLE_ROLES = new Set(['tecnico', 'curador', 'administrador', 'pesquisador', 'estudante']);

app.post('/api/people', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { name, role, institution } = req.body || {};
    const email = String(req.body?.email || '').trim();
    if (!name || !role || !institution || !email) {
      return res.status(400).json({ error: 'Informe name, role, institution e email.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    if (!VALID_PEOPLE_ROLES.has(role)) {
      return res.status(400).json({ error: 'Papel inválido. Use tecnico, curador, administrador, pesquisador ou estudante.' });
    }
    const pool = getPool();
    const person = await createPerson(pool, { name, role, institution, email });
    return res.status(201).json({ person });
  } catch (error: any) {
    console.error('Erro ao cadastrar pessoa:', error);
    // Violação do índice único de e-mail — nunca repassa a mensagem crua do
    // Postgres (revelaria nome de índice/constraint); devolve 409 com uma
    // mensagem que a pessoa cadastrando de fato consegue agir.
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma pessoa cadastrada com esse e-mail.' });
    }
    return res.status(500).json({ error: 'Erro ao cadastrar pessoa.' });
  }
});

// Edita uma pessoa já cadastrada — principalmente para preencher o e-mail de
// quem ainda é um registro antigo (de antes do login real), transformando-a
// numa conta real sem recriar do zero. Mesma validação do cadastro.
app.put('/api/people/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { name, role, institution } = req.body || {};
    const email = String(req.body?.email || '').trim();
    if (!name || !role || !institution || !email) {
      return res.status(400).json({ error: 'Informe name, role, institution e email.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }
    if (!VALID_PEOPLE_ROLES.has(role)) {
      return res.status(400).json({ error: 'Papel inválido. Use tecnico, curador, administrador, pesquisador ou estudante.' });
    }
    const pool = getPool();
    const person = await updatePerson(pool, req.params.id, { name, role, institution, email });
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada.' });
    }
    return res.json({ person });
  } catch (error: any) {
    console.error('Erro ao editar pessoa:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma pessoa cadastrada com esse e-mail.' });
    }
    return res.status(500).json({ error: 'Erro ao editar pessoa.' });
  }
});

app.delete('/api/people/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    await deletePerson(pool, req.params.id);
    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao remover pessoa:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao remover pessoa.' });
  }
});

// --- Grafo de Conhecimento (§16) — mirrors os verbos de consulta do Graphify ---

// Grafo completo, ou escopado a um NIC (?nic=...)
app.get('/api/graph', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const graph = await getGraph(pool, typeof req.query.nic === 'string' ? req.query.nic : undefined);
    return res.json(graph);
  } catch (error: any) {
    console.error('Erro ao carregar grafo:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao carregar grafo.' });
  }
});

// "explain": um nó e todas as suas arestas de entrada/saída
app.get('/api/graph/node/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const result = await getNodeWithEdges(pool, req.params.id);
    if (!result) {
      return res.status(404).json({ error: `Nó ${req.params.id} não encontrado no grafo.` });
    }
    return res.json(result);
  } catch (error: any) {
    console.error('Erro ao explicar nó do grafo:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao explicar nó do grafo.' });
  }
});

// "path": caminho mais curto entre dois nós
app.get('/api/graph/path', async (req: Request, res: Response) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) {
      return res.status(400).json({ error: 'Informe os parâmetros de consulta "from" e "to".' });
    }
    const pool = getPool();
    const path = await findPath(pool, from, to);
    if (!path) {
      return res.status(404).json({ error: `Nenhum caminho encontrado entre ${from} e ${to}.` });
    }
    return res.json({ path });
  } catch (error: any) {
    console.error('Erro ao calcular caminho no grafo:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao calcular caminho no grafo.' });
  }
});

// "query": busca por texto em label/propriedades
app.get('/api/graph/search', async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      return res.status(400).json({ error: 'Informe o parâmetro de consulta "q".' });
    }
    const pool = getPool();
    const nodes = await searchNodes(pool, q);
    return res.json({ nodes });
  } catch (error: any) {
    console.error('Erro ao buscar no grafo:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao buscar no grafo.' });
  }
});

// Configuração do Vite dev middleware ou arquivos estáticos de produção
async function setupServer() {
  // Aplica migrações pendentes no boot, para o schema estar sempre atualizado
  // antes do servidor aceitar requisições que dependem do banco.
  try {
    const pool = getPool();
    const applied = await runMigrations(pool);
    if (applied.length > 0) {
      console.log(`[DB] Migrações aplicadas no boot: ${applied.join(', ')}`);
    }
  } catch (err) {
    console.error('[DB] Falha ao aplicar migrações no boot:', err);
    throw err;
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIGCOI Full-Stack Server rodando na porta ${PORT} (${isProduction ? 'Produção' : 'Desenvolvimento'})`);
  });
}

setupServer().catch((err) => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
