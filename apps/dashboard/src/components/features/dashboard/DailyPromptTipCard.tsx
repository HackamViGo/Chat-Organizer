'use client';

import React from 'react';
import { Lightbulb, ArrowUpRight } from 'lucide-react';

export const DailyPromptTipCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-2xl border border-white/10 shadow-lg shadow-cyan-500/10">
      <div className="flex items-center gap-2 text-white/80 mb-3">
        <Lightbulb size={18} />
        <span className="text-sm font-bold uppercase tracking-wider">Pro Tip</span>
      </div>
      <h3 className="text-white font-bold text-lg mb-2">Master Variables</h3>
      <p className="text-cyan-50/70 text-sm leading-relaxed mb-4">
        Use bracketed variables like <code>[style]</code> or <code>[subject]</code> in your templates to make them instantly reusable across different platforms.
      </p>
      <button className="flex items-center gap-2 text-white font-semibold text-sm hover:underline">
        Learn more <ArrowUpRight size={14} />
      </button>
    </div>
  );
};
