'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HybridSidebar } from '@/components/layout/HybridSidebar';
import { DataProvider } from '@/components/providers/DataProvider';
import { Menu } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobileSidebarOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const isAuthPage = pathname?.startsWith('/auth');

  // Close sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <DataProvider>
      <div className="flex relative min-h-screen bg-background">
        <HybridSidebar />
        
        {/* Mobile Hamburger */}
        <button 
          onClick={toggleMobileSidebar}
          className="fixed top-3 left-4 z-50 md:hidden p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border shadow-sm"
        >
          <Menu size={20} className="text-muted-foreground" />
        </button>

        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-h-screen overflow-auto transition-all duration-300 pl-0 md:pl-20">
          {children}
        </main>
      </div>
    </DataProvider>
  );
}
