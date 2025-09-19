// /lib/farcaster.ts
/**
 * Farcaster helpers (Frames + share links) — client & server safe.
 * - Normalizes SITE from NEXT_PUBLIC_SITE_URL (forces https, strips trailing slash)
 * - Builds Warpcast/X share links
 * - Miniapp manifest export
 * - Tiny helpers to generate Frame meta tags (for Next.js routes/pages)
 */

const RAW_SITE =
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim()

/** Normalize to https + no trailing slash so all downstream URLs are stable */
export const SITE = (() => {
  try {
    const u = new URL(RAW_SITE)
    // Force https for social/frames previews
    if (u.protocol === "http:") u.protocol = "https:"
    // Remove trailing slash
    u.pathname = u.pathname.replace(/\/+$/, "")
    return u.toString().replace(/\/+$/, "")
  } catch {
    // Very defensive fallback
    return "https://localhost:3000"
  }
})()

/** Hostname used by Warpcast’s allowlist for Frames/Miniapps */
export const MINIAPP_DOMAIN = (() => {
  try {
    return new URL(SITE).hostname
  } catch {
    return "localhost"
  }
})()

/* ───────────────────────────── Miniapp Manifest ─────────────────────────────
   You can expose this at /api/fc/manifest (or similar) by returning the object
   below as JSON. Warpcast expects at least: version, imageUrl, button → action.
----------------------------------------------------------------------------- */
export const fcMiniApp = {
  version: "1",
  imageUrl: `${SITE}/miniapp-card.png`,
  button: {
    title: "Rate Me",
    action: {
      type: "launch_frame",
      name: "Rate Me",
      url: `${SITE}/mini`,
      splashImageUrl: `${SITE}/icon-192.png`,
      splashBackgroundColor: "#0b1220",
    },
  },
} as const

/* ───────────────────────────── Share Intents ───────────────────────────── */

type ShareParams = {
  text: string
  url?: string
  /** Warpcast channel key (e.g., "onlystars"); must be [a-z0-9-]+ */
  channelId?: string
}

/** Build a Warpcast compose URL with optional embed + channel */
export function warpcastShare({ text, url, channelId }: ShareParams) {
  const params = new URLSearchParams()
  params.set("text", text)
  if (url) params.append("embeds[]", url)
  if (channelId && /^[a-z0-9-]+$/.test(channelId)) {
    params.set("channelKey", channelId)
  }
  return `https://warpcast.com/~/compose?${params.toString()}`
}

/** Build an X/Twitter intent URL */
export function twitterShare({ text, url }: { text: string; url?: string }) {
  const params = new URLSearchParams()
  params.set("text", text)
  if (url) params.set("url", url)
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

/** Public creator page URL helper (accepts handle or numeric id) */
export function creatorUrl(handleOrId: string | number) {
  return `${SITE}/creator/${encodeURIComponent(String(handleOrId))}`
}

/** Convenience bundle of share links for a creator profile */
export function creatorShareLinks(handleOrId: string | number, title?: string) {
  const url = creatorUrl(handleOrId)
  const handle = String(handleOrId)
  const text = title || `Check out @${handle} on OnlyStars`
  return {
    cast: warpcastShare({ text, url }),
    tweet: twitterShare({ text, url }),
    url,
    previewImage: `${SITE}/miniapp-card.png`,
  }
}

/* ───────────────────────────── Frames Helpers ─────────────────────────────
   Use these in a Next.js route (app/mini/route.ts or app/mini/page.tsx) to
   quickly emit the correct <meta> tags for a Farcaster Frame.
----------------------------------------------------------------------------- */

export type FrameButton =
  | { label: string; action?: "post" | "post_redirect"; target?: string }
  | { label: string; action: "tx"; target: string } // advanced: transactions
  | { label: string; action: "mint"; target: string } // advanced: minting

export type FrameOptions = {
  /** Absolute image URL used for the frame card (1200x630 recommended) */
  image: string
  /** Optional post URL (where the frame will POST back) */
  postUrl?: string
  /** Up to 4 buttons */
  buttons?: FrameButton[]
  /** OG tags (fallbacks set automatically) */
  og?: { title?: string; description?: string }
}

/**
 * Returns a flat Record of meta name/content pairs for Farcaster Frames + OG.
 * You can spread this into Next.js <Head> manually or transform to JSX.
 */
export function buildFrameMeta(opts: FrameOptions): Record<string, string> {
  const { image, postUrl, buttons = [], og } = opts
  const meta: Record<string, string> = {
    "og:title": og?.title || "OnlyStars",
    "og:description": og?.description || "Creator monetization on Base",
    "og:image": image,
    "fc:frame": "vNext",
    "fc:frame:image": image,
  }

  if (postUrl) meta["fc:frame:post_url"] = postUrl

  // Buttons (1..4)
  buttons.slice(0, 4).forEach((btn, idx) => {
    const i = idx + 1
    meta[`fc:frame:button:${i}`] = btn.label
    if ("action" in btn && btn.action) {
      meta[`fc:frame:button:${i}:action`] = btn.action
    }
    if ("target" in btn && btn.target) {
      meta[`fc:frame:button:${i}:target`] = btn.target
    }
  })

  return meta
}

/**
 * Small utility to transform the record from buildFrameMeta into HTML meta tags.
 * Handy for route handlers that return text/html.
 */
export function renderFrameMetaHtml(meta: Record<string, string>) {
  const tags = Object.entries(meta)
    .map(([name, content]) => `<meta property="${escapeHtml(name)}" content="${escapeHtml(content)}">`)
    .join("\n")
  return [
    "<!doctype html>",
    "<html><head>",
    tags,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    "</head><body></body></html>",
  ].join("")
}

/** Escape helper for very small HTML outputs */
function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

/* ───────────────────────────── Detection Utils ───────────────────────────── */

/** Quick user-agent check (best-effort) */
export function isWarpcastUserAgent(ua?: string) {
  const v = ua || (typeof navigator !== "undefined" ? navigator.userAgent : "")
  return /warpcast/i.test(v)
}
