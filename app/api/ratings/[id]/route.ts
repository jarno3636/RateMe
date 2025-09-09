// app/api/ratings/[id]/route.ts
import { NextResponse } from 'next/server'
import {
  putRating,
  getRatingSummary,
  getRecentRatings,
  type Rating,
} from '@/lib/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

// Edge-safe: ArrayBuffer -> hex
function toHex(ab: ArrayBuffer) {
  return Array.from(new Uint8Array(ab))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * GET /api/ratings/[id]
 * Returns { summary: {count,sum,avg}, recent: Rating[] }
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const creatorId = String(params.id || '').toLowerCase()
  if (!creatorId) return json({ error: 'missing id' }, { status: 400 })

  const [summary, recent] = await Promise.all([
    getRatingSummary(creatorId),
    getRecentRatings(creatorId, 10),
  ])

  return json({ summary, recent })
}

/**
 * POST /api/ratings/[id]
 * Body: { score: number (1..5), comment?: string, raterFid?: number, raterKey?: string }
 * raterKey helps prevent duplicate ratings per rater (e.g. fid or wallet).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const creatorId = String(params.id || '').toLowerCase()
  if (!creatorId) return json({ error: 'missing id' }, { status: 400 })

  // Forgiving JSON parse
  let body: any = null
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const score = Number(body?.score)
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return json({ error: 'Invalid score (1..5)' }, { status: 400 })
  }

  // Prefer explicit raterKey, else FID; else derive anon hash from IP+UA (privacy-safe, best-effort)
  let raterKey =
    typeof body?.raterKey === 'string' && body.raterKey.trim().length > 0
      ? body.raterKey.trim()
      : typeof body?.raterFid === 'number'
      ? `fid:${body.raterFid}`
      : ''

  if (!raterKey) {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || ''
    const ua = req.headers.get('user-agent') || ''
    const data = new TextEncoder().encode(`${ip}|${ua}`)
    const hash = await crypto.subtle.digest('SHA-256', data)
    raterKey = `anon:${toHex(hash).slice(0, 16)}`
  }

  const comment =
    typeof body?.comment === 'string'
      ? body.comment.trim().slice(0, 500)
      : undefined

  const r: Rating = {
    creatorId,
    raterFid:
      typeof body?.raterFid === 'number'
        ? body.raterFid
        : body?.raterFid
        ? Number(body.raterFid)
        : undefined,
    score: Math.round(score),
    comment,
    createdAt: Date.now(),
  }

  const wrote = await putRating(r, raterKey)
  if (!wrote) {
    // 200 with reason keeps UX simple without surfacing a hard error
    return json({ ok: false, reason: 'duplicate' })
  }

  const summary = await getRatingSummary(creatorId)
  return json({ ok: true, summary })
}
