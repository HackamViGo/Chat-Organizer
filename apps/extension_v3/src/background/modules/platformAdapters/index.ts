import type { IPlatformAdapter } from './base'
import { GeminiAdapter } from './gemini.adapter'
import { ClaudeAdapter } from './claude.adapter'
import { ChatGPTAdapter } from './chatgpt.adapter'
import { GrokAdapter } from './grok.adapter'
import { PerplexityAdapter } from './perplexity.adapter'
import { LMArenaAdapter } from './lmarena.adapter'
import { QwenAdapter } from './qwen.adapter'
import { DeepSeekAdapter } from './deepseek.adapter'

const adapters: Record<string, IPlatformAdapter> = {
  gemini: new GeminiAdapter(),
  claude: new ClaudeAdapter(),
  chatgpt: new ChatGPTAdapter(),
  grok: new GrokAdapter(),
  perplexity: new PerplexityAdapter(),
  lmarena: new LMArenaAdapter(),
  qwen: new QwenAdapter(),
  deepseek: new DeepSeekAdapter(),
}

export function getAdapter(platform: string): IPlatformAdapter {
  const adapter = adapters[platform]
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`)
  return adapter
}

export async function fetchConversation(
  platform: string, id: string, url?: string, payload?: unknown
) {
  return getAdapter(platform).fetchConversation(id, url, payload)
}
