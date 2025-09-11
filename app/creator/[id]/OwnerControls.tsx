// app/creator/[id]/OwnerControls.tsx
'use client';

import { useAccount } from 'wagmi';
import Link from 'next/link';

export default function OwnerControls({
  creatorAddress,
  creatorId,
}: {
  creatorAddress: `0x${string}` | null
  creatorId: string
}) {
  const { address } = useAccount();
  const isOwner =
    !!creatorAddress &&
    !!address &&
    creatorAddress.toLowerCase() === address.toLowerCase();

  if (!isOwner) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link href="/creator/dashboard" className="btn">
        Open creator dashboard
      </Link>
      <Link href={`/creator/${encodeURIComponent(creatorId)}#plans`} className="btn-secondary">
        Manage plans & posts
      </Link>
    </div>
  );
}
