'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { getAddress, isAddress } from 'viem';
import SafeMedia from './SafeMedia';
import { useCreatorHub } from '@/hooks/useCreatorHub';

function parseHints(uri: string) {
  try {
    const [base, hash = ''] = uri.split('#');
    const params = new URLSearchParams(hash);
    return {
      base: (base || '').trim(),
      preview: (params.get('rm_preview') || '').trim(),
      blur: params.get('rm_blur') === '1',
    };
  } catch {
    return { base: uri, preview: '', blur: false };
  }
}

export default function PaidPostCard({
  creatorAddress,
  postId,
  priceUSDC,               // number in USDC (e.g., 1.00)
  rawUri,                  // stored URI (may contain rm_preview/rm_blur)
  alsoViaSub,
  onChanged,               // call after a successful purchase to refresh
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

  const [checking, setChecking] = useState(false);
  const [buying, setBuying] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const cancelRef = useRef(false);

  const hints = useMemo(() => parseHints(rawUri), [rawUri]);

  const checksumUser = useMemo(
    () => (address && isAddress(address) ? (getAddress(address) as `0x${string}`) : null),
    [address]
  );

  const normalizedPostId = useMemo(() => {
    try {
      return BigInt(postId);
    } catch {
      return 0n;
    }
  }, [postId]);

  async function refreshAccess() {
    if (!checksumUser || normalizedPostId <= 0n) {
      setCanAccess(false);
      return;
    }
    cancelRef.current = false;
    try {
      setChecking(true);
      const ok = await hasPostAccess(checksumUser, normalizedPostId);
      if (!cancelRef.current) setCanAccess(!!ok);
    } catch {
      if (!cancelRef.current) setCanAccess(false);
    } finally {
      if (!cancelRef.current) setChecking(false);
    }
  }

  // Poll briefly after purchase to absorb on-chain lag (max ~5s)
  async function pollUntilUnlocked(maxMs = 5000) {
    const start = Date.now();
    const delays = [300, 600, 1000, 1500, 2000];
    for (const d of delays) {
      if (Date.now() - start > maxMs) break;
      await new Promise((r) => setTimeout(r, d));
      if (cancelRef.current) return;
      try {
        const ok = checksumUser && normalizedPostId > 0n
          ? await hasPostAccess(checksumUser, normalizedPostId)
          : false;
        if (ok) { setCanAccess(true); return; }
      } catch { /* ignore */ }
    }
    // final refresh fallback
    await refreshAccess();
  }

  useEffect(() => {
    cancelRef.current = false;
    refreshAccess();
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checksumUser, creatorAddress, normalizedPostId]);

  // Re-check when user returns to tab (handles wallet reconnect off-tab)
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') refreshAccess();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checksumUser, normalizedPostId]);

  const showPreview = !canAccess && !!hints.preview;
  const mediaSrc = canAccess ? hints.base : showPreview ? hints.preview : '';
  const showGrey = !mediaSrc;

  async function onBuy() {
    if (!isConnected || !checksumUser || normalizedPostId <= 0n) return;
    try {
      setBuying(true);
      await buyPost(normalizedPostId);     // assume hook handles tx + throws on reject
      onChanged?.();
      await pollUntilUnlocked();
    } finally {
      setBuying(false);
    }
  }

  const priceLabel = Number.isFinite(priceUSDC)
    ? `${priceUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
    : `${priceUSDC} USDC`;

  const isBlurred = hints.blur && !canAccess && !showGrey;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="relative">
        {showGrey ? (
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
          <div className={isBlurred ? 'select-none blur-4xl' : ''}>
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
            disabled={checking || buying || !isConnected || normalizedPostId <= 0n}
            aria-disabled={checking || buying || !isConnected || normalizedPostId <= 0n}
          >
            {buying ? 'Purchasing…' : 'Buy Post'}
          </button>
        )}
      </div>
    </div>
  );
}
