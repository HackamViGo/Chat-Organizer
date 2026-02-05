'use client';

import React, { useMemo } from 'react';
import { Zap, Play, Copy, Check } from 'lucide-react';
import { Prompt } from '@brainbox/shared';
import { useState } from 'react';

interface DailyPickCardProps {
  prompts: Prompt[];
}

export function DailyPickCard({ prompts }: DailyPickCardProps) {
  const [copied, setCopied] = useState(false);

  // Get daily pick based on date (consistent per day)
  const dailyPick = useMemo(() => {
    if (prompts.length === 0) return null;

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        1000 /
        60 /
        60 /
        24
    );

    const index = dayOfYear % prompts.length;
    return prompts[index];
  }, [prompts]);

  const handleCopy = async () => {
    if (dailyPick) {
      await navigator.clipboard.writeText(dailyPick.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTryPrompt = () => {
    if (dailyPick) {
      handleCopy();
    }
  };

  if (!dailyPick) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-orange-500" />
          <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
            Daily Pick
          </span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          No prompts available yet. Create your first prompt to see daily picks!
        </div>
      </div>
    );
  }

  const truncatedContent =
    dailyPick.content.length > 150
      ? dailyPick.content.substring(0, 150) + '...'
      : dailyPick.content;

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 dark:from-orange-500/20 dark:to-yellow-500/20 w-full h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 justify-center">
        <Zap className="w-5 h-5 text-orange-500" />
        <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
          Daily Pick
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 text-center">
        {dailyPick.title}
      </h3>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 text-center flex-1">
        {truncatedContent}
      </p>

      <button
        onClick={handleTryPrompt}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors mt-auto"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Try Prompt
          </>
        )}
      </button>
    </div>
  );
}

