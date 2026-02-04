import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BrainBox - AI Chat Organizer',
  description: 'Organize AI conversations from ChatGPT, Gemini, Claude, Grok, Perplexity, DeepSeek, and Qwen into your personal dashboard',
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
      <body className={jetbrainsMono.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
