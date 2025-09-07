// app/creator/page.tsx
'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function CreatorOnboard() {
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function go() {
    setBusy(true);
    try {
      const res = await fetch('/api/creator/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      toast.success('Creator page created');
      router.push(`/creator/${encodeURIComponent(j.creator.id)}`);
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Become a creator</h1>
      <p className="text-slate-300 text-sm">
        Claim your Farcaster handle to auto-fill your profile. We’ll pull display name, avatar and bio from Neynar.
      </p>
      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <span className="text-slate-400">@</span>
        <input
          className="flex-1 bg-transparent outline-none"
          placeholder="your-handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
      </label>
      <button onClick={go} disabled={busy || !handle} className="btn">
        {busy ? 'Creating…' : 'Create my page'}
      </button>
    </div>
  );
}
