'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Chat, Platform } from '@/types';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { usePathname } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MessageContent } from './MessageContent';
import { analyzeChatContent } from '../../../utils/chatAnalysis';
import { 
  MoreVertical, CheckSquare, Trash2, 
  Archive, ArchiveRestore, Sparkles, ExternalLink,
  FolderInput, Edit2, X, Check, AlertTriangle, FileText,
  Folder as DefaultFolderIcon, Link as LinkIcon, Square, Download, Maximize, Minimize,
  // Dev
  Code, Terminal, Cpu, Database, Server,
  // Art
  Palette, Image, PenTool, Wand2, Layers,
  // Writer
  Feather, BookOpen, Pencil, Scroll,
  // Work
  Briefcase, DollarSign, PieChart, Target, Calculator,
  // Media
  Music, Video, Mic, Film, Headphones,
  // Life
  Globe, Heart, Coffee, Home, Sun
} from 'lucide-react';

interface ChatCardProps {
  chat: Chat;
}

// Icon mapping for folders
const CARD_ICONS: Record<string, React.ElementType> = {
  // Dev
  Code, Terminal, Cpu, Database, Server,
  // Art
  Palette, Image, PenTool, Wand2, Layers,
  // Writer
  Feather, BookOpen, FileText, Pencil, Scroll,
  // Work
  Briefcase, DollarSign, PieChart, Target, Calculator,
  // Media
  Music, Video, Mic, Film, Headphones,
  // Life
  Globe, Heart, Coffee, Home, Sun,
  // Fallback
  Folder: DefaultFolderIcon
};

// Map for semantic colors to background utility classes
const BG_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
  amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  cyan: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
};

const PlatformBadge: React.FC<{ platform: Platform }> = ({ platform }) => {
  const colors = {
    [Platform.ChatGPT]: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30',
    [Platform.Claude]: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/20 dark:border-orange-500/30',
    [Platform.Gemini]: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/20 dark:border-blue-500/30',
    [Platform.Other]: 'bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300 border-gray-500/20 dark:border-gray-500/30',
  };

  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${colors[platform]}`}>
      {platform}
    </span>
  );
};

export const ChatCard: React.FC<ChatCardProps> = ({ chat }) => {
  const { updateChat, deleteChat, selectedChatIds, toggleChatSelection } = useChatStore();
  const { folders } = useFolderStore();
  const pathname = usePathname();
  const isSelected = selectedChatIds.has(chat.id);
  
  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Editing Title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(chat.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Editing Description (Summary)
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState(chat.content || '');
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [modalContent, setModalContent] = useState(chat.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Editing URL
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState(chat.url || '');

  // Selection mode state
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  // Handle click outside to close editing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (isEditingTitle) setIsEditingTitle(false);
        if (isEditingDesc) setIsEditingDesc(false);
        if (isEditingUrl) setIsEditingUrl(false);
      }
    };

    if (isEditingTitle || isEditingDesc || isEditingUrl) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditingTitle, isEditingDesc, isEditingUrl]);

  // Handle long press for selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      toggleChatSelection(chat.id);
    }, 500); // 500ms hold
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Check for hash highlight
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === `#${chat.id}`) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname, chat.id]);

  // AI Analysis Logic (Server-side)
  const handleAIAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chat.content) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Generating Title...');
    
    const stepTimer = setTimeout(() => setAnalysisStatus('Summarizing content...'), 1000);
    const stepTimer2 = setTimeout(() => setAnalysisStatus('Extracting tasks...'), 2000);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chat.content, chatId: chat.id }),
      });
      
      if (!response.ok) throw new Error('AI analysis failed');
      
      const result = await response.json();
      
      await updateChat(chat.id, {
        title: result.title,
        summary: result.summary,
        tasks: result.tasks,
      });
    } catch (e) {
      console.error('AI Analysis error:', e);
    } finally {
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('chatId', chat.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Title Editing Logic
  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== chat.title) {
      await updateChat(chat.id, { title: editedTitle.trim() });
    } else {
      setEditedTitle(chat.title); // Revert if empty
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setEditedTitle(chat.title);
      setIsEditingTitle(false);
    }
  };

  // Description Editing Logic
  const handleDescSave = async () => {
    if (editedDesc !== chat.content) {
      await updateChat(chat.id, { content: editedDesc });
    }
    setIsEditingDesc(false);
  };
  // URL Editing Logic
  const handleUrlSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedUrl !== chat.url) {
      await updateChat(chat.id, { url: editedUrl });
    }
    setIsEditingUrl(false);
  };

  // Local Analysis Logic (Regex-based)
  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnalyzing || !chat.messages || !Array.isArray(chat.messages) || chat.messages.length === 0) return;

    setIsAnalyzing(true);
    try {
      const result = analyzeChatContent(chat.messages as any[]);
      
      const updateData: any = {
        tasks: result.tasks.length > 0 ? result.tasks : chat.tasks
      };

      // Only update summary if we have a valid regex-generated one and existing summary is empty
      if (result.summary && !chat.summary) {
        updateData.summary = result.summary;
      }

      await updateChat(chat.id, updateData);
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  // Modal content save
  const handleSaveModalContent = async () => {
    if (modalContent !== chat.content) {
      await updateChat(chat.id, { content: modalContent });
    }
    setIsEditingInModal(false);
    setShowViewModal(false);
  };

  // Text formatting functions
  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = modalContent.substring(start, end);
    
    // If nothing selected and we're adding markers, add placeholder
    const textToWrap = selectedText || 'text';
    
    const beforeText = modalContent.substring(0, start);
    const afterText = modalContent.substring(end);
    const newText = beforeText + before + textToWrap + after + afterText;
    
    // Calculate new selection position
    const newStart = start + before.length;
    const newEnd = newStart + textToWrap.length;
    
    // Update content
    setModalContent(newText);
    
    // Restore selection immediately after React updates
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 10);
  };


  // Move Folder Logic
  const handleMoveFolder = async (folderId?: string) => {
    await updateChat(chat.id, { folder_id: folderId });
    setShowMoveModal(false);
    setShowMenu(false);
  };

  // Archive Logic
  const handleArchive = async () => {
    await updateChat(chat.id, { is_archived: !chat.is_archived });
    setShowMenu(false);
  };

  // Download Logic
  const handleDownload = () => {
    const content = `Title: ${chat.title}\nPlatform: ${chat.platform || 'Unknown'}\nDate: ${chat.created_at ? new Date(chat.created_at).toLocaleString() : 'Unknown'}\n${chat.url ? `URL: ${chat.url}\n` : ''}\n${chat.summary ? `Summary:\n${chat.summary}\n\n` : ''}${chat.content ? `Content:\n${chat.content}` : 'No content'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const folder = folders.find(f => f.id === chat.folder_id);
  
  // Resolve Folder Icon (folders don't have icon field in DB, use default)
  const FolderIconComp = DefaultFolderIcon;
  const folderStyleClass = folder?.color ? (BG_COLORS[folder.color] || BG_COLORS.default) : '';

  return (
    <>
      <div 
        ref={cardRef}
        id={chat.id}
        draggable
        onDragStart={handleDragStart}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (!isLongPressing) {
            // If in selection mode, toggle selection instead of opening
            if (selectedChatIds.size > 0) {
              toggleChatSelection(chat.id);
            } else {
              setShowViewModal(true);
            }
          }
          setIsLongPressing(false);
        }}
        className={`glass-card rounded-xl p-5 relative group flex flex-col h-full cursor-pointer text-slate-900 dark:text-white transition-all duration-500 hover:scale-[1.02]
          ${isHighlighted ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/20 scale-[1.02]' : ''}
          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''}
        `}
      >
        {/* Selection Checkbox */}
        {(isSelected || isLongPressing || selectedChatIds.size > 0) && (
          <div 
            className="absolute top-3 left-3 z-10"
            onClick={(e) => {
              e.stopPropagation();
              toggleChatSelection(chat.id);
            }}
          >
            <button
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                ${isSelected 
                  ? 'bg-blue-600 border-blue-600 text-white opacity-100 scale-100' 
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-500 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              {isSelected && <Check size={14} className="text-white" />}
            </button>
          </div>
        )}
        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-4 animate-in fade-in duration-200">
            <AlertTriangle className="text-red-500 mb-2" size={32} />
            <h4 className="font-bold mb-1 text-slate-900 dark:text-white">Delete Chat?</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-sm transition-colors text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  try {
                    await deleteChat(chat.id);
                    setShowDeleteConfirm(false);
                  } catch (error) {
                    console.error('Failed to delete chat:', error);
                    alert('Failed to delete chat. Please try again.');
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Move Modal Overlay */}
        {showMoveModal && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 animate-in fade-in duration-200 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold">Move to...</h4>
              <button onClick={() => setShowMoveModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              <button 
                onClick={() => handleMoveFolder(undefined)}
                className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
              >
                No Folder (Root)
              </button>
              {folders.map(f => {
                 const ListIcon = DefaultFolderIcon;
                 return (
                  <button 
                    key={f.id}
                    onClick={() => handleMoveFolder(f.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-200 dark:hover:bg-white/10 flex items-center gap-2
                      ${chat.folder_id === f.id ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-white/5' : 'text-slate-700 dark:text-slate-300'}
                    `}
                  >
                    <ListIcon size={14} className={chat.folder_id === f.id ? 'text-cyan-500' : 'text-slate-400'} />
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 items-center flex-wrap">
            <PlatformBadge platform={(chat.platform || Platform.Other) as Platform} />
            
            {/* Analyze Button */}
            {chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0 && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`p-1 rounded-full border transition-all ${
                  isAnalyzing 
                    ? 'border-cyan-500/50 text-cyan-500 animate-pulse bg-cyan-500/10' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-cyan-500 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                }`}
                title="Analyze Chat (Generate Summary & Tasks)"
              >
                <Sparkles size={12} className={isAnalyzing ? 'animate-spin-slow' : ''} />
              </button>
            )}


            {folder && (
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${folderStyleClass}`}>
                <FolderIconComp size={10} />
                <span className="text-[10px] font-medium">
                  {folder.name}
                </span>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            
            {showMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-10 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-200"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowViewModal(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMoveModal(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <FolderInput size={14} /> Move to Folder
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  <Download size={14} /> Download
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleArchive(); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                >
                  {chat.is_archived ? <ArchiveRestore size={14}/> : <Archive size={14}/>}
                  {chat.is_archived ? 'Restore' : 'Archive'}
                </button>
                <div className="h-px bg-slate-200 dark:bg-white/5 my-1" />
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title (Inline Edit) */}
        <div className="mb-2 min-h-[28px]">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="w-full bg-white dark:bg-black/40 border border-cyan-500/50 rounded px-2 py-0.5 text-lg font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
              <button onClick={handleTitleSave} className="text-cyan-600 dark:text-cyan-400"><Check size={18}/></button>
            </div>
          ) : (
            <h3 
              onClick={() => setIsEditingTitle(true)}
              className="font-semibold text-lg leading-tight hover:text-cyan-600 dark:hover:text-cyan-300 cursor-text transition-colors truncate text-slate-800 dark:text-slate-100"
              title="Click to rename"
            >
              {chat.title}
            </h3>
          )}
        </div>

        {/* Summary (with Edit Mode) */}
        <div className="flex-1 mb-4 relative group/desc">
          {isEditingDesc ? (
            <div className="h-full flex flex-col gap-2">
               <textarea 
                  autoFocus
                  className="w-full h-full min-h-[100px] bg-slate-50 dark:bg-black/30 border border-cyan-500 rounded p-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  placeholder="Enter a description..."
               />
               <div className="flex justify-end gap-2">
                 <button onClick={() => { setEditedDesc(chat.content || ''); setIsEditingDesc(false); }} className="text-xs px-2 py-1 text-slate-500">Cancel</button>
                 <button onClick={handleDescSave} className="text-xs px-2 py-1 bg-cyan-600 text-white rounded">Save</button>
               </div>
            </div>
          ) : (
            <>
              {chat.summary || chat.content ? (
                <div 
                  className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 cursor-text"
                  onClick={() => setIsEditingDesc(true)}
                  title="Click to edit description"
                >
                  {chat.summary || chat.content}
                </div>
              ) : (
                <p 
                  className="text-sm text-slate-500 italic cursor-pointer hover:text-cyan-600"
                  onClick={() => setIsEditingDesc(true)}
                >
                  No description. Click to add.
                </p>
              )}
            </>
          )}
        </div>

        {/* Tasks Preview */}
        {chat.tasks && Array.isArray(chat.tasks) && chat.tasks.length > 0 && (
          <div className="mb-4 space-y-1">
            {(chat.tasks as string[]).slice(0, 2).map((task, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                <CheckSquare size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="truncate">{task}</span>
              </div>
            ))}
            {chat.tasks.length > 2 && (
              <div className="text-xs text-slate-400 dark:text-slate-500 pl-5">+{chat.tasks.length - 2} more tasks</div>
            )}
          </div>
        )}

        {/* Footer / Actions / URL Editing */}
        <div className="mt-auto">
          {isEditingUrl ? (
            <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex flex-col gap-2">
               <div className="flex items-center gap-2">
                  <LinkIcon size={14} className="text-slate-400" />
                  <input 
                    autoFocus
                    className="flex-1 bg-slate-50 dark:bg-black/30 border border-cyan-500/50 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                    placeholder="https://..."
                    value={editedUrl}
                    onChange={(e) => setEditedUrl(e.target.value)}
                  />
               </div>
               <div className="flex justify-end gap-2">
                 <button 
                   onClick={() => { setEditedUrl(chat.url || ''); setIsEditingUrl(false); }} 
                   className="text-[10px] px-2 py-1 bg-slate-200 dark:bg-white/10 rounded hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleUrlSave} 
                   className="text-[10px] px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium"
                 >
                   Save URL
                 </button>
               </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <span className="text-xs text-slate-500">
                  {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'}
                </span>
                {chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0 && (
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {chat.messages.length} msg{chat.messages.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {chat.url && (
                  <a 
                    href={chat.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Open Original"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <button 
                  onClick={handleAIAnalyze}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[100px] justify-center
                    ${isAnalyzing 
                      ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30' 
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_-3px_rgba(8,145,178,0.4)]'
                    }`}
                >
                  {isAnalyzing ? (
                     <span>{analysisStatus || 'Processing...'}</span>
                  ) : (
                    <>
                      <Sparkles size={14} /> Analyze
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Chat Modal */}
      {showViewModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowViewModal(false);
              setIsEditingInModal(false);
              setModalContent(chat.content || '');
            }
          }}
        >
          <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full overflow-hidden flex flex-col transition-all ${
            isFullscreen ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'
          }`}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{chat.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setIsEditingInModal(false);
                    setModalContent(chat.content || '');
                    setIsFullscreen(false);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
              {isEditingInModal ? (
                <textarea
                  ref={textareaRef}
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className="w-full h-full min-h-[400px] font-mono text-sm bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              ) : (
                <>
                  {chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0 ? (
                    <div className="space-y-6">
                      {(chat.messages as any[]).map((msg, idx) => (
                        <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl p-4 ${
                            msg.role === 'user' 
                              ? 'bg-purple-600 text-white rounded-tr-none' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                          }`}>
                            <div className="text-[10px] uppercase tracking-wider font-bold mb-1 opacity-70">
                              {msg.role === 'user' ? 'You' : (chat.platform || 'Assistant').toUpperCase()}
                            </div>
                            <MessageContent content={msg.content || ''} />
                            {msg.metadata?.images && Array.isArray(msg.metadata.images) && msg.metadata.images.length > 0 && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {msg.metadata.images.map((img: string, i: number) => (
                                        <img key={i} src={img} alt="Gemini generated" className="rounded-lg w-full h-auto border border-white/10" />
                                    ))}
                                </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      className="prose dark:prose-invert max-w-none cursor-text markdown-content"
                      onClick={() => setIsEditingInModal(true)}
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(marked.parse(chat.content || 'No content available') as string) 
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Toolbar */}
            {isEditingInModal && (
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/50">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  onClick={() => insertFormatting('_', '_')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => insertFormatting('~~', '~~')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors line-through"
                  title="Strikethrough"
                >
                  S
                </button>
                <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button
                  onClick={() => insertFormatting('==', '==')}
                  className="px-2 py-1 hover:bg-yellow-200 dark:hover:bg-yellow-500/30 rounded-lg transition-colors bg-yellow-100 dark:bg-yellow-500/20 text-sm"
                  title="Highlight"
                >
                  ⬤
                </button>
                <button
                  onClick={() => insertFormatting('`', '`')}
                  className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-mono text-sm"
                  title="Code"
                >
                  {'</>'}
                </button>
                <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button
                  onClick={() => insertFormatting('# ', '')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-bold text-lg"
                  title="Heading"
                >
                  H
                </button>
                <button
                  onClick={() => insertFormatting('- ', '')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="List"
                >
                  ≡
                </button>
              </div>
            )}

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex gap-2 items-center text-sm text-slate-600 dark:text-slate-400">
                <PlatformBadge platform={chat.platform as Platform} />
                {chat.url && (
                  <a 
                    href={chat.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={14} />
                    Open Original
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                {isEditingInModal ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingInModal(false);
                        setModalContent(chat.content || '');
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveModalContent}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditingInModal(true)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        setModalContent(chat.content || '');
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

