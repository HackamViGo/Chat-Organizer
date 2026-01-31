import React from 'react';
import Header from './components/Header';
import StatusBar from './components/StatusBar';
import CurrentChat from './components/CurrentChat';
import ModulesPanel from './components/ModulesPanel';
import QuickAccess from './components/QuickAccess';
import Actions from './components/Actions';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="w-[380px] min-h-[520px] bg-gradient-to-br from-slate-900 to-slate-800 p-3">
      <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl overflow-hidden shadow-2xl">
        <Header />
        <div className="p-4 space-y-4">
          <StatusBar />
          <CurrentChat />
          <ModulesPanel />
          <QuickAccess />
          <Actions />
        </div>
        <Footer />
      </div>
    </div>
  );
}
