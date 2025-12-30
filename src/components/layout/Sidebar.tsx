'use client';

import React, { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';
import { Chat, Folder } from '@/types';
import {
  LayoutGrid, Archive, FileEdit, Settings,
  Folder as FolderIcon, Plus, ChevronRight, ChevronDown, Hash, User, X, Search, Trash2,
  ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp, GripVertical, ListTodo,
  MessageSquarePlus, MessageCircle, LogOut, Brain, Download, Menu,
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
  Globe, Heart, Coffee, Home, Sun, Moon,
  // Body Parts Icons
  Hand, Footprints,
  // Social Icons
  Glasses, Users, Share2, Shield,
  // Health Icons
  Stethoscope, Thermometer,
  // Extra Icons
  Smartphone, Box, Star, Flag, Zap, Lightbulb, Monitor, MousePointer,
  Eye, Lock, MessageSquare, Bot, Gamepad, Sparkles,
  Dice5, CheckSquare, ImageIcon, Activity, Pill
} from 'lucide-react';

// --- Configuration Constants ---

// Theme Toggle Component
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

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
  // Body Parts
  Hand, Footprints, Body: User,
  // Social
  Glasses, Users, Share2, Shield,
  // Health
  Stethoscope, Thermometer,
  // Extras
  Smartphone, Box, Star, Flag, Zap, Lightbulb, Monitor, MousePointer,
  Eye, Lock, MessageSquare, Bot, Gamepad, Sparkles, CheckSquare, ListTodo, Activity, Pill,
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
  { name: 'Social', color: 'blue', icons: ['Glasses', 'Users', 'Share2', 'Camera', 'Hash'] },
  { name: 'Admin', color: 'emerald', icons: ['Settings', 'Lock', 'Archive'] },
  { name: 'Lists', color: 'emerald', icons: ['CheckSquare', 'ListTodo', 'Target'] },
  { name: 'Body Parts', color: 'pink', icons: ['Body', 'Hand', 'Footprints', 'Eye'] },
  { name: 'Health', color: 'red', icons: ['Stethoscope', 'Thermometer', 'Activity', 'Pill'] }
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
  color?: string; // e.g. 'emerald', 'purple', 'amber'
}> = ({ to, icon: Icon, label, isActive, color = 'cyan' }) => {
  const colorClasses = {
    cyan: {
      active: 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-100 border border-cyan-200/50 dark:border-white/10',
      activeIcon: 'text-cyan-600 dark:text-cyan-400',
      hover: 'hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white hover:shadow-lg hover:shadow-cyan-500/30 dark:hover:shadow-cyan-500/40'
    },
    emerald: {
      active: 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-700 dark:text-emerald-100 border border-emerald-200/50 dark:border-white/10',
      activeIcon: 'text-emerald-600 dark:text-emerald-400',
      hover: 'hover:bg-gradient-to-r hover:from-emerald-500 hover:to-green-600 hover:text-white hover:shadow-lg hover:shadow-emerald-500/30 dark:hover:shadow-emerald-500/40'
    },
    purple: {
      active: 'bg-gradient-to-r from-purple-500/10 to-violet-500/10 text-purple-700 dark:text-purple-100 border border-purple-200/50 dark:border-white/10',
      activeIcon: 'text-purple-600 dark:text-purple-400',
      hover: 'hover:bg-gradient-to-r hover:from-purple-500 hover:to-violet-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/30 dark:hover:shadow-purple-500/40'
    },
    amber: {
      active: 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-700 dark:text-amber-100 border border-amber-200/50 dark:border-white/10',
      activeIcon: 'text-amber-600 dark:text-amber-400',
      hover: 'hover:bg-gradient-to-r hover:from-amber-500 hover:to-yellow-600 hover:text-white hover:shadow-lg hover:shadow-amber-500/30 dark:hover:shadow-amber-500/40'
    },
    rose: {
      active: 'bg-gradient-to-r from-rose-500/10 to-pink-500/10 text-rose-700 dark:text-rose-100 border border-rose-200/50 dark:border-white/10',
      activeIcon: 'text-rose-600 dark:text-rose-400',
      hover: 'hover:bg-gradient-to-r hover:from-rose-500 hover:to-pink-600 hover:text-white hover:shadow-lg hover:shadow-rose-500/30 dark:hover:shadow-rose-500/40'
    },
    orange: {
      active: 'bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700 dark:text-orange-100 border border-orange-200/50 dark:border-white/10',
      activeIcon: 'text-orange-600 dark:text-orange-400',
      hover: 'hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/30 dark:hover:shadow-orange-500/40'
    },
    slate: {
      active: 'bg-gradient-to-r from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-100 border border-slate-200/50 dark:border-white/10',
      activeIcon: 'text-slate-600 dark:text-slate-400',
      hover: 'hover:bg-gradient-to-r hover:from-slate-500 hover:to-gray-600 hover:text-white hover:shadow-lg hover:shadow-slate-500/30 dark:hover:shadow-slate-500/40'
    },
    indigo: {
      active: 'bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-indigo-700 dark:text-indigo-100 border border-indigo-200/50 dark:border-white/10',
      activeIcon: 'text-indigo-600 dark:text-indigo-400',
      hover: 'hover:bg-gradient-to-r hover:from-indigo-500 hover:to-blue-600 hover:text-white hover:shadow-lg hover:shadow-indigo-500/30 dark:hover:shadow-indigo-500/40'
    }
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.cyan;

  return (
    <Link 
      href={to} 
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group shadow-md
        ${isActive 
          ? colors.active
          : `text-slate-500 dark:text-slate-400 ${colors.hover} dark:hover:text-white`}
      `}
    >
      <Icon size={18} className={`transition-colors ${isActive ? colors.activeIcon : 'text-slate-400 group-hover:text-white dark:group-hover:text-white group-hover:opacity-100'}`} />
      {label}
    </Link>
  );
};

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
  onDeleteFolder: (id: string) => void;
}

const getFolderLink = (folder: Folder) => {
  const type = (folder as any).type || 'chat'; // Default to chat if no type
  switch(type) {
    case 'image': return `/images?folder=${folder.id}`;
    case 'prompt': return `/prompts?folder=${folder.id}`;
    case 'list': return `/lists?folder=${folder.id}`;
    default: return `/chats?folder=${folder.id}`;
  }
};

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({ 
  folder, level, allFolders, allChats, isActive, onToggle, isExpanded, 
  onDragOver, onDragLeave, onDrop, dragOverState, onFolderDragStart, onChatDragStart, sortMode, onDeleteFolder
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Logic to find children folders
  const children = useMemo(() => {
    let kids = allFolders.filter(f => (f as any).parent_id === folder.id);
    if (sortMode === 'name_asc') kids.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'name_desc') kids.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortMode === 'date_new') kids.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    else if (sortMode === 'date_old') kids.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
    return kids;
  }, [allFolders, folder.id, sortMode]);

  // Logic to find chats in this folder
  const folderChats = useMemo(() => {
    let chats = allChats.filter(c => c.folder_id === folder.id && !c.is_archived);
    chats.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()); 
    return chats;
  }, [allChats, folder.id]);

  const hasChildren = children.length > 0 || folderChats.length > 0;
  const FolderIconComp = folder.icon && FOLDER_ICONS[folder.icon] ? FOLDER_ICONS[folder.icon] : FolderIcon;
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
        {dragPosition === 'before' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500 z-20 pointer-events-none rounded-full animate-pulse shadow-lg shadow-cyan-500/50" />
        )}
        {dragPosition === 'after' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500 z-20 pointer-events-none rounded-full animate-pulse shadow-lg shadow-cyan-500/50" />
        )}

        <Link 
          href={targetLink}
          className={`
            group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all duration-200 border relative my-0.5 shadow-md
            ${isActiveItem 
              ? 'bg-white dark:bg-white/5 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-transparent shadow-sm' 
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
            ${dragPosition === 'inside' 
              ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-400 dark:border-cyan-500 ring-2 ring-cyan-400 dark:ring-cyan-500 ring-offset-1 z-10 scale-[1.02] shadow-lg shadow-cyan-500/30 animate-pulse' 
              : ''}
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
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isActiveItem && !hasChildren && <ChevronRight size={14} className="text-cyan-500" />}
            
            {sortMode === 'custom' && (
              <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:hover:text-slate-300">
                <GripVertical size={12} />
              </div>
            )}
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (showDeleteConfirm) {
                  onDeleteFolder(folder.id);
                  setShowDeleteConfirm(false);
                } else {
                  setShowDeleteConfirm(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowDeleteConfirm(false), 200)}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title={showDeleteConfirm ? "Click again to confirm delete" : "Delete folder"}
            >
              <Trash2 size={12} />
            </button>
          </div>
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
              onDeleteFolder={onDeleteFolder}
            />
          ))}
          {folderChats.map(chat => (
             <Link
                key={chat.id}
                href={`/chats?id=${chat.id}`}
                draggable
                onDragStart={(e) => onChatDragStart(e, chat.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 shadow-md"
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

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFolderParam = searchParams.get('folder');
  const { folders, addFolder, deleteFolder, isLoading: foldersLoading } = useFolderStore();
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
  const isCreatingFolderRef = React.useRef(false);
  
  // -- Mobile Sidebar State --
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  
  // -- Detect Mobile --
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false); // Close on resize to desktop
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // -- Swipe Gesture Handlers (Global) --
  useEffect(() => {
    if (!isMobile) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartX.current;
      const deltaY = touchY - touchStartY.current;
      
      // Only handle horizontal swipes (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        // Swipe right to open (from left edge)
        if (deltaX > 0 && touchStartX.current < 50 && !isMobileOpen) {
          setIsMobileOpen(true);
          touchStartX.current = null;
          touchStartY.current = null;
        }
        // Swipe left to close (when sidebar is open)
        else if (deltaX < 0 && isMobileOpen) {
          setIsMobileOpen(false);
          touchStartX.current = null;
          touchStartY.current = null;
        }
      }
    };
    
    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isMobileOpen]);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsMobileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isMobileOpen]);
  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [pathname, isMobile]);

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
    return currentFolderParam === folderId;
  };

  const getSortedFolders = () => {
    let filtered = folders;
    
    // Filter by active type
    filtered = filtered.filter(f => {
      const folderType = (f as any).type || 'chat'; // Default to chat if no type
      return folderType === activeType;
    });
    
    if (searchTerm) filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Root folders only
    let roots = filtered.filter(f => !(f as any).parent_id);
    
    // Sort
    if (sortMode === 'name_asc') roots.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortMode === 'name_desc') roots.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortMode === 'date_new') roots.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    else if (sortMode === 'date_old') roots.sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
    
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
    if (!newFolderName.trim() || isCreatingFolderRef.current) return;
    
    isCreatingFolderRef.current = true;
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        isCreatingFolderRef.current = false;
        return;
      }
      
      const { data: newFolder, error } = await (supabase as any)
        .from('folders')
        .insert({
          user_id: user.id,
          name: newFolderName,
          color: selectedColor,
          type: activeType,
          icon: selectedIcon,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating folder:', error);
        isCreatingFolderRef.current = false;
        return;
      }
      
      if (newFolder) {
        addFolder(newFolder);
      }
      
      setNewFolderName('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      isCreatingFolderRef.current = false;
    }
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
    
    // Allow drag over for chats and folders
    const chatId = e.dataTransfer.getData('chatId');
    const folderIdDragged = e.dataTransfer.getData('folderId');
    
    if (chatId || folderIdDragged) {
      setDragOverState({ id: folderId, position: 'inside' });
      return;
    }
    
    // For folder reordering, only allow in custom sort mode
    if (sortMode !== 'custom') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.nativeEvent.clientY - rect.top;
    const height = rect.height;
    let position: 'inside' | 'before' | 'after' = 'inside';
    if (offsetY < height * 0.25) position = 'before';
    else if (offsetY > height * 0.75) position = 'after';
    setDragOverState({ id: folderId, position });
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear drag state if we're leaving the folder element itself
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverState(null);
    }
  };
  
  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    setDragOverState(null);
    
    const chatId = e.dataTransfer.getData('chatId');
    const draggedFolderId = e.dataTransfer.getData('folderId');
    
    if (chatId) {
      await updateChat(chatId, { folder_id: targetFolderId });
    } else if (draggedFolderId) {
      // Move folder into target folder
      const { updateFolder } = useFolderStore.getState();
      try {
        await updateFolder(draggedFolderId, { parent_id: targetFolderId || null });
        // Refresh folders to update UI
        const { setFolders } = useFolderStore.getState();
        const response = await fetch('/api/folders', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.folders) {
            setFolders(data.folders);
          }
        }
      } catch (error) {
        console.error('Failed to move folder:', error);
        alert('Failed to move folder');
      }
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      // Refresh folders to update UI
      const { setFolders } = useFolderStore.getState();
      const response = await fetch('/api/folders', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.folders) {
          setFolders(data.folders);
        }
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert('Failed to delete folder');
    }
  };

  return (
    <>
      {/* Mobile Menu Button (visible when sidebar is closed) */}
      {isMobile && !isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-lg lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} className="text-slate-700 dark:text-slate-300" />
        </button>
      )}
      
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Mobile Strip (always visible) */}
      {isMobile && (
        <div 
          className="fixed inset-y-0 left-0 z-50 w-2 bg-gradient-to-b from-cyan-500/20 to-blue-600/20 lg:hidden pointer-events-none"
        />
      )}
      
      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
              <h3 className="font-semibold text-slate-900 dark:text-white capitalize">New Folder</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Close modal" title="Close"><X size={18} /></button>
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
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
              <button onClick={handleAddFolder} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg" disabled={!newFolderName}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Sidebar Structure */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-xl border-r border-slate-200 dark:border-white/5
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobile ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
      >
        <div className="flex flex-col h-full p-4">
          
          {/* 1. Header & Logo */}
          <div className="flex items-center justify-between px-2 mb-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
                <Brain className="text-white" size={18} />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">BrainBox</h1>
            </div>
            <div className="flex items-center gap-2">
              {isMobile && (
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors lg:hidden"
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* 2. Main Navigation Links */}
          <nav className="space-y-1 mb-4">
            <NavItem to="/" icon={LayoutGrid} label="Dashboard" isActive={isActive('/')} color="emerald" />
            <NavItem to="/studio" icon={MessageSquarePlus} label="AI Studio" isActive={isActive('/studio')} color="purple" />
            <NavItem to="/chats" icon={MessageSquare} label="My Chats" isActive={isActive('/chats')} color="cyan" />
            <NavItem to="/prompts" icon={FileEdit} label="Prompts" isActive={isActive('/prompts')} color="amber" />
            <NavItem to="/images" icon={ImageIcon} label="Images" isActive={isActive('/images')} color="rose" />
            <NavItem to="/lists" icon={CheckSquare} label="Lists" isActive={isActive('/lists')} color="orange" />
          </nav>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-white/5 mb-4 mx-2" />

          {/* 3. Dynamic Context Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
             
             {/* Context Header */}
             <div className="flex items-center justify-between px-2 mb-2 group">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                 <span>
                   {activeType === 'chat' ? 'Chat Folders' : 
                    activeType === 'image' ? 'Image Folders' : 
                    activeType === 'prompt' ? 'Prompt Folders' : 
                    activeType === 'list' ? 'List Folders' : 
                    'Folders'}
                 </span>
               </div>
               <button 
                 onClick={openCreateModal} 
                 className="p-1 text-slate-400 hover:text-cyan-500 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-md" 
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
                   className="w-full bg-slate-100 dark:bg-white/5 border-transparent focus:border-cyan-500/50 rounded-md pl-8 pr-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none transition-all shadow-md"
                 />
                 {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search" title="Clear search"><X size={10} /></button>}
             </div>

             {/* Folder Tree */}
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-0.5" onDragLeave={() => setDragOverState(null)}>
                {foldersLoading ? (
                  <div className="px-4 py-8 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 mb-2 text-slate-300 animate-pulse">
                      <FolderIcon size={14} />
                    </div>
                    <p className="text-xs text-slate-400 italic">Loading folders...</p>
                  </div>
                ) : (
                  <>
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
                    onDragLeave={handleDragLeave} 
                    onDrop={handleDrop} 
                    dragOverState={dragOverState}
                    onFolderDragStart={handleFolderDragStart} 
                    onChatDragStart={handleChatDragStart} 
                    sortMode={sortMode}
                    onDeleteFolder={handleDeleteFolder}
                  />
                ))}
                
                {/* Orphaned Chats */}
                {activeType === 'chat' && !searchTerm && rootChats.map(chat => (
                   <Link 
                     key={chat.id} 
                     href={`/chats?id=${chat.id}`} 
                     draggable 
                     onDragStart={(e) => handleChatDragStart(e, chat.id)}
                     className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all border border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 ml-3 shadow-md"
                   >
                      <MessageCircle size={14} className="opacity-70 shrink-0" />
                      <span className="truncate">{chat.title}</span>
                   </Link>
                ))}

                {getSortedFolders().length === 0 && (activeType !== 'chat' || rootChats.length === 0) && !foldersLoading && (
                   <div className="px-4 py-8 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 mb-2 text-slate-300">
                         <FolderIcon size={14} />
                      </div>
                      <p className="text-xs text-slate-400 italic">No folders yet</p>
                   </div>
                )}
                  </>
                )}
             </div>
          </div>

          {/* 4. Bottom Tools */}
          <div className="pt-3 mt-2 border-t border-slate-200 dark:border-white/5 space-y-1">
             <NavItem to="/profile" icon={User} label="Profile" isActive={isActive('/profile')} color="purple" />
             <NavItem to="/settings" icon={Settings} label="Settings" isActive={isActive('/settings')} color="indigo" />
             <NavItem to="/archive" icon={Archive} label="Archive" isActive={isActive('/archive')} color="slate" />
          </div>

        </div>
      </aside>
    </>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-xl border-r border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </aside>
    }>
      <SidebarContent />
    </Suspense>
  );
}
