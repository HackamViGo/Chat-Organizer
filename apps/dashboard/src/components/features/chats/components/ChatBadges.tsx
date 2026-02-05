'use client';

import React from 'react';
import { Tag, CheckSquare } from 'lucide-react';
import { Chat, Platform } from '@brainbox/shared';
import { PROVIDER_ASSETS } from '@brainbox/assets';

interface ChatBadgesProps {
  chat: Chat;
  compact?: boolean;
}

const PROVIDER_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  [Platform.ChatGPT]: { 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20 dark:border-emerald-500/30'
  },
  [Platform.Claude]: { 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20 dark:border-orange-500/30'
  },
  [Platform.Gemini]: { 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20 dark:border-blue-500/30'
  },
  [Platform.Grok]: { 
    color: 'text-slate-900 dark:text-white', 
    bg: 'bg-slate-900/10 dark:bg-white/10',
    border: 'border-slate-900/10 dark:border-white/10'
  },
  [Platform.Perplexity]: { 
    color: 'text-cyan-500', 
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20 dark:border-cyan-500/30'
  },
  [Platform.DeepSeek]: { 
    color: 'text-indigo-500', 
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20 dark:border-indigo-500/30'
  },
  [Platform.LMArena]: { 
    color: 'text-rose-500', 
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20 dark:border-rose-500/30'
  },
  [Platform.Qwen]: { 
    color: 'text-purple-500', 
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20 dark:border-purple-500/30'
  },
  default: { 
    color: 'text-cyan-500', 
    bg: 'bg-cyan-500/10',
    border: 'border-slate-200 dark:border-white/5'
  }
};

export const PlatformIcon: React.FC<{ platform: string; className?: string }> = ({ platform, className }) => {
  return (
    <div className={`w-6 h-6 rounded-sm overflow-hidden flex-shrink-0 ${className}`}>
      <img 
        src={PROVIDER_ASSETS[platform.toLowerCase() as keyof typeof PROVIDER_ASSETS] || PROVIDER_ASSETS.fallback} 
        alt={platform}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export const PlatformBadge: React.FC<{ platform: Platform }> = ({ platform }) => {
  const config = PROVIDER_CONFIG[platform] || PROVIDER_CONFIG.default;
  const assetKey = platform.toLowerCase() as keyof typeof PROVIDER_ASSETS;
  const src = PROVIDER_ASSETS[assetKey] || PROVIDER_ASSETS.fallback;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${config.bg} ${config.border}`}>
      <img src={src} alt="" className="w-3 h-3 object-contain" />
      <span className={`text-[10px] uppercase tracking-wider font-bold ${config.color}`}>
        {platform}
      </span>
    </div>
  );
};

export const ChatBadges: React.FC<ChatBadgesProps> = ({ chat, compact = false }) => {
  const tags = Array.isArray(chat.tags) ? (chat.tags as string[]) : [];
  const tasks = Array.isArray(chat.tasks) ? (chat.tasks as string[]) : [];
  
  return (
    <div className="flex flex-col gap-2">
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, compact ? 2 : 5).map((tag, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/5 text-[10px] text-slate-600 dark:text-slate-400">
              <Tag size={8} /> {tag}
            </span>
          ))}
          {compact && tags.length > 2 && (
            <span className="text-[10px] text-slate-400">+{tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Tasks Preview */}
      {!compact && tasks.length > 0 && (
        <div className="space-y-1">
          {tasks.slice(0, 2).map((task, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <CheckSquare size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">{task}</span>
            </div>
          ))}
          {tasks.length > 2 && (
            <div className="text-xs text-slate-400 dark:text-slate-500 pl-5">+{tasks.length - 2} more tasks</div>
          )}
        </div>
      )}
    </div>
  );
};
