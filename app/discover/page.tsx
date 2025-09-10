// app/discover/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listCreatorsPage, type Creator } from '@/lib/kv';
import DiscoverClient from './DiscoverClient';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Discover creators',
  openGraph: {
    title: 'Discover creators — Rate Me',
    url: `${SITE}/discover`,
    images: [{ url: '/miniapp-card.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/miniapp-card.png'] },
};

export default async function DiscoverPage() {
  // Preload the first page server-side for fast TTFB & SEO
  const { creators, nextCursor } = await listCreatorsPage({ limit: 12, cursor: 0 });

  // If something is catastrophically wrong, show a “soft” empty state instead of 404
  const initial = Array.isArray(creators) ? creators : [];
  if (!initial) return notFound();

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
  );
}

/* ------------------------------------------------------------------ */
/* Client bits (co-located for simplicity)                             */
/* ------------------------------------------------------------------ */

// app/discover/DiscoverClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ExternalLink, Share2 } from 'lucide-react';

type CreatorRow = Pick<Creator, 'id' | 'handle' | 'displayName' | 'avatarUrl' | 'bio'>;

function useInWarpcast() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const iframe = typeof window !== 'undefined' && window.self !== window.top;
    setInApp(/Warpcast/i.test(ua) || iframe);
  }, []);
  return inApp;
}

function composeCastForCreator(c: CreatorRow) {
  const url = `${SITE}/creator/${encodeURIComponent(c.id)}`;
  const text = `Check out @${c.handle} on Rate Me`;
  return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(
    url
  )}`;
}

export default function DiscoverClient({
  initial,
  initialCursor,
}: {
  initial: CreatorRow[];
  initialCursor: number | null;
}) {
  const inWarpcast = useInWarpcast();

  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<CreatorRow[]>(initial);
  const [cursor, setCursor] = useState<number | null>(initialCursor ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.handle.toLowerCase().includes(q) ||
        (c.displayName?.toLowerCase().includes(q) ?? false) ||
        (c.bio?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, query]);

  const loadMore = async () => {
    if (loading || cursor === null) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/creators?limit=12&cursor=${cursor}`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      const j = await res.json();
      // Endpoint returns { creators, nextCursor }
      const page: CreatorRow[] = Array.isArray(j?.creators) ? j.creators : [];
      setRows((s) => [...s, ...page]);
      setCursor(typeof j?.nextCursor === 'number' ? j.nextCursor : null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load more');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-400/40"
          placeholder="Search creators by handle, name, or bio"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
          No creators yet.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const url = `/creator/${encodeURIComponent(c.id)}`;
            return (
              <li
                key={c.id}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.avatarUrl || '/icon-192.png'}
                    alt={`${c.handle} avatar`}
                    className="h-12 w-12 rounded-full ring-1 ring-white/15 object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">@{c.handle}</div>
                    {c.displayName && (
                      <div className="truncate text-xs text-slate-400">{c.displayName}</div>
                    )}
                  </div>
                </div>

                {c.bio && (
                  <p className="mt-3 line-clamp-3 text-sm text-slate-300">{c.bio}</p>
                )}

                <div className="mt-4 flex gap-2">
                  <Link href={url} className="btn-secondary">
                    Open <ExternalLink className="ml-1 h-4 w-4" aria-hidden />
                  </Link>
                  <a
                    href={composeCastForCreator(c)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                  >
                    Share <Share2 className="ml-1 h-4 w-4" aria-hidden />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Load more / status */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Showing <span className="text-slate-200">{filtered.length}</span>
          {query ? ` of ${rows.length}` : null}
        </div>

        <div className="flex items-center gap-2">
          {err && <span className="text-sm text-rose-300">Error: {err}</span>}
          {cursor !== null && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hint for opening inside Warpcast */}
      {!inWarpcast && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-200">
          Tip: open any creator in Warpcast to use the mini app experience.
        </div>
      )}
    </section>
  );
}
