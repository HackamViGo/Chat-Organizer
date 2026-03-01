'use client';

import { getFolderColorClass, getFolderTextColorClass, getCategoryIconContainerClasses , getItemsInFolderAndNested, getChildFolders } from '@brainbox/shared';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import JSZip from 'jszip';
import { MessageSquarePlus, MessageSquare, CheckSquare, Square, Trash2, AlertTriangle, LayoutGrid, Plus, Folder as FolderIcon, X, ChevronRight, Search, Calendar, Filter, Download, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { ChatCard } from '@/components/features/chats/ChatCard';
import { MasterToolbar } from '@/components/features/chats/MasterToolbar';
import { FOLDER_ICONS } from '@/components/layout/HybridSidebar';
import { createClient } from '@/lib/supabase/client';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';





function ChatsPageContent() {
  const { 
    chats, 
    setChats, 
    selectedChatIds, 
    selectAllChats, 
    deselectAllChats, 
    deleteChats,
    updateChat
  } = useChatStore(
    useShallow(s => ({
      chats: s.chats,
      setChats: s.setChats,
      selectedChatIds: s.selectedChatIds,
      selectAllChats: s.selectAllChats,
      deselectAllChats: s.deselectAllChats,
      deleteChats: s.deleteChats,
      updateChat: s.updateChat
    }))
  );
  const { folders, addFolder, isLoading: foldersLoading } = useFolderStore(
    useShallow(s => ({ folders: s.folders, addFolder: s.addFolder, isLoading: s.isLoading }))
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customSource, setCustomSource] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
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
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[]>([]);

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
    let result = chats;
    
    // Folder filter - prioritize selectedFolderId from URL, then folderFilter
    const activeFolderId = selectedFolderId || (folderFilter !== 'all' && folderFilter !== 'none' ? folderFilter : null);
    
    if (activeFolderId) {
      result = getItemsInFolderAndNested(activeFolderId, chats, folders);
    } else if (folderFilter === 'none' || (!selectedFolderId && folderFilter === 'all')) {
      result = chats.filter(c => !c.folder_id);
    } else {
      result = chats;
    }
    
    // Search query
    if (searchQuery) {
      result = result.filter(c => 
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Platform filter
    if (platformFilter !== 'all') {
      result = result.filter(c => {
        const platform = c.platform?.toLowerCase() || '';
        if (platformFilter === 'chatgpt') return platform.includes('chatgpt') || platform.includes('gpt');
        if (platformFilter === 'claude') return platform.includes('claude');
        if (platformFilter === 'gemini') return platform.includes('gemini');
        if (platformFilter === 'other') {
          return !platform.includes('chatgpt') && !platform.includes('gpt') && 
                 !platform.includes('claude') && !platform.includes('gemini');
        }
        return true;
      });
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      result = result.filter(c => {
        if (!c.created_at) return false;
        const chatDate = new Date(c.created_at).getTime();
        const fromDate = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toDate = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : Date.now();
        return chatDate >= fromDate && chatDate <= toDate;
      });
    }
    
    if (isSemanticSearch && searchQuery) {
      return semanticResults;
    }
    
    return result;
  }, [chats, selectedFolderId, folders, searchQuery, platformFilter, folderFilter, dateFrom, dateTo, isSemanticSearch, semanticResults]);
  
  const clearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setFolderFilter('all');
    setDateFrom('');
    setDateTo('');
    setIsSemanticSearch(false);
    setSemanticResults([]);
  };
  
  const hasActiveFilters = searchQuery || platformFilter !== 'all' || folderFilter !== 'all' || dateFrom || dateTo;

  // Semantic Search Effect
  useEffect(() => {
    if (!isSemanticSearch || !searchQuery) {
      setSemanticResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, limit: 20 }),
        });
        if (response.ok) {
          const results = await response.json();
          setSemanticResults(results);
        }
      } catch (err) {
        console.error('Semantic search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, isSemanticSearch]);
  
  
  

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

  // Dynamic column count for virtualization
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth >= 1024) setColumns(3); // lg
      else if (window.innerWidth >= 768) setColumns(2); // md
      else setColumns(1);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: Math.ceil(displayedChats.length / columns),
    estimateSize: () => 240, // estimated height of ChatCard + gap
    overscan: 5,
  });

  if (!mounted || isLoading || foldersLoading) {
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

  const getChatContent = (chat: any, format: 'txt' | 'md' | 'pdf'): string => {
    const sanitizeFilename = (str: string) => {
      if (!str) return 'untitled';
      return str.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase().substring(0, 50);
    };
    
    if (format === 'txt') {
      return `Title: ${chat.title || 'Untitled Chat'}\nPlatform: ${chat.platform || 'Unknown'}\nDate: ${chat.created_at ? new Date(chat.created_at).toLocaleString() : 'Unknown'}\n${chat.url ? `URL: ${chat.url}\n` : ''}\n${chat.summary ? `Summary:\n${chat.summary}\n\n` : ''}${chat.content ? `Content:\n${chat.content}` : 'No content'}`;
    } else if (format === 'md') {
      let content = `# ${chat.title || 'Untitled Chat'}\n\n`;
      content += `**Platform:** ${chat.platform || 'Unknown'}\n`;
      content += `**Date:** ${chat.created_at ? new Date(chat.created_at).toLocaleString() : 'Unknown'}\n`;
      if (chat.url) {
        content += `**URL:** ${chat.url}\n`;
      }
      content += `\n`;
      if (chat.summary) {
        content += `## Summary\n\n${chat.summary}\n\n`;
      }
      if (chat.content) {
        content += `## Content\n\n${chat.content}\n`;
      }
      return content;
    } else {
      // PDF format - generate HTML
      const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(chat.title || 'Untitled Chat')}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; }
    .meta { background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .meta p { margin: 5px 0; }
    .content { white-space: pre-wrap; background: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 20px; }
    @media print {
      body { padding: 20px; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(chat.title || 'Untitled Chat')}</h1>
  <div class="meta">
    <p><strong>Platform:</strong> ${escapeHtml(chat.platform || 'Unknown')}</p>
    <p><strong>Date:</strong> ${escapeHtml(chat.created_at ? new Date(chat.created_at).toLocaleString() : 'Unknown')}</p>
    ${chat.url ? `<p><strong>URL:</strong> <a href="${escapeHtml(chat.url)}">${escapeHtml(chat.url)}</a></p>` : ''}
  </div>
  ${chat.summary ? `<h2>Summary</h2><div class="content">${escapeHtml(chat.summary)}</div>` : ''}
  ${chat.content ? `<h2>Content</h2><div class="content">${escapeHtml(chat.content)}</div>` : ''}
</body>
</html>`;
    }
  };

  const handleDownloadSelected = async (format: 'txt' | 'md' | 'pdf') => {
    if (selectedCount === 0) return;
    
    const selectedChats = chats.filter(c => selectedChatIds.has(c.id));
    setShowDownloadMenu(false);
    
    try {
      const zip = new JSZip();
      const sanitizeFilename = (str: string) => {
        if (!str) return 'untitled';
        return str.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase().substring(0, 50);
      };
      
      const fileExtension = format === 'txt' ? 'txt' : format === 'md' ? 'md' : 'html';
      
      // Track used filenames to handle duplicates
      const usedFilenames = new Map<string, number>();
      
      // Add all chats to ZIP with unique filenames
      selectedChats.forEach((chat, index) => {
        let baseFilename = sanitizeFilename(chat.title || 'untitled');
        const uniqueId = chat.id.substring(0, 8);
        
        // If filename already used, add unique ID to ensure all files are included
        if (usedFilenames.has(baseFilename)) {
          const count = (usedFilenames.get(baseFilename) || 0) + 1;
          usedFilenames.set(baseFilename, count);
          // Use unique ID for duplicates to ensure all files are saved
          baseFilename = `${baseFilename}_${uniqueId}`;
        } else {
          usedFilenames.set(baseFilename, 0);
        }
        
        // Use chat ID if title is empty
        const filename = baseFilename || `chat_${uniqueId}`;
        
        const content = getChatContent(chat, format);
        zip.file(`${filename}.${fileExtension}`, content);
      });
      
      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download ZIP file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chats-export-${new Date().toISOString().split('T')[0]}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file. Please try again.');
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <MasterToolbar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hasActiveFilters={!!(searchQuery || platformFilter !== 'all' || folderFilter !== 'all' || dateFrom || dateTo)}
          onNewChat={() => setShowNewChatModal(true)}
          isSemanticSearch={isSemanticSearch}
          onToggleSemanticSearch={() => setIsSemanticSearch(!isSemanticSearch)}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          onDeselectAll={deselectAllChats}
          allSelected={allSelected}
          onDeleteSelected={() => setShowDeleteConfirm(true)}
          isDeleting={isDeleting}
          downloadMenu={(
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-2 px-4 h-11 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download Selected</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-20 overflow-hidden text-sm">
                  <button
                    onClick={() => handleDownloadSelected('txt')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    Download as TXT
                  </button>
                  <button
                    onClick={() => handleDownloadSelected('md')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    Download as MD
                  </button>
                  <button
                    onClick={() => handleDownloadSelected('pdf')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                  >
                    Download as PDF
                  </button>
                </div>
              )}
            </div>
          )}
        />
        
        <div className="p-6 md:p-10 flex flex-col gap-6">
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Platform
                </label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="all">All Platforms</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              {/* Folder Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Folder
                </label>
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="all">All Folders</option>
                  <option value="none">No Folder (Uncategorized)</option>
                  {chatFolders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
            
            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Click outside to close download menu */}
        {showDownloadMenu && (
          <div
            className="fixed inset-0 z-[5]"
            onClick={() => setShowDownloadMenu(false)}
          />
        )}

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
          <div
            className="w-full relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow: any) => (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {Array.from({ length: columns }).map((_, colIndex) => {
                  const itemIndex = virtualRow.index * columns + colIndex;
                  const chat = displayedChats[itemIndex];
                  if (!chat) return <div key={colIndex} />;
                  return (
                    <div 
                      key={chat.id} 
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards h-full"
                    >
                      <ChatCard chat={chat} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        </div>
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
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isSelected ? getCategoryIconContainerClasses(cat.color, true) + ' scale-110' : 'text-slate-400 bg-slate-100 dark:bg-white/5'}`}
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
