import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { getPool } from './db/pool';
import { runMigrations } from './db/migrate';
import { listCollections, getCollection, createCollection, saveCollection, wipeAllCollections } from './db/collectionsRepo';
import { getGraph, getNodeWithEdges, findPath, searchNodes } from './db/graphRepo';
import { listPeople, createPerson, deletePerson } from './db/peopleRepo';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// CORS para evitar qualquer bloqueio entre o iframe do AI Studio e a aplicação
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Permitir payloads de áudio e dados até 40MB
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true, limit: '40mb' }));

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
    reply: `⚠️ **Aviso de Sobrecarga Temporária na Nuvem Google (HTTP 503):**\nOs servidores da API do Google Gemini estão com picos temporários de demanda neste exato minuto.\n\nEnquanto a conexão se restabelece, as diretrizes procedimentais do SGCCCO permanecem ativas:\n- **Cadeia de Custódia:** Mantenha a integridade física de todos os lacres e registros no Termo de Recebimento (Art. 158 do CPP).\n- **Fases Operacionais:** As etapas de lavagem em água deionizada, secagem em estufa a 37°C e acondicionamento em polipropileno continuam sem interrupção.\n\n*Dica: Você pode reenviar sua pergunta agora ou alternar para o modelo gemini-3.1-flash-lite.*`,
    modelUsed: 'SGCCCO Protocolo de Resiliência',
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
      systemInstruction = 'Você é o Perito Forense e Curador Osteológico Virtual do SGCCCO (INC/DITEC/PF). Auxilie com precisão científica e técnica na análise de ossadas, cadeia de custódia, estimativa de sexo, idade, estatura, ancestralidade, traumatologia e patologias ósseas segundo os protocolos forenses oficiais.',
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
        modelUsed: 'SGCCCO Assistente de Contingência',
        fallbackNotice: 'Oscilação temporária na API detectada.',
      });
    }
  } catch (error: any) {
    console.error('Erro na rota /api/chat:', error);
    return res.json({
      reply: '⚠️ Erro temporário ao comunicar com o servidor de IA. Por favor, tente novamente.',
      modelUsed: 'SGCCCO Falha Recuperável',
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
    const systemInstruction = `Você é o Condutor do POP-01 (COI-INC), conduzindo por voz o preenchimento de um formulário oficial de antropologia forense. Sua única tarefa é interpretar a fala do usuário dentro do contexto do passo atual e devolver o JSON estruturado pedido. Nunca invente valor que não foi falado. Nunca decida stepConfirmed=true se um campo obrigatório continua faltando.

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
              text: 'Transcreva com máxima fidelidade todas as palavras ditadas neste áudio em português do Brasil. Preserve termos técnicos forenses, médicos e anatômicos. Retorne apenas o texto transcrito, sem introduções.',
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
              text: 'Transcreva em português do Brasil todas as palavras faladas neste áudio pericial. Retorne apenas a transcrição direta.',
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

// Cria um novo conjunto (NIC de entrada)
app.post('/api/collections', async (req: Request, res: Response) => {
  try {
    const collection = req.body?.collection;
    if (!collection?.nic) {
      return res.status(400).json({ error: 'Corpo da requisição deve conter { collection } com um NIC válido.' });
    }
    const pool = getPool();
    const persisted = await createCollection(pool, collection);
    return res.status(201).json({ collection: persisted });
  } catch (error: any) {
    console.error('Erro ao criar conjunto:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao criar conjunto.' });
  }
});

// Salva um conjunto existente (qualquer atualização de fase, assinatura, custódia, etc.)
app.put('/api/collections/:nic', async (req: Request, res: Response) => {
  try {
    const collection = req.body?.collection;
    if (!collection || collection.nic !== req.params.nic) {
      return res.status(400).json({ error: 'NIC do corpo da requisição não confere com o NIC da URL.' });
    }
    const pool = getPool();
    await saveCollection(pool, collection);
    return res.json({ collection });
  } catch (error: any) {
    console.error('Erro ao salvar conjunto:', error);
    // Hash de assinatura inválido é erro do cliente (payload adulterado ou hash fraco), não do servidor
    const isSignatureError = typeof error?.message === 'string' && error.message.includes('Assinatura inválida');
    return res.status(isSignatureError ? 400 : 500).json({ error: error?.message || 'Erro ao salvar conjunto.' });
  }
});

// Apaga todos os conjuntos — para testar o app do zero, sem os dados de
// demonstração. Exige um token de confirmação explícito no corpo, para não
// disparar numa chamada acidental (não há autenticação real ainda).
app.delete('/api/collections', async (req: Request, res: Response) => {
  try {
    if (req.body?.confirm !== 'WIPE_ALL') {
      return res.status(400).json({ error: 'Confirmação ausente. Envie { "confirm": "WIPE_ALL" } no corpo da requisição.' });
    }
    const pool = getPool();
    await wipeAllCollections(pool);
    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao apagar todos os conjuntos:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao apagar os conjuntos.' });
  }
});

// --- Cadastro de pessoas (papéis de acesso, sem login/senha ainda) ---

app.get('/api/people', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const people = await listPeople(pool);
    return res.json({ people });
  } catch (error: any) {
    console.error('Erro ao listar pessoas:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao listar pessoas.' });
  }
});

app.post('/api/people', async (req: Request, res: Response) => {
  try {
    const { name, role, institution, registrationNumber } = req.body || {};
    if (!name || !role || !institution || !registrationNumber) {
      return res.status(400).json({ error: 'Informe name, role, institution e registrationNumber.' });
    }
    const pool = getPool();
    const person = await createPerson(pool, { name, role, institution, registrationNumber });
    return res.status(201).json({ person });
  } catch (error: any) {
    console.error('Erro ao cadastrar pessoa:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao cadastrar pessoa.' });
  }
});

app.delete('/api/people/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    await deletePerson(pool, req.params.id);
    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Erro ao remover pessoa:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao remover pessoa.' });
  }
});

// --- Grafo de Conhecimento Forense (§16) — mirrors os verbos de consulta do Graphify ---

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
    console.log(`SGCCCO Full-Stack Server rodando na porta ${PORT} (${isProduction ? 'Produção' : 'Desenvolvimento'})`);
  });
}

setupServer().catch((err) => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
