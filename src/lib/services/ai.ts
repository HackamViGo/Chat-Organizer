import { GoogleGenerativeAI } from '@google/generative-ai';

const getClient = (apiKeyOverride?: string) => {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found');
  }
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
    console.error('Prompt Improvement Error:', error);
    return originalPrompt;
  }
};
