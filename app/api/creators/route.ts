// app/api/creators/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { listCreatorsPage, getRatingSummary } from '@/lib/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/** ---------- utils ---------- */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
} as const

function withCors(init?: ResponseInit) {
  return {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...CORS_HEADERS,
    },
  }
}

const Query = z.object({
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(50).optional()),
  cursor: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(0).optional()),
  include: z.enum(['rating']).optional(), // extendable later (e.g., 'onchain')
})

/** ---------- handlers ---------- */
export async function OPTIONS() {
  return new NextResponse(null, withCors({ status: 204 }))
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const parsed = Query.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      include: url.searchParams.get('include') ?? undefined,
    })

    // defaults if query invalid
    const limit = parsed.success ? parsed.data.limit ?? 12 : 12
    const cursor = parsed.success ? parsed.data.cursor ?? 0 : 0
    const include = parsed.success ? parsed.data.include : undefined

    const { creators, nextCursor } = await listCreatorsPage({ limit, cursor })

    // Optional enrichment: rating summary per creator (count, sum, avg)
    let enriched = creators
    if (include === 'rating' && creators.length) {
      const summaries = await Promise.all(
        creators.map(c => getRatingSummary(c.id).catch(() => ({ count: 0, sum: 0, avg: 0 })))
      )
      enriched = creators.map((c, i) => ({ ...c, rating: summaries[i] }))
    }

    return NextResponse.json(
      { creators: enriched, nextCursor },
      withCors({
        // cache lightly at the edge, but never client-cache
        headers: {
          'Cache-Control': 's-maxage=15, stale-while-revalidate=60',
        },
      })
    )
  } catch (err) {
    console.error('listCreatorsPage failed:', err)
    return NextResponse.json(
      { creators: [] as any[], nextCursor: null },
      withCors({
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      })
    )
  }
}
