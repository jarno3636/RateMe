// app/creator/PostManager.tsx
'use client';

import { useState } from 'react';
import { useCreatorHub } from '@/hooks/useCreatorHub';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PostManager({ creatorId }: { creatorId: string }) {
  const { createPost /*, setPostActive, updatePost, ...*/ } = useCreatorHub();
  const [price, setPrice] = useState('');
  const [uri, setUri] = useState('');
  const [accessViaSub, setAccessViaSub] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try {
      setSubmitting(true);
      const units = Math.round(Number(price || '0') * 1e6); // USDC 6d
      if (!uri) throw new Error('Add a post URI (IPFS/Arweave/https)');
      await createPost({
        price: BigInt(units),
        uri,
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
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={accessViaSub}
            onChange={(e) => setAccessViaSub(e.target.checked)}
            className="h-4 w-4 rounded border-white/10 bg-white/5"
          />
          Accessible via active subscription
        </label>
        <div>
          <button onClick={submit} disabled={submitting} className="btn mt-3 inline-flex items-center">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create post
          </button>
        </div>
      </div>
      {/* TODO: list posts with toggle active / edit price / copy share link */}
    </section>
  );
}
