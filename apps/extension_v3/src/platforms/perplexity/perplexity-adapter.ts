import { Normalizers } from '../../shared/normalizers';
import { DashboardPayload } from '../../shared/types';

export const PerplexityAdapter = {
  async fetchThread(slug: string): Promise<DashboardPayload | null> {
    try {
      const response = await fetch(`https://www.perplexity.ai/api/thread/${slug}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) return null;
      
      const rawData = await response.json();
      return Normalizers.perplexity(rawData);
    } catch (error) {
      console.error('PerplexityAdapter error:', error);
      return null;
    }
  }
};
