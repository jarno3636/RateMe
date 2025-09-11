/// app/creator/PostManager.tsx
'use client';

import { useState, useRef } from 'react';
import { Loader2, Plus, Info, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatorHub } from '@/hooks/useCreatorHub';
import { USDC_ADDRESS as DEFAULT_TOKEN } from '@/lib/profileRegistry/constants';

export default function PostManager({ creatorId }: { creatorId: string }) {
  const { createPost /* , setPostActive, updatePost, ... */ } = useCreatorHub();

  // core fields
  const [price, setPrice] = useState('');                 // USDC (human)
  const [uri, setUri] = useState('');                     // main content URI
  const [accessViaSub, setAccessViaSub] = useState(true); // sub unlock
  const [submitting, setSubmitting] = useState(false);

  // preview / blur
  const [previewUri, setPreviewUri] = useState('');       // optional preview
  const [blurForNonSubs, setBlurForNonSubs] = useState(false);

  // uploads
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // Info modal
  const infoRef = useRef<HTMLDialogElement | null>(null);
  const openInfo = () => infoRef.current?.showModal();
  const closeInfo = () => infoRef.current?.close();

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const j = await res.json().catch(() => null);
    if (!j?.ok || !j?.uri) throw new Error(j?.error || 'Upload failed');
    return j.uri as string;
  }

  async function onPickMain(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploadingMain(true);
      const u = await uploadFile(f);
      setUri(u);
      toast.success('Content uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingMain(false);
      e.target.value = '';
    }
  }

  async function onPickPreview(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploadingPreview(true);
      const u = await uploadFile(f);
      setPreviewUri(u);
      toast.success('Preview uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploadingPreview(false);
      e.target.value = '';
    }
  }

  async function submit() {
    try {
      setSubmitting(true);

      if (!uri.trim()) {
        throw new Error('Add a post URI (upload a file or paste IPFS/Arweave/https URL)');
      }

      // Convert human price to token units (USDC 6dp). Allow 0 for free posts.
      const num = Number((price || '0').trim());
      if (!Number.isFinite(num) || num < 0) {
        throw new Error('Enter a valid price');
      }
      const units = Math.round(num * 1e6);

      // Backward-compatible hinting:
      // Encode preview & blur flags into the fragment so readers can parse them.
      // Example: ipfs://abc#rm_preview=<url>&rm_blur=1
      const hintParams = new URLSearchParams();
      if (previewUri.trim()) hintParams.set('rm_preview', previewUri.trim());
      if (blurForNonSubs) hintParams.set('rm_blur', '1');

      const finalUri =
        hintParams.toString().length > 0
          ? `${uri.trim()}#${hintParams.toString()}`
          : uri.trim();

      await createPost({
        token: DEFAULT_TOKEN as `0x${string}`,
        price: BigInt(units),
        uri: finalUri,
        accessViaSub,
      });

      toast.success('Post created');
      setPrice('');
      setUri('');
      setPreviewUri('');
      setBlurForNonSubs(false);
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
        {/* Main content row */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 grid gap-2">
            <input
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
              placeholder="Content URI (e.g. ipfs://... or https://...)"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex h-7 items-center rounded-md border border-white/10 bg-white/5 px-2">
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Upload file
                  <input
                    type="file"
                    onChange={onPickMain}
                    disabled={uploadingMain}
                    className="hidden"
                  />
                </span>
                <span className="text-slate-400">
                  {uploadingMain ? 'Uploading…' : 'Choose a file to upload'}
                </span>
              </label>
            </div>
          </div>

          <input
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
            placeholder="Price (USDC, 0 for free)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        {/* Preview & blur */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3 items-start">
          <div className="sm:col-span-2 grid gap-2">
            <input
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
              placeholder="Preview URI (optional — image/video teaser)"
              value={previewUri}
              onChange={(e) => setPreviewUri(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex h-7 items-center rounded-md border border-white/10 bg-white/5 px-2">
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Upload preview
                  <input
                    type="file"
                    onChange={onPickPreview}
                    disabled={uploadingPreview}
                    className="hidden"
                  />
                </span>
                <span className="text-slate-400">
                  {uploadingPreview ? 'Uploading…' : 'Optional teaser file'}
                </span>
              </label>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={blurForNonSubs}
              onChange={(e) => setBlurForNonSubs(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/5"
            />
            Blur full content for non-subscribers
          </label>
        </div>

        {/* Access via subscription + token note */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3 items-center">
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
          Tips: Set price to <span className="text-slate-200">0</span> for a free teaser. Use a preview
          and enable blur to show a teaser while gating the full content.
        </p>

        <div>
          <button
            onClick={submit}
            disabled={submitting || uploadingMain || uploadingPreview}
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
              <b>Content</b>: upload a file or paste an IPFS/Arweave/HTTPS URL.
            </li>
            <li>
              <b>Price</b>: a one-off purchase in USDC (6 decimals). <i>0</i> makes it free.
            </li>
            <li>
              <b>Subscribers</b>: when enabled, active subscribers unlock without paying per-post.
            </li>
            <li>
              <b>Preview & Blur</b>: add a teaser and keep the main content blurred for non-subscribers;
              the teaser stays visible to everyone.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Technical note: preview/blur hints are stored in the post URI fragment for compatibility.
            Your viewer can parse <code>rm_preview</code> and <code>rm_blur</code> to render the gated view.
          </p>
        </div>
      </dialog>

      {/* TODO: list posts with toggle active / edit price / copy share link */}
    </section>
  );
}
