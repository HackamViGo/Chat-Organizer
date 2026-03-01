import { GoogleGenerativeAI } from '@google/generative-ai';

import modelsConfig from '../config/ai_models_config.json';

/**
 * AI Service - Direct Gemini Integration
 * All internal AI tasks (analysis, summary, enhancement) are handled
 * using the configured Gemini Flash model.
 */

export interface AIAnalysisResult {
  title: string;
  summary: string;
  tasks: string[];
}

/**
 * Common Gemini model fetcher
 */
const getModel = (apiKey: string, modelAlias: 'analysis' | 'prompt_improvement') => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: modelsConfig.models[modelAlias].model_name 
  });
};

/**
 * analyzeChatContent
 * Extracts title, summary, and action items from conversation content.
 */
export const analyzeChatContent = async (
  content: string,
  apiKey: string
): Promise<AIAnalysisResult> => {
  try {
    const model = getModel(apiKey, 'analysis');
    
    const prompt = `
      Analyze the following chat content. 
      JSON Response Schema:
      {
        "title": "Short descriptive title (max 5 words)",
        "summary": "Concise summary (max 2 sentences)",
        "tasks": ["Extracted actionable tasks or follow-ups (max 5 items)"]
      }

      Chat Content:
      "${content.substring(0, 30000)}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Simple JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      // Type casting justified as we strictly enforce the schema in the prompt
      return JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    }

    throw new Error('Failed to parse AI response as JSON');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AI Analysis Failed: ${message}`);
  }
};

/**
 * generatePromptImprovement
 * Enhances a user prompt to be more structured and effective.
 */
export const generatePromptImprovement = async (
  originalPrompt: string,
  apiKey: string
): Promise<string> => {
  try {
    const model = getModel(apiKey, 'prompt_improvement');
    
    const prompt = `
      Act as an expert prompt engineer. Improve and structure the following prompt for better results. 
      Return ONLY the improved prompt text.

      Original Prompt:
      "${originalPrompt}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch {
    return originalPrompt;
  }
};

/**
 * generateEmbedding
 * Generates a semantic vector representation for RAG/search.
 */
export const generateEmbedding = async (
  text: string,
  apiKey: string
): Promise<number[]> => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelsConfig.models.embedding.model_name 
    });
    
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch {
    // Return zero vector as fallback
    return Array(768).fill(0); // Note: text-embedding-004 is 768 or 1536 depending on config.
  }
};
