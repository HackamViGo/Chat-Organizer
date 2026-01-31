import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function StatusBar() {
  const { isConnected, userEmail, sync, logout } = useAuth();

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
          onClick={sync}
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
          title="Sync Auth"
        >
          🔄
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
