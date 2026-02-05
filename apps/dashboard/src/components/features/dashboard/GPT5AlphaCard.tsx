'use client';

import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';

export const GPT5AlphaCard: React.FC = () => {
  return (
    <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-purple-500/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Unlock GPT-5 Alpha
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Test new reasoning capabilities. Exclusively for Ultra members.
          </p>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            Join Waitlist
            <ArrowUpRight size={16} />
          </button>
        </div>
        <Sparkles className="text-purple-500" size={32} />
      </div>
    </div>
  );
};

