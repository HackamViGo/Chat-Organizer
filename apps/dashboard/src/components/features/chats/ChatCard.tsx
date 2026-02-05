'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Chat, Platform } from '@brainbox/shared';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { useShallow } from 'zustand/react/shallow';
import { generateEmbedding } from '@brainbox/shared';
import { usePathname } from 'next/navigation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MessageContent } from './MessageContent';
import { PROVIDER_ASSETS } from '@brainbox/assets';
import { 
  Check, CheckSquare, ExternalLink, Sparkles, MoreVertical
} from 'lucide-react';
// Provider icons are now handled by @brainbox/assets


import { ChatBadges, PlatformIcon } from './components/ChatBadges';
import { ChatActionMenu } from './components/ChatActionMenu';
import { AIAnalysisModal } from './components/AIAnalysisModal';

interface ChatCardProps {
  chat: Chat;
}

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

export const ChatCard: React.FC<ChatCardProps> = ({ chat }) => {
  const updateChat = useChatStore(s => s.updateChat);
  const deleteChat = useChatStore(s => s.deleteChat);
  const selectedChatIds = useChatStore(s => s.selectedChatIds);
  const toggleChatSelection = useChatStore(s => s.toggleChatSelection);
  const folders = useFolderStore(useShallow(s => s.folders));
  const pathname = usePathname();
  const isSelected = selectedChatIds.has(chat.id);
  
  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Editing Title
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Selection mode state
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Title Editing Logic
  const handleTitleSave = async (title: string) => {
    if (title.trim() && title !== chat.title) {
      await updateChat(chat.id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  // Description Editing Logic
  const handleDescSave = async (content: string) => {
    if (content !== chat.content) {
      await updateChat(chat.id, { content });
    }
  };

  // Archive Logic
  const handleArchive = async () => {
    await updateChat(chat.id, { is_archived: !chat.is_archived });
  };

  const handleUrlSave = async (url: string) => {
    if (url !== chat.url) {
      await updateChat(chat.id, { url });
    }
  };

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
  };

  const handleMoveFolder = async (folderId?: string) => {
    await updateChat(chat.id, { folder_id: folderId });
  };

  // AI Analysis Logic
  const handleAIAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!chat.content) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Generating Title...');
    
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
        detailed_summary: result.detailedSummary,
        tags: result.tags,
        tasks: result.tasks,
        embedding: result.embedding,
      } as any);
    } catch (e) {
      console.error('AI Analysis error:', e);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  return (
    <>
      <div 
        ref={cardRef}
        id={chat.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('chatId', chat.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          longPressTimerRef.current = setTimeout(() => {
            setIsLongPressing(true);
            toggleChatSelection(chat.id);
          }, 500);
        }}
        onMouseUp={() => {
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        }}
        onMouseLeave={() => {
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        }}
        onClick={() => {
          if (!isLongPressing) {
            if (selectedChatIds.size > 0) toggleChatSelection(chat.id);
            else setShowViewModal(true);
          }
          setIsLongPressing(false);
        }}
        className={`group relative flex flex-col h-full rounded-2xl transition-all duration-300
          bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/5
          hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-500/30
          ${isHighlighted ? 'ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/20 scale-[1.02]' : ''}
          ${isSelected ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''}
          p-5
        `}
      >
        {/* Selection Checkbox */}
        {(isSelected || isLongPressing || selectedChatIds.size > 0) && (
          <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                ${isSelected 
                  ? 'bg-blue-600 border-blue-600 text-white opacity-100 scale-100' 
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-500 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
                }`}
              onClick={() => toggleChatSelection(chat.id)}
            >
              {isSelected && <Check size={14} className="text-white" />}
            </button>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 overflow-hidden pr-2">
             <div className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-cyan-500/10 transition-colors border border-slate-200 dark:border-white/5">
                <PlatformIcon platform={(chat.platform as Platform) || Platform.Other} />
             </div>
             <div className="min-w-0 flex-1">
               {isEditingTitle ? (
                 <div className="flex items-center gap-2">
                  <input
                    ref={titleInputRef}
                    defaultValue={chat.title}
                    onBlur={(e) => handleTitleSave(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave((e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    className="w-full bg-white dark:bg-black/40 border border-cyan-500/50 rounded px-1 py-0.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                </div>
               ) : (
                 <h3 
                   onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                   className="font-sans font-semibold text-base leading-tight text-slate-900 dark:text-white truncate group-hover:text-cyan-500 transition-colors cursor-text"
                 >
                   {chat.title}
                 </h3>
               )}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  <span className="flex items-center gap-1">
                    <PlatformIcon platform={(chat.platform as Platform) || Platform.Other} className="!w-3 !h-3" />
                    {chat.platform || 'AI'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>{chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
             </div>
          </div>
          
          <ChatActionMenu 
            chat={chat}
            onEdit={() => setShowViewModal(true)}
            onArchive={handleArchive}
            onDownload={handleDownload}
            onDelete={() => deleteChat(chat.id)}
            onMove={handleMoveFolder}
          />
        </div>

        {/* Summary */}
        <div 
          className="flex-1 mb-4 text-sm text-slate-500 dark:text-slate-300 line-clamp-3 leading-relaxed tracking-wide font-normal mix-blend-plus-lighter cursor-pointer"
          onClick={() => setShowViewModal(true)}
        >
          {(chat.summary || chat.content || '').replace(/\[USER\]|You:|User:|Assistant:|Bot:/gi, '').trim() || 'No description available.'}
        </div>

        {/* Badges, Tags, Tasks */}
        <ChatBadges chat={chat} compact />

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
          <div className="flex gap-3 items-center">
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
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={16} />
              </a>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleAIAnalyze(e);
              }}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all min-w-[100px] justify-center
                ${isAnalyzing 
                  ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                }`}
            >
              {isAnalyzing ? (
                 <span className="animate-pulse">{analysisStatus || 'Analyzing...'}</span>
              ) : (
                <>
                  <Sparkles size={14} /> Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AIAnalysisModal 
        chat={chat}
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        onSaveContent={handleDescSave}
        isAnalyzing={isAnalyzing}
        analysisStatus={analysisStatus}
      />
    </>
  );
};

