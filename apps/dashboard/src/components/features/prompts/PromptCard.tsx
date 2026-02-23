'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Prompt, PromptUpdate } from '@brainbox/shared';
import { usePromptStore } from '@/store/usePromptStore';
import { useShallow } from 'zustand/react/shallow';
import { createClient } from '@/lib/supabase/client';
import { 
  MoreVertical, Trash2, Edit2, Copy, Check, X, AlertTriangle, Menu, Square, CheckSquare
} from 'lucide-react';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
}

// Map for semantic colors to background utility classes
const BG_COLORS: Record<string, string> = {
  '#ef4444': 'bg-red-500',
  '#f97316': 'bg-orange-500',
  '#f59e0b': 'bg-amber-500',
  '#eab308': 'bg-yellow-500',
  '#84cc16': 'bg-lime-500',
  '#22c55e': 'bg-green-500',
  '#10b981': 'bg-emerald-500',
  '#14b8a6': 'bg-teal-500',
  '#06b6d4': 'bg-cyan-500',
  '#0ea5e9': 'bg-sky-500',
  '#3b82f6': 'bg-blue-500',
  '#6366f1': 'bg-indigo-500',
  '#8b5cf6': 'bg-violet-500',
  '#a855f7': 'bg-purple-500',
  '#d946ef': 'bg-fuchsia-500',
  '#ec4899': 'bg-pink-500',
  '#f43f5e': 'bg-rose-500',
};

export function PromptCard({ prompt, onEdit }: PromptCardProps) {
  const { deletePrompt, updatePrompt, selectedPromptIds, togglePromptSelection } = usePromptStore(
    useShallow((s) => ({
      deletePrompt: s.deletePrompt,
      updatePrompt: s.updatePrompt,
      selectedPromptIds: s.selectedPromptIds,
      togglePromptSelection: s.togglePromptSelection,
    }))
  );
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const useInContextMenu = prompt.use_in_context_menu ?? false;
  const isSelected = selectedPromptIds.includes(prompt.id);
  
  // Selection mode state
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close editing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Handle long press for selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      togglePromptSelection(prompt.id);
    }, 500); // 500ms hold
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDelete = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', prompt.id);

      if (error) {
        console.error('Error deleting prompt:', error);
        return;
      }

      deletePrompt(prompt.id);
      setShowDeleteConfirm(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const handleToggleContextMenu = async () => {
    try {
      const supabase = createClient();
      const newValue = !useInContextMenu;
      
      const updateData: PromptUpdate = { use_in_context_menu: newValue };
      const result = await (supabase as any)
        .from('prompts')
        .update(updateData)
        .eq('id', prompt.id);

      if (result.error) {
        console.error('Error updating prompt:', result.error);
        return;
      }

      // Optimistic update - update store directly
      updatePrompt(prompt.id, updateData);
      setShowMenu(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };


  const colorClass = BG_COLORS[prompt.color || '#6366f1'] || 'bg-indigo-500';
  const truncatedContent = prompt.content.length > 200 
    ? prompt.content.substring(0, 200) + '...' 
    : prompt.content;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('promptId', prompt.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div 
      className="relative group h-full"
      draggable
      onDragStart={handleDragStart}
    >
      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 rounded-lg flex flex-col items-center justify-center p-4 border-2 border-destructive">
          <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
          <p className="text-sm font-medium mb-4 text-center">
            Delete this prompt?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-muted text-foreground rounded-md text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Selection Checkbox */}
      <div 
        className={`absolute top-2 right-2 z-10 transition-opacity duration-200
          ${isSelected || isLongPressing || selectedPromptIds.length > 0 
            ? 'opacity-100' 
            : 'opacity-0 group-hover:opacity-100'}
        `}
        onClick={(e) => {
          e.stopPropagation();
          togglePromptSelection(prompt.id);
        }}
      >
        <button 
          className={`w-5 h-5 rounded border transition-all flex items-center justify-center
            ${isSelected 
              ? 'bg-cyan-500 border-cyan-500' 
              : 'bg-white/80 dark:bg-black/50 border-slate-300 dark:border-slate-500 hover:border-cyan-400 backdrop-blur-sm'}
          `}
        >
          {isSelected && <Check size={14} className="text-white" />}
        </button>
      </div>

      {/* Card Content */}
      <div 
        ref={cardRef}
        draggable
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          if (selectedPromptIds.length > 0 || isLongPressing) {
            e.stopPropagation();
            togglePromptSelection(prompt.id);
          }
        }}
        className={`relative bg-card border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col
          ${isSelected ? 'ring-2 ring-cyan-500 shadow-md shadow-cyan-500/10' : ''}
        `}
      >
        {/* Color Indicator */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${colorClass}`} />

        {/* Header */}
        <div className="flex items-start justify-between mb-3 mt-2">
          <h3 className="text-lg font-semibold line-clamp-2 flex-1">
            {prompt.title}
          </h3>
          
          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                />
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-48 bg-popover border rounded-md shadow-lg z-20 py-1"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(prompt);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleContextMenu();
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      useInContextMenu ? 'text-primary' : ''
                    }`}
                  >
                    <Menu className="w-4 h-4" />
                    {useInContextMenu ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span>In context menu</span>
                      </>
                    ) : (
                      <span>Add to context menu</span>
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
          {truncatedContent}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{prompt.content.length} characters</span>
          {prompt.created_at && (
            <span>
              {new Date(prompt.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
