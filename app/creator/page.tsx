// app/creator/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useProfileRegistry } from '@/hooks/useProfileRegistry';
import { checkHandleAvailability, registerCreator } from '@/lib/api/creator';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

function normalizeHandle(s: string) {
  return s.trim().replace(/^@/, '').toLowerCase();
}
function isValidHandle(h: string) {
  if (h.length < 3 || h.length > 32) return false;
  return /^[a-z0-9._-]+$/.test(h);
}

type Avail =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'invalid' }
  | { state: 'taken'; where: 'kv' | 'onchain' }

export default function CreatorOnboard() {
  const router = useRouter();
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [feeView, setFeeView] = useState<string>('');
  const [avail, setAvail] = useState<Avail>({ state: 'idle' });

  const { createProfile, handleTaken, feeUnits } = useProfileRegistry();

  const handle = useMemo(() => normalizeHandle(raw), [raw]);
  const ok = useMemo(() => isValidHandle(handle), [handle]);
  const debouncedHandle = useDebouncedValue(handle, 350);

  // preview fee from the registry (USDC, 6dp)
  useEffect(() => {
    (async () => {
      try {
        const fee = await feeUnits();
        setFeeView((Number(fee) / 1e6).toFixed(2));
      } catch {
        setFeeView('');
      }
    })();
  }, [feeUnits]);

  // live availability check against our GET endpoint
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!debouncedHandle) { setAvail({ state: 'idle' }); return; }
      if (!isValidHandle(debouncedHandle)) { setAvail({ state: 'invalid' }); return; }

      setAvail({ state: 'checking' });
      try {
        const res = await checkHandleAvailability(debouncedHandle);
        if (cancelled) return;

        if (!res.ok) {
          // If the API misbehaves, fall back to simple local validation
          setAvail({ state: 'invalid' });
          return;
        }

        if (res.available) {
          setAvail({ state: 'available' });
        } else if (res.reason === 'taken_kv') {
          setAvail({ state: 'taken', where: 'kv' });
        } else if (res.reason === 'taken_onchain') {
          setAvail({ state: 'taken', where: 'onchain' });
        } else {
          setAvail({ state: 'invalid' });
        }
      } catch {
        if (!cancelled) setAvail({ state: 'invalid' });
      }
    })();

    return () => { cancelled = true; };
  }, [debouncedHandle]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!ok || !handle || busy) return;

      setBusy(true);
      try {
        // final pre-check: on-chain taken?
        if (await handleTaken(handle)) {
          toast.error('Handle already registered on-chain');
          setBusy(false);
          return;
        }

        // show fee hint
        const fee = await feeUnits().catch(() => 0n);
        if (fee && fee > 0n) {
          toast(`Approving USDC & creating (fee: ${(Number(fee) / 1e6).toFixed(2)} USDC)…`, { icon: '⛓️' });
        } else {
          toast('Creating profile…', { icon: '⛓️' });
        }

        // 1) On-chain create
        const { id } = await createProfile({ handle });

        // 2) KV register (server-side Neynar hydration + uniqueness)
        const j = await registerCreator({ handle });

        toast.success('Creator page created');
        // prefer KV id (lowercased handle), fallback to on-chain numeric id if present
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
            aria-describedby="handle-help"
          />
        </label>

        {/* inline guidance + availability */}
        <div className="flex items-center justify-between text-xs">
          <p id="handle-help" className="text-slate-400">
            Letters, numbers, underscores, dots, or hyphens (3–32).
          </p>
          <div className="text-right">
            {avail.state === 'idle' && raw.length === 0 ? null : null}
            {avail.state === 'invalid' && (
              <span className="text-rose-300">Invalid handle</span>
            )}
            {avail.state === 'checking' && (
              <span className="text-slate-300">Checking…</span>
            )}
            {avail.state === 'available' && (
              <span className="text-emerald-300">Available ✓</span>
            )}
            {avail.state === 'taken' && (
              <span className="text-amber-300">
                Taken {avail.where === 'onchain' ? '(on-chain)' : '(in app)'}
              </span>
            )}
          </div>
        </div>

        {/* fee preview */}
        {!!feeView && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            Current creation fee: <span className="text-slate-100">{feeView} USDC</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!ok || busy || avail.state === 'invalid' || avail.state === 'taken'}
            className="btn disabled:opacity-50 disabled:cursor-not-allowed"
            aria-disabled={!ok || busy || avail.state === 'invalid' || avail.state === 'taken'}
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
