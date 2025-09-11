/// app/creator/PostManager.tsx
'use client';

import { useState, useRef } from 'react';
import { Loader2, Plus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';
import { USDC_ADDRESS as DEFAULT_TOKEN } from '@/lib/profileRegistry/constants';

export default function PostManager({ creatorId }: { creatorId: string }) {
  const { createPost /* , setPostActive, updatePost, ... */ } = useCreatorHub();
  const [price, setPrice] = useState('');
  const [uri, setUri] = useState('');
  const [accessViaSub, setAccessViaSub] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Info modal
  const infoRef = useRef<HTMLDialogElement | null>(null);
  const openInfo = () => infoRef.current?.showModal();
  const closeInfo = () => infoRef.current?.close();

  async function submit() {
    try {
      setSubmitting(true);

      if (!uri.trim()) {
        throw new Error('Add a post URI (IPFS/Arweave/https)');
      }

      // Convert human price to token units (USDC 6dp). Allow 0 for free posts.
      const num = Number((price || '0').trim());
      if (!Number.isFinite(num) || num < 0) {
        throw new Error('Enter a valid price');
      }
      const units = Math.round(num * 1e6);

      await createPost({
        token: DEFAULT_TOKEN as `0x${string}`,
        price: BigInt(units),
        uri: uri.trim(),
        accessViaSub,
      });

      toast.success('Post created');
      setPrice('');
      setUri('');
      setAccessViaSub(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Paid posts</h2>
        <button
          type="button"
          onClick={openInfo}
          aria-label="How do paid posts work?"
          className="inline-flex items-center rounded-md border border-white/10 bg-white/5 p-1 hover:bg-white/10"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Price (USDC, 0 for free)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none sm:col-span-2"
            placeholder="Content URI (e.g. ipfs://... or https://...)"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
          />
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-3 items-center">
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={accessViaSub}
              onChange={(e) => setAccessViaSub(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/5"
            />
            Accessible via active subscription
          </label>
          <div className="text-xs text-slate-400 sm:col-span-2">
            Token: <span className="text-slate-200">USDC (Base)</span>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Tip: Set price to <span className="text-slate-200">0</span> for a free teaser. Check the box to include for subscribers.
        </p>

        <div>
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
            Create post
          </button>
        </div>
      </div>

      {/* Info dialog */}
      <dialog
        ref={infoRef}
        className="rounded-2xl border border-white/10 bg-slate-900/95 p-0 text-slate-100 backdrop:bg-black/50 w-full max-w-lg"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold">How paid posts work</h3>
            <button
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
              onClick={closeInfo}
            >
              Close
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-300 list-disc pl-4">
            <li>
              <b>URI</b> should point to your content (IPFS, Arweave, or HTTPS). We show previews
              where possible; the full content is pay/unlock-gated.
            </li>
            <li>
              <b>Price</b> is a one-off purchase in USDC (6 decimals). <i>0</i> makes it free.
            </li>
            <li>
              <b>Accessible via active subscription</b> lets current subscribers unlock this post
              without paying individually.
            </li>
            <li>
              You can mix free teasers and paid content. (Future: blur/preview controls per block.)
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Example: A teaser video at 0 USDC + a full video at 4.99 USDC, both marked as accessible
            to subscribers on your 9.99 USDC/month plan.
          </p>
        </div>
      </dialog>
      {/* TODO: list posts with toggle active / edit price / copy share link */}
    </section>
  );
}
