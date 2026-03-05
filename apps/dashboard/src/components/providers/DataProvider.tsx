'use client'
 
import type { Folder, Chat, Prompt } from '@brainbox/shared'
import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'


import { CONFIG } from '@/lib/config'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
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
  } = useChatStore(
    useShallow((s) => ({
      setChats: s.setChats,
      setLoading: s.setLoading,
      addChat: s.addChat,
    }))
  )
  const { initialize, isAuthenticated } = useAuthStore(
    useShallow((state) => ({
      initialize: state.initialize,
      isAuthenticated: state.isAuthenticated,
    }))
  )
  const isFetchingRef = useRef(false)
  const supabase = useMemo(() => createClient(), [])

  // Initialize Auth on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current || !isAuthenticated) return
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
      logger.error('DataProvider', 'Error fetching data', error)
    } finally {
      isFetchingRef.current = false
      setFoldersLoading(false)
      setPromptsLoading(false)
      setChatsLoading(false)
    }
  }, [setFolders, setFoldersLoading, setPrompts, setPromptsLoading, setChats, setChatsLoading, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    } else {
      setFolders([])
      setPrompts([])
      setChats([])
    }

    // Real-time Subscriptions
    const foldersChannel = supabase
      .channel('folders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        const typedNew = newRecord as Record<string, unknown>
        const typedOld = oldRecord as Record<string, unknown>
        if (eventType === 'INSERT') {
          const state = useFolderStore.getState()
          if (!state.folders.some((f) => f.id === typedNew.id)) {
            addFolder(typedNew as unknown as Folder)
          }
        } else if (eventType === 'UPDATE') {
          updateFolder(typedNew.id as string, typedNew as unknown as Partial<Folder>)
        } else if (eventType === 'DELETE') {
          deleteFolder(typedOld.id as string)
        }
      })
      .subscribe()

    const promptsChannel = supabase
      .channel('prompts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        const typedNew = newRecord as Record<string, unknown>
        const typedOld = oldRecord as Record<string, unknown>
        if (eventType === 'INSERT') {
          const state = usePromptStore.getState()
          if (!state.prompts.some((p) => p.id === typedNew.id)) {
            addPrompt(typedNew as unknown as Prompt)
          }
        } else if (eventType === 'UPDATE') {
          updatePrompt(typedNew.id as string, typedNew as unknown as Partial<Prompt>)
        } else if (eventType === 'DELETE') {
          deletePrompt(typedOld?.id as string)
        }
      })
      .subscribe()

    const chatsChannel = supabase
      .channel('chats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        const typedNew = newRecord as unknown as Chat
        const typedOld = oldRecord as unknown as Chat
        if (eventType === 'INSERT') {
          const state = useChatStore.getState()
          if (!state.chats.some((c) => c.id === typedNew.id)) {
            addChat(typedNew)
          }
        } else if (eventType === 'UPDATE') {
          useChatStore.getState().updateChat(typedNew.id, typedNew)
        } else if (eventType === 'DELETE') {
          useChatStore.getState().deleteChat(typedOld.id)
        }
      })
      .subscribe()

    return () => {
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
    isAuthenticated,
  ])

  return <>{children}</>
}
