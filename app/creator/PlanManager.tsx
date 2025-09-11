// app/creator/PlanManager.tsx
'use client';

import { useState } from 'react';
import { useCreatorHub } from '@/hooks/useCreatorHub';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlanManager({ creatorId }: { creatorId: string }) {
  const { createPlan /*, setPlanActive, updatePlan, ...*/ } = useCreatorHub();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // human (auto 6d for USDC; adjust if you support other tokens)
  const [periodDays, setPeriodDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try {
      setSubmitting(true);
      const units = Math.round(Number(price || '0') * 1e6); // USDC 6 decimals
      if (!units || units < 0) throw new Error('Enter a valid price');
      await createPlan({
        // you may require token address; default to USDC in your hook
        name: name || 'Plan',
        pricePerPeriod: BigInt(units),
        periodDays,
        metadataURI: '',
      });
      toast.success('Plan created');
      setName('');
      setPrice('');
      setPeriodDays(30);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Subscription plans</h2>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Price (USDC)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Period (days)"
            type="number"
            min={1}
            value={periodDays}
            onChange={(e) => setPeriodDays(Math.max(1, Number(e.target.value || 1)))}
          />
        </div>
        <button onClick={submit} disabled={submitting} className="btn mt-3 inline-flex items-center">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create plan
        </button>
      </div>
      {/* TODO: list existing plans for this creator (read from hub) with enable/disable actions */}
    </section>
  );
}
