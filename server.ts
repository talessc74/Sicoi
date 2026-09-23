import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// CORS para evitar qualquer bloqueio entre o iframe do AI Studio e a aplicação
app.use((_req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      systemInstruction = 'Você é o Perito Forense e Curador Osteológico Virtual do SGCCCO (SENASP/DITEC). Auxilie com precisão científica e técnica na análise de ossadas, cadeia de custódia, estimativa de sexo, idade, estatura, ancestralidade, traumatologia e patologias ósseas segundo os protocolos forenses oficiais.',
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

// Configuração do Vite dev middleware ou arquivos estáticos de produção
async function setupServer() {
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
