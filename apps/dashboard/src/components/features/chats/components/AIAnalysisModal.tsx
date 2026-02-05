'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Maximize, Minimize, Sparkles, ExternalLink,
  Bold, Italic, Strikethrough, Code, Heading, List, Highlighter
} from 'lucide-react';
import { Chat, Platform } from '@brainbox/shared';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MessageContent } from '../MessageContent';
import { PlatformBadge } from './ChatBadges';

interface AIAnalysisModalProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onSaveContent: (content: string) => Promise<void>;
  isAnalyzing?: boolean;
  analysisStatus?: string;
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  chat,
  isOpen,
  onClose,
  onSaveContent,
  isAnalyzing = false,
  analysisStatus = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalContent, setModalContent] = useState(chat.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setModalContent(chat.content || '');
      setIsEditing(false);
    }
  }, [isOpen, chat.content]);

  const handleSave = async () => {
    await onSaveContent(modalContent);
    setIsEditing(false);
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = modalContent.substring(start, end);
    const textToWrap = selectedText || 'text';
    
    const beforeText = modalContent.substring(0, start);
    const afterText = modalContent.substring(end);
    const newText = beforeText + before + textToWrap + after + afterText;
    
    setModalContent(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, start + before.length + textToWrap.length);
      }
    }, 10);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col transition-all duration-500 transform scale-100 ${
        isFullscreen ? 'max-w-[98vw] h-[98vh]' : 'max-w-5xl h-[90vh]'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{chat.title}</h2>
            {isAnalyzing && (
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-bold animate-pulse">
                <Sparkles size={14} />
                {analysisStatus || 'Analyzing...'}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-500 dark:text-slate-400 active:scale-95"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all text-slate-500 dark:text-slate-400 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={modalContent}
              onChange={(e) => setModalContent(e.target.value)}
              className="w-full h-full min-h-[500px] font-mono text-sm bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border-2 border-slate-200 dark:border-white/5 focus:border-cyan-500 focus:ring-0 transition-all resize-none leading-relaxed"
              placeholder="Start writing..."
              autoFocus
            />
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              {/* Detailed Summary Section */}
              {chat.detailed_summary && (
                <div className="p-8 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/10 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={64} className="text-cyan-500" />
                  </div>
                  <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 flex items-center gap-2">
                    <Sparkles size={20} /> AI Deep Analysis
                  </h3>
                  <div 
                    className="prose dark:prose-invert max-w-none text-base text-slate-700 dark:text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(marked.parse(chat.detailed_summary) as string) 
                    }}
                  />
                </div>
              )}

              {/* Messages Context */}
              {chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0 ? (
                <div className="space-y-6">
                   <h3 className="text-lg font-bold text-slate-400 dark:text-slate-500 mb-6 uppercase tracking-widest text-sm">Conversation History</h3>
                  {(chat.messages as any[]).map((msg, idx) => (
                    <div key={msg.id || idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl p-5 shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-cyan-600 text-white rounded-tr-none' 
                          : 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/5 rounded-tl-none'
                      }`}>
                        <div className={`text-[10px] uppercase tracking-wider font-black mb-2 opacity-50 ${msg.role === 'user' ? 'text-white' : 'text-cyan-500'}`}>
                          {msg.role === 'user' ? 'You' : (chat.platform || 'Assistant').toUpperCase()}
                        </div>
                        <MessageContent content={msg.content || ''} />
                        {msg.metadata?.images && Array.isArray(msg.metadata.images) && msg.metadata.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {msg.metadata.images.map((img: string, i: number) => (
                                    <img key={i} src={img} alt="Generated asset" className="rounded-xl w-full h-auto border border-white/10 hover:scale-[1.02] transition-transform cursor-pointer" />
                                ))}
                            </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className="prose dark:prose-invert max-w-none markdown-content"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(marked.parse(chat.content || 'No content available') as string) 
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4 bg-slate-50/50 dark:bg-white/[0.02]">
          {isEditing && (
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => insertFormatting('**', '**')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Bold"><Bold size={18}/></button>
              <button onClick={() => insertFormatting('_', '_')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Italic"><Italic size={18}/></button>
              <button onClick={() => insertFormatting('~~', '~~')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Strikethrough"><Strikethrough size={18}/></button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              <button onClick={() => insertFormatting('==', '==')} className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors text-yellow-600" title="Highlight"><Highlighter size={18}/></button>
              <button onClick={() => insertFormatting('`', '`')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Code"><Code size={18}/></button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              <button onClick={() => insertFormatting('# ', '')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Heading"><Heading size={18}/></button>
              <button onClick={() => insertFormatting('- ', '')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors" title="List"><List size={18}/></button>
            </div>
          )}
          
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-4 items-center">
              <PlatformBadge platform={chat.platform as Platform} />
              {chat.url && (
                <a 
                  href={chat.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-cyan-600 transition-colors"
                >
                  <ExternalLink size={16} />
                  Source Origin
                </a>
              )}
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setModalContent(chat.content || '');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-sm font-medium transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Update Content
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 text-sm font-medium transition-all hover:shadow-md"
                  >
                    Edit Content
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                  >
                    Close View
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
