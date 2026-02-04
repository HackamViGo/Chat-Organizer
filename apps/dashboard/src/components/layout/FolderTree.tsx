'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  MessageCircle, 
  Folder as FolderIcon,
  LayoutGrid, Archive, FileEdit, Settings,
  Plus, User, Search, Trash2, ListTodo, 
  MessageSquarePlus, Brain
} from 'lucide-react';
import { Chat, Folder } from '@/types';

// --- Configuration ---

export const FOLDER_ICONS: Record<string, React.ElementType> = {
  Folder: FolderIcon,
  MessageCircle,
  Settings,
  Archive,
  Search,
  User,
  LayoutGrid,
  FileEdit,
  ListTodo,
  MessageSquarePlus,
  Brain
};

// --- Types ---

export interface FolderWithChildren extends Folder {
  children?: FolderWithChildren[];
}

interface FolderTreeItemProps {
  folder: FolderWithChildren;
  level: number;
  allChats: Chat[];
  isActive: (id: string) => boolean;
  onToggle: (id: string) => void;
  expandedFolders: Set<string>;
  isExpanded: boolean;
}

// --- Component ---

export const FolderTreeItem: React.FC<FolderTreeItemProps> = ({ 
  folder, level, allChats, isActive, onToggle, expandedFolders, isExpanded
}) => {
  // 1. THE 80px PURGE (Visibility Fix)
  // Hide everything if sidebar is not expanded
  if (!isExpanded) return null;

  const isFolderExpanded = expandedFolders.has(folder.id);
  const folderChats = allChats.filter(c => c.folder_id === folder.id && !c.is_archived);
  const hasContent = (folder.children && folder.children.length > 0) || folderChats.length > 0;
  const Icon = folder.icon && FOLDER_ICONS[folder.icon] ? FOLDER_ICONS[folder.icon] : FolderIcon;
  const isItemActive = isActive(folder.id);

  // 1. HIERARCHY ALIGNMENT logic
  // Indentation base: 30px (to center 20px icon at 40px)
  // Per level indent: 20px (for clear hierarchy)
  const paddingLeft = isExpanded ? (30 + level * 20) : undefined;
  
  return (
    <div className="relative">
      <div 
        onClick={() => onToggle(folder.id)}
        className={`
          group flex items-center rounded-lg text-sm cursor-pointer transition-all relative select-none
          ${isExpanded ? 'py-1.5 gap-2 pr-2' : 'w-20 h-10 justify-center'}
          ${isItemActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
        `}
        style={{ paddingLeft: isExpanded ? `${paddingLeft}px` : undefined }}
      >
        {/* Horizontal Connector (L-shape) */}
        {level > 0 && isExpanded && (
           <div 
             className="absolute h-[1px] bg-border/40 top-1/2" 
             style={{ 
               left: '40px', 
               width: `${(30 + level * 20) - 40}px` // Connect 40px line to current icon left edge (which starts at 30+level*20)
             }} 
           />
        )}

        <div className="shrink-0 w-5 h-5 flex items-center justify-center relative z-10">
          <Icon size={20} />
        </div>

        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-between min-w-0"
          >
            <span className="truncate">{folder.name}</span>
            
            {/* 3. CHEVRON FEEDBACK */}
            {hasContent && (
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 ${isFolderExpanded ? 'rotate-0 text-foreground' : '-rotate-90 text-muted-foreground'}`} 
              />
            )}
          </motion.div>
        )}
      </div>

      {/* 2. INTERACTIVE ACCORDION (Framer Motion) */}
      <AnimatePresence>
        {isExpanded && isFolderExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden relative"
          >
             {/* The Continuous Vertical Line for Children */}
             <div 
               className="absolute w-[1px] bg-border/40 top-0 bottom-0"
               style={{ left: '39px' /* Global Vertical Axis */ }} 
             />

            {folder.children?.map(child => (
              <FolderTreeItem 
                key={child.id}
                folder={child}
                level={level + 1}
                allChats={allChats}
                isActive={isActive}
                onToggle={onToggle}
                expandedFolders={expandedFolders}
                isExpanded={isExpanded}
              />
            ))}
            {folderChats.map(chat => (
              <Link
                key={chat.id}
                href={`/chats?id=${chat.id}`}
                className="flex items-center gap-2 py-1.5 pr-2 text-xs text-muted-foreground hover:text-foreground transition-colors relative group"
                style={{ paddingLeft: `${30 + (level + 1) * 20}px` }}
              >
                {/* Connector for chat */}
                <div 
                   className="absolute h-[1px] bg-border/40 top-1/2"
                   style={{ 
                     left: '40px',
                     width: `${(30 + (level + 1) * 20) - 40}px`
                   }}
                />
                <MessageCircle size={14} className="shrink-0 group-hover:text-primary transition-colors relative z-10" />
                <span className="truncate">{chat.title}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
