// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rate Me',
  description: 'Rate Me — creator monetization mini app',
};

export const viewport: Viewport = {
  themeColor: '#0b1220',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased">
        {/* Skip link for a11y */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-slate-800 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <Providers>
          <Header />
          <main id="main" className="mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
