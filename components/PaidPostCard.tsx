// components/PaidPostCard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import SafeMedia from './SafeMedia';
import { useCreatorHub } from '@/hooks/useCreatorHub';

function parseHints(uri: string) {
  try {
    const parts = uri.split('#');
    const params = new URLSearchParams(parts[1] || '');
    return {
      base: parts[0],
      preview: params.get('rm_preview') || '',
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
  const { address } = useAccount();
  const { buyPost, canAccessPost } = useCreatorHub();

  const [checking, setChecking] = useState(false);
  const [canAccess, setCanAccess] = useState(false);

  const hints = useMemo(() => parseHints(rawUri), [rawUri]);

  async function refreshAccess() {
    if (!address) return;
    try {
      setChecking(true);
      const ok = await canAccessPost(creatorAddress, postId, address);
      setCanAccess(!!ok);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, creatorAddress, postId]);

  const showPreview = !canAccess && !!hints.preview;
  const mediaSrc = canAccess ? hints.base : showPreview ? hints.preview : '';
  const showGrey = !mediaSrc;

  async function onBuy() {
    if (!address) return;
    await buyPost({ creator: creatorAddress, postId });
    await refreshAccess();
    onChanged?.();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="relative">
        {showGrey ? (
          <div className="rounded-xl h-56 w-full bg-white/[0.03] grid place-items-center">
            {!address ? (
              <span className="text-xs text-slate-400">Connect to preview/purchase</span>
            ) : checking ? (
              <span className="text-xs text-slate-400">Checking access…</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Lock className="h-4 w-4" /> Locked
              </span>
            )}
          </div>
        ) : (
          <div className={hints.blur && !canAccess ? 'blur-md select-none' : ''}>
            <SafeMedia src={mediaSrc} />
          </div>
        )}

        {canAccess && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200 text-xs ring-1 ring-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5" /> Purchased
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3">
        <div className="text-sm text-slate-200 truncate">{hints.base}</div>
        <div className="text-xs text-slate-400">
          {priceUSDC} USDC{alsoViaSub ? ' • also via subscription' : ''}
        </div>

        {!canAccess && (
          <button
            className="btn mt-3"
            onClick={onBuy}
            disabled={checking}
          >
            Buy Post
          </button>
        )}
      </div>
    </div>
  );
}
