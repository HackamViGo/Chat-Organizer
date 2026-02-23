'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';
import { useShallow } from 'zustand/react/shallow';
import { Chat, Platform, Message } from '@brainbox/shared';
import { 
  Send, Bot, Sparkles, Plus, MessageSquare, 
  Cpu, Zap, MoreVertical, Trash2, ArrowLeft,
  Settings, CheckCircle, Lock, Key, Crown
} from 'lucide-react';


const MODELS = [
  { id: 'gemini', name: 'Gemini 2.5 Flash', icon: Sparkles, color: 'text-blue-400', desc: 'Fast & Versatile' },
  { id: 'gpt', name: 'GPT-4o (Simulated)', icon: Zap, color: 'text-emerald-400', desc: 'Reasoning & Logic' },
  { id: 'claude', name: 'Claude 3.5 (Simulated)', icon: Bot, color: 'text-orange-400', desc: 'Creative & Human' },
];

export const ChatStudio: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get('id');
  
  const { chats, addChat, updateChat, deleteChat } = useChatStore(
    useShallow((s) => ({
      chats: s.chats,
      addChat: s.addChat,
      updateChat: s.updateChat,
      deleteChat: s.deleteChat,
    }))
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings State (in real app would be from settings store)
  const [isPro, setIsPro] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedPro = localStorage.getItem('isPro') === 'true';
        const storedKey = localStorage.getItem('geminiApiKey') || '';
        setIsPro(storedPro);
        setApiKey(storedKey);
      } catch (error) {
        if (error instanceof DOMException) {
          if (error.name === 'SecurityError') {
            console.warn('localStorage access denied, skipping settings load');
          } else if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded');
          }
        }
      }
    }
  }, []);

  // Load chat if ID exists
  useEffect(() => {
    if (activeChatId) {
      const existingChat = chats.find(c => c.id === activeChatId);
      if (existingChat && existingChat.content) {
        setMessages([{ id: crypto.randomUUID(), role: 'system', content: 'Continuing conversation...', timestamp: Date.now() }]);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, chats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    const newHistory: Message[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: userText, timestamp: Date.now() }];
    setMessages(newHistory);
    setIsLoading(true);

    let fullResponse = '';
    
    try {
      let currentChatId = activeChatId;

      // Map system instruction
      let sysInstruction = "You are a helpful AI assistant.";
      if (selectedModel.id === 'gpt') {
        sysInstruction = "You are simulating GPT-4o. Be concise, logical, and highly structured.";
      } else if (selectedModel.id === 'claude') {
        sysInstruction = "You are simulating Claude 3.5 Sonnet. Be warm and articulate.";
      }

      // Call AI API - API key is handled server-side from environment variables
      // Following Google Cloud best practices: don't send API keys from client
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userText,
          history: messages,
          systemInstruction: sysInstruction,
          // Note: API key is NOT sent from client for security
          // Server uses GEMINI_API_KEY from environment variables
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'AI generation failed' }));
        throw new Error(errorData.message || 'AI generation failed');
      }

      const data = await response.json();
      fullResponse = data.response || data.title || 'No response from AI';

      // Add AI response
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: fullResponse, timestamp: Date.now() }]);

      // Save to database
      const rawContent = [...newHistory, { id: crypto.randomUUID(), role: 'assistant' as const, content: fullResponse, timestamp: Date.now() }]
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n');

      if (!currentChatId) {
        const platformMap: Record<string, string> = {
          gemini: 'gemini',
          gpt: 'chatgpt',
          claude: 'claude',
        };

        // Create via API
        const createResponse = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: userText.slice(0, 50) + '...',
            content: rawContent,
            platform: platformMap[selectedModel.id] || 'gemini',
          }),
        });

        if (createResponse.ok) {
          const newChat = await createResponse.json();
          addChat(newChat); // Add to store
          router.push(`/chats?id=${newChat.id}`);
          
          // Auto-analyze in background
          fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: rawContent, chatId: newChat.id }),
          }).catch(err => console.error("Auto-analyze failed", err));
        }
      } else {
        await updateChat(currentChatId, { content: rawContent });
      }

    } catch (error: any) {
      console.error('AI generation error:', error);
      let errorMessage = "Error: Could not connect to the AI model.";
      
      // Provide more specific error messages
      if (error?.message?.includes('API Key') || error?.message?.includes('GEMINI_API_KEY')) {
        errorMessage = "Error: API key not configured. Please set GEMINI_API_KEY in environment variables.";
      } else if (error?.message?.includes('quota') || error?.message?.includes('Quota')) {
        errorMessage = "Error: API quota exceeded. Please try again later.";
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    router.push('/chats');
    setMessages([]);
    setInput('');
  };

  const saveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim() && typeof window !== 'undefined') {
      try {
        localStorage.setItem('geminiApiKey', apiKeyInput.trim());
        setApiKey(apiKeyInput.trim());
      } catch (error) {
        console.warn('Failed to save API key to localStorage:', error);
        // Still set in state even if localStorage fails
        setApiKey(apiKeyInput.trim());
      }
    }
  };

  const activateUltra = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('isPro', 'true');
        setIsPro(true);
      } catch (error) {
        console.warn('Failed to save Pro status to localStorage:', error);
        // Still set in state even if localStorage fails
        setIsPro(true);
      }
    } else {
      setIsPro(true);
    }
  };

  // --- ACCESS GATE: PRO CHECK ---
  if (!isPro) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0B1121] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
            <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-cyan-500/30 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-md w-full text-center shadow-2xl border-t border-white/20 relative z-10 flex flex-col items-center gap-6">
           <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-2">
             <Crown size={40} className="text-white" />
           </div>
           
           <div>
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Ultra Access Required</h2>
             <p className="text-slate-600 dark:text-slate-400">
               The AI Studio is reserved for Ultra members. Unlock limitless creativity today.
             </p>
           </div>

           <div className="w-full bg-slate-100 dark:bg-black/30 rounded-xl p-4 text-left space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle size={16} className="text-emerald-500" /> Unlimited AI Personas
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle size={16} className="text-emerald-500" /> Bring Your Own Key (BYOK)
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle size={16} className="text-emerald-500" /> Advanced Reasoning Models
              </div>
           </div>

           <button 
             onClick={activateUltra}
             className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold text-lg shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
           >
             Unlock Ultra
           </button>
           
           <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
             Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  // --- ACCESS GATE: API KEY CHECK ---
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0B1121] relative overflow-hidden">
        <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-md w-full text-center shadow-2xl border-t border-white/20 relative z-10 flex flex-col items-center gap-6">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-2">
             <Key size={32} className="text-white" />
           </div>
           
           <div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">API Key Required</h2>
             <p className="text-slate-600 dark:text-slate-400 text-sm">
               To use the Ultra AI Studio, provide your Gemini API Key. Stored locally in browser.
             </p>
           </div>

           <form onSubmit={saveKey} className="w-full flex flex-col gap-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your Gemini API Key"
                  className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={!apiKeyInput.trim()}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                Save & Enter Studio
              </button>
           </form>
           
           <div className="text-xs text-slate-400">
             Don&apos;t have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline">Get one from Google</a>
           </div>

           <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-2">
             Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  // --- MAIN STUDIO RENDER ---
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B1121] overflow-hidden">
      {/* Left Sidebar: History */}
      <div className="w-80 border-r border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl flex-col hidden md:flex">
         <div className="p-4 border-b border-slate-200 dark:border-white/5">
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              <Plus size={18} /> New Conversation
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Recent Chats</div>
            {chats.filter(c => !c.is_archived).slice(0, 20).map(chat => (
               <button
                 key={chat.id}
                 onClick={() => router.push(`/chats?id=${chat.id}`)}
                 className={`w-full text-left p-3 rounded-lg transition-all border border-transparent group
                    ${activeChatId === chat.id 
                      ? 'bg-white dark:bg-white/5 shadow-md border-slate-200 dark:border-white/5' 
                      : 'hover:bg-white/50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}
                 `}
               >
                 <div className="font-medium truncate text-sm text-slate-900 dark:text-slate-200 mb-0.5">{chat.title}</div>
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] opacity-60 truncate">{chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'N/A'}</span>
                   {activeChatId === chat.id && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={async (e) => { 
                        e.stopPropagation(); 
                        try {
                          await deleteChat(chat.id);
                          handleNewChat();
                        } catch (error) {
                          console.error('Failed to delete chat:', error);
                        }
                      }}>
                         <Trash2 size={12} className="text-red-400 hover:text-red-500" />
                      </div>
                   )}
                 </div>
               </button>
            ))}
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
         {/* Header */}
         <div className="h-16 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
            <div className="flex items-center gap-4">
               <button className="md:hidden text-slate-500" onClick={() => router.push('/')}><ArrowLeft size={20} /></button>
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/5 ${selectedModel.color}`}>
                    <selectedModel.icon size={20} />
                 </div>
                 <div>
                    <h2 className="font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                      {selectedModel.name}
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shadow-sm">ULTRA</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedModel.desc}</p>
                 </div>
               </div>
            </div>

            <div className="flex items-center gap-2">
               {/* Model Selector */}
               <div className="flex bg-slate-100 dark:bg-black/30 rounded-lg p-1">
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m)}
                      className={`p-2 rounded-md transition-all ${selectedModel.id === m.id ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                      title={m.name}
                    >
                      <m.icon size={16} />
                    </button>
                  ))}
               </div>
               <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <Settings size={20} />
               </button>
            </div>
         </div>

         {/* Messages */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <div className={`w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6 ${selectedModel.color}`}>
                     <selectedModel.icon size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Hello, Ultra User</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    I&apos;m ready to help with code, design, writing, or analysis. Select a persona above and start typing.
                  </p>
               </div>
            ) : (
               messages.map((msg, idx) => (
                 <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-white/20' : `bg-slate-100 dark:bg-white/5 ${selectedModel.color}`}`}>
                       {msg.role === 'user' ? <div className="w-4 h-4 rounded-full bg-slate-500" /> : <selectedModel.icon size={16} />}
                    </div>
                    
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                       msg.role === 'user' 
                       ? 'bg-blue-600 text-white rounded-tr-sm' 
                       : 'bg-white dark:bg-[#1a2236] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                    }`}>
                       <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                 </div>
               ))
            )}
            {isLoading && (
               <div className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/5 ${selectedModel.color}`}>
                     <Sparkles size={16} className="animate-spin" />
                  </div>
                  <div className="bg-white dark:bg-[#1a2236] border border-slate-200 dark:border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
         </div>

         {/* Input */}
         <div className="p-6 pt-2 bg-gradient-to-t from-slate-50 dark:from-[#0B1121] via-slate-50 dark:via-[#0B1121] to-transparent">
            <form 
              onSubmit={handleSend}
              className="glass-panel p-2 rounded-2xl flex items-end gap-2 shadow-2xl shadow-cyan-900/10 border-slate-300 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-xl"
            >
               <button type="button" className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <Plus size={20} />
               </button>
               <textarea 
                  autoFocus
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Message ${selectedModel.name}...`}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 py-3 max-h-32 resize-none"
                  style={{ minHeight: '48px' }}
               />
               <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`p-3 rounded-xl transition-all duration-300 ${input.trim() ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}
               >
                  <Send size={20} />
               </button>
            </form>
            <div className="text-center mt-2 text-[10px] text-slate-400">
               AI can make mistakes. Please verify important information.
            </div>
         </div>
      </div>
    </div>
  );
};
