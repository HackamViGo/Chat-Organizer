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
  { 
    id: 'chatgpt', 
    name: 'GPT', 
    icon: '🤖', 
    url: 'https://chatgpt.com', 
    glowClass: 'hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-600 hover:text-white hover:shadow-lg hover:shadow-emerald-500/40' 
  },
  { 
    id: 'gemini', 
    name: 'GEM', 
    icon: '💎', 
    url: 'https://gemini.google.com', 
    glowClass: 'hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/40' 
  },
  { 
    id: 'claude', 
    name: 'CLA', 
    icon: '☁️', 
    url: 'https://claude.ai', 
    glowClass: 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/40' 
  },
  { 
    id: 'grok', 
    name: 'GROK', 
    icon: '𝕏', 
    url: 'https://grok.com', 
    glowClass: 'hover:bg-gradient-to-r hover:from-slate-500 hover:to-gray-600 hover:text-white hover:shadow-lg hover:shadow-slate-500/40' 
  },
  { 
    id: 'perplexity', 
    name: 'PER', 
    icon: '🌐', 
    url: 'https://perplexity.ai', 
    glowClass: 'hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:shadow-lg hover:shadow-cyan-500/40' 
  },
  { 
    id: 'lmarena', 
    name: 'LMA', 
    icon: '🏆', 
    url: 'https://lmarena.ai', 
    glowClass: 'hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-600 hover:text-white hover:shadow-lg hover:shadow-amber-500/40' 
  },
  { 
    id: 'deepseek', 
    name: 'DEP', 
    icon: '⚡', 
    url: 'https://deepseek.com', 
    glowClass: 'hover:bg-gradient-to-r hover:from-indigo-500 hover:to-blue-600 hover:text-white hover:shadow-lg hover:shadow-indigo-500/40' 
  },
  { 
    id: 'qwen', 
    name: 'QWE', 
    icon: '🧩', 
    url: 'https://qwenlm.github.io', 
    glowClass: 'hover:bg-gradient-to-r hover:from-purple-500 hover:to-violet-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/40' 
  },
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
              transition-all duration-200
              hover:border-transparent
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
