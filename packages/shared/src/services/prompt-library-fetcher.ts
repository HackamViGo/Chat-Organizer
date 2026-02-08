export interface PromptEntry {
  id: string;
  title: string;
  prompt: string;
  category?: string;
  tags: string[];
}

export class PromptLibraryFetcher {
  
  private static GITHUB_RAW_URL = 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv';
  private static CACHE_KEY = 'prompt_library_cache';
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Fetch prompts from GitHub (with caching)
   * Works on both client and server
   */
  static async fetchPrompts(): Promise<PromptEntry[]> {
    // Check cache first (client-side only)
    if (typeof window !== 'undefined') {
      const cached = this.getFromCache();
      if (cached) {
        return cached;
      }
    }

    try {
      // Always use GitHub URL directly - it works from both client and server
      const response = await fetch(this.GITHUB_RAW_URL, {
        cache: 'no-store',
        headers: {
          'Accept': 'text/csv',
          'User-Agent': 'Mozilla/5.0',
        },
      });
      
      if (!response.ok) {
        console.error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
        // Try to use cache if available
        if (typeof window !== 'undefined') {
          const cached = this.getFromCache();
          if (cached && cached.length > 0) {
            console.warn('Using cached prompts due to fetch error');
            return cached;
          }
        }
        throw new Error(`Failed to fetch prompts: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      
      if (!csvText || csvText.trim().length === 0) {
        console.error('Empty CSV response from GitHub');
        // Try cache
        if (typeof window !== 'undefined') {
          const cached = this.getFromCache();
          if (cached && cached.length > 0) {
            return cached;
          }
        }
        throw new Error('Empty response from GitHub');
      }
      
      if (process.env.NODE_ENV === 'development') {
        // console.log(`Fetched CSV, length: ${csvText.length} characters`);
      }
      const prompts = this.parseCSV(csvText);
      if (process.env.NODE_ENV === 'development') {
        // console.log(`Parsed ${prompts.length} prompts from CSV`);
      }
      
      if (prompts.length === 0) {
        console.error('No prompts parsed from CSV');
        // Try cache
        if (typeof window !== 'undefined') {
          const cached = this.getFromCache();
          if (cached && cached.length > 0) {
            return cached;
          }
        }
        throw new Error('No prompts parsed from CSV');
      }
      
      // Cache for 24h (client-side only)
      if (typeof window !== 'undefined') {
        this.saveToCache(prompts);
      }
      
      return prompts;
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      
      // Try to use cache as fallback
      if (typeof window !== 'undefined') {
        const cached = this.getFromCache();
        if (cached && cached.length > 0) {
          console.warn('Using cached prompts as fallback');
          return cached;
        }
      }
      
      // Return empty array instead of throwing - allows UI to show error message
      console.error('Could not load prompt library, returning empty array');
      return [];
    }
  }

  /**
   * Parse CSV to structured prompts
   * Handles quoted fields with escaped quotes and newlines
   */
  private static parseCSV(csvText: string): PromptEntry[] {
    const prompts: PromptEntry[] = [];
    
    // Split by lines but handle quoted fields that span multiple lines
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      
      if (char === '"') {
        // Check if it's an escaped quote ("")
        if (nextChar === '"' && inQuotes) {
          currentLine += '"';
          i++; // Skip next quote
          continue;
        }
        // Toggle quote state
        inQuotes = !inQuotes;
        currentLine += char;
      } else if (char === '\n' && !inQuotes) {
        // End of line (not inside quotes)
        lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    
    // Add last line if exists
    if (currentLine.trim()) {
      lines.push(currentLine);
    }
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line: "act","prompt"
      // Handle quoted fields that may contain commas and escaped quotes
      const parsed = this.parseCSVLine(line);
      if (!parsed || parsed.length < 2) continue;

      const title = parsed[0].trim();
      const prompt = parsed[1].trim();
      
      if (!title || !prompt) continue;
      
      prompts.push({
        id: this.generateId(title),
        title,
        prompt,
        category: this.detectCategory(title, prompt),
        tags: this.extractTags(title, prompt)
      });
    }

    return prompts;
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private static parseCSVLine(line: string): string[] | null {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (nextChar === '"' && inQuotes) {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator (not inside quotes)
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    fields.push(currentField);
    
    return fields.length >= 2 ? fields : null;
  }

  /**
   * Generate unique ID from title
   */
  private static generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Detect category from title/prompt
   */
  private static detectCategory(title: string, prompt: string): string {
    const text = `${title} ${prompt}`.toLowerCase();

    const categories = {
      'Development': ['code', 'programming', 'developer', 'debug', 'software', 'git', 'javascript', 'python', 'react'],
      'Writing': ['writer', 'author', 'essay', 'article', 'content', 'blog', 'storyteller', 'poet'],
      'Business': ['business', 'entrepreneur', 'accountant', 'financial', 'sales', 'marketing', 'manager', 'consultant'],
      'Creative': ['artist', 'designer', 'composer', 'creative', 'screenwriter', 'illustrator', 'photographer'],
      'Education': ['teacher', 'tutor', 'instructor', 'professor', 'educational', 'explainer', 'math', 'history'],
      'Health': ['doctor', 'dentist', 'therapist', 'psychologist', 'nutritionist', 'medical', 'mental health'],
      'Entertainment': ['comedian', 'magician', 'storyteller', 'entertainer', 'movie', 'song', 'stand-up'],
      'Communication': ['translator', 'interviewer', 'debater', 'public speaking', 'communication', 'speech'],
      'Lifestyle': ['chef', 'personal trainer', 'travel guide', 'stylist', 'decorator', 'life coach'],
      'General': []
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  /**
   * Extract tags from title/prompt
   */
  private static extractTags(title: string, prompt: string): string[] {
    const text = `${title} ${prompt}`.toLowerCase();
    const allTags = new Set<string>();

    // Common tag keywords
    const tagKeywords = [
      'code', 'write', 'explain', 'review', 'debug', 'help', 'create',
      'teach', 'guide', 'analyze', 'summarize', 'translate', 'design',
      'business', 'technical', 'creative', 'professional', 'expert'
    ];

    tagKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        allTags.add(keyword);
      }
    });

    // Add category as tag
    const category = this.detectCategory(title, prompt);
    allTags.add(category.toLowerCase());

    return Array.from(allTags).slice(0, 5); // Max 5 tags
  }

  /**
   * Cache management
   */
  private static getFromCache(): PromptEntry[] | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        try {
          localStorage.removeItem(this.CACHE_KEY);
        } catch (error) {
          console.warn('Failed to remove cache from localStorage:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      // Handle both JSON parse errors and localStorage access errors
      if (error instanceof DOMException && error.name === 'SecurityError') {
        console.warn('localStorage access denied, skipping cache');
      }
      return null;
    }
  }

  private static saveToCache(prompts: PromptEntry[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        data: prompts,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Handle localStorage access errors (e.g., quota exceeded, access denied)
      if (error instanceof DOMException) {
        if (error.name === 'SecurityError') {
          console.warn('localStorage access denied, skipping cache save');
        } else if (error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, clearing cache');
          try {
            localStorage.removeItem(this.CACHE_KEY);
          } catch {
            // Ignore errors when clearing
          }
        }
      } else {
        console.warn('Failed to cache prompts:', error);
      }
    }
  }
}

