'use client';

import React, { useState, useMemo, Suspense, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useChatStore } from '@/store/useChatStore';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';
import { Chat, Folder } from '@brainbox/shared';
import { getFolderIconContainerClasses, getCategoryColorClasses } from '@brainbox/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  LayoutGrid, Archive, FileEdit, Settings,
  Folder as FolderIcon, Plus, ChevronRight, ChevronDown, User, X, Search, Trash2,
  ListTodo, MessageSquarePlus, MessageCircle, Brain, Sun, Moon,
  Menu
} from 'lucide-react';

// --- Configuration Constants ---

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-accent-foreground"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

import { FOLDER_ICONS, FolderWithChildren, FolderTreeItem } from './FolderTree';
export { FOLDER_ICONS };

// --- Sub-Components ---

// --- Sub-Components ---

const NavItem: React.FC<{ 
  to: string; 
  icon: React.ElementType; 
  label: string; 
  isActive: boolean;
  isHovered: boolean;
  children?: React.ReactNode;
  specialStyle?: string;
}> = ({ to, icon: Icon, label, isActive, isHovered, children, specialStyle }) => {
  return (
    <div className="flex flex-col w-full">
      <Link 
        href={to} 
        className={`
          flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative
          ${isHovered ? 'pl-[30px] py-2.5 gap-3' : 'w-20 h-12 justify-center'}
          ${isActive 
            ? (specialStyle || 'bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-primary before:rounded-r-full')
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
        `}
      >
        <motion.div
           whileHover={{ scale: children ? 1 : 1.1 }}
           className="shrink-0"
        >
          <Icon size={20} className={`${isActive ? (specialStyle ? 'text-white' : 'text-primary') : 'text-muted-foreground group-hover:text-foreground'}`} />
        </motion.div>
        
        <AnimatePresence>
          {isHovered && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="truncate whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      <AnimatePresence>
        {isHovered && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// --- Main Hybrid Sidebar Component ---

function HybridSidebarContent({ isMobileOpen, onCloseMobile }: { isMobileOpen?: boolean, onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFolderParam = searchParams.get('folder');
  const [isHovered, setIsHovered] = useState(false);
  const folders = useFolderStore(useShallow(s => s.folders));
  const foldersLoading = useFolderStore(s => s.isLoading);
  const chats = useChatStore(useShallow(s => s.chats));
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // 1. PATHNAME DETECTION & Context
  const isChatRoute = pathname.startsWith('/chats');
  const isPromptRoute = pathname.startsWith('/prompts');
  const isStudioRoute = pathname.startsWith('/ai-studio');

  const activeType = useMemo(() => {
    if (pathname.startsWith('/images')) return 'image';
    if (isPromptRoute) return 'prompt';
    if (pathname.startsWith('/lists')) return 'list';
    if (isChatRoute) return 'chat';
    return null;
  }, [pathname, isChatRoute, isPromptRoute]);

  const toggleFolder = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFolders(next);
  };

  const getFoldersByType = useCallback((type: 'chat' | 'prompt') => {
    // 1. Build a map for easy lookup
    const folderMap = new Map<string, FolderWithChildren>();
    folders.forEach(f => {
      if ((f as any).type === type) {
        folderMap.set(f.id, { ...f, children: [] });
      }
    });
    
    // 2. Build the tree structure
    const tree: FolderWithChildren[] = [];
    folderMap.forEach(f => {
      const parentId = (f as any).parent_id;
      if (parentId && folderMap.has(parentId)) {
        folderMap.get(parentId)!.children!.push(f);
      } else {
        tree.push(f);
      }
    });
    
    return tree;
  }, [folders]);

  const chatFolders = useMemo(() => isChatRoute ? getFoldersByType('chat') : [], [isChatRoute, getFoldersByType]);
  const promptFolders = useMemo(() => isPromptRoute ? getFoldersByType('prompt') : [], [isPromptRoute, getFoldersByType]);

  return (
    <motion.aside
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={false}
      animate={{ 
        width: isHovered ? 256 : 80,
        x: isMobileOpen ? 0 : undefined 
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed left-0 top-0 h-screen z-[60] bg-card/95 backdrop-blur-md border-r border-border flex flex-col justify-between overflow-hidden shadow-2xl transition-transform md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Mobile Close Button */}
      <button 
        onClick={onCloseMobile}
        className={`md:hidden absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground ${!isMobileOpen && 'hidden'}`}
      >
        <X size={20} />
      </button>

      {/* 1. TOP SECTION (Header) */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header (Logo) */}
        <div className={`h-16 flex items-center shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-md ${isHovered ? 'pl-[30px]' : 'w-20 justify-center'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Brain className="text-primary-foreground" size={18} />
            </div>
            <AnimatePresence>
              {isHovered && (
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-xl font-bold text-foreground tracking-tight"
                >
                  BrainBox
                </motion.h1>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. MAIN NAV SECTION (SMART ACCORDION) */}
        <div className={`py-4 space-y-1 flex flex-col ${isHovered ? 'px-0' : 'items-center'} border-b border-border/50 overflow-y-auto custom-scrollbar`}>
          <NavItem to="/" icon={LayoutGrid} label="Dashboard" isActive={pathname === '/'} isHovered={isHovered} />
          
          <NavItem 
            to="/chats" 
            icon={MessageCircle} 
            label="Chats" 
            isActive={isChatRoute} 
            isHovered={isHovered}
          >
            {isChatRoute && isHovered && (
              <div className="flex flex-col pb-2">
                {chatFolders.map(f => (
                  <FolderTreeItem 
                    key={f.id}
                    folder={f}
                    level={0}
                    allChats={chats}
                    isActive={(id) => currentFolderParam === id}
                    onToggle={toggleFolder}
                    expandedFolders={expandedFolders}
                    isExpanded={isHovered}
                  />
                ))}
                {chats.filter(c => !c.folder_id && !c.is_archived).map(chat => (
                  <Link 
                    key={chat.id}
                    href={`/chats?id=${chat.id}`}
                    className="flex items-center rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent group px-3 py-2 gap-3"
                    style={{ paddingLeft: '40px' }}
                  >
                    <MessageCircle size={16} className="shrink-0 group-hover:text-primary transition-colors" />
                    <span className="truncate">{chat.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </NavItem>

          <NavItem 
            to="/prompts" 
            icon={FileEdit} 
            label="Prompts" 
            isActive={isPromptRoute} 
            isHovered={isHovered}
          >
             {isPromptRoute && isHovered && (
              <div className="flex flex-col pb-2">
                {promptFolders.map(f => (
                  <FolderTreeItem 
                    key={f.id}
                    folder={f}
                    level={0}
                    allChats={chats}
                    isActive={(id) => currentFolderParam === id}
                    onToggle={toggleFolder}
                    expandedFolders={expandedFolders}
                    isExpanded={isHovered}
                  />
                ))}
              </div>
             )}
          </NavItem>

          <NavItem 
            to="/ai-studio" 
            icon={Brain} 
            label="AI Studio ✨" 
            isActive={isStudioRoute} 
            isHovered={isHovered} 
            specialStyle={pathname === '/ai-studio' ? "bg-primary/20 text-primary" : undefined}
          />

          <NavItem to="/lists" icon={ListTodo} label="Lists" isActive={pathname === '/lists'} isHovered={isHovered} />
        </div>
      </div>

      {/* 4. FOOTER SECTION (Profile/Settings) */}
      <div className={`py-3 border-t border-border/50 bg-card/80 backdrop-blur-sm shrink-0 flex flex-col ${isHovered ? 'px-0' : 'items-center'}`}>
        <NavItem to="/settings" icon={Settings} label="Settings" isActive={pathname === '/settings'} isHovered={isHovered} />
        <div className={`mt-2 flex items-center justify-between w-full ${isHovered ? 'pl-[30px] pr-6' : 'w-20 justify-center'}`}>
           {isHovered && <span className="text-xs text-muted-foreground">Theme</span>}
           <ThemeToggle />
        </div>
      </div>
    </motion.aside>
  );
}

export function HybridSidebar(props: { isMobileOpen?: boolean, onCloseMobile?: () => void }) {
  return (
    <Suspense fallback={null}>
      <HybridSidebarContent {...props} />
    </Suspense>
  );
}
