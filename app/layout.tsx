// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rate Me',
  description: 'Rate Me — creator monetization mini app',
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
      <body className="bg-slate-950 text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
