'use client';

import React from 'react';
import { MessageSquare, Archive, Layers } from 'lucide-react';

interface ChatStatisticsCardProps {
  totalChats: number;
  archivedChats: number;
  chatsByPlatform: Record<string, number>;
}

export const ChatStatisticsCard: React.FC<ChatStatisticsCardProps> = ({ 
  totalChats, archivedChats, chatsByPlatform 
}) => {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        Chat Statistics
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <MessageSquare size={16} />
            <span>Total Chats</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{totalChats}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Archive size={16} />
            <span>Archived</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{archivedChats}</span>
        </div>
        
        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
            <Layers size={12} /> By Platform
          </p>
          <div className="space-y-2">
            {Object.entries(chatsByPlatform).map(([platform, count]) => (
              <div key={platform} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{platform}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full" 
                      style={{ width: `${(count / (totalChats || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
