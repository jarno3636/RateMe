// app/creator/PlanManager.tsx
'use client';

import { useState, useRef } from 'react';
import { Loader2, Plus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';
// Default token = Base USDC (6 decimals)
import { USDC_ADDRESS as DEFAULT_TOKEN } from '@/lib/profileRegistry/constants';

export default function PlanManager({ creatorId }: { creatorId: string }) {
  const { createPlan /*, setPlanActive, updatePlan, ...*/ } = useCreatorHub();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // human input; assumed USDC (6dp)
  const [periodDays, setPeriodDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  // Info modal
  const infoRef = useRef<HTMLDialogElement | null>(null);
  const openInfo = () => infoRef.current?.showModal();
  const closeInfo = () => infoRef.current?.close();

  async function submit() {
    try {
      setSubmitting(true);

      // Validate & convert human price -> token units (USDC 6 decimals)
      const num = Number((price || '').trim());
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error('Enter a valid price greater than 0');
      }
      const units = Math.round(num * 1e6); // 6dp
      if (!units || units < 0) throw new Error('Enter a valid price');

      await createPlan({
        token: DEFAULT_TOKEN as `0x${string}`,
        name: name?.trim() || 'Plan',
        pricePerPeriod: BigInt(units),
        periodDays: Math.max(1, Math.floor(Number(periodDays || 1))),
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
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Subscription plans</h2>
        <button
          type="button"
          onClick={openInfo}
          aria-label="How do subscription plans work?"
          className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-1 hover:bg-white/10"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Plan name (e.g. Gold)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
            onChange={(e) =>
              setPeriodDays(Math.max(1, Number((e.target.value || '1').trim())))
            }
          />
          <div className="flex items-center text-xs text-slate-400">
            Token:&nbsp;<span className="text-slate-200">USDC (Base)</span>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Tip: $9.99 → enter <span className="text-slate-200">9.99</span>. Period is the billing cycle length.
        </p>

        <button
          onClick={submit}
          disabled={submitting}
          className="btn mt-3 inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create plan
        </button>
      </div>

      {/* Info dialog */}
      <dialog
        ref={infoRef}
        className="rounded-2xl border border-white/10 bg-slate-900/95 p-0 text-slate-100 backdrop:bg-black/50 w-full max-w-lg"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold">How subscriptions work</h3>
            <button
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
              onClick={closeInfo}
            >
              Close
            </button>
          </div>
          <ol className="mt-3 space-y-2 text-sm text-slate-300 list-decimal pl-4">
            <li><b>Create a plan</b> with a name, price (USDC on Base), and billing period in days.</li>
            <li>Fans who subscribe are granted access to any posts you mark as “accessible via active subscription.”</li>
            <li>You can still sell one-off paid posts; subscribers may get them included depending on your settings.</li>
            <li>Revenue is settled on-chain. Prices are in USDC (6 decimals) and billed per period.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-400">
            Example: A “Gold” plan at 9.99 USDC with period 30 means 9.99 USDC every ~30 days.
          </p>
        </div>
      </dialog>
      {/* TODO: list existing plans for this creator (read from hub) with enable/disable actions */}
    </section>
  );
}
