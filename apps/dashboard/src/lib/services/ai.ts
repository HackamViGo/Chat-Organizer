import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Get Google Generative AI client with proper API key configuration
 * Follows Google Cloud best practices for API key usage
 * @see https://docs.cloud.google.com/docs/authentication/api-keys-use#node.js
 */
const getClient = (apiKeyOverride?: string) => {
  // Priority: override > environment variable
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found. Please configure the API key in environment variables.');
  }
  
  // Validate API key format (basic check)
  if (typeof apiKey !== 'string' || apiKey.length < 20) {
    throw new Error('Invalid API key format. API keys should be at least 20 characters long.');
  }
  
  // Initialize client with API key
  // For @google/generative-ai, the API key is passed directly to constructor
  return new GoogleGenerativeAI(apiKey);
};

export interface AIAnalysisResult {
  title: string;
  summary: string;
  tasks: string[];
}

export const analyzeChatContent = async (
  content: string,
  apiKey?: string
): Promise<AIAnalysisResult> => {
  try {
    const ai = getClient(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
      Analyze the following chat transcript or text. 
      1. Generate a concise, 4-6 word title.
      2. Write a brief summary (max 3 sentences) in Markdown.
      3. Extract any actionable tasks or to-dos.
      
      Return the response as JSON with keys: title, summary, tasks (array).
      
      Content:
      ${content.substring(0, 20000)}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    return JSON.parse(jsonText) as AIAnalysisResult;
  } catch (error) {
    // Enhanced error handling for API key issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
    if (errorMessage.includes('API_KEY')) {
      throw new Error('Invalid or missing API key. Please check your GEMINI_API_KEY configuration.');
    }
    if (errorStatus === 429) {
      throw new Error('API quota exceeded. Please try again later.');
    }
    if (errorStatus === 403) {
      throw new Error('API access forbidden. Please check your API key permissions.');
    }
    console.error('Gemini Analysis Error:', error);
    throw error;
  }
};

export const generatePromptImprovement = async (
  originalPrompt: string,
  apiKey?: string
): Promise<string> => {
  try {
    const ai = getClient(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(
      `Improve the following AI prompt to be more effective, structured, and clear using best engineering practices. Return ONLY the improved prompt text.\n\nOriginal: ${originalPrompt}`
    );
    
    return result.response.text() || originalPrompt;
  } catch (error) {
    // Enhanced error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStatus = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
    if (errorMessage.includes('API_KEY')) {
      console.error('Prompt Improvement Error: Invalid API key');
    } else if (errorStatus === 429) {
      console.error('Prompt Improvement Error: Quota exceeded');
    } else {
      console.error('Prompt Improvement Error:', error);
    }
    return originalPrompt;
  }
};
