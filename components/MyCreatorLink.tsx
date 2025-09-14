'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';

export default function MyCreatorLink({ className = 'btn' }: { className?: string }) {
  const { address } = useAccount();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function go() {
    if (!address) { router.push('/creator'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/by-owner?address=${address}`, { cache: 'no-store' });
      const j = await res.json();
      if (j?.creator?.id) router.push(`/creator/${encodeURIComponent(j.creator.id)}`);
      else router.push('/creator'); // onboard
    } catch {
      router.push('/creator');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={go} className={className} disabled={loading}>
      {loading ? 'Checking…' : 'My Creator Page'}
    </button>
  );
}
