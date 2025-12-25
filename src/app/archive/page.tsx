'use client';

import { useChatStore } from '@/store/useChatStore';
import { ChatCard } from '@/components/features/chats/ChatCard';
import { Archive } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Chat } from '@/types';

export default function ArchivePage() {
  const { chats } = useChatStore();
  const [archivedChats, setArchivedChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchArchivedChats() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching archived chats:', error);
        } else {
          setArchivedChats(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchArchivedChats();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Archive className="w-8 h-8" />
            Archive
          </h1>
          <p className="text-muted-foreground">
            Archived chats can be restored or permanently deleted
          </p>
        </div>
      </div>

      {archivedChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Archive className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No archived chats</h3>
          <p className="text-muted-foreground mb-6">
            Chats you archive will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-muted-foreground">
            {archivedChats.length} archived {archivedChats.length === 1 ? 'chat' : 'chats'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedChats.map((chat) => (
              <ChatCard key={chat.id} chat={chat} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
