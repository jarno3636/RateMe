// app/api/creators/route.ts
import { NextResponse } from 'next/server'
import { listCreatorsPage } from '@/lib/kv'
import { z } from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const Query = z.object({
  limit: z.string().optional().transform(v => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(1).max(50).optional()),
  cursor: z.string().optional().transform(v => (v ? Number(v) : undefined))
    .pipe(z.number().int().min(0).optional()),
})

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const parsed = Query.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    })

    const limit = parsed.success ? (parsed.data.limit ?? 12) : 12
    const cursor = parsed.success ? (parsed.data.cursor ?? 0) : 0

    const { creators, nextCursor } = await listCreatorsPage({ limit, cursor })

    return NextResponse.json(
      { creators, nextCursor },
      { headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' } }
    )
  } catch (err) {
    console.error('listCreatorsPage failed:', err)
    return NextResponse.json(
      { creators: [] as any[], nextCursor: null },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
