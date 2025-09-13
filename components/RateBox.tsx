// components/RateBox.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';

type RateBoxProps = {
  creatorId: string;
  raterFid?: number;
  /** Optional: change the textarea max length (defaults to 280, tweet-style) */
  maxLen?: number;
};

export default function RateBox({ creatorId, raterFid, maxLen = 280 }: RateBoxProps) {
  // Normalize once (lowercase, strip leading '@')
  const id = useMemo(() => creatorId.trim().toLowerCase().replace(/^@+/, ''), [creatorId]);

  const [score, setScore] = useState<number>(5);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [justRated, setJustRated] = useState(false);

  const remaining = maxLen - comment.length;
  const tooLong = remaining < 0;

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (!Number.isFinite(score) || score < 1 || score > 5) return false;
    if (tooLong) return false;
    return true;
  }, [busy, score, tooLong]);

  const composeWarpcastHref = useMemo(() => {
    const origin =
      (typeof window !== 'undefined' && window.location?.origin) ||
      (process.env.NEXT_PUBLIC_SITE_URL || 'https://rateme.app');
    const url = `${origin.replace(/\/$/, '')}/creator/${encodeURIComponent(id)}`;
    const text = `I just rated @${id} on Rate Me ⭐️${score}/5`;
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
  }, [id, score]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setJustRated(false);
    try {
      // Server caps comment at 400; keep client conservative & trimmed
      const payload = {
        creatorId: id,
        score,
        comment: (comment || '').trim().slice(0, 400) || undefined,
        raterFid,
      };

      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));

      // Handle duplicate gracefully
      if (res.status === 409 || j?.reason === 'duplicate') {
        toast.success('You already rated this creator.');
        setJustRated(true);
        return;
      }

      if (!res.ok || !j?.ok) {
        const msg = j?.error || `Failed (${res.status})`;
        throw new Error(msg);
      }

      toast.success('Thanks for rating!');
      setComment('');
      setJustRated(true);
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }, [canSubmit, id, score, comment, raterFid]);

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Rate this creator</h3>
        <div className="text-xs text-slate-400">1–5 stars</div>
      </header>

      {/* Stars */}
      <div
        className="mt-2 flex items-center gap-1"
        role="radiogroup"
        aria-label="Rating"
        aria-required="true"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover ?? score) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              title={`${n} star${n > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => setScore(n)}
              disabled={busy}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-white/10 transition ${
                active ? 'bg-yellow-400/80 text-slate-900 ring-yellow-400/40' : 'bg-white/10 text-yellow-300'
              } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Star className={`h-4 w-4 ${active ? '' : 'opacity-70'}`} aria-hidden="true" />
              <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
            </button>
          );
        })}
      </div>

      {/* Comment */}
      <label htmlFor="rate-comment" className="mt-3 block text-xs text-slate-400">
        Optional comment
      </label>
      <textarea
        id="rate-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Say something helpful (optional)"
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-400/30"
        rows={3}
        maxLength={Math.max(maxLen * 2, maxLen)} // hard cap guard; server still trims
        disabled={busy}
      />

      {/* Footer row */}
      <div className="mt-2 flex items-center justify-between">
        <div
          className={`text-xs ${
            tooLong ? 'text-rose-300' : remaining <= 20 ? 'text-amber-300' : 'text-slate-400'
          }`}
          aria-live="polite"
        >
          {remaining} characters left
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="btn disabled:cursor-not-allowed disabled:opacity-60"
          aria-disabled={!canSubmit}
        >
          {busy ? 'Submitting…' : 'Submit Rating'}
        </button>
      </div>

      {/* After-submit share helper */}
      {justRated && (
        <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-200">
          Thanks! Want to share?
          <a
            className="ml-2 inline-flex items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-medium hover:bg-cyan-400/20"
            href={composeWarpcastHref}
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
