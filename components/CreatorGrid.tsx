'use client'

import useSWR from 'swr'
import Link from 'next/link'
import type { Creator } from '@/lib/kv'
import { Star } from 'lucide-react'

/** Shared fetcher */
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Request failed: ${res.status}`)
  }
  return res.json()
}

type ApiResponse = {
  creators: (Creator & {
    avgRating?: number
    ratingCount?: number
  })[]
}

export default function CreatorGrid() {
  const { data, error, isLoading } = useSWR<ApiResponse>('/api/creators', fetcher, {
    revalidateOnFocus: false,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        Loading creators…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
        Error: {error.message}
      </div>
    )
  }

  const rows = data?.creators || []
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No creators yet.{' '}
        <Link href="/creator" className="underline hover:text-cyan-300">
          Be the first →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((c) => (
        <article key={c.id} className="card flex flex-col justify-between">
          {/* Top: avatar + names */}
          <div className="flex items-center gap-3">
            <img
              src={c.avatarUrl || '/icon-192.png'}
              alt={c.displayName || c.handle}
              className="h-10 w-10 rounded-full ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{c.displayName || c.handle}</h3>
              <div className="truncate text-xs text-slate-400">@{c.handle}</div>
            </div>
          </div>

          {/* Bio */}
          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{c.bio || '—'}</p>

          {/* Ratings summary if available */}
          {c.ratingCount ? (
            <div className="mt-2 flex items-center gap-1 text-sm text-slate-400">
              <Star className="h-3.5 w-3.5 text-yellow-400" />
              <span>{c.avgRating?.toFixed(1)}</span>
              <span className="text-xs text-slate-500">({c.ratingCount})</span>
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <Link href={`/creator/${encodeURIComponent(c.id)}`} className="btn">
              View
            </Link>
            <Link
              href={`/creator/${encodeURIComponent(c.id)}/subscribe`}
              className="btn-secondary"
            >
              Subscribe
            </Link>
          </div>
        </article>
      ))}
    </div>
  )
}
