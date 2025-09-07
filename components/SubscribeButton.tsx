// components/SubscribeButton.tsx
'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';

export default function SubscribeButton({ planId }: { planId: bigint }) {
  const { subscribe } = useCreatorHub();
  const [periods, setPeriods] = useState(1);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await subscribe(planId, periods);
      toast.success('Subscribed!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="number"
        min={1}
        value={periods}
        onChange={(e) => setPeriods(Math.max(1, Number(e.target.value || 1)))}
        className="w-20 rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
        aria-label="Periods"
      />
      <button onClick={run} disabled={busy} className="btn">
        {busy ? 'Subscribing…' : 'Subscribe'}
      </button>
    </div>
  );
}
