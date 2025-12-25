'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuit, Send, X, Sparkles, User } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

export const GlobalBrain: React.FC = () => {
  const { chats } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hello! I am your Collective Memory. I've analyzed all your chats. Ask me things like:\n\n*   \"Where did we discuss Supabase auth?\"\n*   \"What was the conclusion on the UI design?\"\n*   \"Summarize my work on Python scripts.\"" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  const handleAsk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQ = query;
    setQuery('');
    setHistory(prev => [...prev, { role: 'user', content: userQ }]);
    setIsLoading(true);

    try {
      // Build context from all chats
      const context = chats
        .map(c => `Chat: ${c.title}\nContent: ${c.content || ''}\nSummary: ${c.summary || ''}`)
        .join('\n\n');

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Context from all chats:\n${context}\n\nUser Question: ${userQ}`,
          systemInstruction: 'You are a RAG assistant that helps users search and understand their chat history. Provide specific, cited answers based on the context provided.',
        }),
      });

      if (!response.ok) throw new Error('Failed to query memory');

      const data = await response.json();
      setHistory(prev => [...prev, { role: 'ai', content: data.response || 'No answer found.' }]);
    } catch (error) {
      console.error('Memory query error:', error);
      setHistory(prev => [...prev, { role: 'ai', content: "I had trouble accessing your memory banks. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-4 rounded-full shadow-lg shadow-purple-900/30 transition-all hover:scale-110 active:scale-95 group"
        title="Open Collective Memory"
      >
        <BrainCircuit size={28} className="animate-pulse" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ask Collective Memory
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f172a]/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] md:h-[700px] relative">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/40 to-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <BrainCircuit className="text-purple-300" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Collective Memory</h3>
              <p className="text-xs text-purple-300">RAG powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20"
        >
          {history.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${msg.role === 'ai' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}
              `}>
                {msg.role === 'ai' ? <Sparkles size={14} /> : <User size={14} />}
              </div>
              
              <div className={`
                max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-tr-sm' 
                  : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-sm whitespace-pre-wrap'}
              `}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                 <Sparkles size={14} className="animate-spin" />
               </div>
               <div className="bg-slate-800/80 border border-white/5 text-slate-400 rounded-2xl rounded-tl-sm p-4 text-sm flex items-center gap-2">
                 <span>Thinking across {chats.length} chats...</span>
                 <span className="flex gap-1">
                   <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </span>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <form onSubmit={handleAsk} className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about previous decisions, code snippets, or summaries..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-4 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 placeholder:text-slate-500 shadow-inner"
            />
            <button 
              type="submit"
              disabled={!query.trim() || isLoading}
              className="absolute right-2 top-2 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="mt-2 flex justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-1"><BrainCircuit size={10} /> {chats.length} Chats Indexed</span>
            <span className="flex items-center gap-1"><Sparkles size={10} /> Global Context</span>
          </div>
        </div>
      </div>
    </div>
  );
};
