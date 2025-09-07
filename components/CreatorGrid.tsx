// components/CreatorGrid.tsx
'use client';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function CreatorGrid() {
  const { data } = useSWR<{ creators: any[] }>('/api/creators', fetcher, { revalidateOnFocus: false });
  const rows = data?.creators || [];

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No creators yet. <Link href="/creator" className="underline">Be the first →</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((c) => (
        <article key={c.id} className="card">
          <div className="flex items-center gap-3">
            <img src={c.avatarUrl || '/icon-192.png'} alt="" className="h-10 w-10 rounded-full ring-1 ring-white/10" />
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{c.displayName || c.handle}</h3>
              <div className="truncate text-xs text-slate-400">@{c.handle}</div>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{c.bio || '—'}</p>
          <div className="mt-3 flex gap-2">
            <Link href={`/creator/${encodeURIComponent(c.id)}`} className="btn">View</Link>
            <Link href={`/creator/${encodeURIComponent(c.id)}/subscribe`} className="btn-secondary">Subscribe</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
