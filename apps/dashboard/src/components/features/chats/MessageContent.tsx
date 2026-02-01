'use client';

import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Copy, Check } from 'lucide-react';

interface MessageContentProps {
  content: string;
}

// Custom renderer for code blocks
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
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
        <div className="absolute top-2 left-3 text-xs font-mono text-slate-400 dark:text-slate-500 uppercase px-2 py-1 bg-slate-800/50 rounded">
          {language}
        </div>
      )}
      
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title="Copy code"
      >
        {copied ? (
          <Check size={16} className="text-green-400" />
        ) : (
          <Copy size={16} />
        )}
      </button>

      {/* Code content */}
      <pre className="bg-slate-900 dark:bg-slate-950 rounded-lg p-4 pt-8 overflow-x-auto border border-slate-700/50">
        <code className="text-sm font-mono text-slate-100">
          {code}
        </code>
      </pre>
    </div>
  );
};

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // Parse markdown and extract code blocks
  const renderContent = () => {
    // Split content by code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(
          <div
            key={`text-${key++}`}
            className="prose dark:prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(marked.parse(textBefore) as string)
            }}
          />
        );
      }

      // Add code block
      const language = match[1];
      const code = match[2].trim();
      parts.push(
        <CodeBlock key={`code-${key++}`} code={code} language={language} />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      parts.push(
        <div
          key={`text-${key++}`}
          className="prose dark:prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(marked.parse(textAfter) as string)
          }}
        />
      );
    }

    return parts.length > 0 ? parts : (
      <div
        className="prose dark:prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(marked.parse(content) as string)
        }}
      />
    );
  };

  return <>{renderContent()}</>;
};
