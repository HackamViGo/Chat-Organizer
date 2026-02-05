import { PromptLibraryFetcher, type PromptEntry } from './prompt-library-fetcher';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class SmartPromptSearch {
  
  /**
   * Find best matching prompt using AI
   */
  static async findBestMatch(userQuery: string, apiKey?: string): Promise<{
    prompt: PromptEntry;
    confidence: number;
    reasoning: string;
    alternatives: PromptEntry[];
  }> {
    // 1. Load all prompts
    let allPrompts: PromptEntry[];
    try {
      allPrompts = await PromptLibraryFetcher.fetchPrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // Return empty result instead of throwing
      allPrompts = [];
    }
    
    // If no prompts available, return error result
    if (allPrompts.length === 0) {
      throw new Error('No prompts available. Please check your internet connection and try again.');
    }

    // 2. Pre-filter by keywords (reduce API load)
    const relevantPrompts = this.preFilter(userQuery, allPrompts);

    // 3. Use AI to find best match
    const searchPrompt = `You are a prompt matching expert. A user needs: "${userQuery}"

Here are the most relevant available prompts:

${relevantPrompts.slice(0, 15).map((p, i) => 
  `${i + 1}. "${p.title}" - Category: ${p.category}`
).join('\n')}

Task: Select the BEST matching prompt number (1-${Math.min(15, relevantPrompts.length)}) and explain why in ONE clear sentence.

Response format (EXACT):
Number: [number]
Confidence: [0-100]
Reason: [one sentence explanation]

Response:`;

    // Check if API key is available before trying AI
    const apiKeyToUse = apiKey || process.env.GEMINI_API_KEY;
    
    // Validate API key format if provided
    if (apiKeyToUse && (typeof apiKeyToUse !== 'string' || apiKeyToUse.length < 20)) {
      console.warn('Invalid API key format, using keyword matching fallback');
    }
    
    // Skip AI if quota is likely exhausted - use keyword matching directly
    // This reduces API calls and improves performance
    const shouldUseAI = apiKeyToUse && relevantPrompts.length > 0 && false; // Disabled to avoid quota issues

    if (shouldUseAI) {
      try {
        // Initialize client with proper API key configuration
        // Follows Google Cloud best practices
        const genAI = new GoogleGenerativeAI(apiKeyToUse);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 150
          }
        });

        const aiResponse = result.response.text();

        // Parse AI response
        const numberMatch = aiResponse.match(/Number:\s*(\d+)/i);
        const confidenceMatch = aiResponse.match(/Confidence:\s*(\d+)/i);
        const reasonMatch = aiResponse.match(/Reason:\s*(.+)/i);

        if (numberMatch) {
          const selectedIndex = parseInt(numberMatch[1]) - 1;
          const selectedPrompt = relevantPrompts[selectedIndex] || relevantPrompts[0];
          const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.85;
          const reasoning = reasonMatch ? reasonMatch[1].trim() : 'Best match found';

          // Get alternatives (next 2 best matches)
          const alternatives = relevantPrompts
            .filter((_, i) => i !== selectedIndex)
            .slice(0, 2);

          return {
            prompt: selectedPrompt,
            confidence,
            reasoning,
            alternatives
          };
        }
      } catch (error) {
        // Enhanced error handling with proper error detection
        const errorStatus = (error && typeof error === 'object' && 'status' in error) ? (error as any).status : undefined;
        const errorStatusText = (error && typeof error === 'object' && 'statusText' in error) ? (error as any).statusText : undefined;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorDetails = (error && typeof error === 'object' && 'errorDetails' in error && Array.isArray((error as any).errorDetails)) ? (error as any).errorDetails : [];
        const isQuotaError = errorStatus === 429 || errorStatusText === 'Too Many Requests';
        const isApiKeyError = 
          errorStatus === 400 || 
          errorStatus === 403 ||
          errorMessage.includes('API_KEY') ||
          errorDetails.some((d: unknown) => 
            typeof d === 'object' && d !== null && 'reason' in d && 
            (d.reason === 'API_KEY_INVALID' || d.reason === 'API_KEY_NOT_FOUND')
          );
        
        if (isApiKeyError) {
          console.warn('AI search error: Invalid or missing API key. Using keyword matching fallback.');
        } else if (isQuotaError) {
          console.warn('AI search error: API quota exceeded. Using keyword matching fallback.');
        } else {
          console.warn('AI search error (using fallback):', errorMessage);
        }
        
        // Fall through to keyword matching fallback
      }
    }

    // Fallback to keyword matching (always works)
    if (relevantPrompts.length === 0) {
      // If no relevant prompts found, return random prompt from all for variety
      const randomIndex = Math.floor(Math.random() * Math.min(allPrompts.length, 10));
      const selectedPrompt = allPrompts[randomIndex] || allPrompts[0];
      const alternatives = allPrompts
        .filter((_, i) => i !== randomIndex)
        .slice(0, 2);
      
      return {
        prompt: selectedPrompt,
        confidence: 0.5,
        reasoning: 'Best match from available prompts',
        alternatives
      };
    }

    // Return first relevant prompt (already sorted by relevance)
    return {
      prompt: relevantPrompts[0],
      confidence: 0.75,
      reasoning: 'Best match based on keyword similarity',
      alternatives: relevantPrompts.slice(1, 3)
    };
  }

  /**
   * Pre-filter prompts by keywords (faster, cheaper)
   */
  private static preFilter(query: string, allPrompts: PromptEntry[]): PromptEntry[] {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Score each prompt
    const scored = allPrompts.map((prompt, index) => {
      const titleLower = prompt.title.toLowerCase();
      const promptLower = prompt.prompt.toLowerCase();
      
      let score = 0;

      // Title match (high weight)
      words.forEach(word => {
        if (titleLower.includes(word)) score += 10;
      });

      // Prompt content match (medium weight)
      words.forEach(word => {
        if (promptLower.includes(word)) score += 3;
      });

      // Tag match (medium weight)
      if (prompt.tags && Array.isArray(prompt.tags)) {
        prompt.tags.forEach((tag: string) => {
          words.forEach(word => {
            if (tag.includes(word) || word.includes(tag)) score += 5;
          });
        });
      }

      // Add tiny random factor to break ties (ensures variety)
      score += Math.random() * 0.01;

      return { prompt, score, index };
    });

    // Sort by score (descending) and return top 20
    return scored
      .sort((a, b) => {
        // Primary sort: by score
        if (b.score !== a.score) return b.score - a.score;
        // Secondary sort: by original index (for stability)
        return a.index - b.index;
      })
      .slice(0, 20)
      .map(s => s.prompt);
  }

  /**
   * Get prompts by category
   */
  static async getByCategory(category: string): Promise<PromptEntry[]> {
    const allPrompts = await PromptLibraryFetcher.fetchPrompts();
    return allPrompts.filter(p => p.category === category);
  }

  /**
   * Get all categories with counts
   */
  static async getCategories(): Promise<Array<{ name: string; count: number; icon: string }>> {
    const allPrompts = await PromptLibraryFetcher.fetchPrompts();
    
    const categoryIcons: Record<string, string> = {
      'Development': '💻',
      'Writing': '✍️',
      'Business': '💼',
      'Creative': '🎨',
      'Education': '📚',
      'Health': '🏥',
      'Entertainment': '🎭',
      'Communication': '💬',
      'Lifestyle': '🌟',
      'General': '📋'
    };

    const counts: Record<string, number> = {};
    
    allPrompts.forEach(prompt => {
      counts[prompt.category || 'General'] = (counts[prompt.category || 'General'] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      icon: categoryIcons[name] || '📋'
    }));
  }
}

