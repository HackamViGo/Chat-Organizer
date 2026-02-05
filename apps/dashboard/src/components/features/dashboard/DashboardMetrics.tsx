'use client';

import React from 'react';
import { FolderKanban, Zap, MessageSquare, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  percentageChange: number;
  iconBgColor: string;
  iconColor: string;
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, icon: Icon, percentageChange, iconBgColor, iconColor, unit 
}) => (
  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
    <div className="flex items-center justify-between mb-2">
      <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center`}>
        <Icon className={iconColor} size={24} />
      </div>
      <div className={`flex items-center gap-1 text-sm font-semibold ${
        percentageChange >= 0 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-red-600 dark:text-red-400'
      }`}>
        {percentageChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        {percentageChange >= 0 ? '+' : ''}{percentageChange}{unit || '%'}
      </div>
    </div>
    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
      {value}
    </h3>
    <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
  </div>
);

interface DashboardMetricsProps {
  metrics: {
    activeProjects: number;
    totalTokens: number;
    totalChats: number;
    timeSavedHours: number;
  };
  percentageChanges: {
    projects: number;
    tokens: number;
    chats: number;
    time: number;
  };
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ metrics, percentageChanges }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Active Projects"
        value={metrics.activeProjects}
        icon={FolderKanban}
        percentageChange={percentageChanges.projects}
        iconBgColor="bg-green-500/10 dark:bg-green-500/20"
        iconColor="text-green-600 dark:text-green-400"
      />
      <MetricCard
        title="Tokens Generated"
        value={`${Math.round(metrics.totalTokens / 1000)}k`}
        icon={Zap}
        percentageChange={percentageChanges.tokens}
        iconBgColor="bg-purple-500/10 dark:bg-purple-500/20"
        iconColor="text-purple-600 dark:text-purple-400"
      />
      <MetricCard
        title="Total Conversations"
        value={metrics.totalChats}
        icon={MessageSquare}
        percentageChange={percentageChanges.chats}
        iconBgColor="bg-blue-500/10 dark:bg-blue-500/20"
        iconColor="text-blue-600 dark:text-blue-400"
      />
      <MetricCard
        title="Time Saved"
        value={`${metrics.timeSavedHours}h`}
        icon={Clock}
        percentageChange={percentageChanges.time}
        iconBgColor="bg-pink-500/10 dark:bg-pink-500/20"
        iconColor="text-pink-600 dark:text-pink-400"
        unit="h"
      />
    </div>
  );
};
