'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { CONFIG } from '@/lib/config'
import { createClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/useChatStore'
import { useFolderStore } from '@/store/useFolderStore'
import { usePromptStore } from '@/store/usePromptStore'

export function DataProvider({ children }: { children: React.ReactNode }) {
  const {
    setFolders,
    setLoading: setFoldersLoading,
    addFolder,
    updateFolder,
    deleteFolder,
  } = useFolderStore(
    useShallow((s) => ({
      setFolders: s.setFolders,
      setLoading: s.setLoading,
      addFolder: s.addFolder,
      updateFolder: s.updateFolder,
      deleteFolder: s.deleteFolder,
    }))
  )
  const {
    setPrompts,
    setLoading: setPromptsLoading,
    addPrompt,
    updatePrompt,
    deletePrompt,
  } = usePromptStore(
    useShallow((s) => ({
      setPrompts: s.setPrompts,
      setLoading: s.setLoading,
      addPrompt: s.addPrompt,
      updatePrompt: s.updatePrompt,
      deletePrompt: s.deletePrompt,
    }))
  )
  const {
    setChats,
    setLoading: setChatsLoading,
    addChat,
    updateChat: updateChatInStore,
    deleteChat: deleteChatInStore,
  } = useChatStore(
    useShallow((s) => ({
      setChats: s.setChats,
      setLoading: s.setLoading,
      addChat: s.addChat,
      updateChat: s.updateChat,
      deleteChat: s.deleteChat,
    }))
  )
  const isFetchingRef = useRef(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setFoldersLoading(true)
    setPromptsLoading(true)
    setChatsLoading(true)

    try {
      const [chatsResult, foldersResult, promptsResult] = await Promise.allSettled([
        fetch(`${CONFIG.API_BASE_URL}/api/chats`, {
          credentials: 'include',
          cache: 'no-store',
        }).then((res) => (res.ok ? res.json() : null)),
        fetch(`${CONFIG.API_BASE_URL}/api/folders`, {
          credentials: 'include',
          cache: 'no-store',
        }).then((res) => (res.ok ? res.json() : null)),
        fetch(`${CONFIG.API_BASE_URL}/api/prompts`, {
          credentials: 'include',
          cache: 'no-store',
        }).then((res) => (res.ok ? res.json() : null)),
      ])

      // Handle Chats
      if (chatsResult.status === 'fulfilled' && chatsResult.value) {
        setChats(chatsResult.value.chats || [])
      }

      // Handle Folders
      if (foldersResult.status === 'fulfilled' && foldersResult.value) {
        setFolders(foldersResult.value.folders || [])
      }

      // Handle Prompts
      if (promptsResult.status === 'fulfilled' && promptsResult.value) {
        setPrompts(promptsResult.value.prompts || [])
      }
    } catch (error) {
      console.error('Error in DataProvider:', error)
    } finally {
      isFetchingRef.current = false
      setFoldersLoading(false)
      setPromptsLoading(false)
      setChatsLoading(false)
    }
  }, [setFolders, setFoldersLoading, setPrompts, setPromptsLoading, setChats, setChatsLoading])

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Subscribe to Auth changes
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchData()
      } else if (event === 'SIGNED_OUT') {
        setFolders([])
        setPrompts([])
        setChats([])
      }
    })

    // Real-time Subscriptions
    const foldersChannel = supabase
      .channel('folders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        if (eventType === 'INSERT') {
          const state = useFolderStore.getState()
          if (!state.folders.some((f) => f.id === newRecord.id)) {
            addFolder(newRecord as any)
          }
        } else if (eventType === 'UPDATE') {
          updateFolder(newRecord.id, newRecord as any)
        } else if (eventType === 'DELETE') {
          deleteFolder(oldRecord.id)
        }
      })
      .subscribe()

    const promptsChannel = supabase
      .channel('prompts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        if (eventType === 'INSERT') {
          const state = usePromptStore.getState()
          if (!state.prompts.some((p) => p.id === newRecord.id)) {
            addPrompt(newRecord as any)
          }
        } else if (eventType === 'UPDATE') {
          updatePrompt(newRecord.id, newRecord as any)
        } else if (eventType === 'DELETE') {
          deletePrompt(payload.old?.id)
        }
      })
      .subscribe()

    const chatsChannel = supabase
      .channel('chats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        if (eventType === 'INSERT') {
          const state = useChatStore.getState()
          if (!state.chats.some((c) => c.id === newRecord.id)) {
            addChat(newRecord as any)
          }
        } else if (eventType === 'UPDATE') {
          // S4-4: Use action instead of setState
          useChatStore.getState().updateChat(newRecord.id, newRecord as any)
        } else if (eventType === 'DELETE') {
          // S4-4: Use action instead of setState
          useChatStore.getState().deleteChat(oldRecord.id)
        }
      })
      .subscribe()

    return () => {
      authSub.unsubscribe()
      supabase.removeChannel(foldersChannel)
      supabase.removeChannel(promptsChannel)
      supabase.removeChannel(chatsChannel)
    }
  }, [
    fetchData,
    addFolder,
    updateFolder,
    deleteFolder,
    addPrompt,
    updatePrompt,
    deletePrompt,
    addChat,
    setFolders,
    setPrompts,
    setChats,
    supabase,
  ])

  return <>{children}</>
}
