// lib/farcaster.ts
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const MINIAPP_DOMAIN = (() => { try { return new URL(SITE).hostname } catch { return 'localhost' } })()

export const fcMiniApp = {
  version: '1',
  imageUrl: `${SITE}/miniapp-card.png`,
  button: {
    title: 'Rate Me',
    action: {
      type: 'launch_frame',
      name: 'Rate Me',
      url: `${SITE}/mini`,
      splashImageUrl: `${SITE}/icon-192.png`,
      splashBackgroundColor: '#0b1220',
    },
  },
}

/** Build a Warpcast cast intent URL with prefilled text and optional link preview */
export function warpcastShare({ text, url }: { text: string; url?: string }) {
  const params = new URLSearchParams()
  params.set('text', text)
  if (url) params.set('embeds[]', url)
  return `https://warpcast.com/~/compose?${params.toString()}`
}

/** Build an X/Twitter intent link */
export function twitterShare({ text, url }: { text: string; url?: string }) {
  const params = new URLSearchParams()
  params.set('text', text)
  if (url) params.set('url', url)
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

/** Convenience: links to share a creator page */
export function creatorShareLinks(handleOrId: string, title?: string) {
  const url = `${SITE}/creator/${encodeURIComponent(handleOrId)}`
  const text = title || `Check out @${handleOrId} on Rate Me`
  return {
    cast: warpcastShare({ text, url }),
    tweet: twitterShare({ text, url }),
    url,
  }
}

export { SITE }
