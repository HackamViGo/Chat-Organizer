'use client';

import React from 'react';

interface UserInfoCardProps {
  email: string;
  memberSince: string;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({ email, memberSince }) => {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        User Information
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{email || 'N/A'}</p>
        </div>
        {memberSince && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Member Since</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{memberSince}</p>
          </div>
        )}
      </div>
    </div>
  );
};
