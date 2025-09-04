// app/api/gate/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'           // runs on Vercel Edge
export const dynamic = 'force-dynamic'  // never pre-render or cache

export async function GET() {
  return NextResponse.json({ ok: true, gate: 'stub' }, {
    headers: { 'cache-control': 'no-store' },
  })
}

export async function POST(req: NextRequest) {
  // Accept anything for now; echo it back
  let data: unknown = null
  try { data = await req.json() } catch { /* ignore */ }

  return NextResponse.json(
    { ok: true, gate: 'stub', received: data },
    { headers: { 'cache-control': 'no-store' } }
  )
}
