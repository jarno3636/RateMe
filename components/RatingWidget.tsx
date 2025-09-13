// components/RatingWidget.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Star } from 'lucide-react';

type Props = { creatorId: string };

type RatingItem = { score: number; comment?: string; at: number };
type RatingState = { avg: number; count: number; items: RatingItem[] };

const SITE =
  (process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).toString().replace(/\/$/, '');

export default function RatingWidget({ creatorId }: Props) {
  const id = useMemo(() => creatorId.toLowerCase().replace(/^@/, ''), [creatorId]);

  const [data, setData] = useState<RatingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // compose state
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const display = hover ?? score;
  const SOFT_LIMIT = 280;
  const remaining = SOFT_LIMIT - comment.length;
  const canSubmit = score >= 1 && score <= 5 && !pending && remaining >= 0;

  const shareHref = useMemo(() => {
    const url = `${SITE}/creator/${encodeURIComponent(id)}`;
    const text = `I just rated @${id} on Rate Me ⭐️${score}/5`;
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
  }, [id, score]);

  const fetchRatings = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setError(null);
    try {
      const res = await fetch(`/api/ratings/${encodeURIComponent(id)}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
        signal: ac.signal,
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j) {
        throw new Error(j?.error || `Failed to load ratings (${res.status})`);
      }

      // New API shape: { summary: {avg,count}, recent: Rating[] }
      const avg = Number(j?.summary?.avg ?? 0);
      const count = Number(j?.summary?.count ?? 0);
      const items: RatingItem[] = Array.isArray(j?.recent)
        ? j.recent.map((r: any) => ({
            score: Number(r?.score ?? 0),
            comment: typeof r?.comment === 'string' ? r.comment : undefined,
            at: Number(r?.createdAt ?? Date.now()),
          }))
        : [];

      setData({ avg: Number.isFinite(avg) ? avg : 0, count: Number.isFinite(count) ? count : 0, items });
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load ratings');
      setData({ avg: 0, count: 0, items: [] });
    }
  }, [id]);

  useEffect(() => {
    fetchRatings();
    return () => abortRef.current?.abort();
  }, [fetchRatings]);

  const submit = useCallback(() => {
    if (!canSubmit) return;
    setError(null);
    setOkMsg(null);

    // Optimistic UI (clamped to top 10 items)
    const optimistic: RatingItem = {
      score,
      comment: comment.trim() || undefined,
      at: Date.now(),
    };
    setData((prev) => {
      if (!prev) return { avg: score, count: 1, items: [optimistic] };
      const nextCount = prev.count + 1;
      const nextAvg = (prev.avg * prev.count + score) / nextCount;
      const nextItems = [optimistic, ...prev.items].slice(0, 10);
      return { avg: nextAvg, count: nextCount, items: nextItems };
    });

    startTransition(async () => {
      try {
        // Keep using /api/rate, which returns { ok: true } or 409 on duplicates
        const res = await fetch('/api/rate', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            creatorId: id,
            score,
            comment: comment.trim() || undefined, // server caps length
          }),
        });
        const j = await res.json().catch(() => null);

        if (res.status === 409 || j?.reason === 'duplicate') {
          setOkMsg('You already rated this creator.');
          // Reload canonical data to drop optimistic entry if necessary
          await fetchRatings();
          return;
        }

        if (!res.ok || !j?.ok) {
          throw new Error(j?.error || `Failed (${res.status})`);
        }

        setOkMsg('Thanks for rating!');
        setComment('');
        setScore(0);
        await fetchRatings(); // ensure avg/count match server
      } catch (e: any) {
        setError(e?.message || 'Something went wrong.');
        await fetchRatings(); // drop optimistic state on error
      }
    });
  }, [canSubmit, comment, fetchRatings, id, score]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Rate this creator</h3>
          <div className="text-xs text-slate-400">
            Average {Number(data?.avg ?? 0).toFixed(2)} / 5 · {data?.count ?? 0} ratings
          </div>
        </div>

        {/* Star input */}
        <div className="flex items-center gap-1" aria-label="Your rating" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover ?? score) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                onClick={() => setScore(n)}
                className="rounded p-1 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                title={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-6 w-6 ${active ? 'fill-yellow-300 text-yellow-300' : 'text-slate-400'}`}
                />
              </button>
            );
          })}
        </div>
      </header>

      {/* Comment */}
      <div className="mt-3">
        <label className="mb-1 block text-xs text-slate-400" htmlFor="rating-comment">
          Optional comment
        </label>
        <textarea
          id="rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={560} // hard guard; API trims further if needed
          placeholder="What did you like? What can improve?"
          className="w-full rounded-lg border border-white/10 bg-transparent p-2 text-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-400/30"
          rows={3}
        />
        <div
          className={`mt-1 text-xs ${
            remaining < 0 ? 'text-rose-300' : remaining <= 20 ? 'text-amber-300' : 'text-slate-400'
          }`}
          aria-live="polite"
        >
          {remaining} characters left
        </div>
      </div>

      {/* Actions / status */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={!canSubmit}
          onClick={submit}
          className="btn disabled:cursor-not-allowed disabled:opacity-60"
          aria-disabled={!canSubmit}
        >
          {pending ? 'Sending…' : 'Submit rating'}
        </button>
        {error && <span className="text-sm text-rose-300">Error: {error}</span>}
        {okMsg && (
          <span className="text-sm text-emerald-300" role="status" aria-live="polite">
            {okMsg}
          </span>
        )}
      </div>

      {/* Recent ratings */}
      {!!(data?.items?.length) && (
        <div className="mt-4 space-y-2">
          {data!.items.slice(0, 3).map((r, i) => (
            <div key={`${r.at}-${i}`} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="flex items-center gap-1 text-xs">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${r.score >= n ? 'fill-yellow-300 text-yellow-300' : 'text-slate-500'}`}
                  />
                ))}
                <span className="ml-2 text-slate-500">
                  {new Date(r.at).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-slate-300">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Post-submit Farcaster nudge */}
      {okMsg && (
        <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-200">
          Want to share your rating?
          <a
            className="ml-2 inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-medium hover:bg-cyan-400/20"
            href={shareHref}
            target="_blank"
            rel="noreferrer"
          >
            Cast on Warpcast
          </a>
        </div>
      )}
    </section>
  );
}
