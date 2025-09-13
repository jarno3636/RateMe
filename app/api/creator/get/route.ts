// app/api/creator/get/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const id = (url.searchParams.get('id') || '').trim().toLowerCase()
    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'missing id' },
        { status: 400 },
      )
    }

    const data = await kv.hgetall<Record<string, unknown>>(`creator:${id}`)

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'creator not found' },
        { status: 404 },
      )
    }

    // Normalize + coerce types
    const creator = {
      id,
      handle: (data.handle as string) || id,
      displayName: (data.displayName as string) || (data.handle as string) || id,
      avatarUrl: (data.avatarUrl as string) || null,
      bio: (data.bio as string) || '',
      address: (data.address as string) || null,
      fid: data.fid ? Number(data.fid) : null,
      createdAt: data.createdAt ? Number(data.createdAt) : null,
      updatedAt: data.updatedAt ? Number(data.updatedAt) : Date.now(),
    }

    return NextResponse.json(
      { ok: true, creator },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'server error' },
      { status: 500 },
    )
  }
}
