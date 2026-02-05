'use client';

import React from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';

export const NotificationsCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Notifications
        </h2>
        <Bell size={16} className="text-slate-400" />
      </div>
      <div className="space-y-3">
        <div className="flex gap-3 p-3 rounded-xl bg-green-500/5 dark:bg-green-500/10 border border-green-500/10">
          <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Extension Synced</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">All chats updated successfully</p>
          </div>
        </div>
        <div className="flex gap-3 p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10">
          <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Profile Verified</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Account security check passed</p>
          </div>
        </div>
        <div className="flex gap-3 p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Cloud Storage</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">85% of free space used</p>
          </div>
        </div>
      </div>
    </div>
  );
};
