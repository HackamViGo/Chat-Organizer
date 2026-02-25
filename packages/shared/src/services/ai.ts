/**
 * AI Service - Centralized Gateway Routing
 * All internal AI tasks (analysis, summary, enhancement) must route 
 * via the central API gateway defined in ai_models_config.json.
 */

export interface AIAnalysisResult {
  title: string;
  summary: string;
  tasks: string[];
}

// Internal model aliases (aligned with packages/shared/src/config/ai_models_config.json)
const MODELS = {
  ANALYSIS: 'internal-analyzer',
  SUMMARY: 'internal-summarizer',
  ENHANCE: 'internal-enhancer',
  EMBEDDING: 'internal-embedder'
};

/**
 * Common gateway fetcher
 */
const callGateway = async (endpoint: string, payload: any, baseUrl: string, token?: string) => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Gateway Error: ${response.status}`);
  }

  return await response.json();
};

export const analyzeChatContent = async (
  content: string,
  baseUrl: string,
  token?: string
): Promise<AIAnalysisResult> => {
  try {
    const result = await callGateway('/api/ai/analyze', {
      content: content.substring(0, 30000), // Larger context allowed via gateway
      model_alias: MODELS.ANALYSIS
    }, baseUrl, token);

    return result as AIAnalysisResult;
  } catch (error: any) {
    throw new Error(`AI Analysis Failed: ${error.message}`);
  }
};

export const generatePromptImprovement = async (
  originalPrompt: string,
  baseUrl: string,
  token?: string
): Promise<string> => {
  try {
    const result = await callGateway('/api/ai/enhance', {
      prompt: originalPrompt,
      model_alias: MODELS.ENHANCE
    }, baseUrl, token);
    
    return result.enhancedPrompt || originalPrompt;
  } catch (error) {
    return originalPrompt;
  }
};

export const generateEmbedding = async (
  text: string,
  baseUrl: string,
  token?: string
): Promise<number[]> => {
  try {
    const result = await callGateway('/api/ai/embed', {
      text,
      model_alias: MODELS.EMBEDDING
    }, baseUrl, token);
    
    return result.embedding;
  } catch (error) {
    return Array(1536).fill(0);
  }
};
