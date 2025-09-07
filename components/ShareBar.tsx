// components/ShareBar.tsx
'use client';
import { SITE } from '@/lib/config';

export default function ShareBar({ creatorId, handle }: { creatorId: string; handle: string }) {
  const url = `${SITE}/creator/${encodeURIComponent(creatorId)}`;
  const text = `Check out @${handle} on Rate Me`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const warpcast = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-secondary" href={twitter} target="_blank" rel="noreferrer">Share on X</a>
      <a className="btn-secondary" href={warpcast} target="_blank" rel="noreferrer">Share on Warpcast</a>
      <button
        className="rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          alert('Profile link copied');
        }}
      >
        Copy link
      </button>
    </div>
  );
}
