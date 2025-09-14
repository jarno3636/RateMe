// components/PaidPostCard.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { getAddress, isAddress } from 'viem';
import SafeMedia from './SafeMedia';
import { useCreatorHub } from '@/hooks/useCreatorHub';

function ipfsToHttp(u?: string) {
  if (!u) return '';
  const s = u.trim();
  if (!s) return '';
  if (s.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${s.slice('ipfs://'.length)}`;
  return s;
}

function parseHints(uri: string) {
  try {
    const [raw, hash = ''] = (uri || '').split('#');
    const base = ipfsToHttp(raw || '');
    const params = new URLSearchParams(hash);
    const preview = ipfsToHttp(params.get('rm_preview') || '');
    const blur = params.get('rm_blur') === '1';
    return { base, preview, blur };
  } catch {
    return { base: ipfsToHttp(uri), preview: '', blur: false };
  }
}

/** POST /api/gate { mode:'post', user, postId } → { ok, allowed } */
async function gateCheckPost(user: `0x${string}`, postId: bigint) {
  try {
    const res = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ mode: 'post', user, postId: postId.toString() }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return false;
    return !!j.allowed;
  } catch {
    return false;
  }
}

export default function PaidPostCard({
  creatorAddress,
  postId,
  priceUSDC,               // human  e.g., 1.00
  rawUri,                  // may contain rm_preview / rm_blur
  alsoViaSub,
  onChanged,               // after successful purchase
}: {
  creatorAddress: `0x${string}`;
  postId: bigint;
  priceUSDC: number;
  rawUri: string;
  alsoViaSub: boolean;
  onChanged?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { buyPost, hasPostAccess } = useCreatorHub();

  const hints = useMemo(() => parseHints(rawUri), [rawUri]);

  const user = useMemo(
    () => (address && isAddress(address) ? (getAddress(address) as `0x${string}`) : null),
    [address]
  );

  const pid = useMemo(() => {
    try {
      const n = BigInt(postId);
      return n > 0n ? n : 0n;
    } catch {
      return 0n;
    }
  }, [postId]);

  const [checking, setChecking] = useState(false);
  const [buying, setBuying] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const cancelRef = useRef(false);
  const pollGen = useRef(0); // token to cancel older polls

  const refreshAccess = useCallback(async () => {
    if (!user || pid <= 0n) {
      setCanAccess(false);
      return;
    }
    cancelRef.current = false;
    setChecking(true);
    try {
      // 1) Authoritative check via /api/gate (server can apply extra logic)
      const gate = await gateCheckPost(user, pid);
      if (!cancelRef.current && gate) {
        setCanAccess(true);
        return;
      }
      // 2) Fallback: direct on-chain view
      const onchain = await hasPostAccess(user, pid).catch(() => false);
      if (!cancelRef.current) setCanAccess(!!onchain);
    } finally {
      if (!cancelRef.current) setChecking(false);
    }
  }, [user, pid, hasPostAccess]);

  // Initial & dependency-based checks
  useEffect(() => {
    cancelRef.current = false;
    refreshAccess();
    return () => {
      cancelRef.current = true;
    };
  }, [refreshAccess]);

  // Re-check when the tab becomes visible again (wallet reconnects, etc.)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') refreshAccess();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshAccess]);

  // Poll briefly post-tx to absorb indexer lag (both gate + on-chain)
  async function pollUntilUnlocked(maxMs = 6000) {
    const token = ++pollGen.current;
    const start = Date.now();
    const delays = [250, 500, 800, 1200, 1800, 2400];
    for (const d of delays) {
      if (Date.now() - start > maxMs) break;
      await new Promise((r) => setTimeout(r, d));
      if (cancelRef.current || pollGen.current !== token) return;

      try {
        if (!user || pid <= 0n) break;
        const gate = await gateCheckPost(user, pid);
        if (gate) {
          setCanAccess(true);
          return;
        }
        const chain = await hasPostAccess(user, pid).catch(() => false);
        if (chain) {
          setCanAccess(true);
          return;
        }
      } catch {
        // ignore transient read errors
      }
    }
    await refreshAccess();
  }

  async function onBuy() {
    if (!isConnected || !user || pid <= 0n) return;
    try {
      setBuying(true);
      await buyPost(pid);       // hook should throw on reject
      onChanged?.();
      await pollUntilUnlocked();
    } finally {
      setBuying(false);
    }
  }

  const priceLabel = Number.isFinite(priceUSDC)
    ? `${priceUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
    : `${priceUSDC} USDC`;

  const showPreview = !canAccess && !!hints.preview;
  const mediaSrc = canAccess ? hints.base : showPreview ? hints.preview : '';
  const isBlurred = hints.blur && !canAccess && !!mediaSrc;
  const isEmpty = !mediaSrc;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="relative">
        {isEmpty ? (
          <div className="grid h-56 w-full place-items-center rounded-xl bg-white/[0.03]">
            {!isConnected ? (
              <span className="text-xs text-slate-400">Connect to preview or purchase</span>
            ) : checking ? (
              <span className="text-xs text-slate-400">Checking access…</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Lock className="h-4 w-4" /> Locked
              </span>
            )}
          </div>
        ) : (
          <div className={isBlurred ? 'select-none blur-md' : ''}>
            <SafeMedia src={mediaSrc} />
          </div>
        )}

        {isBlurred && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide">
              Locked
            </span>
          </div>
        )}

        {canAccess && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200 ring-1 ring-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5" /> Purchased
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3">
        <span className="sr-only">{hints.base}</span>

        <div className="text-xs text-slate-400">
          {priceLabel}
          {alsoViaSub ? ' • also via subscription' : ''}
        </div>

        {!canAccess && (
          <button
            className="btn mt-3"
            onClick={onBuy}
            disabled={checking || buying || !isConnected || pid <= 0n}
            aria-disabled={checking || buying || !isConnected || pid <= 0n}
          >
            {buying ? 'Purchasing…' : 'Buy Post'}
          </button>
        )}
      </div>
    </div>
  );
}
