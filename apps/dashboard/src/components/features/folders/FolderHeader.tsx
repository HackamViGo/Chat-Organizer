'use client';

import type { Folder as FolderType } from '@brainbox/shared';
import { AlertTriangle, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useFolderStore } from '@/store/useFolderStore';

interface FolderHeaderProps {
  folder: FolderType;
  chatCount: number;
}

// Color mapping for folder display
const BG_COLORS: Record<string, string> = {
  '#ef4444': 'bg-red-500',
  '#f97316': 'bg-orange-500',
  '#eab308': 'bg-yellow-500',
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

export default function FolderHeader({ folder, chatCount }: FolderHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { deleteFolder } = useFolderStore(useShallow(s => ({ deleteFolder: s.deleteFolder })));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      setIsDeleting(true);
      const supabase = createClient();

      // Delete folder from Supabase
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folder.id);

      if (error) {
        toast({ title: 'Failed to delete folder', variant: 'destructive' });
        console.error('Error deleting folder:', error);
        return;
      }

      // Update store
      deleteFolder(folder.id);

      // Show success toast and redirect
      toast({ title: 'Folder deleted successfully' });
      router.push('/chats');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({ title: 'An error occurred while deleting the folder', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const bgColor = BG_COLORS[folder.color || '#6366f1'] || 'bg-indigo-500';

  return (
    <div className="relative">
      <div className="flex items-center gap-4">
        {/* Color Badge */}
        <div className={`w-16 h-16 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}></div>

        {/* Folder Info */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{folder.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {chatCount} {chatCount === 1 ? 'chat' : 'chats'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              /* TODO: Implement edit folder */
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            title="Edit folder"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg transition-colors ${
              showDeleteConfirm
                ? 'bg-red-100 dark:bg-red-900 text-red-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Delete folder"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100">Delete folder?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This will permanently delete the folder. Chats will not be deleted, but will lose this folder assignment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
