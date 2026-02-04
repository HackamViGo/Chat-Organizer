import React from 'react';
import { Search, Filter, Plus, X, Sparkles } from 'lucide-react';

interface MasterToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onNewChat: () => void;
  isSemanticSearch: boolean;
  onToggleSemanticSearch: () => void;
  selectedCount?: number;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  allSelected?: boolean;
  onDeleteSelected?: () => void;
  isDownloading?: boolean;
  isDeleting?: boolean;
  downloadMenu?: React.ReactNode;
}

export const MasterToolbar: React.FC<MasterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onNewChat,
  isSemanticSearch,
  onToggleSemanticSearch,
  selectedCount = 0,
  onSelectAll,
  onDeselectAll,
  allSelected,
  onDeleteSelected,
  isDownloading = false,
  isDeleting = false,
  downloadMenu,
}) => {
  if (selectedCount > 0) {
    return (
      <div className="flex items-center justify-between h-11 px-4 bg-cyan-900/10 backdrop-blur-md border-b border-cyan-500/20 sticky top-0 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedCount}</span>
             <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Selected</span>
           </div>
           
           <div className="h-4 w-px bg-cyan-500/20 mx-2" />
           
           <button 
             onClick={allSelected ? onDeselectAll : onSelectAll}
             className="text-base text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 font-medium transition-colors h-11 min-w-[44px] px-4"
           >
             {allSelected ? 'Deselect All' : 'Select All'}
           </button>
        </div>

        <div className="flex items-center gap-2">
           {downloadMenu}
           
           <button
             onClick={onDeleteSelected}
             disabled={isDeleting}
             className="flex items-center gap-2 px-4 h-11 min-w-[44px] bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg transition-colors text-base font-medium"
           >
             {isDeleting ? 'Deleting...' : 'Delete'}
           </button>
           
           <button
             onClick={onDeselectAll}
             className="ml-2 h-11 min-w-[44px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-slate-500 transition-colors"
           >
             <X size={18} />
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between h-11 px-4 bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="flex gap-2 items-center flex-1 max-w-md">
        <div className="relative group w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={16} />
           <input
             type="text"
             value={searchQuery}
             onChange={(e) => onSearchChange(e.target.value)}
             placeholder="Search chats..."
             className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
           />
           {searchQuery && (
             <button
               onClick={onClearSearch}
               className="absolute right-0 top-1/2 -translate-y-1/2 h-11 min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
             >
               <X size={14} />
             </button>
           )}
        </div>
      </div>

      <div className="flex gap-3 items-center ml-4">
        <button
          onClick={onToggleSemanticSearch}
           className={`flex items-center gap-2 px-3 h-11 min-w-[44px] rounded-lg border transition-all duration-200 text-base font-medium ${
            isSemanticSearch
              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
              : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Semantic AI Search (Natural Language)"
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">AI Search</span>
        </button>

        <button
          onClick={onToggleFilters}
          className={`flex items-center justify-center gap-2 px-4 h-11 min-w-[44px] rounded-lg border transition-all duration-200 text-base font-medium ${
            hasActiveFilters
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
              : 'border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Filter size={16} />
          <span>Filters</span>
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>}
        </button>

        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-6 h-11 min-w-[44px] bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all shadow-[0_0_15px_-3px_rgba(8,145,178,0.4)] font-medium text-base"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>
    </div>
  );
};
