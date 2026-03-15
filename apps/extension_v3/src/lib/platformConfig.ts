export const PLATFORM_CONFIG = {
  gemini: {
    id: 'gemini' as const,
    name: 'Google Gemini',
    urlPatterns: ['https://gemini.google.com/*'],
    storageKeys: { atToken: 'gemini_at_token', dynamicKey: 'gemini_dynamic_key' },
  },
  claude: {
    id: 'claude' as const,
    name: 'Claude',
    urlPatterns: ['https://claude.ai/*'],
    storageKeys: { orgId: 'claude_org_id' },
  },
  chatgpt: {
    id: 'chatgpt' as const,
    name: 'ChatGPT',
    urlPatterns: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    storageKeys: { token: 'chatgpt_token' },
  },
  grok: {
    id: 'grok' as const,
    name: 'Grok',
    urlPatterns: ['https://grok.com/*', 'https://x.com/i/grok*'],
    storageKeys: { csrfToken: 'grok_csrf_token', authToken: 'grok_auth_token' },
  },
  perplexity: {
    id: 'perplexity' as const,
    name: 'Perplexity',
    urlPatterns: ['https://www.perplexity.ai/*'],
    storageKeys: { session: 'perplexity_session' },
  },
  deepseek: {
    id: 'deepseek' as const,
    name: 'DeepSeek',
    urlPatterns: ['https://chat.deepseek.com/*'],
    storageKeys: { token: 'deepseek_token', version: 'deepseek_version' },
  },
  qwen: {
    id: 'qwen' as const,
    name: 'Qwen',
    urlPatterns: ['https://chat.qwen.ai/*'],
    storageKeys: { xsrfToken: 'qwen_xsrf_token', appId: 'qwen_app_id' },
  },
  lmarena: {
    id: 'lmarena' as const,
    name: 'LM Arena',
    urlPatterns: ['https://chat.lmsys.org/*', 'https://arena.ai/*', 'https://lmarena.ai/*'],
    storageKeys: { sessionHash: 'lmarena_session_hash', fnIndex: 'lmarena_fn_index' },
  },
} as const

export type PlatformId = keyof typeof PLATFORM_CONFIG

export function getAllPlatformUrls(): string[] {
  return Object.values(PLATFORM_CONFIG).flatMap(p => p.urlPatterns)
}
