export type PlatformTheme = {
  id: string
  name: string
  colors: {
    primary: string
    border: string
    bg: string
    text: string
  }
}

export const MODEL_THEMES: Record<string, PlatformTheme> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    colors: {
      primary: '#10a37f',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
      text: 'text-emerald-500',
    },
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    colors: {
      primary: '#d97757',
      border: 'border-orange-500/20',
      bg: 'bg-orange-500/5',
      text: 'text-orange-500',
    },
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    colors: {
      primary: '#1a73e8',
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5',
      text: 'text-blue-500',
    },
  },
  grok: {
    id: 'grok',
    name: 'Grok',
    colors: {
      primary: '#000000',
      border: 'border-slate-500/20',
      bg: 'bg-slate-500/5',
      text: 'text-slate-900 dark:text-slate-100',
    },
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    colors: {
      primary: '#20b2aa',
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/5',
      text: 'text-cyan-500',
    },
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    colors: {
      primary: '#4d6bfe',
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/5',
      text: 'text-indigo-500',
    },
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    colors: {
      primary: '#8e44ad',
      border: 'border-purple-500/20',
      bg: 'bg-purple-500/5',
      text: 'text-purple-500',
    },
  },
  lmsys: {
    id: 'lmsys',
    name: 'LMArena',
    colors: {
      primary: '#f1c40f',
      border: 'border-yellow-500/20',
      bg: 'bg-yellow-500/5',
      text: 'text-yellow-600',
    },
  },
}

export function getPlatformTheme(platform: string | null | undefined): PlatformTheme {
  const normalized = platform?.toLowerCase() || 'chatgpt'
  return MODEL_THEMES[normalized] || MODEL_THEMES.chatgpt
}
