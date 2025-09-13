// app/api/og/creator/route.tsx
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import {
  getCreator as _getCreator,
  getCreatorByHandle as _getCreatorByHandle,
  getRatingSummary as _getRatingSummary,
} from '@/lib/kv'

export const runtime = 'edge'

// ---- Canvas size (change if you want a different OG size) ----
const WIDTH = 1200
const HEIGHT = 630

// Prefer your own gateway if you have one (e.g., https://gateway.pinata.cloud/ipfs/)
const IPFS_HTTP_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY?.replace(/\/$/, '') || 'https://ipfs.io/ipfs'

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function normalizeId(s: string) {
  return String(s || '').trim().replace(/^@+/, '').toLowerCase()
}

function withVersion(url?: string | null, v?: number | null) {
  if (!url) return url ?? undefined
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${Number.isFinite(Number(v)) ? Number(v) : Date.now()}`
}

function ipfsToHttp(u?: string | null) {
  if (!u) return undefined
  if (u.startsWith('ipfs://')) {
    const cid = u.replace('ipfs://', '')
    return `${IPFS_HTTP_GATEWAY}/${cid}`
  }
  return u
}

function safeHttpUrl(u?: string | null) {
  if (!u) return undefined
  try {
    const url = new URL(u)
    if (url.protocol === 'http:' || url.protocol === 'https:') return u
    return undefined
  } catch {
    return undefined
  }
}

async function getCreator(idOrHandle: string) {
  const id = normalizeId(idOrHandle)
  const byId = await _getCreator(id)
  if (byId) return byId
  const byHandle = await _getCreatorByHandle(id)
  if (byHandle) return byHandle
  return {
    id,
    handle: id,
    address: null,
    displayName: id,
    avatarUrl: undefined as string | undefined,
    bio: undefined as string | undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function letterAvatar(letter: string) {
  const ch = (letter || 'U').slice(0, 1).toUpperCase()
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
        color: 'white',
        fontSize: 120,
        fontWeight: 800,
      }}
    >
      {ch}
    </div>
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || searchParams.get('handle') || ''
  const site = siteUrl()
  const hostname = new URL(site).hostname

  const c = await getCreator(id)
  const title = c.displayName || c.handle || 'Creator'
  const handle = c.handle?.startsWith('@') ? c.handle : `@${c.handle || 'unknown'}`

  // avatar handling: ipfs->http, add ?v=updatedAt, ensure http(s)
  const avatarProcessed =
    safeHttpUrl(withVersion(ipfsToHttp(c.avatarUrl), (c as any)?.updatedAt)) ||
    undefined

  // rating summary (best-effort; don’t block OG if missing)
  let ratingPill: string | null = null
  try {
    const sum = await _getRatingSummary(c.id)
    if (sum?.count && sum.count > 0) {
      const avg = (sum.avg || 0).toFixed(2)
      ratingPill = `★ ${avg} • ${sum.count} rating${sum.count === 1 ? '' : 's'}`
    }
  } catch {
    // ignore rating failures for OG
  }

  const avatarNode = avatarProcessed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="avatar"
      src={avatarProcessed}
      width={240}
      height={240}
      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
    />
  ) : (
    letterAvatar((handle.replace(/^@/, '') || 'U')[0] || 'U')
  )

  const bioShort = c.bio ? String(c.bio) : ''
  const bioDisplay =
    bioShort.length > 0
      ? `${bioShort.slice(0, 150)}${bioShort.length > 150 ? '…' : ''}`
      : 'Creator on Base — subscriptions, paid posts & ratings.'

  return new ImageResponse(
    (
      <div
        style={{
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: 'flex',
          background: 'linear-gradient(135deg,#0b1220 0%,#0f172a 50%,#0b1220 100%)',
          color: '#e5e7eb',
          padding: '48px',
          position: 'relative',
          fontFamily: 'system-ui, ui-sans-serif, Segoe UI, Roboto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            fontSize: 28,
            color: '#67e8f9',
            letterSpacing: 0.25,
          }}
        >
          Rate Me
        </div>

        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {avatarNode}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 40, gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 36, color: '#93c5fd' }}>{handle}</div>
            {ratingPill ? (
              <div
                style={{
                  fontSize: 24,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(253, 224, 71, 0.12)',
                  border: '1px solid rgba(253, 224, 71, 0.45)',
                  color: '#fde047',
                }}
              >
                {ratingPill}
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 28,
              maxWidth: 760,
              color: 'rgba(229,231,235,0.9)',
              lineHeight: 1.25,
              whiteSpace: 'pre-wrap',
            }}
          >
            {bioDisplay}
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 18, alignItems: 'center' }}>
            <div
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(103, 232, 249, 0.12)',
                border: '1px solid rgba(103, 232, 249, 0.5)',
                color: '#67e8f9',
                fontSize: 24,
              }}
            >
              {hostname}
            </div>
            <div style={{ fontSize: 22, color: 'rgba(229,231,235,0.6)' }}>Built on Base</div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      // headers here (route export headers are ignored by og responses)
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=60, max-age=60, stale-while-revalidate=30',
      },
    }
  )
}
