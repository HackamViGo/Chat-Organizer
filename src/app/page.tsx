'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { ChatCard } from '@/components/features/chats/ChatCard';
import { MessageSquare, Plus, FolderPlus } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { chats } = useChatStore();
  const { folders } = useFolderStore();

  const recentChats = chats.filter(c => !c.is_archived).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#0B1121] dark:via-[#0f1729] dark:to-[#0B1121] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            AI Chat <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Organizer</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Manage your AI conversations with powerful organization, search, and analysis tools.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/studio">
            <div className="glass-card p-6 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 dark:group-hover:bg-cyan-500/30 transition-colors">
                <MessageSquare className="text-cyan-600 dark:text-cyan-400" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">AI Studio</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Start new conversations with multiple AI models</p>
            </div>
          </Link>

          <Link href="/chats">
            <div className="glass-card p-6 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/30 transition-colors">
                <FolderPlus className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">New Folder</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Organize your chats into custom folders</p>
            </div>
          </Link>

          <Link href="/prompts">
            <div className="glass-card p-6 rounded-2xl hover:scale-105 transition-transform cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 dark:group-hover:bg-orange-500/30 transition-colors">
                <Plus className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Prompts Library</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Save and reuse your best prompts</p>
            </div>
          </Link>
        </div>

        {/* Recent Chats */}
        {recentChats.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Chats</h2>
              <Link href="/chats" className="text-cyan-600 dark:text-cyan-400 hover:underline text-sm">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentChats.map(chat => (
                <ChatCard key={chat.id} chat={chat} />
              ))}
            </div>
          </div>
        )}

        {recentChats.length === 0 && (
          <div className="text-center py-20">
            <MessageSquare className="mx-auto mb-4 text-slate-300 dark:text-slate-700" size={64} />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No chats yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Start your first AI conversation</p>
            <Link href="/studio">
              <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold transition-colors">
                Go to AI Studio
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
