// app/mini/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Mini() {
  const [inWarpcast, setInWarpcast] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || '';
    const iframe = window.self !== window.top;
    setInWarpcast(/Warpcast/i.test(ua) || iframe);
  }, []);

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
        <h1 className="text-2xl font-bold">Rate Me</h1>
        <p className="mt-2 text-sm text-slate-300">
          Subscriptions, paid posts & custom requests. Tap a creator below or open a profile link.
        </p>
        {!inWarpcast && (
          <p className="mt-2 text-xs text-slate-400">Tip: open this inside Warpcast for the Mini App experience.</p>
        )}
        <div className="mt-4 flex justify-center">
          <Link href="/discover" className="btn">Browse Creators</Link>
        </div>
      </section>
    </main>
  );
}
