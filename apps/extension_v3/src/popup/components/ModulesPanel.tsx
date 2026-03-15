import React from 'react';
import { useModules } from '../hooks/useModules';

export default function ModulesPanel() {
  const { modules, toggleChats, togglePrompts } = useModules();

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">⚙️ Modules:</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Chats Toggle */}
          <button
            onClick={toggleChats}
            className="flex items-center gap-2 group"
          >
            <span className="text-sm text-slate-300">Chats:</span>
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${
                modules.chats ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  modules.chats ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>

          {/* Prompts Toggle */}
          <button
            onClick={togglePrompts}
            className="flex items-center gap-2 group"
          >
            <span className="text-sm text-slate-300">Prompts:</span>
            <div
              className={`w-10 h-5 rounded-full transition-colors relative ${
                modules.prompts ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  modules.prompts ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
