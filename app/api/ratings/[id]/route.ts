// app/api/ratings/[id]/route.ts
import { NextResponse } from 'next/server'
import { store } from '@/lib/kv'

export const runtime = 'edge'

const KEY = (id: string) => `rate:${id}`

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = (params.id || '').toLowerCase()
  const raw = await store.lrange(KEY(id), 0, 49) // latest 50
  const items = raw.map((x) => {
    try { return JSON.parse(x) } catch { return null }
  }).filter(Boolean) as Array<{ score: number; comment?: string; at: number }>

  const count = items.length
  const avg = count ? items.reduce((a, b) => a + b.score, 0) / count : 0
  return NextResponse.json({
    id,
    count,
    avg: Number(avg.toFixed(2)),
    items,
  }, { headers: { 'cache-control': 'no-store' } })
}
