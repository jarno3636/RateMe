// app/api/ratings/[id]/route.ts
import { NextResponse } from 'next/server'
import {
  putRating,
  getRatingSummary,
  getRecentRatings,
  type Rating,
} from '@/lib/kv'

export const runtime = 'edge'

/**
 * GET /api/ratings/[id]
 * Returns { summary: {count,sum,avg}, recent: Rating[] }
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const creatorId = params.id.toLowerCase()
  const summary = await getRatingSummary(creatorId)
  const recent = await getRecentRatings(creatorId, 10)
  return NextResponse.json({ summary, recent })
}

/**
 * POST /api/ratings/[id]
 * Body: { score: number (1..5), comment?: string, raterFid?: number, raterKey?: string }
 * raterKey is used to prevent duplicate ratings per rater (e.g. fid or address)
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const creatorId = params.id.toLowerCase()
  const body = await req.json().catch(() => null)

  if (
    !body ||
    typeof body.score !== 'number' ||
    body.score < 1 ||
    body.score > 5
  ) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }

  const raterKey =
    typeof body.raterKey === 'string' && body.raterKey.length > 0
      ? body.raterKey
      : body.raterFid
      ? `fid:${body.raterFid}`
      : 'anonymous'

  const rating: Rating = {
    creatorId,
    raterFid: typeof body.raterFid === 'number' ? body.raterFid : undefined,
    score: Math.round(body.score),
    comment:
      typeof body.comment === 'string' && body.comment.length
        ? body.comment.slice(0, 500)
        : undefined,
    createdAt: Date.now(),
  }

  const wrote = await putRating(rating, raterKey)
  if (!wrote) {
    return NextResponse.json(
      { ok: false, reason: 'duplicate' },
      { status: 200 }
    )
  }

  const summary = await getRatingSummary(creatorId)
  return NextResponse.json({ ok: true, summary })
}
