'use client';

import { useEffect, useState, useMemo } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  Sun, Moon, User, TrendingUp, TrendingDown, 
  FolderKanban, Zap, MessageSquare, Clock,
  CheckCircle2, AlertCircle, XCircle,
  Bell, Sparkles, Lightbulb, ArrowUpRight
} from 'lucide-react';

export default function HomePage() {
  const { chats } = useChatStore();
  const { folders } = useFolderStore();
  const { theme, setTheme } = useTheme();
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
      .slice(0, 3)
      .map(f => ({
        id: f.id,
        name: f.name,
        status: 'Active' as const,
        updatedAt: f.updated_at || f.created_at || '',
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

  const maxUsage = Math.max(...modelUsageData.map(d => d.usage), 1);

  // Monthly usage calculation
  const monthlyUsage = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyChats = chats.filter(chat => {
      const chatDate = new Date(chat.created_at || 0);
      return chatDate >= monthStart && chatDate <= monthEnd;
    }).length;
    
    // Assume limit of 1000 chats per month (can be made dynamic)
    const monthlyLimit = 1000;
    const usagePercentage = Math.min(Math.round((monthlyChats / monthlyLimit) * 100), 100);
    
    return {
      chats: monthlyChats,
      limit: monthlyLimit,
      percentage: usagePercentage,
    };
  }, [chats]);

  const displayName = user?.user_metadata?.first_name 
    ? user.user_metadata.first_name 
    : user?.email?.split('@')[0] || 'User';

  const userEmail = user?.email || '';
  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  // Calculate percentage change for metrics (comparing last 7 days vs previous 7 days)
  const percentageChanges = useMemo(() => {
    const now = new Date();
    const last7DaysEnd = new Date(now);
    last7DaysEnd.setHours(23, 59, 59, 999);
    const last7DaysStart = new Date(now);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    last7DaysStart.setHours(0, 0, 0, 0);
    
    const previous7DaysEnd = new Date(last7DaysStart);
    previous7DaysEnd.setMilliseconds(previous7DaysEnd.getMilliseconds() - 1);
    const previous7DaysStart = new Date(previous7DaysEnd);
    previous7DaysStart.setDate(previous7DaysStart.getDate() - 7);

    const recentChats = chats.filter(c => {
      const date = new Date(c.created_at || 0);
      return date >= last7DaysStart && date <= last7DaysEnd;
    }).length;

    const previousChats = chats.filter(c => {
      const date = new Date(c.created_at || 0);
      return date >= previous7DaysStart && date <= previous7DaysEnd;
    }).length;

    const change = previousChats > 0 
      ? Math.round(((recentChats - previousChats) / previousChats) * 100)
      : recentChats > 0 ? 100 : 0;

    return {
      projects: 12, // Mock for now
      tokens: 5, // Mock for now
      chats: change,
      time: 2, // Mock for now
    };
  }, [chats]);

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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center">
              <FolderKanban className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              percentageChanges.projects >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {percentageChanges.projects >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {percentageChanges.projects >= 0 ? '+' : ''}{percentageChanges.projects}%
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {metrics.activeProjects}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Active Projects</p>
        </div>

        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
              <Zap className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              percentageChanges.tokens >= 0 
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {percentageChanges.tokens >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {percentageChanges.tokens >= 0 ? '+' : ''}{percentageChanges.tokens}%
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {Math.round(metrics.totalTokens / 1000)}k
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Tokens Generated</p>
        </div>

        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              percentageChanges.chats >= 0 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {percentageChanges.chats >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {percentageChanges.chats >= 0 ? '+' : ''}{percentageChanges.chats}%
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {metrics.totalChats}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total Conversations</p>
        </div>

        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center">
              <Clock className="text-pink-600 dark:text-pink-400" size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              percentageChanges.time >= 0 
                ? 'text-pink-600 dark:text-pink-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {percentageChanges.time >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {percentageChanges.time >= 0 ? '+' : ''}{percentageChanges.time}h
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {metrics.timeSavedHours}h
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Time Saved</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Projects & Model Usage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Projects */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Recent Projects
            </h2>
            <div className="space-y-3">
              {recentProjects.length > 0 ? (
                recentProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {project.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {project.status} • {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                      {project.status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No projects yet
                </p>
              )}
            </div>
          </div>

          {/* Model Usage Chart */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Model Usage
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">This Week</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-48">
              {modelUsageData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-blue-600 transition-all hover:opacity-80"
                      style={{ height: `${(data.usage / maxUsage) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {data.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - User Info, Chat Stats & Notifications */}
        <div className="space-y-6">
          {/* User Information */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              User Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{userEmail || 'N/A'}</p>
              </div>
              {memberSince && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Member Since</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{memberSince}</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Statistics */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              Chat Statistics
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Total Chats</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{metrics.totalChats}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Archived</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{metrics.archivedChats}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">By Platform</p>
                <div className="space-y-2">
                  {Object.entries(metrics.chatsByPlatform).map(([platform, count]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{platform}</span>
                      <span className="text-xs font-medium text-slate-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">By Folder</p>
                <div className="space-y-2">
                  {Object.entries(metrics.chatsByFolder)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([folderId, count]) => {
                      const folder = folders.find(f => f.id === folderId);
                      return (
                        <div key={folderId} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {folder ? folder.name : folderId === 'none' ? 'Uncategorized' : 'Unknown'}
                          </span>
                          <span className="text-xs font-medium text-slate-900 dark:text-white">{count as number}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card p-6 rounded-2xl">
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

          {/* Notifications */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Notifications
              </h2>
              <Bell className="text-slate-400" size={16} />
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  Project Exported
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  &quot;Marketing Copy&quot; was successfully exported to PDF
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">10 mins ago</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  New Feature
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  GPT-4 Turbo is now available in your workspace
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">2 hours ago</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  Subscription Renewed
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Your Ultra plan has been renewed for another month
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GPT-5 Alpha Card */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-purple-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Unlock GPT-5 Alpha
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Test new reasoning capabilities. Exclusively for Ultra members.
              </p>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                Join Waitlist
                <ArrowUpRight size={16} />
              </button>
            </div>
            <Sparkles className="text-purple-500" size={32} />
          </div>
        </div>

        {/* Daily Prompt Tip */}
        <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 dark:from-orange-500/20 dark:to-yellow-500/20 border border-orange-500/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="text-orange-500 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Daily Prompt Tip
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Use &quot;Chain of Thought&quot; reasoning to improve complex math problem outputs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Usage */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Monthly Usage
          </h3>
          <span className="text-sm text-slate-600 dark:text-slate-400">{monthlyUsage.percentage}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full bg-gradient-to-r rounded-full transition-all ${
              monthlyUsage.percentage >= 90 
                ? 'from-red-500 to-red-600' 
                : monthlyUsage.percentage >= 75 
                ? 'from-yellow-500 to-yellow-600' 
                : 'from-cyan-500 to-blue-600'
            }`}
            style={{ width: `${monthlyUsage.percentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {monthlyUsage.chats} of {monthlyUsage.limit} chats this month
        </p>
        {monthlyUsage.percentage >= 90 && (
          <button className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors">
            Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
}
