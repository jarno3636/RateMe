// components/BuyPostButton.tsx
'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';

export default function BuyPostButton({ postId }: { postId: bigint }) {
  const { buyPost } = useCreatorHub();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await buyPost(postId); toast.success('Purchased'); }
        catch (e: any) { toast.error(e?.shortMessage || e?.message || 'Purchase failed'); }
        finally { setBusy(false); }
      }}
    >
      Buy Post
    </button>
  );
}
