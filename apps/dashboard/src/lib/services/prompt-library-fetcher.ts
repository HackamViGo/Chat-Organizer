export interface PromptEntry {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  platform?: string;
}

export class PromptLibraryFetcher {
  static async fetchAll(): Promise<PromptEntry[]> {
    return [];
  }

  static async fetchByCategory(category: string): Promise<PromptEntry[]> {
    return [];
  }

  static async search(query: string): Promise<PromptEntry[]> {
    return [];
  }
}
