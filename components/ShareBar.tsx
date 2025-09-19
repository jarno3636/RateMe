// components/ShareBar.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { creatorShareLinks } from "@/lib/farcaster";
import { Copy, Share2, ExternalLink, Link as LinkIcon } from "lucide-react";

/**
 * ShareBar
 * - Warpcast + X(Twitter) links with proper, SSR-safe URLs
 * - Native Web Share (when available)
 * - Copy link with a11y feedback + stable pill width (no layout shift)
 * - Compact size option for tight spaces
 * - UTM-tagged links for simple analytics
 *
 * Usage:
 *   <ShareBar creatorId={id.toString()} handle={handle} />
 */
type Props = {
  creatorId: string;
  handle: string;
  /** Compact pills for tight spaces */
  size?: "default" | "compact";
  /** Optional custom message appended to share text */
  message?: string;
  /** Optional callback for analytics */
  onShare?: (channel: "warpcast" | "x" | "webshare" | "copy") => void;
};

function buildSiteOrigin() {
  // Prefer configured site URL (no trailing slash), fall back to client origin, then a safe default
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://onlystars.app";
}

function withUtm(u: string, source: string, medium = "sharebar", campaign = "creator_profile") {
  try {
    const url = new URL(u);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", medium);
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  } catch {
    return u;
  }
}

export default function ShareBar({
  creatorId,
  handle,
  size = "default",
  message,
  onShare,
}: Props) {
  const origin = useMemo(buildSiteOrigin, []);
  // Canonical profile URL (prefer handle route if you have it; fall back to id)
  const canonicalUrl = useMemo(() => {
    // If your app supports handle-based pages, uncomment the first line:
    // return `${origin}/@${encodeURIComponent(handle)}`;
    return `${origin}/creator/${encodeURIComponent(creatorId)}`;
  }, [origin, creatorId /* , handle */]);

  const shareText = useMemo(
    () => (message?.trim() ? message.trim() : `Check out @${handle} on OnlyStars`),
    [handle, message]
  );

  // Build Farcaster/X helper links; then UTM-tag the final URL
  const { url, cast, tweet } = useMemo(() => {
    // creatorShareLinks should return { url, cast, tweet } based on the input `handle` and fallback text.
    // We override the base url to use our canonicalUrl and add utm tags for analytics.
    const base = creatorShareLinks(handle, shareText);
    const shareUrl = withUtm(canonicalUrl, "direct");
    // Try to replace any internal url with our canonical/utm one
    const castUrl = withUtm(shareUrl, "warpcast");
    const tweetUrl = withUtm(shareUrl, "x");
    // Update the outbound links (many helper utils accept a text param with &text=...&url=...)
    const castHref = (() => {
      try {
        const c = new URL(base.cast);
        // Prefer placing text in `text`. If helper already put one, keep it, just ensure URL param exists.
        if (!c.searchParams.get("text")) c.searchParams.set("text", shareText);
        // Add/replace url param if helper supports it; otherwise append to text.
        if (c.searchParams.has("url")) {
          c.searchParams.set("url", castUrl);
        } else {
          c.searchParams.set("text", `${c.searchParams.get("text")} ${castUrl}`.trim());
        }
        return c.toString();
      } catch {
        // Fallback to Warpcast composer with our params
        const text = encodeURIComponent(`${shareText} ${castUrl}`);
        return `https://warpcast.com/~/compose?text=${text}`;
      }
    })();

    const tweetHref = (() => {
      try {
        const t = new URL(base.tweet);
        // Support both old and new X endpoints (text/url or just text)
        if (!t.searchParams.get("text")) t.searchParams.set("text", shareText);
        if (t.searchParams.has("url")) {
          t.searchParams.set("url", tweetUrl);
        } else {
          t.searchParams.set("text", `${t.searchParams.get("text")} ${tweetUrl}`.trim());
        }
        return t.toString();
      } catch {
        const text = encodeURIComponent(`${shareText} ${tweetUrl}`);
        return `https://twitter.com/intent/tweet?text=${text}`;
      }
    })();

    return {
      url: shareUrl,
      cast: castHref,
      tweet: tweetHref,
    };
  }, [canonicalUrl, handle, shareText]);

  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);
  const [mounted, setMounted] = useState(false); // avoid SSR feature checks until client
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined" && !!navigator.share) setCanWebShare(true);
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
      onShare?.("copy");
    } catch {
      try {
        // Fallback prompt for restricted environments
        // eslint-disable-next-line no-alert
        window.prompt("Copy link:", url);
        onShare?.("copy");
      } catch {
        /* noop */
      }
    }
  }, [url, onShare]);

  const onWebShare = useCallback(async () => {
    if (!canWebShare) return;
    try {
      await navigator.share({
        title: `@${handle} on OnlyStars`,
        text: shareText,
        url,
      });
      onShare?.("webshare");
    } catch {
      // user cancelled — ignore
    }
  }, [canWebShare, handle, shareText, url, onShare]);

  const isCompact = size === "compact";
  const pad = isCompact ? "px-2.5 py-1.5" : "px-3 py-2";
  const text = isCompact ? "text-xs" : "text-sm";

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-2",
        "rounded-2xl border border-white/10 bg-black/30 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
      ].join(" ")}
      aria-label="Share this profile"
    >
      {/* Canonical link pill (useful in lists; hidden on very small screens) */}
      <a
        className={[
          "hidden sm:inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5",
          pad,
          text,
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors shrink-0",
        ].join(" ")}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open profile link"
        title="Open profile link"
        onClick={() => onShare?.("copy")}
      >
        <LinkIcon className="h-4 w-4 opacity-80" aria-hidden />
        {url.replace(/^https?:\/\//, "")}
      </a>

      {/* Warpcast */}
      <a
        className={[
          "inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5",
          pad,
          text,
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors shrink-0",
        ].join(" ")}
        href={cast}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Warpcast"
        title="Share on Warpcast"
        onClick={() => onShare?.("warpcast")}
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
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors shrink-0",
        ].join(" ")}
        href={tweet}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        title="Share on X"
        onClick={() => onShare?.("x")}
      >
        <span className="hidden sm:inline">Share on X</span>
        <span className="sm:hidden">X</span>
        <ExternalLink className="h-4 w-4 opacity-80" aria-hidden />
      </a>

      {/* Native share (guarded by mount to avoid SSR mismatch) */}
      {mounted && canWebShare && (
        <button
          type="button"
          onClick={onWebShare}
          className={[
            "inline-flex items-center gap-1 rounded-xl border border-white/15",
            pad,
            text,
            "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors shrink-0",
          ].join(" ")}
          aria-label="Share via device"
          title="Share via device"
        >
          Share
          <Share2 className="h-4 w-4 opacity-80" aria-hidden />
        </button>
      )}

      {/* Copy link (stable width so label change doesn't shift layout) */}
      <button
        type="button"
        onClick={onCopy}
        className={[
          "inline-flex items-center justify-center gap-1 rounded-xl border border-pink-500/40",
          pad,
          text,
          "hover:bg-pink-500/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-colors shrink-0",
          "min-w-[7.25rem]", // keeps width stable between “Copy link” and “Copied!”
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
    </div>
  );
}
