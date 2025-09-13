// app/api/rate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  putRating,
  getRatingSummary,
  getRecentRatings,
  getCreator,
  getCreatorByHandle,
  type Rating,
} from '@/lib/kv'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(
    typeof data === 'object' && data !== null && !('ok' in (data as any))
      ? { ok: true, ...(data as object) }
      : data,
    { headers: { 'cache-control': 'no-store' }, ...init }
  )
}

// ---- helpers ----

// Edge-safe: ArrayBuffer -> hex
function toHex(ab: ArrayBuffer) {
  return Array.from(new Uint8Array(ab))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function deriveAnonKey(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    ''
  const ua = req.headers.get('user-agent') || ''
  const data = new TextEncoder().encode(`${ip}|${ua}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return `anon:${toHex(hash).slice(0, 16)}`
}

const BodySchema = z.object({
  creatorId: z.string().min(1).transform((s) => s.trim().toLowerCase()),
  score: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  comment: z.string().optional(),
  raterFid: z.union([z.number().int().positive(), z.string()]).optional(),
  raterKey: z.string().min(1).optional(),
})

const MAX_COMMENT_LEN = 500

function sanitizeComment(input?: string) {
  if (!input) return undefined
  // remove zero-width chars, collapse whitespace, trim, and cap length
  const cleaned = input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned ? cleaned.slice(0, MAX_COMMENT_LEN) : undefined
}

async function rateLimitKey(creatorId: string, req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return `rl:ratings:${creatorId}:${ip}`
}

// ---- route ----

export async function POST(req: NextRequest) {
  try {
    // parse & validate
    let raw: any
    try {
      raw = await req.json()
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return json({ ok: false, error: first?.message || 'Bad request' }, { status: 400 })
    }

    const creatorId = parsed.data.creatorId
    // ensure creator exists (avoid orphan ratings)
    const creator =
      (await getCreator(creatorId)) || (await getCreatorByHandle(creatorId))
    if (!creator) return json({ ok: false, error: 'creator not found' }, { status: 404 })

    // score clamp/round
    const scoreNum = Number(parsed.data.score)
    if (!Number.isFinite(scoreNum)) {
      return json({ ok: false, error: 'score must be a number' }, { status: 400 })
    }
    const score = Math.max(1, Math.min(5, Math.round(scoreNum)))

    const comment = sanitizeComment(parsed.data.comment)

    // dedupe key priority: explicit raterKey > raterFid > anon
    let raterKey = parsed.data.raterKey?.trim()
    if (!raterKey && parsed.data.raterFid != null) {
      const fidNum =
        typeof parsed.data.raterFid === 'number'
          ? parsed.data.raterFid
          : Number(parsed.data.raterFid)
      if (Number.isFinite(fidNum) && fidNum > 0) {
        raterKey = `fid:${fidNum}`
      }
    }
    if (!raterKey) raterKey = await deriveAnonKey(req)

    // rate-limit: 5 ratings/min per IP per creator
    try {
      const key = await rateLimitKey(creatorId, req)
      const cur = await kv.incr(key)
      if (cur === 1) await kv.expire(key, 60)
      if (cur > 5) return json({ ok: false, error: 'rate_limited' }, { status: 429 })
    } catch {
      // ignore RL failures
    }

    const rating: Rating = {
      creatorId,
      raterFid:
        typeof parsed.data.raterFid === 'number'
          ? parsed.data.raterFid
          : parsed.data.raterFid != null
          ? Number(parsed.data.raterFid)
          : undefined,
      score,
      comment,
      createdAt: Date.now(),
    }

    const wrote = await putRating(rating, raterKey!)
    if (!wrote) {
      // soft duplicate: client can treat as success if desired
      return json({ ok: false, reason: 'duplicate' })
    }

    // return fresh aggregates so UI can update immediately
    const [summary, recent] = await Promise.all([
      getRatingSummary(creatorId),
      getRecentRatings(creatorId, 10),
    ])

    return json({ ok: true, summary, recent })
  } catch (e: any) {
    const msg = e?.message || 'Server error'
    return json({ ok: false, error: msg }, { status: 500 })
  }
}
