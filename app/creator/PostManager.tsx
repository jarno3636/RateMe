// app/creator/PostManager.tsx
'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';
import { USDC_ADDRESS as DEFAULT_TOKEN } from '@/lib/profileRegistry/constants';

export default function PostManager({ creatorId }: { creatorId: string }) {
  const { createPost /* , setPostActive, updatePost, ... */ } = useCreatorHub();
  const [price, setPrice] = useState('');
  const [uri, setUri] = useState('');
  const [accessViaSub, setAccessViaSub] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try {
      setSubmitting(true);

      if (!uri.trim()) {
        throw new Error('Add a post URI (IPFS/Arweave/https)');
      }

      // Convert human price to token units (USDC 6dp). Allow 0 for free posts.
      const num = Number(price || '0');
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
      <h2 className="text-lg font-semibold">Paid posts</h2>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Price (USDC)"
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

        <div>
          <button
            onClick={submit}
            disabled={submitting}
            className="btn mt-3 inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create post
          </button>
        </div>
      </div>
      {/* TODO: list posts with toggle active / edit price / copy share link */}
    </section>
  );
}
