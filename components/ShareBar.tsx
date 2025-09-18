// components/ShareBar.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { creatorShareLinks } from '@/lib/farcaster';
import { Copy, Share2, ExternalLink } from 'lucide-react';

type Props = { creatorId: string; handle: string };

export default function ShareBar({ creatorId, handle }: Props) {
  // Build links once per handle (SSR-safe; no window usage here)
  const { url, cast, tweet } = useMemo(
    () => creatorShareLinks(handle, `Check out @${handle} on OnlyStars`),
    [handle]
  );

  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  // Hydration-safe feature detection
  useEffect(() => {
    setCanWebShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      try {
        // eslint-disable-next-line no-alert
        window.prompt('Copy link:', url);
      } catch {
        /* noop */
      }
    }
  }, [url]);

  const onWebShare = useCallback(async () => {
    if (!canWebShare) return;
    try {
      await navigator.share({
        title: `@${handle} on OnlyStars`,
        text: `Check out @${handle} on OnlyStars`,
        url,
      });
    } catch {
      // user cancelled — ignore
    }
  }, [canWebShare, handle, url]);

  return (
    <div
      className="
        flex flex-wrap items-center gap-2
        rounded-2xl border border-white/10 bg-black/30 p-2
      "
      aria-label="Share this profile"
    >
      {/* Warpcast */}
      <a
        className="
          inline-flex items-center gap-1
          rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm
          hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50
        "
        href={cast}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Warpcast"
        title="Share on Warpcast"
      >
        Share on Warpcast
        <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
      </a>

      {/* X / Twitter */}
      <a
        className="
          inline-flex items-center gap-1
          rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm
          hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50
        "
        href={tweet}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
        title="Share on X"
      >
        Share on X
        <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
      </a>

      {/* Native share (only after mount to avoid SSR mismatch) */}
      {canWebShare && (
        <button
          type="button"
          onClick={onWebShare}
          className="
            inline-flex items-center gap-1
            rounded-xl border border-white/15 px-3 py-2 text-sm
            hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50
          "
          aria-label="Share via device"
          title="Share via device"
        >
          Share
          <Share2 className="h-4 w-4 opacity-80" aria-hidden />
        </button>
      )}

      {/* Copy link */}
      <button
        type="button"
        onClick={onCopy}
        className="
          inline-flex items-center gap-1
          rounded-xl border border-pink-500/40 px-3 py-2 text-sm
          hover:bg-pink-500/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50
        "
        aria-live="polite"
        aria-label="Copy profile link"
        title="Copy profile link"
      >
        {copied ? 'Copied!' : 'Copy link'}
        <Copy className="h-4 w-4 opacity-80" aria-hidden />
      </button>
    </div>
  );
}
