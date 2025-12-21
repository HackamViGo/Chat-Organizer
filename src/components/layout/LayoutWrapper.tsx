'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { FolderProvider } from '@/components/providers/FolderProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <FolderProvider>
      <div className="flex relative">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen overflow-auto">{children}</main>
      </div>
    </FolderProvider>
  );
}
