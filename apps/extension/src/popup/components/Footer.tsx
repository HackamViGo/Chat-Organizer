import React from 'react';

export default function Footer() {
  return (
    <div className="bg-slate-900/50 border-t border-slate-700/50 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-glow" />
        <span className="text-xs text-green-500 font-medium">System Ready</span>
      </div>
      <span className="text-xs text-slate-500">v2.1.0</span>
    </div>
  );
}
