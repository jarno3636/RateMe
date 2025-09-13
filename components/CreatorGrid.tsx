// components/CreatorGrid.tsx
'use client';

import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import type { Creator } from '@/lib/kv';
import { Star, Share2, RefreshCw } from 'lucide-react';
import { creatorShareLinks } from '@/lib/farcaster';

type RatingSummary = { count?: number; sum?: number; avg?: number };
type ApiCreator = Creator & {
  rating?: RatingSummary;
};

type ApiResponse = {
  creators: ApiCreator[];
  nextCursor: number | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as ApiResponse;
};

function withVersion(url?: string | null, v?: number) {
  if (!url) return '/icon-192.png';
  const u = url.toString();
  if (!/^https?:\/\//i.test(u)) return u; // don't add query to non-http(s)
  const sep = u.includes('?') ? '&' : '?';
  return `${u}${sep}v=${typeof v === 'number' && Number.isFinite(v) ? v : Date.now()}`;
}

const PAGE_SIZE = 12;

export default function CreatorGrid() {
  const getKey = (index: number, prev: ApiResponse | null) => {
    if (prev && prev.nextCursor === null) return null; // reached end
    const cursor = index === 0 ? 0 : prev?.nextCursor ?? 0;
    return `/api/creators?limit=${PAGE_SIZE}&cursor=${cursor}&include=rating`;
  };

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<ApiResponse>(getKey, fetcher, { revalidateOnFocus: false });

  const pages = data ?? [];
  const creators = pages.flatMap((p) => p.creators ?? []);
  const nextCursor = pages.length ? pages[pages.length - 1].nextCursor : null;
  const canLoadMore = nextCursor !== null;

  /* ---------- loading ---------- */
  if (isLoading && !data?.length) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                <div className="h-2 w-1/3 animate-pulse rounded bg-white/10" />
              </div>
            </div>
            <div className="mt-3 h-10 w-full animate-pulse rounded bg-white/10" />
            <div className="mt-3 flex gap-2">
              <div className="h-9 w-20 animate-pulse rounded bg-white/10" />
              <div className="h-9 w-24 animate-pulse rounded bg-white/10" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  /* ---------- error ---------- */
  if (error && !creators.length) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200">
        <p className="text-sm">
          Error loading creators{error.message ? `: ${error.message}` : ''}.
        </p>
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-300/30 px-3 py-1.5 text-sm hover:bg-rose-400/10"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Retry
        </button>
      </div>
    );
  }

  if (!creators.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No creators yet.{' '}
        <Link href="/creator" className="underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-300">
          Be the first →
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((c) => {
          // map rating summary (from API include=rating)
          const ratingCount = Number(c.rating?.count ?? 0);
          const avgRating = ratingCount ? Number(c.rating?.avg ?? 0) : 0;

          const viewUrl = `/creator/${encodeURIComponent(c.id)}`;
          const share = creatorShareLinks(c.id, `Check out @${c.handle} on Rate Me`);

          // fresh avatar (cache-busted by updatedAt if http(s) url)
          const avatarSrc = withVersion(c.avatarUrl || '/icon-192.png', c.updatedAt);

          return (
            <li
              key={c.id}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
            >
              {/* Top: avatar + names */}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc}
                  alt={c.displayName || c.handle}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{c.displayName || c.handle}</h3>
                  <div className="truncate text-xs text-slate-400">@{c.handle}</div>
                </div>
              </div>

              {/* Bio */}
              {c.bio ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-300">{c.bio}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">—</p>
              )}

              {/* Ratings summary if available */}
              {ratingCount > 0 ? (
                <div
                  className="mt-2 inline-flex items-center gap-1 text-sm text-slate-400"
                  aria-label={`Rating ${avgRating.toFixed(2)} from ${ratingCount} ratings`}
                >
                  <Star className="h-3.5 w-3.5 text-yellow-400" aria-hidden />
                  <span className="font-medium text-slate-200">{avgRating.toFixed(2)}</span>
                  <span className="text-xs text-slate-500">({ratingCount})</span>
                </div>
              ) : null}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <Link href={viewUrl} className="btn" aria-label={`Open @${c.handle}`}>
                  View
                </Link>
                <Link href={`${viewUrl}/subscribe`} className="btn-secondary" aria-label={`Subscribe to @${c.handle}`}>
                  Subscribe
                </Link>
                <a
                  href={share.cast}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                  aria-label={`Share @${c.handle} on Farcaster`}
                  title="Share on Warpcast"
                >
                  <Share2 className="mr-1 h-4 w-4" aria-hidden />
                  Share
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Load more */}
      <div className="mt-4 flex justify-center">
        {canLoadMore ? (
          <button
            onClick={() => setSize(size + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" /><path d="M4 12a8 8 0 018-8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
                Loading…
              </>
            ) : (
              <>Load more</>
            )}
          </button>
        ) : (
          <div className="text-xs text-slate-500">End of list</div>
        )}
      </div>
    </>
  );
}
