'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { ChatCard } from '@/components/features/chats/ChatCard';
import { MessageSquarePlus, CheckSquare, Square, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ChatsPage() {
  const { 
    chats, 
    setChats, 
    selectedChatIds, 
    selectAllChats, 
    deselectAllChats, 
    deleteChats 
  } = useChatStore();
  const [mounted, setMounted] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customSource, setCustomSource] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newChatData, setNewChatData] = useState({
    title: '',
    url: '',
    platform: 'ChatGPT',
    content: ''
  });

  const selectedCount = selectedChatIds.size;
  const allSelected = chats.length > 0 && selectedChatIds.size === chats.length;

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch('/api/chats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setChats]);

  useEffect(() => {
    setMounted(true);
    fetchChats();
  }, [fetchChats]);

  // Auto-detect platform from URL
  const detectPlatform = (url: string): string => {
    if (!url) return 'Other';
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('chatgpt') || lowerUrl.includes('openai')) return 'ChatGPT';
    if (lowerUrl.includes('claude') || lowerUrl.includes('anthropic')) return 'Claude';
    if (lowerUrl.includes('gemini') || lowerUrl.includes('bard')) return 'Gemini';
    if (lowerUrl.includes('perplexity')) return 'Perplexity';
    if (lowerUrl.includes('lmarena') || lowerUrl.includes('lmsys')) return 'LMArena';
    
    return 'Other';
  };

  const handleNewChat = async () => {
    if (!newChatData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    // Use custom source if "Other" is selected and custom source is provided
    const finalPlatform = newChatData.platform === 'Other' && customSource.trim() 
      ? customSource.trim() 
      : newChatData.platform;

    setIsSaving(true);

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newChatData.title,
          url: newChatData.url || window.location.href,
          platform: finalPlatform,
          content: newChatData.content,
          folder_id: null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save');
      }

      const data = await response.json();
      setShowNewChatModal(false);
      setNewChatData({ title: '', url: '', platform: 'ChatGPT', content: '' });
      setCustomSource('');
      window.location.reload();
    } catch (error) {
      console.error('Error saving chat:', error);
      alert(`Failed to save chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  const handleSelectAll = () => {
    if (allSelected) {
      deselectAllChats();
    } else {
      selectAllChats();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      setIsDeleting(true);
      const idsArray = Array.from(selectedChatIds);
      await deleteChats(idsArray);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting chats:', error);
      alert('Failed to delete chats. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Chats</h1>
          <p className="text-muted-foreground">
            Manage and organize your AI conversations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedCount} {selectedCount === 1 ? 'chat' : 'chats'} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete Selected'}
              </button>
            </>
          )}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-5 h-5" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="w-5 h-5" />
                Select All
              </>
            )}
          </button>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <MessageSquarePlus className="w-5 h-5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={32} />
              <h2 className="text-xl font-bold">Delete {selectedCount} {selectedCount === 1 ? 'chat' : 'chats'}?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone. All selected chats will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewChatModal(false);
              setNewChatData({ title: '', url: '', platform: 'ChatGPT', content: '' });
              setCustomSource('');
            }
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full scale-[0.8]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold">Add New Chat</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Manually add a chat conversation
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newChatData.title}
                  onChange={(e) => {
                    setNewChatData({ ...newChatData, title: e.target.value });
                  }}
                  placeholder="e.g., How to build a React app"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL</label>
                <input
                  type="url"
                  value={newChatData.url}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    setNewChatData({ ...newChatData, url: newUrl });
                    // Auto-detect platform
                    if (newUrl) {
                      const detected = detectPlatform(newUrl);
                      setNewChatData(prev => ({ ...prev, url: newUrl, platform: detected }));
                    }
                  }}
                  placeholder="https://chatgpt.com/c/..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Source</label>
                <select
                  value={newChatData.platform}
                  onChange={(e) => {
                    setNewChatData({ ...newChatData, platform: e.target.value });
                    if (e.target.value !== 'Other') {
                      setCustomSource('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800"
                >
                  <option value="ChatGPT">ChatGPT</option>
                  <option value="Claude">Claude</option>
                  <option value="Gemini">Gemini</option>
                  <option value="Perplexity">Perplexity</option>
                  <option value="LMArena">LMArena</option>
                  <option value="Other">Other (Custom)</option>
                </select>
                
                {newChatData.platform === 'Other' && (
                  <input
                    type="text"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="Enter custom source name..."
                    className="w-full px-4 py-2 mt-2 border border-purple-300 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-purple-50 dark:bg-purple-900/20"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description/Content
                </label>
                <textarea
                  value={newChatData.content}
                  onChange={(e) => setNewChatData({ ...newChatData, content: e.target.value })}
                  placeholder="Paste the chat conversation here..."
                  rows={10}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 font-mono text-sm resize-none overflow-y-auto"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setNewChatData({ title: '', url: '', platform: 'ChatGPT', content: '' });
                  setCustomSource('');
                }}
                disabled={isSaving}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleNewChat}
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Chat'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
