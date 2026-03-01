'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Globe, Database, Folder, Star, Sparkles, Download, Upload, FileText, FileJson, Trash2, X, AlertTriangle, LogOut } from 'lucide-react';
import { useFolderStore } from '@/store/useFolderStore';
import { useChatStore } from '@/store/useChatStore';
import { useShallow } from 'zustand/react/shallow';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const { folders, setFolders } = useFolderStore(
    useShallow((state) => ({ folders: state.folders, setFolders: state.setFolders }))
  );
  const { chats, setChats } = useChatStore(
    useShallow((state) => ({ chats: state.chats, setChats: state.setChats }))
  );
  const [quickAccessFolders, setQuickAccessFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // Fetch folders from API
    const fetchFolders = async () => {
      try {
        const res = await fetch('/api/folders', { credentials: 'include' });
        const data = await res.json();
        if (data.folders) {
          setFolders(data.folders);
        }
      } catch (error: unknown) {
        console.error('Error fetching folders:', error instanceof Error ? error.message : error);
      } finally {
        setIsLoadingFolders(false);
      }
    };
    fetchFolders();
    
    // Fetch user settings (including quick access folders)
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/user/settings', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.quickAccessFolders) {
            setQuickAccessFolders(data.settings.quickAccessFolders);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
    fetchSettings();

    // Set last sync time from localStorage if it exists
    const savedLastSync = localStorage.getItem('brainbox_last_sync_time');
    if (savedLastSync) {
      setLastSyncTime(savedLastSync);
    }
  }, [setFolders]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // Fetch folders
      const foldersRes = await fetch('/api/folders', { credentials: 'include', cache: 'no-store' });
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
      }

      // Fetch chats/prompts (refresh the current page if needed, or update stores)
      // Since we use stores, we just update them
      const chatsRes = await fetch('/api/chats', { credentials: 'include', cache: 'no-store' });
      if (chatsRes.ok) {
        const data = await chatsRes.json();
        setChats(data.chats || []);
      }

      const now = new Date().toLocaleTimeString();
      setLastSyncTime(now);
      localStorage.setItem('brainbox_last_sync_time', now);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const toggleQuickAccess = async (folderId: string) => {
    let newQuickAccess = [...quickAccessFolders];
    
    if (newQuickAccess.includes(folderId)) {
      // Remove from quick access
      newQuickAccess = newQuickAccess.filter(id => id !== folderId);
    } else {
      // Add to quick access (max 3)
      if (newQuickAccess.length >= 3) {
        alert('You can only have 3 folders in quick access. Remove one first.');
        return;
      }
      newQuickAccess.push(folderId);
    }
    
    setQuickAccessFolders(newQuickAccess);
    
    // Save to database
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            quickAccessFolders: newQuickAccess
          }
        })
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }

    // Update extension storage (if available via message passing or if extension context)
    // Note: Provide visual feedback or sync mechanism in extension side
  };

  const clearAllQuickAccess = async () => {
    if (quickAccessFolders.length === 0) return;
    
    setQuickAccessFolders([]);
    
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            quickAccessFolders: []
          }
        })
      });
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  };

  const promptFolders = folders.filter(f => f.type === 'prompt');

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chats-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    setIsExporting(true);
    try {
      // Fetch chats
      const response = await fetch('/api/chats', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      const data = await response.json();
      const chats = data.chats || [];
      
      // Convert to Markdown
      let markdown = `# Chats Export\n\n`;
      markdown += `Exported on: ${new Date().toLocaleString()}\n`;
      markdown += `Total chats: ${chats.length}\n\n`;
      markdown += `---\n\n`;
      
      chats.forEach((chat: any, index: number) => {
        markdown += `## ${index + 1}. ${chat.title || 'Untitled Chat'}\n\n`;
        markdown += `**Platform:** ${chat.platform || 'Unknown'}\n`;
        markdown += `**Date:** ${chat.created_at ? new Date(chat.created_at).toLocaleString() : 'Unknown'}\n`;
        if (chat.url) {
          markdown += `**URL:** ${chat.url}\n`;
        }
        markdown += `\n`;
        
        if (chat.summary) {
          markdown += `### Summary\n\n${chat.summary}\n\n`;
        }
        
        if (chat.content) {
          markdown += `### Content\n\n${chat.content}\n\n`;
        }
        
        markdown += `---\n\n`;
      });
      
      // Download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chats-export-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    
    try {
      const text = await file.text();
      let jsonData;
      
      try {
        jsonData = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please check the file format.');
      }
      
      // Validate structure
      if (!jsonData.chats || !Array.isArray(jsonData.chats)) {
        throw new Error('Invalid file format. Expected JSON with "chats" array.');
      }
      
      // Check for conflicts (duplicates by title and platform)
      const existingChats = chats;
      const conflicts: string[] = [];
      jsonData.chats.forEach((chat: any) => {
        const duplicate = existingChats.find(
          (c: any) => c.title === chat.title && c.platform === chat.platform
        );
        if (duplicate) {
          conflicts.push(chat.title || 'Untitled');
        }
      });
      
      if (conflicts.length > 0) {
        const proceed = confirm(
          `Found ${conflicts.length} duplicate chat(s). They will be imported as new entries. Continue?`
        );
        if (!proceed) {
          setIsImporting(false);
          return;
        }
      }
      
      // Import chats and folders
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          chats: jsonData.chats,
          folders: jsonData.folders || []
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to import data' }));
        throw new Error(errorData.message || 'Failed to import data');
      }
      
      const result = await response.json();
      const importedChats = result.imported?.chats || result.imported || jsonData.chats.length;
      const importedFolders = result.imported?.folders || 0;
      
      let successMsg = `Successfully imported ${importedChats} chat(s)`;
      if (importedFolders > 0) {
        successMsg += ` and ${importedFolders} folder(s)`;
      }
      successMsg += '.';
      setImportSuccess(successMsg);
      
      // Refresh chats and folders
      const chatsResponse = await fetch('/api/chats', {
        credentials: 'include',
      });
      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json();
        setChats(chatsData.chats || []);
      }
      
      const foldersResponse = await fetch('/api/folders', {
        credentials: 'include',
      });
      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        setFolders(foldersData.folders || []);
      }
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setImportSuccess(null), 5000);
    } catch (error: any) {
      console.error('Import error:', error);
      setImportError(error.message || 'Failed to import data. Please check the file format.');
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Clear remember me
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('brainbox_remember_me');
        } catch (error) {
          if (error instanceof DOMException) {
            console.warn('Failed to remove remember me from localStorage:', error.name);
          }
        }
        document.cookie = 'brainbox_remember_me=; max-age=0; path=/';
      }

      router.push('/auth/signin');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      // Call API to delete account and all data
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete account' }));
        throw new Error(errorData.message || 'Failed to delete account');
      }

      // Sign out and redirect
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Clear remember me
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('brainbox_remember_me');
        } catch (error) {
          if (error instanceof DOMException) {
            console.warn('Failed to remove remember me from localStorage:', error.name);
          }
        }
        document.cookie = 'brainbox_remember_me=; max-age=0; path=/';
      }

      router.push('/auth/signin');
      router.refresh();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setDeleteError(error.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      <div className="space-y-6">

        {/* Data Sync & Realtime */}
        <div className="glass-card p-6 rounded-2xl border-l-4 border-l-cyan-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center">
              <Sparkles className={`w-5 h-5 text-cyan-600 dark:text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Synchronization</h2>
              <p className="text-sm text-muted-foreground">
                Sync folders, prompts and chats with the cloud
              </p>
            </div>
            {lastSyncTime && (
              <div className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                Last sync: {lastSyncTime}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex-1 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all text-left flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className={`w-6 h-6 text-cyan-600 dark:text-cyan-400 ${isSyncing ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <p className="font-semibold text-cyan-900 dark:text-cyan-100">Sync All Data</p>
                <p className="text-xs text-cyan-700/70 dark:text-cyan-300/60">
                  Force refresh folders & prompts from database
                </p>
              </div>
            </button>

            <div className="flex-1 p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold">Automatic Sync</p>
                <p className="text-xs text-muted-foreground">
                  Real-time updates are active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chrome Extension Quick Access */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Extension Quick Access</h2>
              <p className="text-sm text-muted-foreground">
                Select up to 3 folders to show in Chrome Extension hover menu
              </p>
            </div>
            <div className="flex items-center gap-2">
              {quickAccessFolders.length > 0 && (
                <button
                  onClick={clearAllQuickAccess}
                  className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Clean
                </button>
              )}
              <div className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                {quickAccessFolders.length}/3
              </div>
            </div>
          </div>

          {isLoadingFolders ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : promptFolders.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-border rounded-xl">
              <Folder className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No prompt folders yet</p>
              <p className="text-sm text-muted-foreground">
                Create prompt folders first, then add them to quick access
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {promptFolders.map((folder) => {
                const isInQuickAccess = quickAccessFolders.includes(folder.id);
                
                return (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isInQuickAccess
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                    onClick={() => toggleQuickAccess(folder.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${folder.color || '#667eea'}20` }}
                      >
                        <Folder
                          className="w-5 h-5"
                          style={{ color: folder.color || '#667eea' }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.type || 'prompt'} folder
                        </p>
                      </div>
                    </div>
                    
                    {isInQuickAccess && (
                      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm font-medium text-primary">Quick Access</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                  🎉 Free Feature - Coming Soon: PRO & ULTRA Plans
                </p>
                <p className="text-purple-700 dark:text-purple-300 text-xs">
                  Quick Access folders are currently free! Soon we&apos;ll introduce PRO and ULTRA plans with even more amazing features. Enjoy this feature while it&apos;s in beta!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Configure notification preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about new updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Language & Region */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Language & Region</h2>
              <p className="text-sm text-muted-foreground">
                Set your preferred language and timezone
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border">
              <label className="block text-sm font-medium mb-2">Language</label>
              <select className="w-full p-2 rounded-lg border border-border bg-background">
                <option>English (US)</option>
                <option>Bulgarian</option>
                <option>Español</option>
                <option>Français</option>
              </select>
            </div>

            <div className="p-4 rounded-lg border border-border">
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select className="w-full p-2 rounded-lg border border-border bg-background">
                <option>UTC+2 (Sofia)</option>
                <option>UTC+0 (London)</option>
                <option>UTC-5 (New York)</option>
                <option>UTC+8 (Singapore)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Data & Privacy</h2>
              <p className="text-sm text-muted-foreground">
                Manage your data and privacy settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Import Data</p>
                  <p className="text-sm text-muted-foreground">
                    Import chats and data from a file
                  </p>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
              />
            </button>

            <button 
              onClick={handleExportJSON}
              className="w-full p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download all your chats and data
                  </p>
                </div>
              </div>
            </button>

            <button 
              onClick={handleSignOut}
              className="w-full p-4 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left flex items-center gap-3"
            >
              <LogOut size={18} />
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
            </button>

            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full p-4 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <p className="font-medium">Delete Account</p>
              <p className="text-sm">
                Permanently delete your account and all data
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Delete Account
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                This action cannot be undone. This will permanently delete your account and remove all of your data from our servers.
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                Please type <span className="text-red-600 dark:text-red-400 font-mono">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                placeholder="Type DELETE to confirm"
              />
              {deleteError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
