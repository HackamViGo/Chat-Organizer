import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Chat, Folder as FolderType } from '@brainbox/shared';
import Link from 'next/link';
import { ChevronRight, Home, Folder as FolderIcon } from 'lucide-react';
import { ChatCard } from '@/components/features/chats/ChatCard';
import FolderHeader from '@/components/features/folders/FolderHeader';

interface FolderPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: FolderPageProps) {
  const supabase = createServerSupabaseClient();

  const { data: folder } = await (supabase as any)
    .from('folders')
    .select('name')
    .eq('id', params.id)
    .single();

  return {
    title: folder?.name ? `${folder.name} - Mega-Pack` : 'Folder - Mega-Pack',
  };
}

export default async function FolderPage({ params }: FolderPageProps) {
  const supabase = createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch folder details
  const { data: folder, error: folderError } = await (supabase as any)
    .from('folders')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  // Show 404 if folder doesn't exist or user doesn't own it
  if (folderError || !folder) {
    notFound();
  }

  // Fetch chats in this folder
  const { data: chatsData } = await (supabase as any)
    .from('chats')
    .select('*')
    .eq('folder_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const chats = (chatsData || []) as Chat[];

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
          <Home size={16} />
          <span>Home</span>
        </Link>
        <ChevronRight size={16} className="text-gray-400" />
        <Link href="/chats" className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
          <FolderIcon size={16} />
          <span>Folders</span>
        </Link>
        <ChevronRight size={16} className="text-gray-400" />
        <span className="text-gray-900 dark:text-gray-100 font-medium">{folder.name}</span>
      </nav>

      {/* Folder Header */}
      <FolderHeader folder={folder} chatCount={chats.length} />

      {/* Chats Grid */}
      {chats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chats.map((chat) => (
            <ChatCard key={chat.id} chat={chat} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <FolderIcon size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">No chats in this folder</h3>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
            This folder is empty. Create a new chat or move chats here to organize your conversations.
          </p>
          <Link
            href="/chats"
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Go to Chats
          </Link>
        </div>
      )}
    </div>
  );
}
