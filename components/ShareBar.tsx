// components/ShareBar.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { creatorShareLinks } from "@/lib/farcaster";
import { Copy, Share2, ExternalLink } from "lucide-react";

/**
 * Optional: size="compact" makes the bar smaller for tight spaces.
 */
type Props = { creatorId: string; handle: string; size?: "default" | "compact" };

export default function ShareBar({ creatorId, handle, size = "default" }: Props) {
  // Build links once per handle (SSR-safe; no window usage here)
  const { url, cast, tweet } = useMemo(
    () => creatorShareLinks(handle, `Check out @${handle} on OnlyStars`),
    [handle]
  );

  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  // Keep a stable timeout ref so we can clear on unmount
  const copyTimerRef = useRef<number | null>(null);

  // Hydration-safe feature detection
  useEffect(() => {
    setCanWebShare(typeof navigator !== "undefined" && !!navigator.share);
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      try {
        // Fallback prompt for restricted environments
        // eslint-disable-next-line no-alert
        window.prompt("Copy link:", url);
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

  const isCompact = size === "compact";
  const pad = isCompact ? "px-2.5 py-1.5" : "px-3 py-2";
  const text = isCompact ? "text-xs" : "text-sm";

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-2",
        "rounded-2xl border border-white/10 bg-black/30 p-2",
        // very subtle gradient edge = “premium” feel without distraction
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
      ].join(" ")}
      aria-label="Share this profile"
    >
      {/* Warpcast */}
      <a
        className={[
          "inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5",
          pad,
          text,
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50",
          "transition-colors",
          "shrink-0",
        ].join(" ")}
        href={cast}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Warpcast"
        title="Share on Warpcast"
      >
        <span className="hidden sm:inline">Share on Warpcast</span>
        <span className="sm:hidden">Warpcast</span>
        <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
      </a>

      {/* X / Twitter */}
      <a
        className={[
          "inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5",
          pad,
          text,
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50",
          "transition-colors",
          "shrink-0",
        ].join(" ")}
        href={tweet}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        title="Share on X"
      >
        <span className="hidden sm:inline">Share on X</span>
        <span className="sm:hidden">X</span>
        <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
      </a>

      {/* Native share (only after mount to avoid SSR mismatch) */}
      {canWebShare && (
        <button
          type="button"
          onClick={onWebShare}
          className={[
            "inline-flex items-center gap-1 rounded-xl border border-white/15",
            pad,
            text,
            "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50",
            "transition-colors",
            "shrink-0",
          ].join(" ")}
          aria-label="Share via device"
          title="Share via device"
        >
          Share
          <Share2 className="h-4 w-4 opacity-80" aria-hidden />
        </button>
      )}

      {/* Copy link (fixed min-width so the pill doesn't jump when text flips to “Copied!”) */}
      <button
        type="button"
        onClick={onCopy}
        className={[
          "inline-flex items-center justify-center gap-1 rounded-xl border border-pink-500/40",
          pad,
          text,
          "hover:bg-pink-500/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50",
          "transition-colors",
          "shrink-0",
          "min-w-[7.25rem]", // ~116px keeps width stable between “Copy link” and “Copied!”
        ].join(" ")}
        aria-live="polite"
        aria-label="Copy profile link"
        title="Copy profile link"
      >
        <span className="pointer-events-none select-none">
          {copied ? "Copied!" : "Copy link"}
        </span>
        <Copy className="h-4 w-4 opacity-80" aria-hidden />
      </button>

      {/* Optional: the raw URL in a tiny chip for power users, collapses on small screens */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={[
          "ml-auto hidden max-w-full items-center truncate rounded-full border border-white/10",
          "bg-black/20 px-2 py-1 text-[11px] opacity-70 hover:opacity-90 sm:inline-flex",
        ].join(" ")}
        title={url}
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
    </div>
  );
}
