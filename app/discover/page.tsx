// app/discover/page.tsx
import type { Metadata } from 'next'
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

type ApiCreator = {
  id: string
  handle: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  rating?: { count: number; sum: number; avg: number }
}

export default async function DiscoverPage() {
  // Preload the first page server-side via the API (include=rating) and no-store
  const res = await fetch(
    `${SITE}/api/creators?limit=12&cursor=0&include=rating`,
    { cache: 'no-store', headers: { accept: 'application/json' } }
  )

  // If the API has a hiccup, fall back to an empty page (soft-empty state)
  let initial: ApiCreator[] = []
  let nextCursor: number | null = null
  if (res.ok) {
    const json = await res.json()
    initial = Array.isArray(json?.creators) ? json.creators : []
    nextCursor = typeof json?.nextCursor === 'number' ? json.nextCursor : null
  }

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
