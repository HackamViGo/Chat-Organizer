'use client';

import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { LIMITS } from '@brainbox/shared';

interface UsageDay {
  day: string;
  date: string;
  usage: number;
}

interface UsageChartProps {
  data: UsageDay[];
  chats: any[]; // Using any[] for simplicity as we just need it for counting
}

export const UsageChart: React.FC<UsageChartProps> = ({ data, chats }) => {
  const maxUsage = useMemo(() => Math.max(...data.map(d => d.usage), 1), [data]);

  // Internal calculation of monthly usage to keep Page.tsx clean
  const monthlyUsage = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyChatsCount = chats.filter(chat => {
      const chatDate = new Date(chat.created_at || 0);
      return chatDate >= monthStart && chatDate <= monthEnd;
    }).length;
    
    const monthlyLimit = LIMITS.MONTHLY_CHATS_FREE;
    const usagePercentage = Math.min(Math.round((monthlyChatsCount / monthlyLimit) * 100), 100);
    
    return {
      chats: monthlyChatsCount,
      limit: monthlyLimit,
      percentage: usagePercentage,
    };
  }, [chats]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Activity Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-purple-500" />
            Platform Activity
          </h2>
          <select className="bg-slate-100 dark:bg-white/10 border-none rounded-lg text-sm px-3 py-1.5 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
        
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {data.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
              <div className="w-full relative flex flex-col items-center justify-end h-48">
                {/* Tooltip */}
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900 text-white text-xs py-1.5 px-2.5 rounded shadow-xl pointer-events-none z-10 whitespace-nowrap">
                  {day.usage} chats ({day.date})
                </div>
                
                {/* Bar */}
                <div 
                  className="w-full max-w-[40px] bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-lg transition-all duration-500 group-hover:from-cyan-400 group-hover:to-blue-500 relative"
                  style={{ height: `${(day.usage / maxUsage) * 100}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Limit Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white/10 dark:to-white/5 p-6 rounded-2xl border border-slate-700 dark:border-white/10 flex flex-col">
        <h2 className="text-xl font-bold text-white mb-6">Usage Limit</h2>
        
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="flex items-baseline justify-between text-white/90">
            <span className="text-3xl font-bold">{monthlyUsage.chats}</span>
            <span className="text-sm text-white/50">of {monthlyUsage.limit} chats</span>
          </div>
          
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              style={{ width: `${monthlyUsage.percentage}%` }}
            />
          </div>
          
          <p className="text-sm text-white/60 leading-relaxed">
            You&apos;ve used <span className="text-white font-semibold">{monthlyUsage.percentage}%</span> of your monthly chat synchronization limit. Upgrade for unlimited storage.
          </p>
        </div>
        
        <button className="mt-8 w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-cyan-500 hover:text-white transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
};
