
import Actions from './components/Actions';
import CurrentChat from './components/CurrentChat';
import Footer from './components/Footer';
import Header from './components/Header';
import ModulesPanel from './components/ModulesPanel';
import QuickAccess from './components/QuickAccess';
import StatusBar from './components/StatusBar';

export default function App() {
  return (
    <div className="w-[380px] h-fit bg-gradient-to-br from-slate-900 to-slate-800 p-3">
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
