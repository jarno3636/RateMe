// components/ShareBar.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { creatorShareLinks } from '@/lib/farcaster';
import { Copy, Share2, ExternalLink } from 'lucide-react';

type Props = { creatorId: string; handle: string };

export default function ShareBar({ creatorId, handle }: Props) {
  // Build links once per handle
  const { url, cast, tweet } = useMemo(
    () => creatorShareLinks(handle, `Check out @${handle} on Rate Me`),
    [handle]
  );

  const [copied, setCopied] = useState(false);
  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share;

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback if clipboard API is blocked
      try {
        // eslint-disable-next-line no-alert
        window.prompt('Copy link:', url);
      } catch {
        // noop
      }
    }
  }, [url]);

  const onWebShare = useCallback(async () => {
    if (!canWebShare) return;
    try {
      await navigator.share({
        title: `@${handle} on Rate Me`,
        text: `Check out @${handle} on Rate Me`,
        url,
      });
    } catch {
      // user cancelled or platform blocked — silently ignore
    }
  }, [canWebShare, handle, url]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Warpcast */}
      <a
        className="btn-secondary inline-flex items-center"
        href={cast}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Warpcast"
      >
        Share on Warpcast <ExternalLink className="ml-1 h-4 w-4" aria-hidden />
      </a>

      {/* X / Twitter */}
      <a
        className="btn-secondary inline-flex items-center"
        href={tweet}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on X"
      >
        Share on X <ExternalLink className="ml-1 h-4 w-4" aria-hidden />
      </a>

      {/* Native share (if supported) */}
      {canWebShare && (
        <button
          type="button"
          onClick={onWebShare}
          className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
          aria-label="Share via device"
        >
          Share <Share2 className="ml-1 h-4 w-4" aria-hidden />
        </button>
      )}

      {/* Copy */}
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
        aria-live="polite"
        aria-label="Copy profile link"
      >
        {copied ? 'Copied!' : 'Copy link'} <Copy className="ml-1 h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
