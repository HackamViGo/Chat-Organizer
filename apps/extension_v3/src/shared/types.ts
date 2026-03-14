// Platforms
export type Platform = 'gemini' | 'chatgpt' | 'claude' | 'grok' | 'perplexity';

// Message
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: string[];
  images?: string[];
  model?: string;
}

// Local conversation record
export interface ConversationRecord {
  conversationId: string;
  title: string;
  url: string;
  platform: Platform;
  timestamp: number;
  messages: Message[];
  synced: boolean;
  dashboardId?: string;
}

// Payload to the Dashboard API
export interface DashboardPayload {
  conversationId: string;
  title: string;
  messages: Message[];
  platform: Platform;
  url: string;
  created_at: number;
  updated_at: number;
  folderId?: string | null;
  metadata: {
    source: 'dom' | 'network' | 'mixed';
    version: 'v3';
  };
}

// Sync Queue
export interface QueueItem {
  id: string;
  payload: DashboardPayload;
  folderId: string | null;
  attempts: number;
  createdAt: number;
  lastAttempt?: number;
}

// Auth state per platform
export interface PlatformAuth {
  chatgpt?: { bearerToken: string; capturedAt: number };
  claude?: { orgId: string; capturedAt: number };
  gemini?: { atToken: string; capturedAt: number };
  grok?: { csrfToken: string; sessionCookie: string; capturedAt: number };
  perplexity?: { csrfToken: string; sessionCookie: string; capturedAt: number };
}

// Message contracts between extension parts
export type ExtensionMessage =
  | { action: 'storeGeminiToken'; token: string }
  | { action: 'storeChatGPTToken'; token: string }
  | { action: 'storeClaudeOrgId'; orgId: string }
  | { action: 'storeGrokAuth'; csrfToken: string; sessionCookie: string }
  | { action: 'storePerplexityAuth'; csrfToken: string; sessionCookie: string }
  | { action: 'triggerSaveChat'; platform: Platform; conversationId?: string; title?: string; url?: string }
  | { action: 'saveToDashboard'; data: DashboardPayload; folderId?: string | null; silent?: boolean }
  | { action: 'storeDashboardAuth'; accessToken: string; refreshToken?: string; expiresAt?: number }
  | { action: 'getAuthStatus' }
  | { action: 'injectGeminiMainBridge' }
  | { action: 'getChatGPTToken' }
  | { action: 'getClaudeOrgId' }
  | { action: 'flushSyncQueue' };
