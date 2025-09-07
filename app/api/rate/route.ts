// app/api/rate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { store, ipHash } from '@/lib/kv'

export const runtime = 'edge'

type Payload = {
  creatorId: string
  score: number
  comment?: string
}

const KEY = (id: string) => `rate:${id}`

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload
    const creatorId = (body.creatorId || '').trim().toLowerCase().replace(/^@/, '')
    const score = Number(body.score)

    if (!creatorId || !(score >= 1 && score <= 5)) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    const ua = req.headers.get('user-agent') || ''
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const voter = ipHash(ip) // anonymized

    // Light dedupe: remember last cookie for 24h
    const cookieName = `v_${creatorId}`
    const already = req.cookies.get(cookieName)?.value
    if (already === voter) {
      return NextResponse.json({ ok: false, error: 'Already rated recently' }, { status: 429 })
    }

    const record = {
      score,
      comment: (body.comment || '').slice(0, 280),
      at: Date.now(),
      voter, // anonymized
      ua,
    }

    await store.lpush(KEY(creatorId), JSON.stringify(record))

    const res = NextResponse.json({ ok: true })
    // Cookie TTL ~ 1 day
    res.cookies.set(cookieName, voter, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24, path: '/' })
    return res
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
