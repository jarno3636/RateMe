// app/api/creator/get/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = (url.searchParams.get('id') || '').trim().toLowerCase()
  if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 })

  const data = await kv.hgetall<Record<string, unknown>>(`creator:${id}`)
  return NextResponse.json(
    { ok: true, id, data },
    { headers: { 'cache-control': 'no-store' } },
  )
}
