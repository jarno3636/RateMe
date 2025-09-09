// app/api/og/creator/route.tsx
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import {
  getCreator as _getCreator,
  getCreatorByHandle as _getCreatorByHandle,
} from '@/lib/kv'

export const runtime = 'edge'
export const alt = 'Rate Me — Creator'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function normalizeId(s: string) {
  return String(s || '').trim().replace(/^@/, '').toLowerCase()
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
    avatarUrl: undefined,
    bio: undefined,
    createdAt: Date.now(),
  }
}

/** Fallback avatar: gradient with first letter */
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

  // avatar node (inline <img> supported by next/og)
  const hasAvatar = !!c.avatarUrl
  const avatarNode = hasAvatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="avatar"
      src={c.avatarUrl!}
      width={240}
      height={240}
      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
    />
  ) : (
    letterAvatar((handle.replace(/^@/, '') || 'U')[0] || 'U')
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg,#0b1220 0%,#0f172a 50%,#0b1220 100%)',
          color: '#e5e7eb',
          padding: '48px',
          position: 'relative',
          fontFamily: 'system-ui, ui-sans-serif, Segoe UI, Roboto',
        }}
      >
        {/* Logo badge */}
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

        {/* Left: Avatar */}
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

        {/* Right: Text */}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 40, gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
          <div style={{ fontSize: 36, color: '#93c5fd' }}>{handle}</div>

          {c.bio ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 28,
                maxWidth: 760,
                color: 'rgba(229,231,235,0.9)',
                lineHeight: 1.25,
              }}
            >
              {String(c.bio).slice(0, 150)}
              {String(c.bio).length > 150 ? '…' : ''}
            </div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 28, color: 'rgba(229,231,235,0.6)' }}>
              Creator on Base — subscriptions, paid posts & ratings.
            </div>
          )}

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
      ...size,
      headers: {
        // refresh avatars fairly often
        'Cache-Control': 'public, s-maxage=60, max-age=60, stale-while-revalidate=30',
      },
    }
  )
}
