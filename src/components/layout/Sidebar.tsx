'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { Chat, Folder } from '@/types';
import { 
  LayoutGrid, Archive, FileEdit, Settings, 
  Folder as FolderIcon, Plus, ChevronRight, ChevronDown, Hash, User, X, Search,
  ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp, GripVertical, ListTodo,
  MessageSquarePlus, MessageCircle,
  // Dev Icons
  Code, Terminal, Cpu, Database, Server,
  // Art Icons
  Palette, Image, PenTool, Wand2, Layers, Camera,
  // Writer Icons
  Feather, BookOpen, FileText, Pencil, Scroll,
  // Work Icons
  Briefcase, DollarSign, PieChart, Target, Calculator,
  // Media Icons
  Music, Video, Mic, Film, Headphones,
  // Life Icons
  Globe, Heart, Coffee, Home, Sun,
  // Extra Icons
  Smartphone, Box, Star, Flag, Zap, Lightbulb, Monitor, MousePointer, 
  Eye, Lock, MessageSquare, Bot, Gamepad, Sparkles,
  Dice5, CheckSquare, ImageIcon
} from 'lucide-react';

// --- Configuration Constants ---

export const FOLDER_ICONS: Record<string, React.ElementType> = {
  // Dev
  Code, Terminal, Cpu, Database, Server,
  // Art
  Palette, Image, PenTool, Wand2, Layers, Camera,
  // Writer
  Feather, BookOpen, FileText, Pencil, Scroll,
  // Work
  Briefcase, DollarSign, PieChart, Target, Calculator,
  // Media
  Music, Video, Mic, Film, Headphones,
  // Life
  Globe, Heart, Coffee, Home, Sun,
  // Extras
  Smartphone, Box, Star, Flag, Zap, Lightbulb, Monitor, MousePointer, 
  Eye, Lock, MessageSquare, Bot, Gamepad, Sparkles, CheckSquare, ListTodo,
  // System / Nav
  Settings, Archive, Search, User, Hash,
  // Fallback
  Folder: FolderIcon 
};

export const ICON_CATEGORIES = [
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
  { name: 'Admin', color: 'emerald', icons: ['Settings', 'Lock', 'Archive'] },
  { name: 'Lists', color: 'emerald', icons: ['CheckSquare', 'ListTodo', 'Target'] }
];

export const getCategoryColor = (iconKey: string): string => {
  const category = ICON_CATEGORIES.find(cat => cat.icons.includes(iconKey));
  return category ? category.color : 'blue';
};

// --- Types ---

type SortMode = 'custom' | 'name_asc' | 'name_desc' | 'date_new' | 'date_old';

interface DragState {
  id: string;
  position: 'inside' | 'before' | 'after';
}

// --- Sub-Components ---

// 1. Navigation Item
const NavItem: React.FC<{ 
  to: string; 
  icon: React.ElementType; 
  label: string; 
  isActive: boolean; 
}> = ({ to, icon: Icon, label, isActive }) => (
  <Link 
    href={to} 
    className={`
      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
      ${isActive 
        ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-100 border border-cyan-200/50 dark:border-white/10' 
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'}
    `}
  >
    <Icon size={18} className={`transition-colors ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
    {label}
  </Link>
);

// 2. Folder Tree Item
interface FolderTreeItemProps {
  folder: Folder;
  level: number;
  allFolders: Folder[];
  allChats: Chat[];
  isActive: (path: string, type: string) => boolean;
  onToggle: (id: string) => void;
  isExpanded: boolean;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  dragOverState: DragState | null;
  onFolderDragStart: (e: React.DragEvent, id: string) => void;
  onChatDragStart: (e: React.DragEvent, id: string) => void;
  sortMode: SortMode;
}

const getFolderLink = (folder: Folder) => {
  // Note: folder.type doesn't exist in DB yet, default to chat
  const type = 'chat'; // TODO: Add type field to folders table
  switch(type) {
    case 'image': return `/images?folder=${folder.id}`;
    case 'prompt': return `/prompts?folder=${folder.id}`;
    case 'list': return `/lists?folder=${folder.id}`;
    default: return `/folder/${folder.id}`;
  }
};

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({ 
  folder, level, allFolders, allChats, isActive, onToggle, isExpanded, 
  onDragOver, onDragLeave, onDrop, dragOverState, onFolderDragStart, onChatDragStart, sortMode
}) => {
  // Logic to find children folders
  const children = useMemo(() => {
    let kids = allFolders.filter(f => f.parent_id === folder.id);
    if (sortMode === 'name_asc') kids.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'name_desc') kids.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortMode === 'date_new') kids.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortMode === 'date_old') kids.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return kids;
  }, [allFolders, folder.id, sortMode]);

  // Logic to find chats in this folder
  const folderChats = useMemo(() => {
    let chats = allChats.filter(c => c.folder_id === folder.id && !c.is_archived);
    chats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); 
    return chats;
  }, [allChats, folder.id]);

  const hasChildren = children.length > 0 || folderChats.length > 0;
  const FolderIconComp = FolderIcon; // TODO: Add icon field to folders table
  const isActiveItem = isActive(folder.id, 'chat');
  const targetLink = getFolderLink(folder);
  
  const isDragTarget = dragOverState?.id === folder.id;
  const dragPosition = isDragTarget ? dragOverState?.position : null;

  const fColor = folder.color || 'blue';
  const iconContainerClass = isActiveItem
    ? `bg-${fColor}-500 text-white shadow-md` 
    : `bg-${fColor}-100 text-${fColor}-600 dark:bg-${fColor}-500/20 dark:text-${fColor}-400 group-hover:bg-${fColor}-200 dark:group-hover:bg-${fColor}-500/30`;

  return (
    <div className="select-none">
      <div
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
        draggable={sortMode === 'custom'}
        onDragStart={(e) => onFolderDragStart(e, folder.id)}
        className="relative"
      >
        {/* Drop Indicators */}
        {dragPosition === 'before' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500 z-20 pointer-events-none rounded-full" />}
        {dragPosition === 'after' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 z-20 pointer-events-none rounded-full" />}

        <Link 
          href={targetLink}
          className={`
            group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all border relative my-0.5
            ${isActiveItem 
              ? 'bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-transparent shadow-sm' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'}
            ${dragPosition === 'inside' ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-400 dark:border-cyan-500 ring-1 ring-cyan-400 z-10' : ''}
          `}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {hasChildren ? (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(folder.id); }}
                className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 z-20 -ml-1"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : <span className="w-4" />}
            
            <div className={`flex items-center justify-center w-6 h-6 rounded-md transition-all duration-300 shrink-0 ${iconContainerClass}`}>
              <FolderIconComp size={14} />
            </div>
            <span className="truncate font-medium">{folder.name}</span>
          </div>
          
          {isActiveItem && !hasChildren && <ChevronRight size={14} className="text-cyan-500" />}
          
          {sortMode === 'custom' && (
             <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-opacity">
               <GripVertical size={12} />
             </div>
          )}
        </Link>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
          {children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              allFolders={allFolders}
              allChats={allChats}
              isActive={isActive}
              onToggle={onToggle}
              isExpanded={isExpanded}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dragOverState={dragOverState}
              onFolderDragStart={onFolderDragStart}
              onChatDragStart={onChatDragStart}
              sortMode={sortMode}
            />
          ))}
          {folderChats.map(chat => (
             <Link
                key={chat.id}
                href={`/chats?id=${chat.id}`}
                draggable
                onDragStart={(e) => onChatDragStart(e, chat.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}
             >
                <MessageCircle size={12} className="opacity-70 shrink-0" />
                <span className="truncate">{chat.title}</span>
             </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderParam = searchParams.get('folder');
  const { folders, addFolder } = useFolderStore();
  const { chats, updateChat } = useChatStore();
  
  // -- Local State --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [dragOverState, setDragOverState] = useState<DragState | null>(null);

  // -- Determine Active Context --
  const getActiveType = (path: string): 'chat' | 'image' | 'prompt' | 'list' => {
    if (path.startsWith('/images')) return 'image';
    if (path.startsWith('/prompts')) return 'prompt';
    if (path.startsWith('/lists')) return 'list';
    return 'chat';
  };
  const activeType = getActiveType(pathname);

  // -- Filters --
  const isActive = (path: string) => pathname === path;
  const isFolderActive = (folderId: string, type: string) => {
    if (type === 'chat') return pathname === `/folder/${folderId}`;
    return currentFolderParam === folderId;
  };

  const getSortedFolders = () => {
    let filtered = folders;
    if (searchTerm) filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Root folders only
    let roots = filtered.filter(f => !f.parent_id);
    
    // Sort
    if (sortMode === 'name_asc') roots.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'name_desc') roots.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortMode === 'date_new') roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortMode === 'date_old') roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return roots;
  };

  const rootChats = useMemo(() => {
    if (activeType !== 'chat' || searchTerm) return [];
    return chats.filter(c => !c.folder_id && !c.is_archived);
  }, [chats, activeType, searchTerm]);

  // -- Handlers --
  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedFolders(newExpanded);
  };

  const openCreateModal = () => {
    const allIcons = ICON_CATEGORIES.flatMap(cat => cat.icons);
    const randomIcon = allIcons[Math.floor(Math.random() * allIcons.length)];
    const colors = ['cyan', 'rose', 'purple', 'blue', 'emerald', 'amber'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setSelectedIcon(randomIcon);
    setSelectedColor(randomColor);
    setIsModalOpen(true);
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    await addFolder({
      name: newFolderName,
      color: selectedColor,
    });
    
    setNewFolderName('');
    setIsModalOpen(false);
  };

  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    e.dataTransfer.setData('folderId', folderId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleChatDragStart = (e: React.DragEvent, chatId: string) => {
    e.dataTransfer.setData('chatId', chatId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (sortMode !== 'custom') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.nativeEvent.clientY - rect.top;
    const height = rect.height;
    let position: 'inside' | 'before' | 'after' = 'inside';
    if (offsetY < height * 0.25) position = 'before';
    else if (offsetY > height * 0.75) position = 'after';
    setDragOverState({ id: folderId, position });
  };
  
  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    setDragOverState(null);
    
    const chatId = e.dataTransfer.getData('chatId');
    const draggedFolderId = e.dataTransfer.getData('folderId');
    
    if (chatId) {
      await updateChat(chatId, { folder_id: targetFolderId });
    }
    // TODO: Add folder move logic when needed
  };

  return (
    <>
      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <h3 className="font-semibold text-slate-900 dark:text-white capitalize">New Folder</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleAddFolder} className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <input 
                autoFocus 
                type="text" 
                placeholder="Folder Name" 
                className="w-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)} 
              />
              
              <div className="h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-lg p-2 bg-slate-50/50 dark:bg-black/20 space-y-3">
                {ICON_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">{cat.name}</div>
                    <div className="grid grid-cols-6 gap-2">
                      {cat.icons.map(iconKey => {
                        const IconComp = FOLDER_ICONS[iconKey];
                        const isSelected = selectedIcon === iconKey;
                        return (
                          <button 
                            key={iconKey} 
                            onClick={() => { setSelectedIcon(iconKey); setSelectedColor(cat.color); }} 
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isSelected ? `bg-${cat.color}-500 text-white shadow-md scale-110` : 'text-slate-400 bg-slate-100 dark:bg-white/5'}`} 
                            type="button"
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
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
              <button onClick={handleAddFolder} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg" disabled={!newFolderName}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar Structure */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-xl border-r border-slate-200 dark:border-white/5">
        <div className="flex flex-col h-full p-4">
          
          {/* 1. Header & Logo */}
          <div className="flex items-center gap-2 px-2 mb-6 mt-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
              <Hash className="text-white" size={18} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">Mega-Pack</h1>
          </div>

          {/* 2. Main Navigation Links */}
          <nav className="space-y-1 mb-4">
            <NavItem to="/" icon={LayoutGrid} label="Dashboard" isActive={isActive('/')} />
            <NavItem to="/studio" icon={MessageSquarePlus} label="AI Studio" isActive={isActive('/studio')} />
            <NavItem to="/chats" icon={MessageSquare} label="My Chats" isActive={isActive('/chats')} />
            <NavItem to="/prompts" icon={FileEdit} label="Prompts" isActive={isActive('/prompts')} />
            <NavItem to="/lists" icon={CheckSquare} label="Lists" isActive={isActive('/lists')} />
          </nav>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-white/5 mb-4 mx-2" />

          {/* 3. Dynamic Context Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
             
             {/* Context Header */}
             <div className="flex items-center justify-between px-2 mb-2 group">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                 <span>Folders</span>
               </div>
               <button 
                 onClick={openCreateModal} 
                 className="p-1 text-slate-400 hover:text-cyan-500 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-all" 
                 title="New Folder"
               >
                 <Plus size={14} />
               </button>
             </div>

             {/* Context Search */}
             <div className="relative px-1 mb-2">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                 <input 
                   type="text" 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                   placeholder="Filter folders..." 
                   className="w-full bg-slate-100 dark:bg-white/5 border-transparent focus:border-cyan-500/50 rounded-md pl-8 pr-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none transition-all"
                 />
                 {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={10} /></button>}
             </div>

             {/* Folder Tree */}
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-0.5" onDragLeave={() => setDragOverState(null)}>
                {getSortedFolders().map(f => (
                  <FolderTreeItem 
                    key={f.id} 
                    folder={f} 
                    level={0} 
                    allFolders={folders} 
                    allChats={chats} 
                    isActive={isFolderActive} 
                    onToggle={toggleFolder} 
                    isExpanded={expandedFolders.has(f.id) || !!searchTerm}
                    onDragOver={handleDragOver} 
                    onDragLeave={() => {}} 
                    onDrop={handleDrop} 
                    dragOverState={dragOverState}
                    onFolderDragStart={handleFolderDragStart} 
                    onChatDragStart={handleChatDragStart} 
                    sortMode={sortMode}
                  />
                ))}
                
                {/* Orphaned Chats */}
                {activeType === 'chat' && !searchTerm && rootChats.map(chat => (
                   <Link 
                     key={chat.id} 
                     href={`/chats?id=${chat.id}`} 
                     draggable 
                     onDragStart={(e) => handleChatDragStart(e, chat.id)}
                     className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 ml-3"
                   >
                      <MessageCircle size={14} className="opacity-70 shrink-0" />
                      <span className="truncate">{chat.title}</span>
                   </Link>
                ))}

                {getSortedFolders().length === 0 && (activeType !== 'chat' || rootChats.length === 0) && (
                   <div className="px-4 py-8 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 mb-2 text-slate-300">
                         <FolderIcon size={14} />
                      </div>
                      <p className="text-xs text-slate-400 italic">No folders yet</p>
                   </div>
                )}
             </div>
          </div>

          {/* 4. Bottom Tools */}
          <div className="pt-3 mt-2 border-t border-slate-200 dark:border-white/5 space-y-1">
             <NavItem to="/archive" icon={Archive} label="Archive" isActive={isActive('/archive')} />
             <NavItem to="/settings" icon={Settings} label="Settings" isActive={isActive('/settings')} />
          </div>

        </div>
      </aside>
    </>
  );
}
