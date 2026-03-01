'use client';

import { LIMITS } from '@brainbox/shared';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useEffect, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

// New sub-components
import { ChatStatisticsCard } from '@/components/features/dashboard/ChatStatisticsCard';
import { DailyPromptTipCard } from '@/components/features/dashboard/DailyPromptTipCard';
import { DashboardMetrics } from '@/components/features/dashboard/DashboardMetrics';
import { GPT5AlphaCard } from '@/components/features/dashboard/GPT5AlphaCard';
import { NotificationsCard } from '@/components/features/dashboard/NotificationsCard';
import { RecentProjects } from '@/components/features/dashboard/RecentProjects';
import { SystemStatusCard } from '@/components/features/dashboard/SystemStatusCard';
import { UsageChart } from '@/components/features/dashboard/UsageChart';
import { UserInfoCard } from '@/components/features/dashboard/UserInfoCard';
import { createClient } from '@/lib/supabase/client';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';

export default function HomePage() {
  // OPTIMIZATION: Use useShallow to prevent unnecessary re-renders when other store properties change
  const chats = useChatStore(useShallow((state) => state.chats));
  const folders = useFolderStore(useShallow((state) => state.folders));
  
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error: unknown) {
        console.error('Error fetching user:', error instanceof Error ? error.message : error);
      }
    };
    fetchUser();
  }, []);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeProjects = folders.length;
    const totalChats = chats.filter(c => !c.is_archived).length;
    const archivedChats = chats.filter(c => c.is_archived).length;
    
    // Calculate tokens (estimate based on content length)
    const totalTokens = chats.reduce((sum, chat) => {
      const contentLength = chat.content?.length || 0;
      // Rough estimate: ~4 characters per token
      return sum + Math.ceil(contentLength / 4);
    }, 0);
    
    // Calculate time saved (2 min per chat)
    const timeSavedHours = Math.round((totalChats * 2) / 60);

    // Chats by platform
    const chatsByPlatform = chats.reduce((acc, chat) => {
      const platform = chat.platform?.toLowerCase() || 'other';
      let key = 'other';
      if (platform.includes('chatgpt') || platform.includes('gpt')) key = 'chatgpt';
      else if (platform.includes('claude')) key = 'claude';
      else if (platform.includes('gemini')) key = 'gemini';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Chats by folder
    const chatsByFolder = chats.reduce((acc, chat) => {
      const folderId = chat.folder_id || 'none';
      acc[folderId] = (acc[folderId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      activeProjects,
      totalTokens,
      totalChats,
      archivedChats,
      timeSavedHours,
      chatsByPlatform,
      chatsByFolder,
    };
  }, [chats, folders]);

  // Recent projects (folders)
  const recentProjects = useMemo(() => {
    return folders
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, LIMITS.RECENT_PROJECTS_COUNT)
      .map(f => ({
        id: f.id,
        name: f.name,
        status: 'Active' as const,
        updatedAt: (f.updated_at || f.created_at || '').toString(),
      }));
  }, [folders]);

  // Model usage data - last 7 days
  const modelUsageData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map(date => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const chatsOnDay = chats.filter(chat => {
        const chatDate = new Date(chat.created_at || 0);
        return chatDate >= dayStart && chatDate <= dayEnd;
      });

      return {
        day: days[date.getDay()],
        date: date.toISOString().split('T')[0],
        usage: chatsOnDay.length,
      };
    });
  }, [chats]);

  // Calculate percentage change for metrics (comparing last 7 days vs previous 7 days)
  const percentageChanges = useMemo(() => {
    const now = new Date();
    const last7DaysStart = new Date(now);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    last7DaysStart.setHours(0, 0, 0, 0);
    
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setMilliseconds(previous7DaysEnd.getMilliseconds() - 1);
    const previous7DaysStart = new Date(previous7DaysEnd);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);

    const recentChats = chats.filter(c => {
      const date = new Date(c.created_at || 0);
      return date >= last7DaysStart;
    }).length;

    const previousChats = chats.filter(c => {
      const date = new Date(c.created_at || 0);
      return date >= previous7DaysStart && date <= previous7DaysEnd;
    }).length;

    const change = previousChats > 0 
      ? Math.round(((recentChats - previousChats) / previousChats) * 100)
      : recentChats > 0 ? 100 : 0;

    return {
      projects: 0,
      tokens: 0, 
      chats: change,
      time: 0,
    };
  }, [chats]);

  const displayName = user?.user_metadata?.first_name 
    ? user.user_metadata.first_name 
    : user?.email?.split('@')[0] || 'User';

  const userEmail = user?.email || '';
  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto flex flex-col gap-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Project Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Welcome back, {displayName}. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <DashboardMetrics metrics={metrics} percentageChanges={percentageChanges} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Projects & Usage Chart */}
        <div className="lg:col-span-2 space-y-6">
          <RecentProjects projects={recentProjects} />
          <UsageChart data={modelUsageData} chats={chats} />
        </div>

        {/* Right Column - User Info, Chat Stats & Notifications */}
        <div className="space-y-6">
          <UserInfoCard email={userEmail} memberSince={memberSince} />
          <ChatStatisticsCard 
            totalChats={metrics.totalChats} 
            archivedChats={metrics.archivedChats}
            chatsByPlatform={metrics.chatsByPlatform}
          />
          <SystemStatusCard />
          <NotificationsCard />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GPT5AlphaCard />
        </div>
        <div>
          <DailyPromptTipCard />
        </div>
      </div>
    </div>
  );
}
