import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#0B1121] dark:via-[#0f1729] dark:to-[#0B1121]">
      <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
          <Search className="text-purple-500" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          404
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Page not found
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Home size={18} />
          Go Home
        </Link>
      </div>
    </div>
  );
}

