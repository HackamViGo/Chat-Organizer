import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mega-Pack AI Studio',
  description: 'AI Chat Organizer - Intelligent Knowledge Manager',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex relative">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
