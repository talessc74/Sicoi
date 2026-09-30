/**
 * Serviço de Integração Gemini do SIGCOI
 * Comunica-se com o backend Express (/api/chat, /api/transcribe, /api/status)
 * protegendo chaves de API e garantindo diagnóstico em tempo real.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  fallbackNotice?: string;
}

export interface ApiStatus {
  status: string;
  hasApiKey: boolean;
  keyMasked: string;
  supportedModels: {
    general: string;
    complex: string;
    fast: string;
    transcribe: string;
  };
}

export async function checkGeminiStatus(): Promise<ApiStatus | null> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function sendChatMessage(
  messages: { role: string; content: string }[],
  model: 'general' | 'complex' | 'fast' = 'general',
  systemInstruction?: string
): Promise<{ reply: string; modelUsed: string; fallbackNotice?: string }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model,
        systemInstruction,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error(
          'Erro 401 (Não Autorizado): A chave GEMINI_API_KEY do servidor não foi validada ou não tem permissão para este modelo. Acesse "Settings > Secrets" no AI Studio e gere uma nova chave.'
        );
      }
      throw new Error(data.error || `Erro HTTP ${res.status}`);
    }

    return {
      reply: data.reply,
      modelUsed: data.modelUsed,
      fallbackNotice: data.fallbackNotice,
    };
  } catch (error: any) {
    console.error('Falha no chat Gemini:', error);
    throw error;
  }
}

export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Audio = reader.result as string;
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: blob.type || 'audio/webm',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error(
              'Erro 401: Falha de autenticação ao transcrever áudio com gemini-3.5-transcribe. Verifique as credenciais no Secrets.'
            );
          }
          throw new Error(data.error || 'Erro ao transcrever áudio.');
        }

        resolve(data.transcript || '');
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

export interface PopStepAiResult {
  extractedFields: Record<string, any>;
  missingRequiredFields: string[];
  stepConfirmed: boolean;
  conductorReplyText: string;
  modelUsed: string;
}

/**
 * Extração + confirmação de um passo do POP por julgamento da IA (não regex).
 * `stepContext` descreve o passo atual, os campos obrigatórios e o que já está
 * preenchido — o Gemini decide `stepConfirmed` considerando os dois.
 */
export async function sendPopStepMessage(transcript: string, stepContext: string): Promise<PopStepAiResult> {
  const res = await fetch('/api/pop-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, stepContext })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao processar o passo do POP.`);
  }
  return data;
}
