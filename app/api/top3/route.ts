// /app/api/top3/route.ts
import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const ids = (await kv.get<number[]>('creator:top3')) ?? []
    return NextResponse.json({ ids })
  } catch {
    return NextResponse.json({ ids: [] })
  }
}
