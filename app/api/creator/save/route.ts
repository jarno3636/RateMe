// app/api/creator/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { ensureCreator, setCreatorAddress } from '@/lib/kv'

export const runtime = 'nodejs'

type PatchBody = Partial<{
  id: string             // id or handle (any form)
  handle: string         // optional, normalized inside ensureCreator
  displayName: string
  avatarUrl: string
  bio: string
  address: `0x${string}` | null
  fid: number
}>

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

const MAX_BIO_WORDS = 250
function tooLongBio(bio?: string) {
  if (!bio) return false
  const words = bio.trim().split(/\s+/).filter(Boolean)
  return words.length > MAX_BIO_WORDS
}
function isLikelyUrl(u?: string | null) {
  if (!u) return false
  const v = String(u).trim()
  return /^https?:\/\//i.test(v) || /^ipfs:\/\//i.test(v)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PatchBody
    const source = (body.id || body.handle || '').trim()
    if (!source) return json({ ok: false, error: 'Missing id or handle' }, { status: 400 })

    // 1) Ensure creator exists & get canonical id + record (migrates legacy keys)
    const { id, creator } = await ensureCreator(source)

    // 2) Validate patch fields
    const patch: Record<string, unknown> = {}

    if (typeof body.displayName === 'string' && body.displayName.trim()) {
      patch.displayName = body.displayName.trim().slice(0, 64)
    }

    if (typeof body.avatarUrl === 'string') {
      const a = body.avatarUrl.trim()
      if (a && !isLikelyUrl(a)) {
        return json({ ok: false, error: 'Avatar URL must be http(s) or ipfs' }, { status: 400 })
      }
      if (a.length > 1024) {
        return json({ ok: false, error: 'Avatar URL too long' }, { status: 400 })
      }
      patch.avatarUrl = a
    }

    if (typeof body.bio === 'string') {
      if (tooLongBio(body.bio)) {
        return json({ ok: false, error: `Bio must be ${MAX_BIO_WORDS} words or less` }, { status: 400 })
      }
      patch.bio = body.bio
    }

    if (typeof body.fid === 'number' && Number.isFinite(body.fid)) {
      patch.fid = Math.max(0, Math.floor(body.fid))
    }

    // 3) Optional: address update keeps owner index in sync
    if (typeof body.address !== 'undefined') {
      await setCreatorAddress(id, body.address as `0x${string}` | null)
    }

    // If nothing else to change, we’re done (address might have been updated)
    if (Object.keys(patch).length) {
      patch.updatedAt = Date.now()
      // kv.hset is inside ensureCreator’s normalized keyspace, so we can write directly
      const { kv } = await import('@vercel/kv')
      await kv.hset(`creator:${id}`, patch)
    }

    // 4) Revalidate canonical paths (by id and by handle)
    revalidatePath(`/creator/${id}`)
    const nextHandle = (patch.displayName ? creator.handle : creator.handle) || creator.handle
    if (nextHandle) revalidatePath(`/creator/${nextHandle.toLowerCase()}`)

    return json({ ok: true })
  } catch (e: any) {
    return json({ ok: false, error: e?.message || 'Save failed' }, { status: 500 })
  }
}
