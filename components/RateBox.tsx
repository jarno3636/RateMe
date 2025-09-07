// components/RateBox.tsx
'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function RateBox({ creatorId, raterFid }: { creatorId: string; raterFid?: number }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creatorId, score, comment, raterFid }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      toast.success('Thanks for rating!');
      setComment('');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-medium">Rate this creator</div>
      <div className="mt-2 flex items-center gap-2">
        {[1,2,3,4,5].map((n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={`h-8 w-8 rounded-full ring-1 ring-white/10 ${n <= score ? 'bg-yellow-400/70' : 'bg-white/10'}`}
            aria-label={`${n} star${n>1?'s':''}`}
          />
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Say something nice (optional)"
        className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm outline-none"
        rows={3}
      />
      <button onClick={submit} disabled={busy} className="btn mt-3">
        {busy ? 'Submitting…' : 'Submit Rating'}
      </button>
    </div>
  );
}
