// components/BuyPostButton.tsx
'use client';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useCreatorHub } from '@/hooks/useCreatorHub';

export default function BuyPostButton({ postId }: { postId: bigint }) {
  const { buyPost } = useCreatorHub();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await buyPost(postId);
      toast.success('Unlocked!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={run} disabled={busy} className="btn">
      {busy ? 'Purchasing…' : 'Buy Post'}
    </button>
  );
}
