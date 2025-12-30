'use client';

import React, { useState } from 'react';
import { FileEdit, Settings, Loader2, Copy, Check, Sparkles } from 'lucide-react';

interface SearchResult {
  prompt: {
    id: string;
    title: string;
    prompt: string;
    category?: string;
    tags: string[];
  };
  confidence: number;
  reasoning: string;
  alternatives: any[];
}

export function EnhancePromptCard() {
  const [draftPrompt, setDraftPrompt] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOptimize = async () => {
    if (!draftPrompt.trim()) {
      setError('Please enter what you need help with');
      return;
    }

    setIsOptimizing(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = await fetch('/api/prompts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: draftPrompt.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // If it's a fallback result, still show it
        if (errorData.fallback && errorData.prompt) {
          setSearchResult({
            prompt: errorData.prompt,
            confidence: 0.7,
            reasoning: 'Best match found using keyword matching',
            alternatives: []
          });
          return;
        }
        throw new Error(errorData.error || 'Failed to find matching prompt');
      }

      const data = await response.json();
      
      // Check if response has error but also has fallback data
      if (data.error && data.fallback) {
        setError(data.error);
        // Don't set result if there's an error
        return;
      }
      
      setSearchResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find matching prompt. Please check your internet connection and try again.';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Enhance Prompt
          </h3>
        </div>
        <div className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
          GPT-4 Turbo
        </div>
      </div>

      <div className="space-y-4">
        <textarea
          value={draftPrompt}
          onChange={(e) => {
            setDraftPrompt(e.target.value);
            setSearchResult(null);
            setError(null);
          }}
          placeholder="What do you need? (e.g., write email, review code, explain topic...)"
          className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
        />

        {error && (
          <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {searchResult && (
          <div className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {searchResult.prompt.title}
                  </h4>
                  {searchResult.prompt.category && (
                    <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium rounded">
                      {searchResult.prompt.category}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 italic mb-2">
                  {searchResult.reasoning}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Match: {Math.round(searchResult.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Prompt Content */}
            <div className="px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Found Prompt:
                </span>
                <button
                  onClick={() => handleCopy(searchResult.prompt.prompt)}
                  className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                {searchResult.prompt.prompt}
              </div>
            </div>

            {/* Alternatives */}
            {searchResult.alternatives && searchResult.alternatives.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Other matches:
                </div>
                {searchResult.alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => setSearchResult({ ...searchResult, prompt: alt })}
                    className="w-full text-left px-3 py-2 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
                  >
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {alt.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {alt.category} • Click to view
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleOptimize}
          disabled={isOptimizing || !draftPrompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Optimize with AI
            </>
          )}
        </button>
      </div>
    </div>
  );
}

