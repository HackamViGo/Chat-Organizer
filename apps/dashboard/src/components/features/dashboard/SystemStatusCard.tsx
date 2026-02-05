'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const SystemStatusCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        System Status
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700 dark:text-slate-300">Text Gen (LLM)</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={16} />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Operational</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700 dark:text-slate-300">Image Gen</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={16} />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Operational</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700 dark:text-slate-300">Vector DB</span>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-500" size={16} />
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Degraded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
