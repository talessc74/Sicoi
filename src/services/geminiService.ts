/**
 * Serviço de Integração Gemini do SIGCOI
 * Comunica-se com o backend Express (/api/chat, /api/transcribe, /api/status)
 * protegendo chaves de API e garantindo diagnóstico em tempo real.
 */
import { csrfHeaders } from './csrf';

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
      headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify({ transcript, stepContext })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao processar o passo do POP.`);
  }
  return data;
}

// Mesmos vocabulários fechados de SkeletalElement/biologicalProfile
// (src/types/sgccco.ts) — mantidos aqui, e não importados de db/, porque db/ é
// código de servidor (usa 'pg') e não deve entrar no bundle do frontend.
export interface BoneSimilarityCriteria {
  boneNameQuery?: string;
  side?: 'direito' | 'esquerdo' | 'axial_unico';
  sexEstimate?: 'masculino' | 'provavel_masculino' | 'indeterminado' | 'provavel_feminino' | 'feminino';
  ageCategory?: 'jovem' | 'adulto_jovem' | 'adulto_medio' | 'adulto_maduro' | 'idoso';
}

export interface BoneSimilarityExplanation {
  similarityScore: number;
  explanation: string;
  confidence: 'alta' | 'media' | 'baixa';
}

export interface BoneSimilarityCandidate {
  nic: string;
  element: Record<string, any>;
  individual: Record<string, any> | null;
  // Só presente quando a busca foi por `freeText` e a explicação da IA deu certo
  // para este candidato (_local-adr-policy-103) — ausente no caminho por
  // `criteria` estruturado, ou se a explicação falhou (ver `explanationError`).
  similarity?: BoneSimilarityExplanation;
}

export interface BoneSimilaritySearchResult {
  criteria: BoneSimilarityCriteria;
  candidates: BoneSimilarityCandidate[];
  // Presente só quando a busca tentou explicar (freeText) e a IA falhou — a
  // busca em si não falhou, os candidatos acima são reais e válidos.
  explanationError?: string;
}

/**
 * Busca ossos parecidos a partir de uma descrição livre (extraída pelo Gemini no
 * servidor) ou de um critério já estruturado — nunca os dois ao mesmo tempo.
 * Investigação, não gravação: não altera nenhum conjunto (_local-adr-policy-103).
 */
export async function searchSimilarBones(
  input: { freeText: string } | { criteria: BoneSimilarityCriteria }
): Promise<BoneSimilaritySearchResult> {
  const res = await fetch('/api/bone-similarity/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    body: JSON.stringify(input)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao buscar ossos parecidos.`);
  }
  return data;
}

/**
 * Extrai os campos da Fase 0 a partir de uma foto/PDF da Declaração de Óbito.
 * A imagem nunca é armazenada — só usada nesta chamada (_local-adr-policy-104).
 * Devolve apenas o que o Gemini reconheceu com segurança no documento; campos
 * ausentes no retorno significam "não identificado na imagem", nunca um valor
 * inventado. O Técnico sempre revisa cada campo no formulário antes de assinar.
 */
export async function extractDeathCertificateFields(file: File): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Image = reader.result as string;
        const res = await fetch('/api/phase0/extract-death-certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
          body: JSON.stringify({
            imageBase64: base64Image,
            mimeType: file.type || 'image/jpeg'
          })
        });

        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Erro 401: Falha de autenticação ao extrair dados da Declaração de Óbito. Verifique as credenciais no Secrets.');
          }
          throw new Error(data.error || 'Erro ao extrair dados da Declaração de Óbito.');
        }
        resolve(data.fields || {});
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}
