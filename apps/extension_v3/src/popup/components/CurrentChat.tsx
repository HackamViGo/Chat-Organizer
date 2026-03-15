import React from 'react';

export default function CurrentChat() {
  // TODO: Implement chat title fetching from active tab
  const currentChat = null;

  if (!currentChat) {
    return null;
  }

  return (
    <div className="bg-slate-800/20 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">🗨️</span>
        <span className="text-slate-300 text-sm truncate">
          Current Chat: <span className="font-medium">AI Analysis - Session 12...</span>
        </span>
      </div>
    </div>
  );
}
