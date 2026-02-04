'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HybridSidebar } from '@/components/layout/HybridSidebar';
import { DataProvider } from '@/components/providers/DataProvider';
import { Menu } from 'lucide-react';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isAuthPage = pathname?.startsWith('/auth');

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <DataProvider>
      <div className="flex relative min-h-screen bg-background">
        <HybridSidebar 
          isMobileOpen={isMobileOpen} 
          onCloseMobile={() => setIsMobileOpen(false)} 
        />
        
        {/* Mobile Hamburger */}
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="fixed top-3 left-4 z-50 md:hidden p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border shadow-sm"
        >
          <Menu size={20} className="text-muted-foreground" />
        </button>

        {/* Mobile Backdrop */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        <main className="flex-1 min-h-screen overflow-auto transition-all duration-300 pl-0 md:pl-20">
          {children}
        </main>
      </div>
    </DataProvider>
  );
}
