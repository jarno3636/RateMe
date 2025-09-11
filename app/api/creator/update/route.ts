// app/api/creator/update/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'nodejs'

type Body = {
  id?: string            // can be a numeric id OR a handle
  handle?: string        // optional, if you have it
  avatarUrl?: string
  bio?: string
}

const norm = (s?: string | null) => (s || '').trim().toLowerCase().replace(/^@+/, '')

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const rawId = body.id || body.handle
    const key = norm(rawId)
    if (!key) {
      return NextResponse.json({ ok: false, error: 'Missing creator id/handle' }, { status: 400 })
    }

    // Try both id & handle lookups, then upsert if missing.
    // Keys used here are generic; adjust if your KV schema differs.
    // We maintain a handle->id mapping and a creator record by id/handle.
    const handle = norm(body.handle || key)

    // Mapping lookups
    const mappedId = await kv.get<string>(`handles:${handle}`)
    const creatorKey = mappedId ? `creator:${mappedId}` : `creator:${key}`

    // Fetch existing (may be null)
    const existing = (await kv.get<Record<string, any>>(creatorKey)) || null

    // Build the new record (upsert)
    const next = {
      id: existing?.id || mappedId || key,
      handle: existing?.handle || handle,
      displayName: existing?.displayName || existing?.handle || handle,
      avatarUrl: body.avatarUrl ?? existing?.avatarUrl ?? '',
      bio: body.bio ?? existing?.bio ?? '',
      fid: existing?.fid ?? 0,
      address: existing?.address ?? null,
      createdAt: existing?.createdAt ?? Date.now(),
      // keep any other fields you may be storing:
      ...existing,
    }

    // Write main record
    await kv.set(creatorKey, next)

    // Maintain handle mapping (so pages can resolve handle -> id)
    await kv.set(`handles:${next.handle}`, next.id)

    return NextResponse.json({ ok: true, creator: { id: next.id, handle: next.handle } })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to update creator' },
      { status: 500 }
    )
  }
}
