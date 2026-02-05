'use client';

import React, { useState } from 'react';
import { 
  MoreVertical, Edit2, FolderInput, Download, 
  Archive, ArchiveRestore, Trash2, X, AlertTriangle, Check,
  Folder as DefaultFolderIcon
} from 'lucide-react';
import { Chat } from '@brainbox/shared';
import { useFolderStore } from '@/store/useFolderStore';
import { useShallow } from 'zustand/react/shallow';

interface ChatActionMenuProps {
  chat: Chat;
  onEdit: () => void;
  onArchive: () => Promise<void>;
  onDownload: () => void;
  onDelete: () => Promise<void>;
  onMove: (folderId?: string) => Promise<void>;
}

export const ChatActionMenu: React.FC<ChatActionMenuProps> = ({
  chat,
  onEdit,
  onArchive,
  onDownload,
  onDelete,
  onMove
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  const folders = useFolderStore(useShallow(s => s.folders));

  const handleAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical size={16} />
      </button>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 top-8 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-20 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-200">
          <button 
            onClick={() => handleAction(onEdit)}
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button 
            onClick={() => handleAction(() => setShowMoveModal(true))}
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <FolderInput size={14} /> Move to Folder
          </button>
          <button 
            onClick={() => handleAction(onDownload)}
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <Download size={14} /> Download
          </button>
          <button 
            onClick={() => handleAction(() => onArchive())}
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            {chat.is_archived ? <ArchiveRestore size={14}/> : <Archive size={14}/>}
            {chat.is_archived ? 'Restore' : 'Archive'}
          </button>
          <div className="h-px bg-slate-200 dark:bg-white/5 my-1" />
          <button 
            onClick={() => handleAction(() => setShowDeleteConfirm(true))}
            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Delete Chat?</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">"{chat.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-sm font-medium transition-colors text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await onDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal Overlay */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-lg">Move to...</h4>
              <button 
                onClick={() => setShowMoveModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={20}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <button 
                onClick={async () => {
                  await onMove(undefined);
                  setShowMoveModal(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between
                  ${!chat.folder_id ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}
                `}
              >
                No Folder (Root)
                {!chat.folder_id && <Check size={16} />}
              </button>
              <div className="h-px bg-slate-100 dark:bg-white/5 my-2 mx-4" />
              {folders.map(f => (
                <button 
                  key={f.id}
                  onClick={async () => {
                    await onMove(f.id);
                    setShowMoveModal(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between
                    ${chat.folder_id === f.id ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <DefaultFolderIcon size={16} className={chat.folder_id === f.id ? 'text-cyan-500' : 'text-slate-400'} />
                    <span>{f.name}</span>
                  </div>
                  {chat.folder_id === f.id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
