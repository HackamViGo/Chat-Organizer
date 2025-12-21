'use client';

import { useChatStore } from '@/store/useChatStore';
import { ChatCard } from '@/components/features/chats/ChatCard';
import { MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';

export default function ChatsPage() {
  const { chats } = useChatStore();

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Chats</h1>
          <p className="text-muted-foreground">
            Manage and organize your AI conversations
          </p>
        </div>
        <Link
          href="/studio"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <MessageSquarePlus className="w-5 h-5" />
          New Chat
        </Link>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquarePlus className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No saved chats</h3>
          <p className="text-muted-foreground mb-6">
            Start a conversation in AI Studio to see it here
          </p>
          <Link
            href="/studio"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to AI Studio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chats.map((chat) => (
            <ChatCard key={chat.id} chat={chat} />
          ))}
        </div>
      )}
    </div>
  );
}
