'use client';

import { useEffect } from 'react';
import { useFolderStore } from '@/store/useFolderStore';
import { createClient } from '@/lib/supabase/client';

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const { setFolders } = useFolderStore();

  useEffect(() => {
    const fetchFolders = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { data: folders } = await (supabase as any)
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (folders) {
        setFolders(folders);
      }
    };

    fetchFolders();
  }, [setFolders]);

  return <>{children}</>;
}
