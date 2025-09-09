// app/api/rate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { putRating } from '@/lib/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

// Web Crypto: ArrayBuffer -> hex (Edge-safe; no Buffer)
function toHex(ab: ArrayBuffer) {
  return Array.from(new Uint8Array(ab))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(req: NextRequest) {
  try {
    // Be forgiving about bad JSON
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Normalize inputs
    const creatorId = String(body?.creatorId || '').trim().toLowerCase()
    const score = Number(body?.score)
    const rawComment = String(body?.comment ?? '').trim()
    const comment = rawComment.slice(0, 400) // hard cap to 400 chars
    const raterFid =
      typeof body?.raterFid === 'number'
        ? body.raterFid
        : body?.raterFid
        ? Number(body.raterFid)
        : undefined

    // Basic validation
    if (!creatorId) return json({ error: 'creatorId required' }, { status: 400 })
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return json({ error: 'score 1..5 required' }, { status: 400 })
    }

    // Best-effort dedupe key
    let raterKey = raterFid ? `fid:${raterFid}` : ''
    if (!raterKey) {
      const ip = req.headers.get('x-forwarded-for') || ''
      const ua = req.headers.get('user-agent') || ''
      const data = new TextEncoder().encode(`${ip}|${ua}`)
      const hash = await crypto.subtle.digest('SHA-256', data)
      raterKey = `anon:${toHex(hash).slice(0, 16)}`
    }

    // Persist (KV enforces first-write wins for this raterKey)
    const ok = await putRating(
      {
        creatorId,
        raterFid,
        score,
        comment,
        createdAt: Date.now(),
      },
      raterKey
    )

    if (!ok) return json({ error: 'Already rated' }, { status: 409 })
    return json({ ok: true })
  } catch (e: any) {
    const msg = e?.message || 'Server error'
    return json({ error: msg }, { status: 500 })
  }
}
