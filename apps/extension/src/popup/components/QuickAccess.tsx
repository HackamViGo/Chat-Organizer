/// <reference types="chrome"/>

import React from 'react';

interface Platform {
  id: string;
  name: string;
  icon: string;
  url: string;
  glowClass: string;
}

const platforms: Platform[] = [
  { id: 'chatgpt', name: 'GPT', icon: '🤖', url: 'https://chatgpt.com', glowClass: 'glow-chatgpt' },
  { id: 'gemini', name: 'GEM', icon: '💎', url: 'https://gemini.google.com', glowClass: 'glow-gemini' },
  { id: 'claude', name: 'CLA', icon: '☁️', url: 'https://claude.ai', glowClass: 'glow-claude' },
  { id: 'grok', name: 'GROK', icon: '𝕏', url: 'https://x.ai', glowClass: 'glow-grok' },
  { id: 'perplexity', name: 'PER', icon: '🌐', url: 'https://perplexity.ai', glowClass: 'glow-perplexity' },
  { id: 'lmarena', name: 'LMA', icon: '🏆', url: 'https://lmarena.ai', glowClass: 'glow-lmarena' },
  { id: 'deepseek', name: 'DEP', icon: '⚡', url: 'https://deepseek.com', glowClass: 'glow-deepseek' },
  { id: 'qwen', name: 'QWE', icon: '🧩', url: 'https://qwenlm.github.io', glowClass: 'glow-qwen' },
];

export default function QuickAccess() {
  const handleClick = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div>
      <h3 className="text-slate-300 text-sm font-medium mb-3">Quick Access</h3>
      <div className="grid grid-cols-4 gap-2">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => handleClick(platform.url)}
            className={`
              aspect-square rounded-lg 
              bg-slate-800/50 border border-slate-700/50
              flex flex-col items-center justify-center gap-1
              transition-all duration-300
              hover:scale-105 hover:border-slate-600
              active:scale-95
              ${platform.glowClass}
            `}
            title={`Open ${platform.name}`}
          >
            <span className="text-2xl">{platform.icon}</span>
            <span className="text-xs text-slate-300 font-medium">{platform.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
