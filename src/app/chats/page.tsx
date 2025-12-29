'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { ChatCard } from '@/components/features/chats/ChatCard';
import { MessageSquarePlus, CheckSquare, Square, Trash2, AlertTriangle, LayoutGrid, Plus, Folder as FolderIcon, X, ChevronRight } from 'lucide-react';
import { FOLDER_ICONS } from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase/client';
import { getItemsInFolderAndNested, getChildFolders } from '@/lib/utils/folders';
import Link from 'next/link';

function ChatsPageContent() {
  const { 
    chats, 
    setChats, 
    selectedChatIds, 
    selectAllChats, 
    deselectAllChats, 
    deleteChats,
    updateChat
  } = useChatStore();
  const { folders, addFolder } = useFolderStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const isCreatingFolderRef = React.useRef(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [selectedColor, setSelectedColor] = useState('cyan');

  const selectedFolderId = searchParams.get('folder');
  const setSelectedFolderId = (id: string | null) => {
    if (id) {
      router.push(`/chats?folder=${id}`);
    } else {
      router.push('/chats');
    }
  };

  const selectedCount = selectedChatIds.size;
  const allSelected = chats.length > 0 && selectedChatIds.size === chats.length;
  
  const chatFolders = useMemo(() => folders.filter(f => (f as any).type === 'chat' || !(f as any).type), [folders]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const displayedChats = useMemo(() => {
    if (selectedFolderId) {
      return getItemsInFolderAndNested(selectedFolderId, chats, folders);
    }
    return chats.filter(c => !c.folder_id);
  }, [chats, selectedFolderId, folders]);
  
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };
  
  const renderNestedFolders = (parentId: string | null, level: number = 0): React.ReactNode => {
    const childFolders = getChildFolders(chatFolders, parentId);
    
    return childFolders.map(f => {
      const Icon = f.icon && FOLDER_ICONS[f.icon] ? FOLDER_ICONS[f.icon] : FolderIcon;
      const isActive = selectedFolderId === f.id;
      const isHovered = hoveredFolderId === f.id;
      const isExpanded = expandedFolders.has(f.id);
      const hasChildren = getChildFolders(chatFolders, f.id).length > 0;
      const folderChats = getItemsInFolderAndNested(f.id, chats, folders);
      
      return (
        <div key={f.id} className="relative flex items-center justify-center">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 8}px` }}>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolderExpansion(f.id);
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ChevronRight 
                  size={12} 
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <button
              onClick={() => setSelectedFolderId(f.id)}
              onMouseEnter={() => setHoveredFolderId(f.id)}
              onMouseLeave={() => setHoveredFolderId(null)}
              onDragOver={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                setHoveredFolderId(f.id); 
              }} 
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                  setHoveredFolderId(null);
                }
              }}
              onDrop={(e) => handleDropOnFolder(e, f.id)}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 relative shrink-0 z-20
                ${isActive 
                  ? `bg-${f.color}-500 text-white shadow-lg scale-110` 
                  : 'text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200'}
                ${isHovered && !isActive 
                  ? 'ring-2 ring-cyan-400 dark:ring-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 scale-110 shadow-lg shadow-cyan-500/30 animate-pulse' 
                  : ''}
              `}
            >
              <Icon size={24} />
            </button>
          </div>
          
          {isHovered && (
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 glass-panel rounded-xl shadow-2xl z-50 p-3 flex flex-col pointer-events-none animate-in fade-in slide-in-from-left-4 duration-200">
              <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                <Icon size={16} className={`text-${f.color}-500`} />
                <span className="font-semibold text-slate-900 dark:text-white truncate">{f.name}</span>
                <span className="ml-auto text-xs text-slate-500">{folderChats.length} chats</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 p-2">
                {folderChats.length > 0 ? (
                  <div className="space-y-1">
                    {folderChats.slice(0, 3).map(chat => (
                      <div key={chat.id} className="truncate">{chat.title}</div>
                    ))}
                    {folderChats.length > 3 && (
                      <div className="text-slate-400">+{folderChats.length - 3} more</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 italic">Empty folder</div>
                )}
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-full -mr-1 border-8 border-transparent border-r-[rgba(255,255,255,0.65)] dark:border-r-[rgba(15,23,42,0.6)]" />
            </div>
          )}
          
          {isExpanded && hasChildren && (
            <div className="w-full mt-2">
              {renderNestedFolders(f.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

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

    // Folders are loaded by FolderProvider - no need for additional fetching
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

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredFolderId(null);

    const chatId = e.dataTransfer.getData('chatId');
    if (!chatId) return;

    const idsToMove = selectedChatIds.has(chatId) 
      ? Array.from(selectedChatIds) 
      : [chatId];

    try {
      const supabase = createClient();
      for (const id of idsToMove) {
        await updateChat(id, { folder_id: targetFolderId || null });
      }
      
      // Refresh chats
      await fetchChats();
      
      if (selectedChatIds.has(chatId)) {
        deselectAllChats();
      }
    } catch (error) {
      console.error('Failed to move chats:', error);
      alert('Failed to move chats');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || isCreatingFolderRef.current) return;

    isCreatingFolderRef.current = true;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        isCreatingFolderRef.current = false;
        return;
      }

      const { data, error } = await (supabase as any)
        .from('folders')
        .insert({
          user_id: user.id,
          name: newFolderName,
          type: 'chat',
          color: selectedColor,
          icon: selectedIcon,
        })
        .select()
        .single();

      if (error) throw error;

      addFolder(data);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    } finally {
      isCreatingFolderRef.current = false;
    }
  };

  const randomizeTheme = () => {
    const icons = ['Folder', 'MessageSquare', 'FileText', 'Book', 'Archive'];
    const colors = ['cyan', 'rose', 'purple', 'blue', 'emerald', 'amber'];
    setSelectedIcon(icons[Math.floor(Math.random() * icons.length)]);
    setSelectedColor(colors[Math.floor(Math.random() * colors.length)]);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen relative">
      {/* Sidebar */}
      <aside className="w-20 hidden md:flex flex-col items-center py-8 border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 backdrop-blur-sm sticky top-0 h-screen gap-4 z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setSelectedFolderId(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHoveredFolderId('root');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
              setHoveredFolderId(null);
            }
          }}
          onDrop={(e) => handleDropOnFolder(e, undefined)}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 relative group shrink-0
            ${!selectedFolderId
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-110'
              : 'text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200'}
            ${hoveredFolderId === 'root' && selectedFolderId
              ? 'ring-2 ring-cyan-500 dark:ring-cyan-400 bg-cyan-100 dark:bg-cyan-900/20 scale-110 shadow-lg shadow-cyan-500/30 animate-pulse'
              : ''}
          `}
          title="All Chats"
        >
          <LayoutGrid size={24} />
        </button>

        <div className="w-8 h-px bg-slate-200 dark:bg-white/10 my-2 shrink-0" />

        <button
          onClick={() => {
            randomizeTheme();
            setIsCreateFolderModalOpen(true);
          }}
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-500 transition-all duration-300 relative group shrink-0"
        >
          <Plus size={24} />
        </button>

        <div className="flex flex-col gap-3 w-full items-start">
          {renderNestedFolders(null)}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-8">
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

      {displayedChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquarePlus className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {selectedFolderId ? 'No chats in this folder' : 'No saved chats'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {selectedFolderId
              ? 'Move chats to this folder to organize them'
              : 'Start a conversation in AI Studio to see it here'}
          </p>
          {!selectedFolderId && (
            <Link
              href="/studio"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to AI Studio
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedChats.map((chat) => (
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

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <h3 className="font-semibold text-slate-900 dark:text-white capitalize">New Folder</h3>
              <button onClick={() => setIsCreateFolderModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Close modal" title="Close"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <input
                autoFocus
                type="text"
                placeholder="Folder Name"
                className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <div className="h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-lg p-2 bg-slate-50/50 dark:bg-black/20 space-y-3">
                {[
                  { name: 'Dev', color: 'blue', icons: ['Code', 'Terminal', 'Database'] },
                  { name: 'Ops', color: 'cyan', icons: ['Server', 'Cpu', 'Monitor'] },
                  { name: 'Design', color: 'purple', icons: ['Palette', 'Layers', 'PenTool'] },
                  { name: 'Product', color: 'rose', icons: ['Box', 'Target', 'Flag'] },
                  { name: 'Biz', color: 'emerald', icons: ['Briefcase', 'DollarSign', 'PieChart'] },
                  { name: 'Write', color: 'amber', icons: ['Feather', 'FileText', 'BookOpen'] },
                  { name: 'Comms', color: 'blue', icons: ['MessageSquare', 'Mic', 'Video'] },
                  { name: 'Idea', color: 'amber', icons: ['Lightbulb', 'Sparkles', 'Wand2'] },
                  { name: 'Learn', color: 'cyan', icons: ['Globe', 'Search', 'Scroll'] },
                  { name: 'Life', color: 'rose', icons: ['Heart', 'Home', 'Coffee'] },
                  { name: 'Media', color: 'purple', icons: ['Image', 'Film', 'Music'] },
                  { name: 'Social', color: 'blue', icons: ['Glasses', 'Users', 'Share2', 'Camera', 'Hash'] },
                  { name: 'Admin', color: 'emerald', icons: ['Settings', 'Lock', 'Archive'] },
                  { name: 'Lists', color: 'emerald', icons: ['CheckSquare', 'ListTodo', 'Target'] },
                  { name: 'Body Parts', color: 'pink', icons: ['Body', 'Hand', 'Footprints', 'Eye'] },
                  { name: 'Health', color: 'red', icons: ['Stethoscope', 'Thermometer', 'Activity', 'Pill'] },
                ].map((cat) => (
                  <div key={cat.name}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">{cat.name}</div>
                    <div className="grid grid-cols-6 gap-2">
                      {cat.icons.map(iconKey => {
                        const IconComp = FOLDER_ICONS[iconKey];
                        if (!IconComp) {
                          console.warn(`Icon ${iconKey} not found in FOLDER_ICONS`);
                          return null;
                        }
                        const isSelected = selectedIcon === iconKey;
                        return (
                          <button
                            key={iconKey}
                            onClick={() => { setSelectedIcon(iconKey); setSelectedColor(cat.color); }}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isSelected ? `bg-${cat.color}-500 text-white shadow-md scale-110` : 'text-slate-400 bg-slate-100 dark:bg-white/5'}`}
                            type="button"
                            aria-label={`Select ${iconKey} icon`}
                            title={iconKey}
                          >
                            <IconComp size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2 bg-slate-50/50 dark:bg-white/5">
              <button onClick={() => setIsCreateFolderModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
              <button onClick={handleCreateFolder} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg" disabled={!newFolderName}>Create</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    }>
      <ChatsPageContent />
    </Suspense>
  );
}
