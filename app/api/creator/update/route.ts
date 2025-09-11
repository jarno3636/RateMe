// app/api/creator/update/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

// Helpers: accept either numeric ID or handle string
function normalize(s: string) { return String(s || '').trim().toLowerCase() }
const isNumeric = (s: string) => /^\d+$/.test(s)

async function resolveId(idOrHandle: string): Promise<string | null> {
  const key = normalize(idOrHandle)
  if (isNumeric(key)) {
    // trust numeric id
    const exists = await kv.exists(`creator:${key}`)
    return exists ? key : null
  }
  // try handle -> id mapping first
  const mapped = await kv.get<string | null>(`handle:${key}`)
  if (mapped) return mapped
  // fallback: maybe the handle itself is used as id in KV for early creators
  const exists = await kv.exists(`creator:${key}`)
  return exists ? key : null
}

export async function POST(req: Request) {
  try {
    const { id, avatarUrl, bio } = await req.json()

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })
    }

    const creatorId = await resolveId(id)
    if (!creatorId) {
      return NextResponse.json({ ok: false, error: 'Creator not found' }, { status: 404 })
    }

    // Optional: 250-word limiter on server too
    const words = String(bio || '').trim().split(/\s+/).filter(Boolean)
    if (words.length > 250) {
      return NextResponse.json({ ok: false, error: 'Bio must be 250 words or less' }, { status: 400 })
    }

    // Write only provided fields
    const patch: Record<string, string> = {}
    if (typeof avatarUrl === 'string') patch.avatarUrl = avatarUrl
    if (typeof bio === 'string') patch.bio = bio

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 })
    }

    await kv.hset(`creator:${creatorId}`, patch)

    // Revalidate both numeric and handle routes just in case
    revalidatePath(`/creator/${creatorId}`)

    // If the record has a handle, revalidate that route too
    const cur = await kv.hgetall<Record<string, string>>(`creator:${creatorId}`)
    const handle = cur?.handle?.toLowerCase?.()
    if (handle) {
      revalidatePath(`/creator/${handle}`)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Update failed' }, { status: 500 })
  }
}
