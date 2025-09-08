// app/api/creators/route.ts
import { NextResponse } from 'next/server'
import { listCreators } from '@/lib/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const creators = await listCreators(12)
    return NextResponse.json({ creators }, { headers: { 'cache-control': 'no-store' } })
  } catch (err) {
    console.error('listCreators failed:', err)
    // Never bubble 500 to the UI — return an empty list instead
    return NextResponse.json({ creators: [] }, { status: 200 })
  }
}
