// app/creator/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import type { Address, Abi } from 'viem';

import { useProfileRegistry } from '@/hooks/useProfileRegistry';
import {
  checkHandleAvailability,
  registerCreator,
  type Availability,
} from '@/lib/api/creator';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { creatorShareLinks } from '@/lib/farcaster';

// On-chain reads
import { readPreviewCreate } from '@/lib/profileRegistry/reads';
import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi';
import { REGISTRY_ADDRESS } from '@/lib/profileRegistry/constants';

function normalizeHandleId(s: string) {
  return s.trim().replace(/^@+/, '').toLowerCase();
}
function isValidHandleId(h: string) {
  return h.length >= 3 && h.length <= 32 && /^[a-z0-9._-]+$/.test(h);
}

export default function CreatorOnboard() {
  const router = useRouter();

  // wallet
  const { address: wallet, isConnected } = useAccount();

  // form state
  const [raw, setRaw] = useState('');
  const handleId = useMemo(() => normalizeHandleId(raw), [raw]);
  const okFormat = useMemo(() => isValidHandleId(handleId), [handleId]);

  // availability state
  const [checking, setChecking] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);
  const debouncedHandle = useDebouncedValue(handleId, 350);

  // on-chain flow
  const [busy, setBusy] = useState(false);
  const [feeView, setFeeView] = useState<string>('');
  const [allowanceOk, setAllowanceOk] = useState<boolean | null>(null);
  const { createProfile, handleTaken, feeUnits } = useProfileRegistry();

  // detect existing on-chain profile(s) for a clearer CTA
  const [ownedId, setOwnedId] = useState<string | null>(null);

  // If this wallet already owns a registry profile, surface a "Go to my page" button
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isConnected || !wallet) return;
        const { readClient } = await import('@/lib/profileRegistry/reads');
        const ids = (await readClient.readContract({
          address: REGISTRY_ADDRESS as Address,
          abi: PROFILE_REGISTRY_ABI as Abi,
          functionName: 'getProfilesByOwner',
          args: [wallet as Address],
        })) as bigint[];

        if (!alive) return;
        if (ids && ids.length > 0) {
          setOwnedId(String(ids[0]));
        } else {
          setOwnedId(null);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [isConnected, wallet]);

  // preview creation fee (prefer previewCreate; fallback to feeUnits)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (wallet) {
          const pv = await readPreviewCreate(wallet as Address);
          if (pv) {
            if (!alive) return;
            setFeeView((Number(pv.fee) / 1e6).toFixed(2));
            setAllowanceOk(pv.okAllowance);
            return;
          }
        }
        // fallback: just feeUnits
        const fee = await feeUnits();
        if (!alive) return;
        setFeeView(fee ? (Number(fee) / 1e6).toFixed(2) : '');
        setAllowanceOk(null);
      } catch {
        if (!alive) return;
        setFeeView('');
        setAllowanceOk(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [wallet, feeUnits]);

  // live availability check
  useEffect(() => {
    let canceled = false;

    (async () => {
      if (!debouncedHandle) {
        setAvail(null);
        return;
      }
      if (!isValidHandleId(debouncedHandle)) {
        setAvail({
          ok: true,
          valid: false,
          existsKV: false,
          onchainTaken: false,
          available: false,
        });
        return;
      }

      setChecking(true);
      try {
        const res = await checkHandleAvailability(debouncedHandle);
        if (canceled) return;
        setAvail(res);
      } catch {
        if (canceled) return;
        setAvail({
          ok: false,
          valid: okFormat,
          existsKV: false,
          onchainTaken: false,
          available: false,
          error: 'network error',
        });
      } finally {
        if (!canceled) setChecking(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [debouncedHandle, okFormat]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!okFormat || !handleId || busy) return;

      if (avail && (!avail.ok || !avail.available)) {
        toast.error(
          avail?.error
            ? `Unavailable: ${avail.error}`
            : avail?.onchainTaken
            ? 'Handle already registered on-chain'
            : avail?.existsKV
            ? 'Handle already taken in app'
            : 'Handle not available'
        );
        return;
      }

      setBusy(true);
      try {
        if (await handleTaken(handleId)) {
          toast.error('Handle already registered on-chain');
          setBusy(false);
          return;
        }

        const fee = await feeUnits().catch(() => 0n);
        if (fee && fee > 0n) {
          toast(`Approving USDC & creating (fee: ${(Number(fee) / 1e6).toFixed(2)} USDC)…`, {
            icon: '⛓️',
          });
        } else {
          toast('Creating profile…', { icon: '⛓️' });
        }

        // 1) On-chain create
        const { id } = await createProfile({ handle: handleId });

        // 2) KV registration (server-side Neynar hydration + uniqueness)
        const reg = await registerCreator({ handle: handleId });
        if (!('creator' in reg)) {
          const msg = 'error' in reg && reg.error ? reg.error : 'Failed to register';
          throw new Error(msg);
        }

        const routeId = reg.creator.id || String(id);
        const { cast, tweet, url } = creatorShareLinks(
          routeId,
          `Check out @${routeId} on Rate Me`
        );

        toast.success('Creator page created');
        toast.custom(
          () => (
            <div className="rounded-xl border border-white/10 bg-[#0b1220] p-4 text-slate-100 shadow-lg">
              <div className="text-sm font-medium">Share your new page</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={cast}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-400/20"
                >
                  Cast on Warpcast
                </a>
                <a
                  href={tweet}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-400/20"
                >
                  Tweet it
                </a>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success('Link copied');
                    } catch {
                      toast.error('Copy failed');
                    }
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                >
                  Copy link
                </button>
              </div>
            </div>
          ),
          { duration: 6000 }
        );

        router.push(`/creator/${encodeURIComponent(routeId)}`);
      } catch (err: any) {
        toast.error(err?.message || 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [okFormat, handleId, busy, router, createProfile, feeUnits, handleTaken, avail]
  );

  // UI helpers based on unified availability
  const helpRight = useMemo(() => {
    if (!raw) return null;
    if (!okFormat) return <span className="text-rose-300">Invalid handle</span>;
    if (checking) return <span className="text-slate-300">Checking…</span>;
    if (!avail) return null;

    if (!avail.ok) {
      return <span className="text-rose-300">Error{avail.error ? `: ${avail.error}` : ''}</span>;
    }
    if (!avail.valid) {
      return <span className="text-rose-300">Invalid handle</span>;
    }
    if (avail.available) {
      return <span className="text-emerald-300">Available ✓</span>;
    }
    if (avail.onchainTaken) {
      return <span className="text-amber-300">Taken (on-chain)</span>;
    }
    if (avail.existsKV) {
      return <span className="text-amber-300">Taken (in app)</span>;
    }
    return <span className="text-slate-300">Unavailable</span>;
  }, [raw, okFormat, checking, avail]);

  const disableSubmit =
    busy ||
    !okFormat ||
    checking ||
    (avail ? !avail.ok || !avail.available : false);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {isConnected ? (
            <span>
              Connected as <span className="text-slate-200">{wallet}</span>
            </span>
          ) : (
            <span>Connect your wallet to create</span>
          )}
        </div>
        <ConnectButton chainStatus="none" showBalance={false} />
      </div>

      {ownedId && (
        <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          You already have a creator profile.{' '}
          <button
            onClick={() => router.push(`/creator/${encodeURIComponent(ownedId)}`)}
            className="ml-2 inline-flex items-center rounded-lg border border-emerald-400/30 px-2 py-1 hover:bg-emerald-400/10"
          >
            Go to my page
          </button>
        </div>
      )}

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

        <div className="flex items-center justify-between text-xs">
          <p id="handle-help" className="text-slate-400">
            Letters, numbers, underscores, dots, or hyphens (3–32).
          </p>
          <div className="text-right">{helpRight}</div>
        </div>

        {!!feeView && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            Current creation fee: <span className="text-slate-100">{feeView} USDC</span>
            {allowanceOk === true && (
              <span className="ml-2 text-emerald-300">(allowance ok)</span>
            )}
            {allowanceOk === false && (
              <span className="ml-2 text-amber-300">(approval required)</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={disableSubmit || !isConnected}
            className="btn disabled:opacity-50 disabled:cursor-not-allowed"
            aria-disabled={disableSubmit || !isConnected}
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
          <a href="/terms" className="underline hover:text-slate-200">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:text-slate-200">
            Privacy Policy
          </a>
          .
        </div>
      </form>
    </div>
  );
}
