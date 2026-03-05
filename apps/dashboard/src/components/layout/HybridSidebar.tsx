'use client';

import type { Chat, Folder } from '@brainbox/shared';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  LayoutGrid, Settings, FileEdit,
  MessageCircle, Brain, Sun, Moon,
  X, Search, ListTodo, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import React, { useState, useMemo, Suspense, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { FolderWithChildren} from './FolderTree';
import { FolderTreeItem, FOLDER_ICONS } from './FolderTree';


import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { usePromptStore } from '@/store/usePromptStore';
import { useUIStore } from '@/store/useUIStore';

export { FOLDER_ICONS };

// --- Theme Toggle Component ---
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    );
  };
  
  // --- NavItem Component ---
  interface NavItemProps {
    to: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    isHovered: boolean;
    children?: React.ReactNode;
    specialStyle?: string;
    layout?: boolean | "position" | "size" | "preserve-aspect"; 
  }
  
  const NavItem: React.FC<NavItemProps> = ({ 
    to, icon: Icon, label, isActive, isHovered, children, specialStyle, layout 
  }) => {
    return (
      <motion.div 
        layout={layout || "position"}
        className="flex flex-col w-full group/nav relative min-w-0"
      >
        <Link 
          href={to}
          aria-label={label}
          className={`
            relative flex items-center w-full h-12 transition-all duration-200 overflow-hidden
            ${isActive 
              ? (specialStyle || 'text-primary bg-primary/10')
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}
          `}
        >
          {isActive && !specialStyle && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
          )}
          
          {/* Fixed Rail Anchor */}
          <div className="w-20 h-full shrink-0 flex items-center justify-center">
            <motion.div
               whileHover={{ scale: children ? 1 : 1.1 }}
               className="flex items-center justify-center"
            >
              <Icon size={20} className={isActive ? (specialStyle ? 'text-white' : 'text-primary') : 'text-muted-foreground group-hover/nav:text-foreground'} />
            </motion.div>
          </div>
          
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="truncate whitespace-nowrap text-sm font-medium pr-4 flex-1 min-w-0"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

      <AnimatePresence initial={false}>
        {isHovered && children && (
          <motion.div
            layout="position"
            style={{ overflow: 'hidden' }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} 
            className="w-full flex flex-col"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Logic Helpers ---
interface DisplayItemsResult {
  visibleFolders: FolderWithChildren[];
  visibleChats: Chat[];
  totalHiddenCount: number;
}

function getDisplayItems(folders: FolderWithChildren[], chats: Chat[], limit = 5): DisplayItemsResult {
  const visibleFolders = folders.slice(0, limit);
  const remainingSlots = Math.max(0, limit - visibleFolders.length);
  const visibleChats = chats.slice(0, remainingSlots);
  
  const totalItems = folders.length + chats.length;
  const shownItems = visibleFolders.length + visibleChats.length;
  const totalHiddenCount = Math.max(0, totalItems - shownItems);

  return { visibleFolders, visibleChats, totalHiddenCount };
}

// --- Fallback Components ---
function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 opacity-50">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 w-full">
          <div className="w-4 h-4 rounded bg-muted animate-pulse shrink-0" />
          <div className={`h-3 rounded bg-muted animate-pulse ${i === 1 ? 'w-24' : i === 2 ? 'w-32' : 'w-20'}`} />
        </div>
      ))}
    </div>
  );
}

function SidebarEmptyState({ label }: { label: string }) {
  return (
    <div className="px-4 py-4 text-xs text-muted-foreground text-center italic border border-dashed border-border/50 rounded-lg mx-4 mb-2">
      No {label} found
    </div>
  );
}

// --- Main Content ---
function HybridSidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFolderParam = searchParams.get('folder');
  
  const isMobileSidebarOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  
  // State
  const [isHovered, setIsHovered] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentRootId, setCurrentRootId] = useState<string | null>(null);
  
  // Reset root ID when leaving relevant sections
  useEffect(() => {
     if (!pathname.startsWith('/chats') && !pathname.startsWith('/prompts')) {
        setCurrentRootId(null);
     }
  }, [pathname]);

  // Stores
  const folders = useFolderStore(useShallow(s => s.folders));
  const isLoadingFolders = useFolderStore(useShallow(s => s.isLoading));
  const isLoadingChats = useChatStore(useShallow(s => s.isLoading));
  const isLoadingPrompts = usePromptStore(useShallow(s => s.isLoading));

  // Route Detection
  const isChatRoute = pathname.startsWith('/chats');
  const isPromptRoute = pathname.startsWith('/prompts');
  const isStudioRoute = pathname.startsWith('/studio');

  // Logic: Double Click to enter folder
  const handleFolderDoubleClick = useCallback((folderId: string) => {
    setCurrentRootId(folderId);
  }, []);

  // Logic: Back Button
  const handleBackNavigation = useCallback(() => {
    if (!currentRootId) return;
    const currentFolder = folders.find(f => f.id === currentRootId);
    if (currentFolder && (currentFolder as Folder).parent_id) {
       setCurrentRootId((currentFolder as Folder).parent_id!);
    } else {
       setCurrentRootId(null);
    }
  }, [currentRootId, folders]);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Build Tree Data
  const getFoldersByType = useCallback((type: 'chat' | 'prompt', rootId: string | null) => {
    const folderMap = new Map<string, FolderWithChildren>();
    folders.forEach(f => {
      if ((f as Folder).type === type) {
        folderMap.set(f.id, { ...f, children: [] });
      }
    });
    
    const result: FolderWithChildren[] = [];
    folderMap.forEach(f => {
      const parentId = (f as Folder).parent_id;
      if (parentId === rootId || (!parentId && rootId === null)) {
         result.push(f);
      }
      if (parentId && folderMap.has(parentId)) {
        folderMap.get(parentId)!.children!.push(f);
      }
    });
    return result;
  }, [folders]);

  // "Smart 5" Logic
  const VISIBLE_LIMIT = 5;

  // -- Chat Data --
  const currentChatFolders = useMemo(() => isChatRoute ? getFoldersByType('chat', currentRootId) : [], [isChatRoute, getFoldersByType, currentRootId]);
  
  const currentChats = useChatStore(useShallow((state) => {
    if (!isChatRoute) return [];
    return state.chats.filter(c => {
      if (c.is_archived) return false;
      if (currentRootId) return c.folder_id === currentRootId;
      return !c.folder_id;
    });
  }));

  const { visibleFolders: chatFolders, visibleChats: chatItems, totalHiddenCount: chatHidden } = useMemo(() => 
    getDisplayItems(currentChatFolders, currentChats, VISIBLE_LIMIT), 
  [currentChatFolders, currentChats]);

  // -- Prompt Data --
  const currentPromptFolders = useMemo(() => isPromptRoute ? getFoldersByType('prompt', currentRootId) : [], [isPromptRoute, getFoldersByType, currentRootId]);
  const { visibleFolders: promptFolders, visibleChats: promptItems, totalHiddenCount: promptHidden } = useMemo(() => 
    getDisplayItems(currentPromptFolders, [], VISIBLE_LIMIT), 
  [currentPromptFolders]);

  const currentRootName = useMemo(() => folders.find(f => f.id === currentRootId)?.name || 'Folder', [currentRootId, folders]);

  return (
    <>
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[55] md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        layout
        layoutRoot
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={false}
        animate={{ 
          width: isHovered ? 256 : 80,
          x: isMobileSidebarOpen ? 0 : undefined 
        }}
        transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.45 }}
        className={`
          fixed left-0 top-0 h-screen z-[60] 
          bg-card/95 backdrop-blur-xl border-r border-border
          flex flex-col shadow-2xl 
          md:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          will-change-[width,transform]
          transition-all duration-300
        `}
      >
        <button 
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
          className={`md:hidden absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground ${!isMobileSidebarOpen && 'hidden'}`}
        >
          <X size={20} />
        </button>

        {/* 1. Header Section */}
        <motion.div layout="position" className="flex flex-col shrink-0">
          <div className="h-16 flex items-center shrink-0 border-b border-border bg-transparent overflow-hidden">
             {/* Fixed Rail Anchor: Logo */}
             <div className="w-20 shrink-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <Brain className="text-white" size={18} />
                </div>
             </div>
             
             <AnimatePresence>
                {isHovered && (
                  <motion.h1
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                    className="text-xl font-bold text-foreground tracking-tight whitespace-nowrap"
                  >
                    BrainBox
                  </motion.h1>
                )}
              </AnimatePresence>
          </div>

          {/* Search Section */}
          <div className="py-4 flex items-center relative h-14 w-full">
             <div className="w-20 shrink-0 flex items-center justify-center z-10 pointer-events-none">
                 <Search size={20} className="text-muted-foreground" />
             </div>

             <AnimatePresence>
               {isHovered && (
                 <motion.div 
                   initial={{ opacity: 0, width: 0 }}
                   animate={{ opacity: 1, width: "100%" }}
                   exit={{ opacity: 0, width: 0 }}
                   transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                   className="absolute left-0 top-0 w-full h-full flex items-center pr-4"
                 >
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      className="w-full bg-secondary/50 text-sm text-foreground placeholder-muted-foreground rounded-lg py-2 pl-14 pr-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-inner"
                    />
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </motion.div>

        {/* 2. Main Nav Section (Vertical Isolation) */}
        <LayoutGroup>
          <motion.div 
            layout="position"
            className={`
              flex-1 flex flex-col min-h-0 overflow-hidden relative
              ${isHovered ? 'px-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]' : 'items-center overflow-hidden'}
              [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700
            `}
          >
            <NavItem 
              to="/" 
              icon={LayoutGrid} 
              label="Dashboard" 
              isActive={pathname === '/'} 
              isHovered={isHovered} 
              layout="position"
            />
            
            <NavItem 
              to="/chats" 
              icon={MessageCircle} 
              label="Chats" 
              isActive={isChatRoute} 
              isHovered={isHovered}
              layout="position"
            >
              {isChatRoute && isHovered && (
                <motion.div 
                  className="flex flex-col pb-2"
                  layout="position"
                  style={{ overflow: 'hidden' }}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <AnimatePresence mode="wait">
                    {currentRootId && (
                      <motion.button 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={(e) => { e.preventDefault(); handleBackNavigation(); }}
                        className="flex items-center gap-2 px-3 py-2 mx-4 mb-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5 hover:border-white/10"
                      >
                        <ChevronLeft size={14} />
                        <span className="truncate max-w-[120px]">Back to {currentRootName}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                  
                  {isLoadingFolders || isLoadingChats ? (
                    <SidebarSkeleton />
                  ) : chatFolders.length === 0 && chatItems.length === 0 ? (
                    <SidebarEmptyState label="chats" />
                  ) : (
                    <>
                      {chatFolders.map(f => (
                        <div key={f.id} onDoubleClick={() => handleFolderDoubleClick(f.id)}>
                          <FolderTreeItem 
                            folder={f}
                            level={0}
                            isActive={(id) => currentFolderParam === id}
                            onToggle={toggleFolder}
                            expandedFolders={expandedFolders}
                            isExpanded={isHovered}
                          />
                        </div>
                      ))}
                      {chatItems.map(chat => (
                        <Link 
                          key={chat.id}
                          href={`/chats?id=${chat.id}`}
                          className="group flex items-center w-full h-10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                        >
                          <div className="w-20 shrink-0 flex items-center justify-center">
                            <MessageCircle size={16} className="shrink-0 group-hover:text-primary transition-colors" />
                          </div>
                          <span className="truncate text-sm pr-4">{chat.title}</span>
                        </Link>
                      ))}
                      {chatHidden > 0 && <div className="pl-20 py-1 text-xs text-slate-500 italic">+ {chatHidden} more items...</div>}
                    </>
                  )}
                </motion.div>
              )}
            </NavItem>

            <NavItem 
              to="/prompts" 
              icon={FileEdit} 
              label="Prompts" 
              isActive={isPromptRoute} 
              isHovered={isHovered}
              layout="position"
            >
               {isPromptRoute && isHovered && (
                <motion.div 
                   className="flex flex-col pb-2"
                   layout="position"
                   style={{ overflow: 'hidden' }}
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: "auto" }}
                   exit={{ opacity: 0, height: 0 }}
                   transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >

                  <AnimatePresence mode="wait">
                    {currentRootId && (
                      <motion.button 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={(e) => { e.preventDefault(); handleBackNavigation(); }}
                        className="flex items-center gap-2 px-3 py-2 mx-4 mb-2 text-xs font-medium text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5 hover:border-white/10"
                      >
                        <ChevronLeft size={14} />
                        <span className="truncate max-w-[120px]">Back to {currentRootName}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                  
                  {isLoadingFolders || isLoadingPrompts ? (
                    <SidebarSkeleton />
                  ) : promptFolders.length === 0 && promptItems.length === 0 ? (
                    <SidebarEmptyState label="prompts" />
                  ) : (
                    <>
                      {promptFolders.map(f => (
                        <div key={f.id} onDoubleClick={() => handleFolderDoubleClick(f.id)}>
                          <FolderTreeItem 
                            folder={f}
                            level={0}
                            isActive={(id) => currentFolderParam === id}
                            onToggle={toggleFolder}
                            expandedFolders={expandedFolders}
                            isExpanded={isHovered}
                          />
                         </div>
                      ))}
                      {promptItems.map(p => (
                        <Link
                          key={p.id}
                          href={`/prompts?id=${p.id}`}
                          className="group flex items-center w-full h-10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                        >
                          <div className="w-20 shrink-0 flex items-center justify-center">
                            <FileEdit size={16} className="shrink-0 group-hover:text-primary" />
                          </div>
                          <span className="truncate text-sm pr-4">{p.title}</span>
                        </Link>
                      ))}
                      {promptHidden > 0 && <div className="pl-20 py-1 text-xs text-slate-500 italic">+ {promptHidden} more items...</div>}
                    </>
                  )}
                </motion.div>
               )}
            </NavItem>

            <NavItem 
              to="/studio" 
              icon={Brain} 
              label="Studio ✨" 
              isActive={isStudioRoute} 
              isHovered={isHovered} 
              specialStyle={pathname === '/studio' ? "bg-primary/20 text-primary" : undefined}
              layout="position"
            />

            <NavItem 
              to="/lists" 
              icon={ListTodo} 
              label="Lists" 
              isActive={pathname === '/lists'} 
              isHovered={isHovered} 
              layout="position"
            />
          </motion.div>
        </LayoutGroup>

        {/* 3. Footer Section (Stabilized) */}
         <motion.div 
          layout="position"
          className={`
            py-3 border-t border-border bg-transparent shrink-0 flex flex-col mt-auto
            ${isHovered ? 'px-0' : 'items-center'}
          `}
        >
          <div className="w-full flex flex-col gap-1 items-center">
              <div className="w-full">
                <NavItem 
                  to="/settings" 
                  icon={Settings} 
                  label="Settings" 
                  isActive={pathname === '/settings'} 
                  isHovered={isHovered} 
                  layout="position"
                />
              </div>
              
              <div className="flex items-center w-full h-14 relative group">
                  <div className="w-20 h-full flex items-center justify-center shrink-0">
                    <ThemeToggle />
                  </div>
                  
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="whitespace-nowrap overflow-hidden text-sm font-medium text-slate-400"
                      >
                         Theme
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>
          </div>
        </motion.div>
      </motion.aside>
    </>
  );
}

export function HybridSidebar() {
  return (
    <Suspense fallback={<div className="w-20 bg-slate-900 h-screen fixed left-0 top-0 border-r border-white/10" />}>
      <HybridSidebarContent />
    </Suspense>
  );
}
