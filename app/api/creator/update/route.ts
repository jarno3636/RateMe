// app/api/creator/update/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ---------------- helpers ---------------- */

function normalize(s: string) {
  return String(s || '').trim().toLowerCase()
}
const isNumeric = (s: string) => /^\d+$/.test(s)
const MAX_BIO_WORDS = 250

function isLikelyUrl(s?: string | null) {
  if (!s) return false
  const v = String(s).trim()
  return /^https?:\/\//i.test(v) || /^ipfs:\/\//i.test(v)
}
function guessFromString(s: string) {
  const t = String(s || '').trim()
  if (!t) return {}
  if (isLikelyUrl(t)) return { avatarUrl: t }
  if (!/\s/.test(t) && t.length <= 64) return { displayName: t }
  return { bio: t }
}

/** seconds → ms if needed */
function toMs(n: number) {
  if (!Number.isFinite(n)) return Date.now()
  return n < 1e12 ? n * 1000 : n
}

/**
 * Resolve a creator ID to the canonical id stored under `creator:{id}`.
 * Accepts numeric id, handle via `handle:{handle}`, or legacy `creator:{handle}` directly.
 */
async function resolveId(idOrHandle: string): Promise<string | null> {
  const key = normalize(idOrHandle)
  if (isNumeric(key)) {
    const exists = await kv.exists(`creator:${key}`)
    return exists ? key : null
  }
  const mapped = await kv.get<string | null>(`handle:${key}`)
  if (mapped) return mapped

  const exists = await kv.exists(`creator:${key}`)
  return exists ? key : null
}

/**
 * Ensure `creator:{id}` is a HASH.
 * If a legacy plain value exists, migrate it into a normalized hash.
 */
async function ensureHashKey(creatorId: string): Promise<void> {
  const key = `creator:${creatorId}`

  const asHash = await kv.hgetall<Record<string, unknown>>(key)
  if (asHash && Object.keys(asHash).length > 0) return

  const raw = await kv.get(key)
  if (raw == null) return

  const now = Date.now()
  let patch: any = {}
  if (typeof raw === 'string') patch = guessFromString(raw)
  else if (typeof raw === 'object' && raw) patch = { ...raw }
  else return

  await kv.del(key)
  await kv.hset(key, {
    id: creatorId,
    handle: (patch.handle || creatorId)?.toString().toLowerCase(),
    displayName: patch.displayName || creatorId,
    avatarUrl: patch.avatarUrl || '',
    bio: patch.bio || '',
    address: patch.address ?? null,
    fid: Number(patch.fid || 0),
    createdAt: toMs(Number(patch.createdAt || now)),
    updatedAt: now,
  })
}

/* ---------------- route ---------------- */

export async function POST(req: Request) {
  try {
    const { id, avatarUrl, bio } = await req.json()

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Missing id' },
        { status: 400, headers: { 'cache-control': 'no-store' } }
      )
    }

    const creatorId = await resolveId(id)
    if (!creatorId) {
      return NextResponse.json(
        { ok: false, error: 'Creator not found' },
        { status: 404, headers: { 'cache-control': 'no-store' } }
      )
    }

    // Ensure we’re writing to a hash (migrates legacy scalar)
    await ensureHashKey(creatorId)

    // Validate fields
    const patch: Record<string, unknown> = {}

    if (typeof bio === 'string') {
      const words = bio.trim().split(/\s+/).filter(Boolean)
      if (words.length > MAX_BIO_WORDS) {
        return NextResponse.json(
          { ok: false, error: `Bio must be ${MAX_BIO_WORDS} words or less` },
          { status: 400, headers: { 'cache-control': 'no-store' } }
        )
      }
      patch.bio = bio
    }

    if (typeof avatarUrl === 'string') {
      if (avatarUrl && avatarUrl.length > 1024) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL too long' },
          { status: 400, headers: { 'cache-control': 'no-store' } }
        )
      }
      if (avatarUrl && !isLikelyUrl(avatarUrl)) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL must be http(s) or ipfs' },
          { status: 400, headers: { 'cache-control': 'no-store' } }
        )
      }
      patch.avatarUrl = avatarUrl
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Nothing to update' },
        { status: 400, headers: { 'cache-control': 'no-store' } }
      )
    }

    // bump updatedAt (ms)
    patch.updatedAt = Date.now()

    await kv.hset(`creator:${creatorId}`, patch)

    // read back the updated hash to return to client
    const cur = await kv.hgetall<Record<string, any>>(`creator:${creatorId}`)
    if (cur) {
      // coerce timestamps to ms (defensive)
      cur.createdAt = toMs(Number(cur.createdAt ?? Date.now()))
      cur.updatedAt = toMs(Number(cur.updatedAt ?? Date.now()))
    }

    // Revalidate both routes
    revalidatePath(`/creator/${creatorId}`)
    const handle = cur?.handle?.toLowerCase?.()
    if (handle) revalidatePath(`/creator/${handle}`)

    return NextResponse.json(
      { ok: true, creator: cur },
      { headers: { 'cache-control': 'no-store' } }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Update failed' },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    )
  }
}
