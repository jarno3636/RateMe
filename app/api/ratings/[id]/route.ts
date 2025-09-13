// app/api/ratings/[id]/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  putRating,
  getRatingSummary,
  getRecentRatings,
  type Rating,
  getCreator,
  getCreatorByHandle,
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

// -------- edge-safe helpers --------

// ArrayBuffer -> hex
function toHex(ab: ArrayBuffer) {
  return Array.from(new Uint8Array(ab))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const BodySchema = z.object({
  score: z.number().or(z.string()).transform((v) => Number(v)).refine((n) => Number.isFinite(n), 'score must be a number'),
  comment: z.string().optional(),
  raterFid: z.number().int().positive().optional(),
  raterKey: z.string().min(1).optional(),
})

const MAX_COMMENT_LEN = 500
const MAX_LIMIT = 50

function sanitizeComment(input?: string) {
  if (!input) return undefined
  // remove zero-width chars, collapse inner whitespace, trim
  const cleaned = input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length ? cleaned.slice(0, MAX_COMMENT_LEN) : undefined
}

async function deriveAnonKey(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || ''
  const ua = req.headers.get('user-agent') || ''
  const data = new TextEncoder().encode(`${ip}|${ua}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return `anon:${toHex(hash).slice(0, 16)}`
}

async function rateLimitKey(creatorId: string, req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return `rl:ratings:${creatorId}:${ip}`
}

// ---------------------------------- GET ----------------------------------
/**
 * GET /api/ratings/[id]?limit=10
 * Returns { ok, summary: {count,sum,avg}, recent: Rating[] }
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const creatorIdRaw = String(params.id || '').trim().toLowerCase()
  if (!creatorIdRaw) return json({ ok: false, error: 'missing id' }, { status: 400 })

  const url = new URL(req.url)
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, limitParam ? Number(limitParam) || 10 : 10)
  )

  // If you want to ensure the creator exists, uncomment:
  // const creator = (await getCreator(creatorIdRaw)) || (await getCreatorByHandle(creatorIdRaw))
  // if (!creator) return json({ ok: false, error: 'creator not found' }, { status: 404 })

  const [summary, recent] = await Promise.all([
    getRatingSummary(creatorIdRaw),
    getRecentRatings(creatorIdRaw, limit),
  ])

  return json({ summary, recent })
}

// ---------------------------------- POST ---------------------------------
/**
 * POST /api/ratings/[id]
 * Body: { score: number (1..5), comment?: string, raterFid?: number, raterKey?: string }
 * raterKey helps prevent duplicate ratings per rater (e.g., fid or wallet).
 * Returns { ok, summary, recent }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const creatorId = String(params.id || '').trim().toLowerCase()
  if (!creatorId) return json({ ok: false, error: 'missing id' }, { status: 400 })

  // Optional: ensure creator exists to avoid orphan ratings
  const creator = (await getCreator(creatorId)) || (await getCreatorByHandle(creatorId))
  if (!creator) return json({ ok: false, error: 'creator not found' }, { status: 404 })

  let parsed: z.infer<typeof BodySchema>
  try {
    const raw = await req.json()
    parsed = BodySchema.parse(raw)
  } catch (e: any) {
    const msg = e?.issues?.[0]?.message || e?.message || 'Invalid JSON'
    return json({ ok: false, error: msg }, { status: 400 })
  }

  // clamp/round score
  const score = Math.max(1, Math.min(5, Math.round(parsed.score)))
  const comment = sanitizeComment(parsed.comment)

  // Stable dedupe priority: explicit raterKey > raterFid > anon
  let raterKey: string | undefined = parsed.raterKey?.trim()
  if (!raterKey && typeof parsed.raterFid === 'number') raterKey = `fid:${parsed.raterFid}`
  if (!raterKey) raterKey = await deriveAnonKey(req)

  // light rate-limit (per-IP per creator): 5 ratings / minute
  try {
    const key = await rateLimitKey(creatorId, req)
    const cur = await kv.incr(key)
    if (cur === 1) await kv.expire(key, 60)
    if (cur > 5) return json({ ok: false, error: 'rate_limited' }, { status: 429 })
  } catch {
    // ignore RL errors
  }

  const r: Rating = {
    creatorId,
    raterFid:
      typeof parsed.raterFid === 'number'
        ? parsed.raterFid
        : undefined,
    score,
    comment,
    createdAt: Date.now(),
  }

  const wrote = await putRating(r, raterKey!)
  if (!wrote) {
    // return ok=false with reason=duplicate (soft fail for UX)
    return json({ ok: false, reason: 'duplicate' })
  }

  const [summary, recent] = await Promise.all([
    getRatingSummary(creatorId),
    getRecentRatings(creatorId, 10),
  ])

  return json({ ok: true, summary, recent })
}
