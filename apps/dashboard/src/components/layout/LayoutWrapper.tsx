'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { DataProvider } from '@/components/providers/DataProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <DataProvider>
      <div className="flex relative">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-auto transition-all duration-300 lg:ml-64">
          {children}
        </main>
      </div>
    </DataProvider>
  );
}
