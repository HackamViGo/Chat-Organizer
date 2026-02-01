'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePromptStore } from '@/store/usePromptStore';
import { useFolderStore } from '@/store/useFolderStore';
import { PromptCard } from '@/components/features/prompts/PromptCard';
import { CreatePromptModal } from '@/components/features/prompts/CreatePromptModal';
import { EnhancePromptCard } from '@/components/features/prompts/EnhancePromptCard';
import { DailyPromptCard } from '@/components/features/prompts/DailyPromptCard';
import { createClient } from '@/lib/supabase/client';
import { FileEdit, Plus, Search, ArrowUpDown, LayoutGrid, Folder as FolderIcon, X, Trash2, CheckSquare } from 'lucide-react';
import { FOLDER_ICONS } from '@/components/layout/Sidebar';
import { getFolderColorClass, getFolderTextColorClass, getCategoryIconContainerClasses } from '@/lib/utils/colors';
import { Prompt, Folder } from '@/types';

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

function PromptsPageContent() {
  const { prompts, setPrompts, updatePrompt, selectedPromptIds, deletePrompt, clearSelection } = usePromptStore();
  const { folders, addFolder, isLoading: foldersLoading } = useFolderStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [selectedColor, setSelectedColor] = useState('cyan');

  const selectedFolderId = searchParams.get('folder');
  const setSelectedFolderId = (id: string | null) => {
    if (id) {
      router.push(`/prompts?folder=${id}`);
    } else {
      router.push('/prompts');
    }
  };

  const promptFolders = useMemo(() => folders.filter((f: Folder) => f.type === 'prompt' || !f.type), [folders]);

  const isLoading = usePromptStore(state => state.isLoading);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = prompts;
    
    // Filter by folder (from URL)
    if (selectedFolderId) {
      filtered = filtered.filter(p => p.folder_id === selectedFolderId);
    } else {
      // Filter by category dropdown
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'none') {
          filtered = filtered.filter(p => !p.folder_id);
        } else {
          filtered = filtered.filter(p => p.folder_id === categoryFilter);
        }
      } else {
        // Show all when no folder selected and category is 'all'
        filtered = filtered.filter(p => !p.folder_id);
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((prompt) => 
        prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query)
      );
    }
    
    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'date-asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [prompts, selectedFolderId, categoryFilter, searchQuery, sortBy]);

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingPrompt(null);
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredFolderId(null);

    const promptId = e.dataTransfer.getData('promptId');
    if (!promptId) return;

    try {
      await updatePrompt(promptId, { folder_id: targetFolderId || null });
      
      // Refresh prompts
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) {
          setPrompts(data);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to move prompt:', error instanceof Error ? error.message : error);
      alert('Failed to move prompt');
    }
  };

  const isCreatingFolderRef = React.useRef(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || isCreatingFolderRef.current) return;

    isCreatingFolderRef.current = true;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        isCreatingFolderRef.current = false;
        return;
      }

      const { data, error } = await (supabase as any)
        .from('folders')
        .insert({
          user_id: user.id,
          name: newFolderName,
          type: 'prompt',
          color: selectedColor,
          icon: selectedIcon,
        })
        .select()
        .single();

      if (error) throw error;

      addFolder(data);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
    } catch (error: unknown) {
      console.error('Failed to create folder:', error instanceof Error ? error.message : error);
      alert('Failed to create folder');
    } finally {
      isCreatingFolderRef.current = false;
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPromptIds.length} prompts?`)) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('prompts')
        .delete()
        .in('id', selectedPromptIds);

      if (error) throw error;

      // Update local state
      selectedPromptIds.forEach(id => deletePrompt(id));
      clearSelection();
    } catch (error) {
      console.error('Error deleting prompts:', error);
      alert('Failed to delete selected prompts');
    }
  };

  const randomizeTheme = () => {
    const icons = ['Folder', 'FileEdit', 'FileText', 'Book', 'Sparkles'];
    const colors = ['cyan', 'rose', 'purple', 'blue', 'emerald', 'amber'];
    setSelectedIcon(icons[Math.floor(Math.random() * icons.length)]);
    setSelectedColor(colors[Math.floor(Math.random() * colors.length)]);
  };

  if (!mounted || isLoading || foldersLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen relative">
      {/* Sidebar */}
      <aside className="w-20 hidden md:flex flex-col items-center py-8 border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 backdrop-blur-sm sticky top-0 h-screen gap-4 z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <button 
          onClick={() => setSelectedFolderId(null)}
          onDragOver={(e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            setHoveredFolderId('root'); 
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
              setHoveredFolderId(null);
            }
          }}
          onDrop={(e) => handleDropOnFolder(e, undefined)}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 relative group shrink-0
            ${!selectedFolderId 
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-110' 
              : 'text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200'}
            ${hoveredFolderId === 'root' && selectedFolderId
              ? 'ring-2 ring-cyan-500 dark:ring-cyan-400 bg-cyan-100 dark:bg-cyan-900/20 scale-110 shadow-lg shadow-cyan-500/30 animate-pulse' 
              : ''}  
          `}
          title="All Prompts"
        >
          <LayoutGrid size={24} />
        </button>
        
        <div className="w-8 h-px bg-slate-200 dark:bg-white/10 my-2 shrink-0" />

        <button
          onClick={() => {
            randomizeTheme();
            setIsCreateFolderModalOpen(true);
          }}
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-500 transition-all duration-300 relative group shrink-0"
        >
          <Plus size={24} />
        </button>

        <div className="flex flex-col gap-3 w-full items-center">
          {promptFolders.map(f => {
            const Icon = f.icon && FOLDER_ICONS[f.icon] ? FOLDER_ICONS[f.icon] : FolderIcon;
            const isActive = selectedFolderId === f.id;
            const isHovered = hoveredFolderId === f.id;
            
            const folderPrompts = prompts.filter(p => p.folder_id === f.id);

            return (
              <div key={f.id} className="relative flex items-center justify-center">
                <button
                  onClick={() => setSelectedFolderId(f.id)}
                  onMouseEnter={() => setHoveredFolderId(f.id)}
                  onMouseLeave={() => setHoveredFolderId(null)}
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    setHoveredFolderId(f.id); 
                  }} 
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                      setHoveredFolderId(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnFolder(e, f.id)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 relative shrink-0 z-20
                    ${isActive 
                      ? `${getFolderColorClass(f.color)} text-white shadow-lg scale-110` 
                      : 'text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200'}
                    ${isHovered && !isActive 
                      ? 'ring-2 ring-cyan-400 dark:ring-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 scale-110 shadow-lg shadow-cyan-500/30 animate-pulse' 
                      : ''}
                  `}
                >
                  <Icon size={24} />
                </button>

                {isHovered && (
                  <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 glass-panel rounded-xl shadow-2xl z-50 p-3 flex flex-col pointer-events-none animate-in fade-in slide-in-from-left-4 duration-200">
                    <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                      <Icon size={16} className={getFolderTextColorClass(f.color)} />
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{f.name}</span>
                      <span className="ml-auto text-xs text-slate-500">{folderPrompts.length} prompts</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 p-2">
                      {folderPrompts.length > 0 ? (
                        <div className="space-y-1">
                          {folderPrompts.slice(0, 3).map(prompt => (
                            <div key={prompt.id} className="truncate">{prompt.title}</div>
                          ))}
                          {folderPrompts.length > 3 && (
                            <div className="text-slate-400">+{folderPrompts.length - 3} more</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 italic">Empty folder</div>
                      )}
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-full -mr-1 border-8 border-transparent border-r-[rgba(255,255,255,0.65)] dark:border-r-[rgba(15,23,42,0.6)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-8">
      {/* Header */}
      {selectedPromptIds.length > 0 ? (
        <div className="bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 mb-8 flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-100 dark:bg-cyan-800 p-2 rounded-lg text-cyan-700 dark:text-cyan-300">
              <CheckSquare size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Batch Actions</h2>
              <p className="text-sm text-cyan-600 dark:text-cyan-400">{selectedPromptIds.length} prompts selected</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={clearSelection}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-colors border border-red-600"
            >
              <Trash2 size={18} />
              Delete Selected
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <FileEdit className="w-8 h-8" />
              Prompt Manager
            </h1>
            <p className="text-muted-foreground">
              Organize, Optimize, and Deploy your AI interactions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Prompt
          </button>
        </div>
      )}

      {/* Enhance Prompt and Daily Pick Cards */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="flex-1 lg:w-2/3 min-w-0">
          <EnhancePromptCard />
        </div>
        <div className="flex-shrink-0 lg:w-1/3">
          <DailyPromptCard userPrompts={prompts} />
        </div>
      </div>

      {/* Search, Category and Sort */}
      {prompts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-48 pl-4 pr-10 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="all">Category: All</option>
              <option value="none">No Category</option>
              {promptFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full sm:w-48 pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="date-desc">Sort: Rank (High)</option>
              <option value="date-asc">Sort: Rank (Low)</option>
              <option value="title-asc">Sort: Title (A-Z)</option>
              <option value="title-desc">Sort: Title (Z-A)</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      {prompts.length > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredAndSortedPrompts.length} {filteredAndSortedPrompts.length === 1 ? 'prompt' : 'prompts'}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Empty State */}
      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileEdit className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No prompts yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first prompt to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Prompt
          </button>
        </div>
      ) : filteredAndSortedPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileEdit className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {selectedFolderId ? 'No prompts in this folder' : searchQuery ? 'No prompts found' : 'No prompts'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {selectedFolderId 
              ? 'Move prompts to this folder to organize them'
              : searchQuery 
              ? 'Try adjusting your search query'
              : 'Create your first prompt to get started'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Create Prompt
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPrompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreatePromptModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        editingPrompt={editingPrompt}
      />

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <h3 className="font-semibold text-slate-900 dark:text-white capitalize">New Folder</h3>
              <button onClick={() => setIsCreateFolderModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Close modal" title="Close"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <input 
                autoFocus 
                type="text" 
                placeholder="Folder Name" 
                className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)} 
              />
              <div className="h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-lg p-2 bg-slate-50/50 dark:bg-black/20 space-y-3">
                {[
                  { name: 'Dev', color: 'blue', icons: ['Code', 'Terminal', 'Database'] },
                  { name: 'Ops', color: 'cyan', icons: ['Server', 'Cpu', 'Monitor'] },
                  { name: 'Design', color: 'purple', icons: ['Palette', 'Layers', 'PenTool'] },
                  { name: 'Product', color: 'rose', icons: ['Box', 'Target', 'Flag'] },
                  { name: 'Biz', color: 'emerald', icons: ['Briefcase', 'DollarSign', 'PieChart'] },
                  { name: 'Write', color: 'amber', icons: ['Feather', 'FileText', 'BookOpen'] },
                  { name: 'Comms', color: 'blue', icons: ['MessageSquare', 'Mic', 'Video'] },
                  { name: 'Idea', color: 'amber', icons: ['Lightbulb', 'Sparkles', 'Wand2'] },
                  { name: 'Learn', color: 'cyan', icons: ['Globe', 'Search', 'Scroll'] },
                  { name: 'Life', color: 'rose', icons: ['Heart', 'Home', 'Coffee'] },
                  { name: 'Media', color: 'purple', icons: ['Image', 'Film', 'Music'] },
                  { name: 'Social', color: 'blue', icons: ['Glasses', 'Users', 'Share2', 'Camera', 'Hash'] },
                  { name: 'Admin', color: 'emerald', icons: ['Settings', 'Lock', 'Archive'] },
                  { name: 'Lists', color: 'emerald', icons: ['CheckSquare', 'ListTodo', 'Target'] },
                  { name: 'Body Parts', color: 'pink', icons: ['Body', 'Hand', 'Footprints', 'Eye'] },
                  { name: 'Health', color: 'red', icons: ['Stethoscope', 'Thermometer', 'Activity', 'Pill'] },
                ].map((cat) => (
                  <div key={cat.name}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">{cat.name}</div>
                    <div className="grid grid-cols-6 gap-2">
                      {cat.icons.map(iconKey => {
                        const IconComp = FOLDER_ICONS[iconKey];
                        if (!IconComp) {
                          console.warn(`Icon ${iconKey} not found in FOLDER_ICONS`);
                          return null;
                        }
                        const isSelected = selectedIcon === iconKey;
                        return (
                          <button 
                            key={iconKey} 
                            onClick={() => { setSelectedIcon(iconKey); setSelectedColor(cat.color); }} 
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isSelected ? getCategoryIconContainerClasses(cat.color, true) + ' scale-110' : 'text-slate-400 bg-slate-100 dark:bg-white/5'}`} 
                            type="button"
                            aria-label={`Select ${iconKey} icon`}
                            title={iconKey}
                          >
                            <IconComp size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </form>
            
            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2 bg-slate-50/50 dark:bg-white/5">
              <button onClick={() => setIsCreateFolderModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
              <button onClick={handleCreateFolder} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg" disabled={!newFolderName}>Create</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function PromptsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    }>
      <PromptsPageContent />
    </Suspense>
  );
}
