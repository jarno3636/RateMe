// components/SubscriptionBadge.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle } from 'lucide-react';
import { useCreatorHub } from '@/hooks/useCreatorHub';

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return '';
  }
}

export default function SubscriptionBadge({
  creatorAddress,
}: {
  creatorAddress: `0x${string}` | null;
}) {
  const { address } = useAccount();
  const { getSubExpiry } = useCreatorHub();
  const [expiry, setExpiry] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!address || !creatorAddress) return setExpiry(null);
      const ts = await getSubExpiry(creatorAddress, address); // returns ms or 0
      if (!alive) return;
      setExpiry(ts && ts > Date.now() ? ts : null);
    })();
    return () => { alive = false };
  }, [address, creatorAddress, getSubExpiry]);

  if (!address || !creatorAddress || !expiry) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200 text-xs ring-1 ring-emerald-500/30">
      <CheckCircle className="h-3.5 w-3.5" />
      Subscribed ✓ until {fmt(expiry)}
    </span>
  );
}
