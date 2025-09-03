// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'FairPlay Vault — Provably-fair USDC pools on Base',
    template: '%s — FairPlay Vault',
  },
  description: 'Create and join commit–reveal USDC pools on Base. Transparent, no VRF required.',
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'FairPlay Vault',
    title: 'FairPlay Vault',
    description: 'Provably-fair USDC pools on Base.',
    images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630, alt: 'FairPlay Vault' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FairPlay Vault',
    description: 'Provably-fair USDC pools on Base.',
    images: [`${SITE}/miniapp-card.png`],
  },
  icons: { icon: [{ url: '/favicon.ico' }] },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0b1220',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {/* Header placeholder (add later) */}
        <main className="min-h-screen">{children}</main>
        {/* Footer placeholder (add later) */}
      </body>
    </html>
  )
}
