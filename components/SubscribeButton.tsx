// components/SubscribeButton.tsx
'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';

export default function SubscribeButton({ planId, periods = 1 }: { planId: bigint; periods?: number }) {
  const { subscribe } = useCreatorHub();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await subscribe(planId, periods); toast.success('Subscribed'); }
        catch (e: any) { toast.error(e?.shortMessage || e?.message || 'Subscribe failed'); }
        finally { setBusy(false); }
      }}
    >
      Subscribe
    </button>
  );
}
