// app/mini/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, Sparkles, ExternalLink, Copy, Loader2 } from 'lucide-react';

type CreatorRow = {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
};

type ApiCreatorsResp = {
  creators: CreatorRow[];
  nextCursor: number | null;
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function Mini() {
  const search = useSearchParams();
  const hintedCreator = search.get('creator'); // ?creator=alice

  const [inWarpcast, setInWarpcast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Very light “in mini app” detection — works in Warpcast iframe & mobile webview
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const iframe = typeof window !== 'undefined' && window.self !== window.top;
    setInWarpcast(/Warpcast/i.test(ua) || iframe);
  }, []);

  const openInWarpcastHref = useMemo(() => {
    // “Open in app” entry — we embed this page so users can tap through into Warpcast
    const url = `${SITE}/mini${hintedCreator ? `?creator=${encodeURIComponent(hintedCreator)}` : ''}`;
    // Compose link opens Warpcast and keeps your URL as an embed (reliable deep link)
    return `https://warpcast.com/~/compose?text=${encodeURIComponent('Open Rate Me')}&embeds[]=${encodeURIComponent(url)}`;
  }, [hintedCreator]);

  const copyUrl = async () => {
    const url = `${SITE}/mini${hintedCreator ? `?creator=${encodeURIComponent(hintedCreator)}` : ''}`;
    await navigator.clipboard.writeText(url);
    alert('Mini App link copied');
  };

  async function fetchPage(pageCursor: number | null, isLoadMore = false) {
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      isLoadMore ? setMoreLoading(true) : setLoading(true);
      setErr(null);

      const qs = new URLSearchParams();
      qs.set('limit', '12');
      if (pageCursor && pageCursor > 0) qs.set('cursor', String(pageCursor));

      const res = await fetch(`/api/creators?${qs.toString()}`, {
        cache: 'no-store',
        signal: ctl.signal,
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiCreatorsResp;

      setCreators((prev) => (isLoadMore ? [...prev, ...data.creators] : data.creators));
      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setErr(e?.message || 'Failed to load creators');
      if (!isLoadMore) {
        setCreators([]);
        setCursor(null);
        setHasMore(false);
      }
    } finally {
      isLoadMore ? setMoreLoading(false) : setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    fetchPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className="mx-auto max-w-xl space-y-5 px-4 py-6"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
    >
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
        <h1 className="text-2xl font-bold">Rate Me</h1>
        <p className="mt-2 text-sm text-slate-300">
          Subscriptions, paid posts & custom requests. Open a profile or pick a creator below.
        </p>

        {!inWarpcast && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <a
              className="btn"
              href={openInWarpcastHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in Warpcast"
            >
              Open in Warpcast <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
            <button
              className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
              onClick={copyUrl}
              aria-label="Copy Mini App link"
            >
              Copy link <Copy className="ml-2 inline h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        {hintedCreator && (
          <div className="mt-4">
            <Link
              href={`/creator/${encodeURIComponent(hintedCreator)}`}
              className="btn-secondary inline-flex items-center"
            >
              Go to @{hintedCreator}
              <Sparkles className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="flex items-center gap-2 text-left text-lg font-semibold">
          <Users className="h-5 w-5" aria-hidden="true" />
          Creators
        </h2>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-slate-400" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        )}

        {err && !loading && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-rose-300">Error: {err}</p>
            <button
              onClick={() => fetchPage(0, false)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !err && creators.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">No creators yet.</p>
        )}

        {!loading && !err && creators.length > 0 && (
          <>
            <ul className="mt-4 space-y-3">
              {creators.map((c) => {
                const url = `/creator/${encodeURIComponent(c.id)}`;
                const shareHref = `https://warpcast.com/~/compose?text=${encodeURIComponent(
                  `Check out @${c.handle} on Rate Me`
                )}&embeds[]=${encodeURIComponent(`${SITE}${url}`)}`;

                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.avatarUrl || '/icon-192.png'}
                          alt={`${c.handle} avatar`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">@{c.handle}</div>
                        {c.displayName && (
                          <div className="truncate text-xs text-slate-400">{c.displayName}</div>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-2">
                      <Link href={url} className="btn-secondary" aria-label={`Open @${c.handle}`}>
                        Open
                      </Link>
                      <a
                        href={shareHref}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
                        aria-label={`Share @${c.handle} on Warpcast`}
                      >
                        Share
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* pagination */}
            <div className="mt-4 flex justify-center">
              {hasMore ? (
                <button
                  onClick={() => fetchPage(cursor, true)}
                  disabled={moreLoading}
                  className="btn disabled:cursor-not-allowed disabled:opacity-60"
                  aria-disabled={moreLoading}
                >
                  {moreLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Loading…
                    </span>
                  ) : (
                    'Load more'
                  )}
                </button>
              ) : creators.length > 0 ? (
                <span className="text-xs text-slate-400">You’ve reached the end.</span>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
