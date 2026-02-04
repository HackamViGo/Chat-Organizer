export const PROVIDER_ASSETS: Record<string, string> = {
  chatgpt: '/icons/providers/openai.png',
  openai: '/icons/providers/openai.png',
  claude: '/icons/providers/claude.png',
  anthropic: '/icons/providers/claude.png',
  gemini: '/icons/providers/gemini.png',
  google: '/icons/providers/gemini.png',
  deepseek: '/icons/providers/deepseek.png',
  perplexity: '/icons/providers/perplexity.png',
  mistral: '/icons/providers/mistral.png',
  grok: '/icons/providers/grok.png',
  xai: '/icons/providers/grok.png',
  qwen: '/icons/providers/qwen.png',
  alibaba: '/icons/providers/qwen.png',
  lmarena: '/icons/providers/default-bot.png',
  fallback: '/icons/providers/default-bot.png'
} as const;

export type ProviderKey = keyof typeof PROVIDER_ASSETS;
