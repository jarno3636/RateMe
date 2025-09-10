// app/discover/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listCreatorsPage, type Creator } from '@/lib/kv'
import DiscoverClient from './DiscoverClient'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Discover creators',
  openGraph: {
    title: 'Discover creators — Rate Me',
    url: `${SITE}/discover`,
    images: [{ url: '/miniapp-card.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/miniapp-card.png'] },
}

export default async function DiscoverPage() {
  // Preload the first page server-side for fast TTFB & SEO
  const { creators, nextCursor } = await listCreatorsPage({ limit: 12, cursor: 0 })

  // If something is catastrophically wrong, show a “soft” empty state instead of 404
  const initial = Array.isArray(creators) ? creators : []
  if (!initial) return notFound()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Discover</h1>
        <p className="mt-1 text-sm text-slate-300">
          Newest creators first. Open profiles, subscribe to plans, buy posts, and leave ratings.
        </p>
      </header>

      <DiscoverClient initial={initial} initialCursor={nextCursor} />
    </main>
  )
}
