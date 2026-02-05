'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFolderStore } from '@/store/useFolderStore';
import { usePromptStore } from '@/store/usePromptStore';
import { useChatStore } from '@/store/useChatStore';
import { createClient } from '@/lib/supabase/client';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { setFolders, setLoading: setFoldersLoading, addFolder, updateFolder, deleteFolder } = useFolderStore();
  const { setPrompts, setLoading: setPromptsLoading, addPrompt, updatePrompt, deletePrompt } = usePromptStore();
  const { setChats, setLoading: setChatsLoading, addChat, updateChat: updateChatInStore, deleteChat: deleteChatInStore } = useChatStore();
  const isFetchingRef = useRef(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setFoldersLoading(true);
    setPromptsLoading(true);
    setChatsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [chatsResult, foldersResult, promptsResult] = await Promise.allSettled([
        fetch('/api/chats', { credentials: 'include', cache: 'no-store' }).then(res => res.ok ? res.json() : null),
        fetch('/api/folders', { credentials: 'include', cache: 'no-store' }).then(res => res.ok ? res.json() : null),
        user ? supabase.from('prompts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) : Promise.resolve({ data: null, error: null })
      ]);

      // Handle Chats
      if (chatsResult.status === 'fulfilled' && chatsResult.value) {
        setChats(chatsResult.value.chats || []);
      }

      // Handle Folders
      if (foldersResult.status === 'fulfilled' && foldersResult.value) {
        setFolders(foldersResult.value.folders || []);
      }

      // Handle Prompts
      if (promptsResult.status === 'fulfilled') {
        const { data, error } = promptsResult.value;
        if (!error && data) {
          setPrompts(data);
        }
      }

    } catch (error) {
      console.error('Error in DataProvider:', error);
    } finally {
      isFetchingRef.current = false;
      setFoldersLoading(false);
      setPromptsLoading(false);
      setChatsLoading(false);
    }
  }, [setFolders, setFoldersLoading, setPrompts, setPromptsLoading, setChats, setChatsLoading, supabase]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Subscribe to Auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setFolders([]);
        setPrompts([]);
      }
    });

    // Real-time Subscriptions
    const foldersChannel = supabase
      .channel('folders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === 'INSERT') {
          // Check if already in store (avoid duplicates from local UI actions)
          const state = useFolderStore.getState();
          if (!state.folders.some(f => f.id === newRecord.id)) {
            addFolder(newRecord as any);
          }
        } else if (eventType === 'UPDATE') {
          updateFolder(newRecord.id, newRecord as any);
        } else if (eventType === 'DELETE') {
          deleteFolder(oldRecord.id);
        }
      })
      .subscribe();

    const promptsChannel = supabase
      .channel('prompts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === 'INSERT') {
          const state = usePromptStore.getState();
          if (!state.prompts.some(p => p.id === newRecord.id)) {
            addPrompt(newRecord as any);
          }
        } else if (eventType === 'UPDATE') {
          updatePrompt(newRecord.id, newRecord as any);
        } else if (eventType === 'DELETE') {
          deletePrompt(oldRecord.id);
        }
      })
      .subscribe();
      
    const chatsChannel = supabase
      .channel('chats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (eventType === 'INSERT') {
          const state = useChatStore.getState();
          if (!state.chats.some(c => c.id === newRecord.id)) {
            addChat(newRecord as any);
          }
        } else if (eventType === 'UPDATE') {
          // Note: we don't call the API again here, just update local store
          useChatStore.setState((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === newRecord.id ? { ...chat, ...newRecord } : chat
            ),
          }));
        } else if (eventType === 'DELETE') {
          useChatStore.setState((state) => ({
            chats: state.chats.filter((chat) => chat.id !== oldRecord.id),
          }));
        }
      })
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(foldersChannel);
      supabase.removeChannel(promptsChannel);
      supabase.removeChannel(chatsChannel);
    };
  }, [fetchData, addFolder, updateFolder, deleteFolder, addPrompt, updatePrompt, deletePrompt, addChat, setFolders, setPrompts, setChats, supabase]);

  return <>{children}</>;
}
