// app/.well-known/farcaster.json/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const SITE =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://rateme-mini.vercel.app').replace(/\/$/, '')

// Your provided custody/owner association (static)
const ACCOUNT_ASSOCIATION = {
  header:
    'eyJmaWQiOjExMjExOTMsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhmNTYwMzNDMTkxYjY2NTA0QWQ0Q0Y4NzMyM0E3NzNGRDg2RGM1MGFkIn0',
  payload: 'eyJkb21haW4iOiJyYXRlbWUtbWluaS52ZXJjZWwuYXBwIn0',
  signature:
    'MHg5ZGE2NmE2ZGQ4NmUyZTQ1N2I1MjZiYzQyYWE5MDQwOTk3NTYzOTczMWE0ZTgyYzAwYTE5ZDAxMjQyYmRkMzAyNDViNThlYjU0ZDg3OTdlMTY1ZjJiMzFlM2ZiYTVkZDAyNWQyZDRiMjhlOTYxMDgzNTUwMDRmMGUzNmIwODAwYjFj',
}

export async function GET() {
  const manifest = {
    accountAssociation: ACCOUNT_ASSOCIATION,
    frame: {
      version: '1',
      name: 'Example Frame',
      iconUrl: `${SITE}/icon-512.png`,
      homeUrl: SITE,
      imageUrl: `${SITE}/miniapp-card.png`,
      buttonTitle: 'Check this out',
      splashImageUrl: `${SITE}/miniapp-card.png`,
      splashBackgroundColor: '#eeccff',
      webhookUrl: `${SITE}/api/webhook`,
    },
  }

  return NextResponse.json(manifest, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
