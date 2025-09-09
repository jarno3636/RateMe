// app/creator/page.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useProfileRegistry } from '@/hooks/useProfileRegistry';

function normalizeHandle(s: string) {
  return s.trim().replace(/^@/, '').toLowerCase();
}
function isValidHandle(h: string) {
  if (h.length < 3 || h.length > 32) return false;
  return /^[a-z0-9._-]+$/.test(h);
}

export default function CreatorOnboard() {
  const router = useRouter();
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const { createProfile, handleTaken, feeUnits } = useProfileRegistry();

  const handle = useMemo(() => normalizeHandle(raw), [raw]);
  const ok = useMemo(() => isValidHandle(handle), [handle]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!ok || !handle || busy) return;

      setBusy(true);
      try {
        // fast pre-checks
        if (await handleTaken(handle)) {
          toast.error('Handle already registered on-chain');
          setBusy(false);
          return;
        }

        const fee = await feeUnits();
        toast(`Approving USDC & creating (fee: ${(Number(fee) / 1e6).toFixed(2)} USDC)…`, { icon: '⛓️' });

        // 1) On-chain create
        const { id, txHash } = await createProfile({ handle });

        // 2) KV register (server-side Neynar hydration)
        const res = await fetch('/api/creator/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ handle }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || 'Failed to register');

        toast.success('Creator page created');
        // prefer on-chain id if present; KV also returns j.creator.id (handle lowercased)
        const routeId = j?.creator?.id || String(id);
        router.push(`/creator/${encodeURIComponent(routeId)}`);
      } catch (err: any) {
        toast.error(err?.message || 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [ok, handle, busy, router, createProfile, feeUnits, handleTaken]
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <form onSubmit={submit} className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Become a creator</h1>
          <p className="mt-1 text-sm text-slate-300">
            Claim your Farcaster handle to auto-fill your profile. We’ll import your display name,
            avatar, and bio from Neynar.
          </p>
        </header>

        <label
          htmlFor="fc-handle"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-400/40"
        >
          <span className="text-slate-400">@</span>
          <input
            id="fc-handle"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none"
            placeholder="your-handle"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        </label>

        {!ok && raw.length > 0 && (
          <p className="text-xs text-rose-300">
            Handles can include letters, numbers, underscores, dots or hyphens (max 32).
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!ok || busy}
            className="btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Creating…' : 'Create my page'}
          </button>

          <a
            href="https://warpcast.com/~/settings/username"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
          >
            Don’t have a handle?
          </a>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
          By creating a page you agree to the{' '}
          <a href="/terms" className="underline hover:text-slate-200">Terms</a> and{' '}
          <a href="/privacy" className="underline hover:text-slate-200">Privacy Policy</a>.
        </div>
      </form>
    </div>
  );
}
