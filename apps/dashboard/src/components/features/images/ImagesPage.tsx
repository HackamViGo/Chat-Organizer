'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Upload, Image as ImageIcon, Download, Trash2, Folder as FolderIcon, 
  X, RefreshCw, LayoutGrid, Plus, ChevronLeft, ChevronRight, Play, Pause, Maximize2,
  Check, AlertTriangle, Dice5, Search, CheckSquare, Square, FolderInput, FileImage, 
  Calendar, HardDrive, ArrowUpAZ, FolderPlus, FolderMinus, Activity, Pill
} from 'lucide-react';
import { FOLDER_ICONS } from '@/components/layout/HybridSidebar';
import { getFolderColorClass, getFolderTextColorClass, getFolderTextColorClasses, getFolderBorderColorClass, getCategoryIconContainerClasses } from '@/lib/utils/colors';
import { useImageStore } from '@/store/useImageStore';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';
import type { Image as ImageType } from '@/types';


interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function ImagesPage() {
  const { 
    images, 
    selectedImageIds, 
    uploadQueue,
    fetchImages, 
    deleteImages, 
    moveImages, 
    toggleImageSelection, 
    selectAllImages, 
    clearSelection,
    addToUploadQueue,
    updateUploadProgress,
    removeFromUploadQueue,
  } = useImageStore();
  
  const { folders, addFolder, isLoading: foldersLoading } = useFolderStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  
  const selectedFolderId = searchParams.get('folder');
  const setSelectedFolderId = (id: string | null) => {
    if (id) {
      router.push(`/images?folder=${id}`);
    } else {
      router.push('/images');
    }
  };
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [selectedColor, setSelectedColor] = useState('cyan');
  
  const isSelectionMode = selectedImageIds.size > 0;
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [isCreatingGroupFromSelection, setIsCreatingGroupFromSelection] = useState(false);
  
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const isDragSelectingRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    format: 'all',
    size: 'all',
    date: 'all',
    sort: 'newest'
  });

  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showFolderedImages, setShowFolderedImages] = useState(false);
  const [feedbackImageIds, setFeedbackImageIds] = useState<Set<string>>(new Set());
  const [showMoveConfirmModal, setShowMoveConfirmModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ targetFolderId: string | null; imageIds: string[] } | null>(null);
  
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchImages(user.id, selectedFolderId || undefined);
      }
    };
    loadImages();
  }, [selectedFolderId, fetchImages]);

  useEffect(() => {
    let interval: any;
    if (hoveredFolderId) {
      setPreviewIndex(0);
      interval = setInterval(() => {
        setPreviewIndex(prev => prev + 1);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [hoveredFolderId]);
  
  const displayedImages = useMemo(() => {
    let result = images;
    if (selectedFolderId) {
      result = result.filter(i => i.folder_id === selectedFolderId);
    } else if (!showFolderedImages) {
      // In All Images view, show only unsorted images by default
      result = result.filter(i => !i.folder_id);
    }
    if (searchQuery) result = result.filter(i => i.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilters.format !== 'all') result = result.filter(i => i.mime_type?.includes(activeFilters.format));
    
    if (activeFilters.size !== 'all') {
      if (activeFilters.size === 'small') result = result.filter(i => (i.size || 0) < 500 * 1024);
      else if (activeFilters.size === 'medium') result = result.filter(i => (i.size || 0) >= 500 * 1024 && (i.size || 0) < 2 * 1024 * 1024);
      else if (activeFilters.size === 'large') result = result.filter(i => (i.size || 0) >= 2 * 1024 * 1024);
    }

    if (activeFilters.date !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      result = result.filter(i => {
        const createdAt = i.created_at ? new Date(i.created_at).getTime() : 0;
        if (activeFilters.date === 'today') return now - createdAt < oneDay;
        if (activeFilters.date === 'week') return now - createdAt < oneDay * 7;
        if (activeFilters.date === 'month') return now - createdAt < oneDay * 30;
        return true;
      });
    }

    result = [...result].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (activeFilters.sort === 'newest') return bTime - aTime;
      if (activeFilters.sort === 'oldest') return aTime - bTime;
      if (activeFilters.sort === 'az') return (a.name || '').localeCompare(b.name || '');
      if (activeFilters.sort === 'za') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    return result;
  }, [images, selectedFolderId, searchQuery, activeFilters, showFolderedImages]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && lightboxIndex !== null) {
      interval = setInterval(() => {
        setLightboxIndex(prev => {
           if (prev === null) return null;
           return (prev + 1) % displayedImages.length;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, lightboxIndex, displayedImages.length]);

  const resetSelection = () => {
    clearSelection();
    setIsCreatingGroupFromSelection(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsPlaying(false);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setIsPlaying(false);
  };

  const handleImageDragStart = (e: React.DragEvent, id: string) => {
    if (selectionBox) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('imageId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedImageId(id);
  };

  const handleRemoveFromFolder = async (imageId: string) => {
    try {
      setFeedbackImageIds(new Set([imageId]));
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await moveImages([imageId], null);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchImages(user.id, selectedFolderId || undefined);
      }
      
      setFeedbackImageIds(new Set());
    } catch (error) {
      console.error('Failed to remove from folder:', error);
      alert('Failed to remove image from folder');
      setFeedbackImageIds(new Set());
    }
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredFolderId(null);

    const imageId = e.dataTransfer.getData('imageId');
    if (!imageId) return;

    const idsToMove = selectedImageIds.has(imageId) 
      ? Array.from(selectedImageIds) 
      : [imageId];

    // Check if moving images from folders when in All Images view
    if (!selectedFolderId) {
      const folderedImages = idsToMove.filter(id => {
        const img = images.find(i => i.id === id);
        return img?.folder_id;
      });
      
      if (folderedImages.length > 0) {
        // Show modal for confirmation
        setPendingMove({ targetFolderId: targetFolderId || null, imageIds: idsToMove });
        setShowMoveConfirmModal(true);
        setDraggedImageId(null);
        return;
      }
    }

    // No images in folders, proceed directly
    await executeMoveImages(targetFolderId || null, idsToMove, false);
    
    if (selectedImageIds.has(imageId)) {
      resetSelection();
    }
    setDraggedImageId(null);
  };

  const executeMoveImages = async (targetFolderId: string | null, imageIds: string[], isCopy: boolean) => {
    try {
      // Visual feedback BEFORE moving
      setFeedbackImageIds(new Set(imageIds));
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (isCopy) {
        // TODO: Implement copy logic
        alert('Copy functionality coming soon!');
        setFeedbackImageIds(new Set());
        return;
      }
      
      await moveImages(imageIds, targetFolderId);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchImages(user.id, selectedFolderId || undefined);
      }
      
      setFeedbackImageIds(new Set());
    } catch (error) {
      console.error('Failed to move images:', error);
      alert('Failed to move images');
      setFeedbackImageIds(new Set());
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag select on left click in empty space (not on image cards)
    if (e.button === 0 && galleryRef.current && !draggedImageId) {
      const target = e.target as HTMLElement;
      // Check if clicking on an image card or its children
      if (target.closest('[id^="card-"]')) return;
      
      const rect = galleryRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + galleryRef.current.scrollLeft;
      const y = e.clientY - rect.top + galleryRef.current.scrollTop;
      
      setSelectionBox({
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
      isDragSelectingRef.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox || !galleryRef.current) return;

    isDragSelectingRef.current = true;

    const rect = galleryRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + galleryRef.current.scrollLeft;
    const y = e.clientY - rect.top + galleryRef.current.scrollTop;

    setSelectionBox(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null);

    const boxLeft = Math.min(selectionBox.startX, x);
    const boxRight = Math.max(selectionBox.startX, x);
    const boxTop = Math.min(selectionBox.startY, y);
    const boxBottom = Math.max(selectionBox.startY, y);

    // Track which images should be selected
    const newSelection = new Set<string>();
    
    displayedImages.forEach(img => {
      const el = document.getElementById(`card-${img.id}`);
      if (el) {
        const itemLeft = el.offsetLeft;
        const itemRight = el.offsetLeft + el.offsetWidth;
        const itemTop = el.offsetTop;
        const itemBottom = el.offsetTop + el.offsetHeight;

        const isIntersecting = !(
           itemLeft > boxRight ||
           itemRight < boxLeft ||
           itemTop > boxBottom ||
           itemBottom < boxTop
        );

        if (isIntersecting) {
           newSelection.add(img.id);
        }
      }
    });
    
    // Update selection to match what's in the box
    newSelection.forEach(id => {
      if (!selectedImageIds.has(id)) {
        toggleImageSelection(id);
      }
    });
    
    // Deselect items that are no longer in the box
    Array.from(selectedImageIds).forEach(id => {
      if (!newSelection.has(id)) {
        toggleImageSelection(id);
      }
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (selectionBox) {
      setSelectionBox(null);
      setTimeout(() => {
        isDragSelectingRef.current = false;
      }, 100);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragSelectingRef.current || selectionBox) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const processFiles = useCallback(async (files: File[]) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const file of files) {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      addToUploadQueue({
        id: uploadId,
        name: file.name,
        progress: 0,
        status: 'uploading',
        file
      });

      try {
        updateUploadProgress(uploadId, 30);
        
        const formData = new FormData();
        formData.append('file', file);
        if (selectedFolderId) formData.append('folderId', selectedFolderId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        updateUploadProgress(uploadId, 100, 'completed');
        
        await fetchImages(user.id, selectedFolderId || undefined);
        
        setTimeout(() => removeFromUploadQueue(uploadId), 3000);
      } catch (error: any) {
        updateUploadProgress(uploadId, 0, 'error', error.message);
      }
    }
  }, [addToUploadQueue, updateUploadProgress, selectedFolderId, fetchImages, removeFromUploadQueue]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  }, [processFiles]);

  const imageFolders = useMemo(() => folders.filter(f => f.type === 'image'), [folders]);

  const convertToAvif = async (img: ImageType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!img.url) return;
    setConvertingId(img.id);
    try {
      const imageObj = new window.Image();
      imageObj.src = img.url;
      await new Promise((resolve) => { imageObj.onload = resolve; });
      const canvas = document.createElement('canvas');
      canvas.width = imageObj.width;
      canvas.height = imageObj.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageObj, 0, 0);
        await new Promise<void>((resolve) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
               const newName = (img.name || 'image').replace(/\.[^/.]+$/, "") + ".avif";
               const file = new File([blob], newName, { type: 'image/avif' });
               await processFiles([file]);
            }
            resolve();
          }, 'image/avif', 0.8);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConvertingId(null);
    }
  };

  const downloadImage = (url: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deleteImageWrapper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this image?')) {
      await deleteImages([id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedImageIds.size} images?`)) return;
    await deleteImages(Array.from(selectedImageIds));
    resetSelection();
  };

  const handleBulkMove = async (targetFolderId?: string) => {
    try {
      const imageIds = Array.from(selectedImageIds);
      
      // Check if moving images from folders when in All Images view
      if (!selectedFolderId) {
        const folderedImages = imageIds.filter(id => {
          const img = images.find(i => i.id === id);
          return img?.folder_id;
        });
        
        if (folderedImages.length > 0) {
          // Show modal for confirmation
          setPendingMove({ targetFolderId: targetFolderId || null, imageIds });
          setShowBulkMoveModal(false);
          setShowMoveConfirmModal(true);
          return;
        }
      }
      
      // No images in folders, proceed directly
      setShowBulkMoveModal(false);
      await executeMoveImages(targetFolderId || null, imageIds, false);
      resetSelection();
    } catch (error) {
      console.error('Failed to move images:', error);
      alert('Failed to move images. Check console for details.');
    }
  };

  const handleBulkCreateGroup = () => {
    setIsCreatingGroupFromSelection(true);
    setIsCreateModalOpen(true);
  };

  const handleBulkConvert = async () => {
    const ids = Array.from(selectedImageIds);
    for (const id of ids) {
       const img = images.find(i => i.id === id);
       if (img && !img.mime_type?.includes('avif')) {
          await convertToAvif(img, { stopPropagation: () => {} } as any);
       }
    }
    resetSelection();
  };

  const isCreatingFolderRef = React.useRef(false);

  const handleCreateImageFolder = async () => {
    if (!newFolderName.trim() || isCreatingFolderRef.current) return;

    isCreatingFolderRef.current = true;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        isCreatingFolderRef.current = false;
        return;
      }

      const { data, error } = await supabase.from('folders').insert({
        name: newFolderName.trim(),
        color: selectedColor,
        icon: selectedIcon,
        user_id: user.id,
        type: 'image'
      } as any).select().single();

      if (error) throw error;

      addFolder(data as any);
      if (isCreatingGroupFromSelection && selectedImageIds.size > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Moving selected images to new folder:', Array.from(selectedImageIds), 'folder:', (data as any).id);
        }
        await moveImages(Array.from(selectedImageIds), (data as any).id);
        
        // Refresh images after moving to new folder
        await fetchImages(user.id, selectedFolderId || undefined);
        resetSelection();
      }

      setIsCreateModalOpen(false);
      setNewFolderName('');
      setIsCreatingGroupFromSelection(false);
      setSelectedIcon('Folder');
      setSelectedColor('cyan');
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    } finally {
      isCreatingFolderRef.current = false;
    }
  };

  if (foldersLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen relative">
        <div className="flex-1 container mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64 mb-4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen relative">

       {isCreateModalOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
               <h3 className="font-semibold text-slate-900 dark:text-white capitalize">New Folder</h3>
               <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Close modal" title="Close"><X size={18} /></button>
             </div>
             <form onSubmit={(e) => { e.preventDefault(); handleCreateImageFolder(); }} className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
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
                   { name: 'Design', color: 'purple', icons: ['Palette', 'Layers', 'PenTool'] },
                   { name: 'Product', color: 'rose', icons: ['Box', 'Target', 'Flag'] },
                   { name: 'Biz', color: 'emerald', icons: ['Briefcase', 'DollarSign', 'PieChart'] },
                   { name: 'Write', color: 'amber', icons: ['Feather', 'FileText', 'BookOpen'] },
                   { name: 'Comms', color: 'blue', icons: ['MessageSquare', 'Mic', 'Video'] },
                   { name: 'Body Parts', color: 'pink', icons: ['Body', 'Hand', 'Footprints', 'Eye'] },
                   { name: 'Health', color: 'red', icons: ['Heart', 'Brain', 'Activity', 'Pill'] },
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
               <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10">Cancel</button>
               <button onClick={handleCreateImageFolder} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg" disabled={!newFolderName}>Create</button>
             </div>
           </div>
         </div>
       )}

       {showBulkMoveModal && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl p-4 shadow-2xl relative flex flex-col max-h-[500px] border border-slate-200 dark:border-slate-700">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
               <h3 className="font-bold text-slate-900 dark:text-white">Move {selectedImageIds.size} Items To...</h3>
               <button onClick={() => setShowBulkMoveModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                 <X size={18} />
               </button>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
               <button onClick={() => handleBulkMove(undefined)} className="w-full text-left px-3 py-2 rounded text-sm bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                 Unsorted (Root)
               </button>
               {imageFolders.map(f => {
                  const Icon = f.icon && FOLDER_ICONS[f.icon] ? FOLDER_ICONS[f.icon] : FolderIcon;
                  return (
                    <button key={f.id} onClick={() => handleBulkMove(f.id)} className="w-full text-left px-3 py-2 rounded text-sm bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 transition-colors">
                      <Icon size={14} className={getFolderTextColorClass(f.color)} /> {f.name}
                    </button>
                  )
               })}
             </div>
           </div>
         </div>
       )}

       <div 
         ref={galleryRef}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onContextMenu={handleContextMenu}
         className="flex-1 p-6 md:p-10 overflow-y-auto flex flex-col gap-6 relative"
       >
          {selectionBox && (
            <div 
              className="absolute z-50 border border-cyan-500 bg-cyan-500/20 pointer-events-none"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.currentX),
                top: Math.min(selectionBox.startY, selectionBox.currentY),
                width: Math.abs(selectionBox.currentX - selectionBox.startX),
                height: Math.abs(selectionBox.currentY - selectionBox.startY),
              }}
            />
          )}

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
             <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                  {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'All Images'}
                </h2>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                  <span>{displayedImages.length} Assets</span>
                  <span>•</span>
                  <span>{selectedFolderId ? 'Folder View' : 'Global View'}</span>
                  {!selectedFolderId && (
                    <>
                      <span>•</span>
                      <button 
                        onClick={() => setShowFolderedImages(!showFolderedImages)}
                        className="text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium transition-colors flex items-center gap-1"
                      >
                        <FolderIcon size={14} />
                        {showFolderedImages ? 'Hide' : 'Show'} Foldered
                      </button>
                    </>
                  )}
                </div>
             </div>

             <div className="flex flex-col md:flex-row gap-3">
               <div className="relative group min-w-[200px]">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-500" size={16} />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search images..." 
                   className="w-full bg-slate-100 dark:bg-white/5 border border-transparent focus:border-cyan-500/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none transition-all"
                 />
                 {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
               </div>

               <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                 <FilterSelect 
                   icon={FileImage}
                   value={activeFilters.format}
                   onChange={(v) => setActiveFilters(prev => ({ ...prev, format: v }))}
                   options={[
                     { label: 'All Formats', value: 'all' },
                     { label: 'JPG', value: 'jpeg' },
                     { label: 'PNG', value: 'png' },
                     { label: 'AVIF', value: 'avif' },
                     { label: 'WebP', value: 'webp' },
                   ]}
                 />
                 <FilterSelect 
                   icon={HardDrive}
                   value={activeFilters.size}
                   onChange={(v) => setActiveFilters(prev => ({ ...prev, size: v }))}
                   options={[
                     { label: 'Any Size', value: 'all' },
                     { label: 'Small (<500KB)', value: 'small' },
                     { label: 'Medium (<2MB)', value: 'medium' },
                     { label: 'Large (>2MB)', value: 'large' },
                   ]}
                 />
                 <FilterSelect 
                   icon={Calendar}
                   value={activeFilters.date}
                   onChange={(v) => setActiveFilters(prev => ({ ...prev, date: v }))}
                   options={[
                     { label: 'Any Time', value: 'all' },
                     { label: 'Last 24h', value: 'today' },
                     { label: 'Last Week', value: 'week' },
                     { label: 'Last Month', value: 'month' },
                   ]}
                 />
                 <FilterSelect 
                   icon={ArrowUpAZ}
                   value={activeFilters.sort}
                   onChange={(v) => setActiveFilters(prev => ({ ...prev, sort: v }))}
                   options={[
                     { label: 'Newest First', value: 'newest' },
                     { label: 'Oldest First', value: 'oldest' },
                     { label: 'Name (A-Z)', value: 'az' },
                     { label: 'Name (Z-A)', value: 'za' },
                   ]}
                 />
               </div>
             </div>
          </div>

          {isSelectionMode && (
            <div className="sticky top-0 z-30 glass-panel p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-xl border-cyan-500/20">
               <div className="flex items-center gap-3">
                 <button onClick={() => selectAllImages(displayedImages.map(i => i.id))} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                   {selectedImageIds.size === displayedImages.length ? <CheckSquare size={16} className="text-cyan-500" /> : <div className="w-4 h-4 bg-cyan-500 rounded-sm flex items-center justify-center text-white text-[10px]">{selectedImageIds.size}</div>}
                   {selectedImageIds.size} Selected
                 </button>
                 <span className="h-4 w-px bg-slate-300 dark:bg-white/20"></span>
                 <button onClick={resetSelection} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white">Clear</button>
               </div>
               
               <div className="flex items-center gap-2">
                 <button onClick={handleBulkCreateGroup} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-500/10 hover:bg-cyan-200 dark:hover:bg-cyan-500/20 rounded-lg transition-colors text-cyan-700 dark:text-cyan-400">
                   <FolderPlus size={14} /> New Group
                 </button>
                 <button onClick={() => setShowBulkMoveModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg transition-colors text-slate-700 dark:text-white">
                   <FolderInput size={14} /> Move
                 </button>
                 <button onClick={handleBulkConvert} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg transition-colors text-slate-700 dark:text-white">
                   <RefreshCw size={14} /> Convert
                 </button>
                 <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-lg transition-colors text-red-600 dark:text-red-400">
                   <Trash2 size={14} /> Delete
                 </button>
               </div>
            </div>
          )}

          <div className="space-y-4">
             <div 
               onClick={() => document.getElementById('file-upload')?.click()}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
               className={`
                 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer group
                 ${isDragging 
                    ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 scale-[1.02] ring-2 ring-cyan-500/30 dark:ring-cyan-400/30 shadow-lg shadow-cyan-500/20 animate-pulse' 
                    : 'border-slate-300 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/50 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}
               `}
             >
               <input 
                 id="file-upload"
                 type="file" 
                 className="hidden" 
                 onChange={handleFileSelect}
                 multiple 
                 accept="image/*"
               />
               <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                 <Upload size={24} className={`transition-colors ${isDragging ? 'text-cyan-600' : 'text-slate-400 group-hover:text-cyan-500'}`} />
               </div>
               <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag & Drop or Click to Upload</p>
               <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WebP, AVIF</p>
             </div>

             {uploadQueue.length > 0 && (
               <div className="bg-white/50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
                 <div className="px-4 py-2 bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-500 uppercase">
                   Upload Activity
                 </div>
                 <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {uploadQueue.map(item => (
                       <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-sm">
                          <div className="w-8 h-8 rounded bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                            {item.status === 'completed' ? <Check size={16} className="text-emerald-500" /> :
                             item.status === 'error' ? <AlertTriangle size={16} className="text-red-500" /> :
                             <RefreshCw size={16} className="text-cyan-500 animate-spin" />}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between mb-1">
                               <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                               <span className="text-xs text-slate-500 capitalize">{item.status}</span>
                             </div>
                             {item.status !== 'error' && (
                               <div className="h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${item.progress}%` }} />
                               </div>
                             )}
                             {item.error && <div className="text-xs text-red-500">{item.error}</div>}
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
             )}
          </div>

          {displayedImages.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-slate-400">
               <ImageIcon size={48} className="mb-2 opacity-20" />
               <p className="text-sm">No images found.</p>
               {(searchQuery || activeFilters.format !== 'all') && <button onClick={() => { setSearchQuery(''); setActiveFilters({format:'all',size:'all',date:'all',sort:'newest'}); }} className="mt-2 text-cyan-500 hover:underline text-xs">Clear Filters</button>}
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 select-none">
               {displayedImages.map((img, index) => {
                 const hasFeedback = feedbackImageIds.has(img.id);
                 const imgFolder = img.folder_id ? folders.find(f => f.id === img.folder_id) : null;
                 return (
                   <div 
                     key={img.id} 
                     id={`card-${img.id}`}
                     className={hasFeedback ? 'animate-pulse-scale' : ''}
                   >
                      <ImageCard 
                          image={img} 
                          folder={imgFolder}
                          onDragStart={handleImageDragStart}
                          onConvert={convertToAvif}
                          onDownload={downloadImage}
                          onDelete={deleteImageWrapper}
                          onRemoveFromFolder={(id, e) => {
                            e.stopPropagation();
                            handleRemoveFromFolder(id);
                          }}
                          isConverting={convertingId === img.id}
                          onClick={() => isSelectionMode ? toggleImageSelection(img.id) : openLightbox(index)}
                          selectable={true}
                          isSelected={selectedImageIds.has(img.id)}
                          onToggleSelect={() => toggleImageSelection(img.id)}
                      />
                   </div>
                 );
               })}
            </div>
          )}
       </div>

       {lightboxIndex !== null && displayedImages[lightboxIndex] && (
         <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
            <div className="absolute top-4 right-4 z-20 flex gap-4 items-center">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={(e) => downloadImage(displayedImages[lightboxIndex].url!, displayedImages[lightboxIndex].name || 'image', e as any)} className="text-white/70 hover:text-white transition-colors"><Download /></button>
              <button onClick={closeLightbox} className="text-white/70 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4 relative" onClick={closeLightbox}>
               <button 
                 className="absolute left-4 text-white/50 hover:text-white p-2 z-20 transition-all hover:scale-110 bg-black/20 rounded-full backdrop-blur-sm"
                 onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : displayedImages.length - 1)); setIsPlaying(false); }}
               >
                 <ChevronLeft size={32} />
               </button>
               
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                 key={displayedImages[lightboxIndex].id}
                 onClick={(e) => e.stopPropagation()}
                 src={displayedImages[lightboxIndex].url} 
                 className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl animate-in fade-in zoom-in-95 duration-300" 
                 alt={displayedImages[lightboxIndex].name || 'image'} 
               />
               
               <button 
                 className="absolute right-4 text-white/50 hover:text-white p-2 z-20 transition-all hover:scale-110 bg-black/20 rounded-full backdrop-blur-sm"
                 onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => (prev !== null && prev < displayedImages.length - 1 ? prev + 1 : 0)); setIsPlaying(false); }}
               >
                 <ChevronRight size={32} />
               </button>
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-3 rounded-full text-center text-white backdrop-blur-md border border-white/10 shadow-xl flex flex-col gap-1 items-center z-20">
               <h3 className="text-sm font-bold truncate max-w-[300px]">{displayedImages[lightboxIndex].name}</h3>
               <div className="flex items-center gap-2 text-xs opacity-70">
                 <span>{lightboxIndex + 1} / {displayedImages.length}</span>
                 <span>•</span>
                 <span>{((displayedImages[lightboxIndex].size || 0) / 1024).toFixed(0)} KB</span>
                 <span>•</span>
                 <span className="uppercase">{displayedImages[lightboxIndex].mime_type?.split('/')[1]}</span>
               </div>
               {isPlaying && (
                 <div className="w-full h-0.5 bg-white/20 mt-1 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-full animate-[shrink_3s_linear_infinite]" />
                 </div>
               )}
            </div>
         </div>
       )}

       {/* Move Confirmation Modal */}
       {showMoveConfirmModal && pendingMove && (
         <div 
           className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
           onClick={() => {
             setShowMoveConfirmModal(false);
             setPendingMove(null);
           }}
         >
           <div 
             className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
             onClick={(e) => e.stopPropagation()}
           >
             {/* Header */}
             <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                 Move Images
               </h3>
               <button
                 onClick={() => {
                   setShowMoveConfirmModal(false);
                   setPendingMove(null);
                 }}
                 className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
               >
                 <X className="w-5 h-5 text-slate-500" />
               </button>
             </div>

             {/* Content */}
             <div className="p-6">
               <p className="text-slate-600 dark:text-slate-400 mb-6">
                 {pendingMove.imageIds.filter(id => images.find(i => i.id === id)?.folder_id).length} image(s) already in a folder. What would you like to do?
               </p>

               {/* Actions */}
               <div className="space-y-3">
                 <button
                   onClick={() => {
                     executeMoveImages(pendingMove.targetFolderId, pendingMove.imageIds, false);
                     setShowMoveConfirmModal(false);
                     setPendingMove(null);
                     resetSelection();
                   }}
                   className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                 >
                   Move (Replace folder)
                 </button>

                 <button
                   onClick={() => {
                     executeMoveImages(pendingMove.targetFolderId, pendingMove.imageIds, true);
                     setShowMoveConfirmModal(false);
                     setPendingMove(null);
                     resetSelection();
                   }}
                   className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                 >
                   Copy (Keep in both folders)
                 </button>

                 <button
                   onClick={() => {
                     setShowMoveConfirmModal(false);
                     setPendingMove(null);
                   }}
                   className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-medium transition-colors"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
       `}</style>
    </div>
  );
}

const FilterSelect: React.FC<{
  icon: React.ElementType,
  value: string,
  onChange: (v: string) => void,
  options: { label: string, value: string }[]
}> = ({ icon: Icon, value, onChange, options }) => (
  <div className="relative group shrink-0">
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 border border-transparent hover:border-slate-300 dark:hover:border-white/20 rounded-lg cursor-pointer transition-all text-xs font-medium text-slate-600 dark:text-slate-300">
      <Icon size={14} />
      <span>{options.find(o => o.value === value)?.label}</span>
    </div>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const ImageCard: React.FC<{
  image: ImageType, 
  folder?: any,
  onDragStart: (e: React.DragEvent, id: string) => void,
  onConvert: (img: ImageType, e: React.MouseEvent) => void,
  onDownload: (url: string, name: string, e: React.MouseEvent) => void,
  onDelete: (id: string, e: React.MouseEvent) => void,
  onRemoveFromFolder?: (id: string, e: React.MouseEvent) => void,
  onClick: () => void,
  isConverting: boolean,
  selectable?: boolean,
  isSelected?: boolean,
  onToggleSelect?: () => void
}> = ({ image, folder, onDragStart, onConvert, onDownload, onDelete, onRemoveFromFolder, onClick, isConverting, selectable, isSelected, onToggleSelect }) => {
  const FolderIconComponent = folder?.icon && FOLDER_ICONS[folder.icon] ? FOLDER_ICONS[folder.icon] : FolderIcon;
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle long press for selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !selectable) return; // Only left mouse button and if selectable
    
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
      onToggleSelect?.();
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

  // Handle click outside to close editing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // Close any editing states if needed
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div 
      ref={cardRef}
      draggable
      onDragStart={(e) => onDragStart(e, image.id)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (!isLongPressing) {
          onClick();
        }
        setIsLongPressing(false);
      }}
      className={`
        glass-card p-4 rounded-xl group relative transition-all duration-200 cursor-pointer h-full
        ${isSelected ? 'ring-2 ring-cyan-500 bg-cyan-500/10' : 'hover:scale-[1.02]'}
      `}
    >
      {folder && (
        <div 
          className={`absolute top-2 left-2 z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md ${getFolderBorderColorClass(folder.color, '50')} shadow-lg transition-all hover:scale-110 cursor-default`}
          title={`In folder: ${folder.name}`}
        >
          <FolderIconComponent size={18} className={`${getFolderTextColorClasses(folder.color).base} ${getFolderTextColorClasses(folder.color).dark} ${getFolderTextColorClasses(folder.color).hover} ${getFolderTextColorClasses(folder.color).hoverDark} transition-colors`} />
        </div>
      )}
      
      {selectable && (isSelected || isLongPressing) && (
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
          className={`absolute top-2 right-2 z-20 p-1.5 rounded-lg transition-all
            ${isSelected 
              ? 'bg-cyan-500 text-white opacity-100 scale-100' 
              : 'bg-black/40 text-white/50 hover:bg-black/60 hover:text-white opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'}
          `}
        >
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      )}

      <div className="aspect-square rounded-lg bg-slate-100 dark:bg-black/50 relative overflow-hidden mb-3 border border-slate-200 dark:border-white/5">
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.name || 'image'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RefreshCw className="animate-spin text-slate-400" />
          </div>
        )}
        
        {!isSelected && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3"
          >
             <button 
               onClick={(e) => { e.stopPropagation(); onDownload(image.url, image.name || 'image', e); }}
               className="p-2.5 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors" 
               title="Download"
             >
               <Download size={18} />
             </button>
             {folder && onRemoveFromFolder && (
               <button 
                 onClick={(e) => { e.stopPropagation(); onRemoveFromFolder(image.id, e); }}
                 className="p-2.5 bg-orange-500/20 hover:bg-orange-500/40 backdrop-blur-md rounded-full text-orange-400 transition-colors" 
                 title="Remove from folder"
               >
                 <FolderMinus size={18} />
               </button>
             )}
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete(image.id, e); }}
               className="p-2.5 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-full text-red-400 transition-colors" 
               title="Delete"
             >
               <Trash2 size={18} />
             </button>
             <div className="absolute bottom-2 text-[10px] text-white/70 flex items-center gap-1">
               <Maximize2 size={10} /> View
             </div>
          </div>
        )}

        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-black/50 text-white backdrop-blur-sm">
          {image.mime_type?.split('/')[1]}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={image.name || 'image'}>
            {image.name}
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {((image.size || 0) / 1024).toFixed(0)} KB • {image.created_at ? new Date(image.created_at).toLocaleDateString() : ''}
          </p>
        </div>

        {!image.mime_type?.includes('avif') && (
          <button 
            onClick={(e) => onConvert(image, e)}
            disabled={isConverting}
            className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-white/5 transition-all text-xs font-medium flex items-center justify-center gap-2"
          >
             {isConverting ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
             To AVIF
          </button>
        )}
      </div>
    </div>
  );
};
