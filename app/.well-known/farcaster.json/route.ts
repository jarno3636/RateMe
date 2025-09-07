// app/.well-known/farcaster.json/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Public env you can set in Vercel:
 * - NEXT_PUBLIC_SITE_URL              e.g. https://rateme-mini.vercel.app
 * - NEXT_PUBLIC_APP_NAME              e.g. Rate Me
 * - NEXT_PUBLIC_APP_ICON              e.g. /icon-192.png
 * - NEXT_PUBLIC_APP_DESCRIPTION       e.g. "Creator subscriptions, paid posts, and ratings on Base."
 * - NEXT_PUBLIC_FARCASTER_CONTACT     e.g. your email or website contact page
 * - NEXT_PUBLIC_FARCASTER_REDIRECTS   e.g. comma-separated URLs you may use for OAuth or deep links (optional)
 * - NEXT_PUBLIC_FARCASTER_PRIVACY_URL e.g. /privacy
 * - NEXT_PUBLIC_FARCASTER_TERMS_URL   e.g. /terms
 *
 * Optional custody/owner fields — leave blank if not using:
 * - FARCASTER_OWNER_FID               e.g. 12345 (number)
 */

export async function GET() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const name = process.env.NEXT_PUBLIC_APP_NAME || 'Rate Me'
  const description =
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'Creator subscriptions, paid posts, and ratings on Base.'
  const iconUrl = `${site}${process.env.NEXT_PUBLIC_APP_ICON || '/icon-192.png'}`
  const contact = process.env.NEXT_PUBLIC_FARCASTER_CONTACT || 'contact@example.com'
  const privacyUrl = `${site}${process.env.NEXT_PUBLIC_FARCASTER_PRIVACY_URL || '/privacy'}`
  const termsUrl = `${site}${process.env.NEXT_PUBLIC_FARCASTER_TERMS_URL || '/terms'}`
  const redirects = (process.env.NEXT_PUBLIC_FARCASTER_REDIRECTS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Minimal, widely-compatible Farcaster app manifest
  const manifest = {
    name,
    iconUrl,
    description,
    websiteUrl: site,
    contact: { email: contact },
    privacyPolicyUrl: privacyUrl,
    termsOfServiceUrl: termsUrl,
    redirectUris: redirects.length ? redirects : [site, `${site}/mini`, `${site}/creator`],

    // Helpful hints for frames/miniapp hosts (purely informational for clients)
    frames: {
      homeUrl: `${site}`,
      postUrl: `${site}/api/frame`,
      imageUrl: `${site}/miniapp-card.png`,
      buttons: ['Open Rate Me', 'Top Creators', 'How it Works'],
    },
    miniApp: {
      domain: (() => {
        try { return new URL(site).hostname } catch { return 'localhost' }
      })(),
      url: `${site}/mini`,
      splashImageUrl: `${site}/icon-192.png`,
      splashBackgroundColor: '#0b1220',
    },

    // Optional: set an owner FID if you want (not required)
    owner: (() => {
      const fid = process.env.FARCASTER_OWNER_FID
      return fid ? { fid: Number(fid) } : undefined
    })(),
  }

  return NextResponse.json(manifest, { headers: { 'Cache-Control': 'public, max-age=3600' } })
}
