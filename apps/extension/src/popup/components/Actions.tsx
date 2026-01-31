/// <reference types="chrome"/>

import React from 'react';

export default function Actions() {
  const openDashboard = () => {
    chrome.tabs.create({ url: 'https://brainbox-alpha.vercel.app' });
  };

  return (
    <div className="space-y-3">
      {/* Open Dashboard Button */}
      <button
        onClick={openDashboard}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <span>🧠</span>
        <span>OPEN DASHBOARD</span>
      </button>

      {/* Download Section */}
      <div className="flex items-center gap-2">
        <button className="flex-1 bg-slate-800/50 text-slate-300 text-sm py-2 rounded-lg border border-slate-700/50 hover:bg-slate-800/70 transition-colors flex items-center justify-center gap-1">
          <span>💾</span>
          <span>Download Selection</span>
        </button>
        <select className="bg-slate-800/50 text-slate-300 text-sm py-2 px-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/70 transition-colors cursor-pointer">
          <option>.md</option>
          <option>.txt</option>
          <option>.json</option>
        </select>
      </div>

      {/* Batch Pictures (Ghost Button) */}
      <button className="w-full text-slate-400 hover:text-slate-300 text-sm py-2 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 flex items-center justify-center gap-2">
        <span>🖼️</span>
        <span>Batch Pictures</span>
      </button>
    </div>
  );
}
