/// <reference types="chrome"/>

import React from 'react';

import { useTheme } from '../hooks/useTheme';

import { CONFIG } from '@/lib/config';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  const handleSettings = () => {
    // Open dashboard settings page
    chrome.tabs.create({ url: `${CONFIG.DASHBOARD_URL}/settings` });
  };

  return (
    <div className="bg-slate-900/50 border-b border-slate-700/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <img src="/src/icons/icon128.png" className="w-5 h-5 object-contain invert" alt="Logo" />
          </div>
          <div>
            <h1 className="text-slate-200 font-semibold text-lg leading-none">BrainBox</h1>
            <p className="text-slate-400 text-xs text-glow-primary">AI Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSettings}
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Settings"
            aria-label="Open Settings"
          >
            ⚙️
          </button>
          <button
            onClick={toggleTheme}
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '🌓' : '☀️'}
          </button>
        </div>
      </div>
    </div>
  );
}
