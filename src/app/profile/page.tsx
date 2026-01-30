'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, Shield, CreditCard, Bell, Code, Pencil, Mail, Moon, Sun, Monitor, Check, Settings, Download, LogOut, Lock, Eye, EyeOff, X } from 'lucide-react';
import Link from 'next/link';

type ProfileSection = 'general' | 'security' | 'billing' | 'notifications' | 'api';

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<ProfileSection>('general');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    language: 'en-US',
    emailNotifications: true,
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [userImages, setUserImages] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          setUser(currentUser);
          setFormData({
            firstName: currentUser.user_metadata?.first_name || '',
            lastName: currentUser.user_metadata?.last_name || '',
            email: currentUser.email || '',
            bio: currentUser.user_metadata?.bio || '',
            language: currentUser.user_metadata?.language || 'en-US',
            emailNotifications: currentUser.user_metadata?.email_notifications !== false,
          });
          
          // Fetch user profile with avatar_url (only uploaded avatars, not Google)
          const { data: profileData, error: profileError } = await (supabase
            .from('users') as any)
            .select('avatar_url')
            .eq('id', currentUser.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }
          
          // Set avatar URL from DB (if exists)
          const profile = profileData as { avatar_url?: string | null } | null;
          if (profile?.avatar_url) {
            console.log('Loaded avatar_url from DB:', profile.avatar_url);
            setAvatarUrl(profile.avatar_url);
          } else {
            console.log('No avatar_url in DB, setting to null');
            setAvatarUrl(null);
          }
        }
      } catch (error: unknown) {
        console.error('Error fetching user:', error instanceof Error ? error.message : error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Debug: Log avatarUrl changes
  useEffect(() => {
    console.log('avatarUrl state changed to:', avatarUrl);
  }, [avatarUrl]);

  // Handle ESC key to close avatar modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAvatarModalOpen) {
        setIsAvatarModalOpen(false);
      }
    };

    if (isAvatarModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isAvatarModalOpen]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Starting avatar upload, file:', file.name, 'size:', file.size, 'type:', file.type);
    console.log('📤 Current avatarUrl before upload:', avatarUrl);
    
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload avatar');
      }

      const responseData = await response.json();
      console.log('Avatar upload response:', responseData);
      const avatar_url = responseData.avatar_url;
      
      if (!avatar_url) {
        console.error('No avatar_url in response:', responseData);
        throw new Error('No avatar URL returned from server');
      }
      
      console.log('Avatar uploaded, new URL:', avatar_url);
      console.log('Setting avatarUrl state to:', avatar_url);
      
      // Set avatar URL immediately - trust the API response
      setAvatarUrl(avatar_url);
      
      // Force a small delay to ensure state update, then verify
      setTimeout(() => {
        console.log('Current avatarUrl state after update:', avatarUrl);
      }, 100);
      
      // Refresh user data (optional, don't wait)
      supabase.auth.getUser().then(({ data: { user: updatedUser } }) => {
        if (updatedUser) {
          setUser(updatedUser);
        }
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      setShowUploadDialog(false);
    }
  };

  const fetchUserImages = async () => {
    setIsLoadingImages(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/images', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      setUserImages(data.images || []);
    } catch (error: any) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleSelectFromExisting = () => {
    setShowUploadDialog(false);
    setShowImageSelector(true);
    if (userImages.length === 0) {
      fetchUserImages();
    }
  };

  const handleSelectImage = async (imageUrl: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Update user record in database with the selected image URL
      const { error: updateError } = await (supabase
        .from('users') as any)
        .update({ 
          avatar_url: imageUrl,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', user?.id);

      if (updateError) {
        throw new Error('Failed to update avatar');
      }

      setAvatarUrl(imageUrl);
      setShowImageSelector(false);
      setIsAvatarModalOpen(false);
    } catch (error: any) {
      console.error('Error setting avatar from image:', error);
      alert(error.message || 'Failed to set avatar');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Update user record in database to remove avatar
      const { error: updateError } = await (supabase
        .from('users') as any)
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', user?.id);

      if (updateError) {
        throw new Error('Failed to remove avatar');
      }

      setAvatarUrl(null);
      setIsAvatarModalOpen(false);
      setShowUploadDialog(false);
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      alert(error.message || 'Failed to remove avatar');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          language: formData.language,
          email_notifications: formData.emailNotifications,
        },
      });

      if (error) throw error;
      
      setIsEditing(false);
      // Refresh user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
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

  const calculatePasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'text-red-500' };
    if (strength <= 4) return { strength, label: 'Medium', color: 'text-yellow-500' };
    return { strength, label: 'Strong', color: 'text-green-500' };
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const strength = calculatePasswordStrength(passwordData.newPassword);
    if (strength.strength < 3) {
      setPasswordError('Password is too weak. Please use a stronger password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const supabase = createClient();
      
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        setIsChangingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccess('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const displayName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : user?.email?.split('@')[0] || 'User';

  const displayEmail = user?.email || '';


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#0B1121] dark:via-[#0f1729] dark:to-[#0B1121]">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Profile Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your account settings and preferences.
            </p>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card & Navigation */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={avatarUrl} // Force re-render when URL changes
                      src={avatarUrl} // Direct URL, no cache busting for now
                      alt={displayName}
                      onClick={() => {
                        setIsAvatarModalOpen(true);
                      }}
                      onError={(e) => {
                        console.error('Failed to load avatar image. URL was:', avatarUrl);
                        console.error('Image error event:', e);
                        const img = e.target as HTMLImageElement;
                        console.error('Image element:', img);
                        console.error('Image src:', img.src);
                        // Don't clear URL on error - let's see what the error is
                        // img.style.display = 'none';
                        // setAvatarUrl(null);
                      }}
                      onLoad={() => {
                        console.log('✅ Avatar image loaded successfully! URL:', avatarUrl);
                      }}
                      className="w-24 h-24 rounded-full object-cover border-4 border-purple-500 dark:border-purple-400 cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ display: 'block' }} // Force display
                    />
                  ) : (
                    <div 
                      onClick={() => setIsAvatarModalOpen(true)}
                      className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold cursor-pointer hover:opacity-90 transition-opacity border-4 border-purple-500 dark:border-purple-400"
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center text-white shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors cursor-pointer z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUploadDialog(true);
                    }}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Pencil size={14} />
                    )}
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {displayName}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {displayEmail}
                </p>
                <div className="px-4 py-1.5 bg-orange-500 text-white rounded-full text-xs font-semibold">
                  ULTRA MEMBER
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="glass-card p-2 rounded-2xl">
              <nav className="space-y-1">
                {[
                  { id: 'general' as ProfileSection, label: 'General Profile', icon: User },
                  { id: 'security' as ProfileSection, label: 'Security & Password', icon: Shield },
                  { id: 'billing' as ProfileSection, label: 'Billing & Plans', icon: CreditCard },
                  { id: 'notifications' as ProfileSection, label: 'Notifications', icon: Bell },
                  { id: 'api' as ProfileSection, label: 'API Keys', icon: Code },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
                
                {/* Settings Link */}
                <Link
                  href="/settings"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white mt-2"
                >
                  <Settings size={18} />
                  <span className="font-medium">Settings</span>
                </Link>
              </nav>
            </div>
            
            {/* Download Button */}
            <Link
              href="/download"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors shadow-lg"
            >
              <Download size={18} />
              Download
            </Link>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2">
            {activeSection === 'general' && (
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Personal Information
                    </h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium text-sm"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="email"
                          value={formData.email}
                          disabled
                          className="w-full px-4 py-2 pl-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={!isEditing}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                        placeholder="AI enthusiast and software architect exploring the boundaries of generative models."
                      />
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                    Preferences
                  </h3>

                  <div className="space-y-6">
                    {/* Theme */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Moon className="text-slate-400" size={20} />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            Theme
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Customize the application appearance
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {[
                          { value: 'light', label: 'Light', icon: Sun },
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'system', label: 'System', icon: Monitor },
                        ].map((option) => {
                          const Icon = option.icon;
                          const isActive = theme === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => setTheme(option.value)}
                              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                isActive
                                  ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300 dark:hover:border-purple-700'
                              }`}
                            >
                              <Icon size={16} className="inline mr-1" />
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form data
                        setFormData({
                          firstName: user?.user_metadata?.first_name || '',
                          lastName: user?.user_metadata?.last_name || '',
                          email: user?.email || '',
                          bio: user?.user_metadata?.bio || '',
                          language: user?.user_metadata?.language || 'en-US',
                          emailNotifications: user?.user_metadata?.email_notifications !== false,
                        });
                      }}
                      className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                    Change Password
                  </h3>

                  <div className="space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-2 pl-10 pr-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title={showPasswords.current ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-4 py-2 pl-10 pr-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title={showPasswords.new ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordData.newPassword && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  calculatePasswordStrength(passwordData.newPassword).strength <= 2
                                    ? 'bg-red-500'
                                    : calculatePasswordStrength(passwordData.newPassword).strength <= 4
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{
                                  width: `${(calculatePasswordStrength(passwordData.newPassword).strength / 6) * 100}%`,
                                }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${calculatePasswordStrength(passwordData.newPassword).color}`}>
                              {calculatePasswordStrength(passwordData.newPassword).label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Use at least 8 characters with uppercase, lowercase, numbers, and symbols
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 pl-10 pr-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title={showPasswords.confirm ? 'Hide password' : 'Show password'}
                        >
                          {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    {/* Error/Success Messages */}
                    {passwordError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                        <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                        <p className="text-sm text-green-600 dark:text-green-400">{passwordSuccess}</p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                      className="w-full px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign Out */}
                <div className="glass-card p-6 rounded-2xl border border-red-200 dark:border-red-500/20">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Sign Out
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Sign out of your account. You will need to sign in again to access your data.
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'billing' && (
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                  Billing & Plans
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Billing settings coming soon...
                </p>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                  Notifications
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Notification settings coming soon...
                </p>
              </div>
            )}

            {activeSection === 'api' && (
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                  API Keys
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  API key management coming soon...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Modal */}
      {isAvatarModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setIsAvatarModalOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-sm"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>
          
          {avatarUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 relative" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={avatarUrl} // Force re-render when URL changes
                src={avatarUrl} // Direct URL
                alt={displayName || 'Avatar'}
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  console.error('Modal: Failed to load avatar image. URL:', avatarUrl);
                  const img = e.target as HTMLImageElement;
                  console.error('Modal: Image src:', img.src);
                }}
                onLoad={() => {
                  console.log('✅ Modal: Avatar image loaded successfully! URL:', avatarUrl);
                }}
                className="w-[512px] h-[512px] object-cover rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300"
                style={{ display: 'block' }} // Force display
              />
              <button
                onClick={handleRemoveAvatar}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Remove Avatar
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <div className="glass-card p-8 rounded-2xl max-w-md w-full">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Upload Avatar</h3>
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? 'Uploading...' : 'Choose Image'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div 
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowUploadDialog(false)}
        >
          <div 
            className="glass-card p-6 rounded-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Choose Avatar</h3>
            <div className="space-y-3">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
                <div className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploadingAvatar ? 'Uploading...' : 'Upload New Image'}
                </div>
              </label>
              <button
                onClick={handleSelectFromExisting}
                className="w-full px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-center transition-colors"
              >
                Choose from Existing Images
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-center transition-colors"
                >
                  Remove Avatar
                </button>
              )}
            </div>
            <button
              onClick={() => setShowUploadDialog(false)}
              className="mt-4 w-full px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Image Selector Modal */}
      {showImageSelector && (
        <div 
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
          onClick={() => setShowImageSelector(false)}
        >
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setShowImageSelector(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-sm"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>
          
          <div 
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto glass-card p-6 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Select Avatar from Your Images
            </h3>
            
            {isLoadingImages ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userImages.length === 0 ? (
              <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                <p>No images found. Upload some images first!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {userImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleSelectImage(image.url)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transition-all hover:scale-105 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

