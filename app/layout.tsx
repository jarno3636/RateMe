import type { Metadata, Viewport } from 'next'
import './globals.css'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const MINIAPP_DOMAIN = (() => { try { return new URL(SITE).hostname } catch { return 'localhost' } })()

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Rate Me — Creator monetization on Base',
    template: '%s — Rate Me'
  },
  description: 'Subscriptions, paid posts, and custom requests with instant on-chain settlement.',
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Rate Me',
    images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }]
  },
  twitter: {
    card: 'summary_large_image',
    images: [`${SITE}/miniapp-card.png`]
  },
  // Mini App directory hint (safe to include site-wide too)
  other: {
    'fc:miniapp:domain': MINIAPP_DOMAIN
  }
}

export const viewport: Viewport = {
  themeColor: '#0b1220',
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* (Header goes here later) */}
        {children}
        {/* (Footer goes here later) */}
      </body>
    </html>
  )
}
