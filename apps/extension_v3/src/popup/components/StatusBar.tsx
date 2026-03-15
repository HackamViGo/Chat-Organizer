import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function StatusBar() {
  const { isConnected, userEmail, sync, logout } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await sync();
    // Keep spinning for visual feedback
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div className="space-y-3">
      {/* Auth Status */}
      <div className="bg-slate-800/30 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="text-sm text-slate-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`text-slate-400 hover:text-cyan-400 transition-all hover:scale-110 active:scale-95 ${
            isSyncing ? 'animate-spin text-cyan-400' : ''
          }`}
          title="Sync All Tokens"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>

      {/* User Info */}
      {isConnected && userEmail && (
        <div className="bg-slate-800/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
              👤
            </div>
            <span className="text-sm text-slate-300 truncate max-w-[200px]">{userEmail}</span>
          </div>
          <button
            onClick={logout}
            className="text-red-400 hover:text-red-300 transition-colors text-xs font-medium"
          >
            LOGOUT
          </button>
        </div>
      )}
    </div>
  );
}
