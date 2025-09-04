// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rate-me.vercel.app').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Rate Me', template: '%s — Rate Me' },
  description: 'A creator monetization hub: subscriptions, paid posts, and requests — on Base.',
  applicationName: 'Rate Me',
  icons: {
    icon: [{ url: '/favicon.ico' }],
    apple: [{ url: '/icon-192.png' }],
  },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Rate Me',
    title: 'Rate Me — Creator monetization on Base',
    description: 'Subscriptions, paid posts, and requests — transparent and instant.',
    images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rate Me',
    description: 'Creator monetization on Base.',
    images: [`${SITE}/miniapp-card.png`],
  },
  // Minimal Farcaster discovery on every page (safe to keep)
  other: {
    'og:locale': 'en_US',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b1220',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {/* Header placeholder (add real header later) */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="text-lg font-semibold tracking-tight">
              <span className="text-slate-300">Rate</span> <span className="text-cyan-400">Me</span>
              <span className="ml-2 text-xs text-slate-400">on @base</span>
            </div>
            <nav className="hidden gap-4 text-sm text-slate-300 sm:flex">
              <a className="hover:text-white/90" href="/">Home</a>
              <a className="hover:text-white/90" href="/mini">Mini</a>
            </nav>
          </div>
        </header>

        <main className="min-h-[80vh]">{children}</main>

        {/* Footer placeholder */}
        <footer className="border-t border-white/10 py-6">
          <div className="mx-auto max-w-6xl px-4 text-sm text-slate-400">
            © {new Date().getFullYear()} Rate Me • Built on Base
          </div>
        </footer>
      </body>
    </html>
  )
}
