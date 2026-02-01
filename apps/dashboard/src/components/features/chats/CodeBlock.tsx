'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative group my-4">
      {/* Language badge */}
      {language && (
        <div className="absolute top-2 left-3 text-xs font-mono text-slate-400 dark:text-slate-500 uppercase">
          {language}
        </div>
      )}
      
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title="Copy code"
      >
        {copied ? (
          <Check size={16} className="text-green-400" />
        ) : (
          <Copy size={16} />
        )}
      </button>

      {/* Code content */}
      <pre className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-700/50">
        <code className="text-sm font-mono text-slate-100">
          {code}
        </code>
      </pre>
    </div>
  );
};
