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
  summary: string;           // Short summary (3-4 sentences)
  detailedSummary: string;   // Detailed summary
  tags: string[];            // Smart tags
  tasks: string[];
  embedding?: number[];      // Optional vector embedding
}

/**
 * Generate a text embedding using Gemini's text-embedding-004 model
 */
export const generateEmbedding = async (
  text: string,
  apiKey?: string
): Promise<number[]> => {
  try {
    const ai = getClient(apiKey);
    const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
    
    console.log('[AI Service] 📉 Generating embedding for text length:', text?.length);
    const result = await model.embedContent(text);
    console.log('[AI Service] ✅ Embedding generated successfully');
    return result.embedding.values;
  } catch (error) {
    console.error('Gemini Embedding Error:', error);
    throw error;
  }
};

export const analyzeChatContent = async (
  content: string,
  apiKey?: string
): Promise<AIAnalysisResult> => {
  try {
    const ai = getClient(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `
      Analyze the following text. You must return a valid JSON response.
      The output language must match the input language (e.g., if input is Bulgarian, output is Bulgarian).

      {
        "title": "A concise 4-6 word title",
        "summary": "A brief summary of exactly 3-4 sentences in Markdown",
        "detailedSummary": "A very detailed and comprehensive summary using Markdown (headers, bullets)",
        "tags": ["3 to 5 relevant keywords"],
        "tasks": ["Specific actionable tasks extracted from the text"]
      }

      Constraint: Return ONLY the JSON object. No conversational filler or markdown code blocks unless requested via API parameters.

      Content:
      ${content.substring(0, 30000)}
    `;

    console.log('[AI Service] 🧠 Sending request to gemini-3-flash-preview...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('[AI Service] 📝 Raw AI Response snippet:', text.substring(0, 200) + '...');
    
    // Better JSON extraction to avoid common Gemini formatting issues
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI failed to return a valid JSON structure');
    }
    
    const analysis = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    console.log('[AI Service] ✅ Parsed AI Analysis:', {
      title: analysis.title,
      tagCount: analysis.tags?.length,
      taskCount: analysis.tasks?.length
    });

    // Generate embedding for semantic search based on the detailed summary
    try {
      const embedding = await generateEmbedding(analysis.detailedSummary, apiKey);
      return { ...analysis, embedding };
    } catch (embError) {
      console.error('Failed to generate embedding during analysis:', embError);
      return analysis;
    }
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
    const model = ai.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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
