// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';

// Prefer env SITE, fallback to localhost; strip trailing slash
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Rate Me',
    template: '%s — Rate Me',
  },
  description: 'Creator subscriptions, paid posts, and ratings on Base.',
  applicationName: 'Rate Me',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
    shortcut: { url: '/favicon.ico' },
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Rate Me',
    title: 'Rate Me',
    description: 'Creator subscriptions, paid posts, and ratings on Base.',
    images: [{ url: '/miniapp-card.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rate Me',
    description: 'Creator subscriptions, paid posts, and ratings on Base.',
    images: ['/miniapp-card.png'],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b1220' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
  // Help iOS PWA/mini-app feel a bit better
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-dvh bg-slate-950 text-slate-100 antialiased"
        style={{
          // Respect safe areas for mobile / mini-app webviews
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Skip link for a11y */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-slate-800 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <Providers>
          {/* Global toast notifications (txn states, errors, etc.) */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#0b1220', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)' },
            }}
          />

          <Header />
          <main id="main" className="mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
