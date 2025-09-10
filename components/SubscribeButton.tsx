// components/SubscribeButton.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { useCreatorHub } from '@/hooks/useCreatorHub';

type Props = {
  planId: bigint;
  /** Optional upper bound for periods the user can prepay (default 12). */
  maxPeriods?: number;
  /** Optional CTA label override (default: "Subscribe"). */
  ctaLabel?: string;
};

export default function SubscribeButton({ planId, maxPeriods = 12, ctaLabel = 'Subscribe' }: Props) {
  const { subscribe } = useCreatorHub();
  const [periods, setPeriods] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  const min = 1;
  const max = Math.max(min, Math.floor(maxPeriods));

  const setSafe = useCallback(
    (n: number) => setPeriods(Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : min))),
    [max]
  );

  const dec = useCallback(() => setSafe(periods - 1), [periods, setSafe]);
  const inc = useCallback(() => setSafe(periods + 1), [periods, setSafe]);

  const disabled = busy || periods < min || periods > max;

  const normalizedPeriods = useMemo(
    () => Math.min(max, Math.max(min, Math.floor(Number(periods || 1)))),
    [periods, max]
  );

  const run = useCallback(async () => {
    if (disabled) return;
    setBusy(true);

    const action = subscribe(planId, normalizedPeriods);

    await toast.promise(
      action,
      {
        loading: 'Confirm in wallet…',
        success: 'Subscribed!',
        error: (e) =>
          e?.shortMessage ||
          e?.cause?.shortMessage ||
          e?.message ||
          'Transaction failed',
      },
      { success: { duration: 3000 } }
    ).finally(() => setBusy(false));
  }, [disabled, subscribe, planId, normalizedPeriods]);

  return (
    <div className="inline-flex items-stretch gap-2">
      <div className="flex items-center rounded-lg border border-white/10 bg-white/5">
        <button
          type="button"
          onClick={dec}
          disabled={busy || periods <= min}
          aria-label="Decrease periods"
          className="grid h-9 w-9 place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 rounded-l-lg"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>

        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={periods}
          onChange={(e) => setSafe(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run();
          }}
          aria-label="Number of periods to prepay"
          className="h-9 w-16 bg-transparent text-center outline-none"
        />

        <button
          type="button"
          onClick={inc}
          disabled={busy || periods >= max}
          aria-label="Increase periods"
          className="grid h-9 w-9 place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 rounded-r-lg"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={disabled}
        className="btn inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
        aria-disabled={disabled}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Processing…
          </>
        ) : (
          ctaLabel
        )}
      </button>
    </div>
  );
}
