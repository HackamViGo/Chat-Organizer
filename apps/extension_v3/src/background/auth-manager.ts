import { Storage } from '../shared/storage';
import type { PlatformAuth } from '../shared/types';

let authCache: PlatformAuth = {};

export const AuthManager = {
  async init(): Promise<void> {
    const stored = await Storage.get<PlatformAuth>('platformAuth');
    authCache = stored ?? {};
  },

  storePlatformAuth<K extends keyof PlatformAuth>(
    platform: K,
    data: PlatformAuth[K]
  ): void {
    authCache[platform] = data;
    Storage.set('platformAuth', authCache);
  },

  async getPlatformAuth<K extends keyof PlatformAuth>(
    platform: K
  ): Promise<PlatformAuth[K] | null> {
    if (authCache[platform]) return authCache[platform] as PlatformAuth[K];
    const stored = await Storage.get<PlatformAuth>('platformAuth');
    return stored?.[platform] ?? null;
  },

  async getChatGPTToken(): Promise<string | null> {
    const auth = await this.getPlatformAuth('chatgpt');
    return auth?.bearerToken ?? null;
  },

  async getClaudeOrgId(): Promise<string | null> {
    const auth = await this.getPlatformAuth('claude');
    return auth?.orgId ?? null;
  },

  async getGeminiToken(): Promise<string | null> {
    const auth = await this.getPlatformAuth('gemini');
    return auth?.atToken ?? null;
  },

  async getDashboardAuthToken(): Promise<string | null> {
    return Storage.get<string>('dashboardAuthToken');
  },

  clearPlatformAuth(platform: keyof PlatformAuth): void {
    delete authCache[platform];
    Storage.set('platformAuth', authCache);
  }
};
