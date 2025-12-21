'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, User, Bell, Globe, Database, Folder, Star, Sparkles } from 'lucide-react';
import { useFolderStore } from '@/store/useFolderStore';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const currentTheme = theme ?? 'system';
  const { folders, setFolders } = useFolderStore();
  const [quickAccessFolders, setQuickAccessFolders] = useState<string[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);

  useEffect(() => {
    // Fetch folders from API
    fetch('/api/folders', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.folders) {
          setFolders(data.folders);
        }
      })
      .finally(() => setIsLoadingFolders(false));
    
    // Load quick access folders from extension storage (client-side only)
    if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
      (window as any).chrome.storage.local.get(['customFolders'], (result: any) => {
        if (result.customFolders) {
          setQuickAccessFolders(result.customFolders.map((f: any) => f.id));
        }
      });
    }
  }, [setFolders]);

  const toggleQuickAccess = (folderId: string) => {
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
    
    // Update extension storage (client-side only)
    if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
      const customFolders = newQuickAccess.map(id => {
        const folder = folders.find(f => f.id === id);
        return folder ? {
          id: folder.id,
          name: folder.name,
          color: folder.color || '#667eea',
          type: folder.type || 'chat'
        } : null;
      }).filter(Boolean);
      
      (window as any).chrome.storage.local.set({ customFolders }, () => {
        console.log('Quick access folders updated:', customFolders);
      });
    }
  };

  const chatFolders = folders.filter(f => f.type === 'chat' || !f.type);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center">
              <Sun className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Customize how the app looks on your device
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = currentTheme === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-lg'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mx-auto mb-2 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      isActive ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {option.label}
                  </p>
                </button>
              );
            })}
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
            <div className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
              {quickAccessFolders.length}/3
            </div>
          </div>

          {isLoadingFolders ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chatFolders.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-border rounded-xl">
              <Folder className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No folders yet</p>
              <p className="text-sm text-muted-foreground">
                Create chat folders first, then add them to quick access
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatFolders.map((folder) => {
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
                          {folder.type || 'chat'} folder
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

        {/* Account Settings */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Account</h2>
              <p className="text-sm text-muted-foreground">
                Manage your account information
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
              <div>
                <p className="font-medium">Profile Settings</p>
                <p className="text-sm text-muted-foreground">
                  Update your personal information
                </p>
              </div>
              <span className="text-muted-foreground">→</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
              <div>
                <p className="font-medium">Email & Password</p>
                <p className="text-sm text-muted-foreground">
                  Change your login credentials
                </p>
              </div>
              <span className="text-muted-foreground">→</span>
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
                <option>Български</option>
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
            <button className="w-full p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left">
              <p className="font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground">
                Download all your chats and data
              </p>
            </button>

            <button className="w-full p-4 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors text-left">
              <p className="font-medium">Delete Account</p>
              <p className="text-sm">
                Permanently delete your account and all data
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
