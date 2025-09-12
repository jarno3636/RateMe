// app/api/creator/update/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

// --- helpers ---
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

/**
 * Resolve a creator ID to the canonical numeric/string id we store under `creator:{id}`.
 * Accepts numeric id, handle via `handle:{handle}`, or legacy `creator:{handle}` directly.
 */
async function resolveId(idOrHandle: string): Promise<string | null> {
  const key = normalize(idOrHandle)
  if (isNumeric(key)) {
    const exists = await kv.exists(`creator:${key}`)
    return exists ? key : null
  }
  // handle map
  const mapped = await kv.get<string | null>(`handle:${key}`)
  if (mapped) return mapped

  // legacy: `creator:{handle}` was used as the id key
  const exists = await kv.exists(`creator:${key}`)
  return exists ? key : null
}

/**
 * Ensure `creator:{id}` key is a hash.
 * If a legacy plain string is found, convert it into a normalized hash.
 */
async function ensureHashKey(creatorId: string): Promise<void> {
  const key = `creator:${creatorId}`

  // If already a hash (has fields), hgetall returns object with keys
  const asHash = await kv.hgetall<Record<string, unknown>>(key)
  if (asHash && Object.keys(asHash).length > 0) return

  // Try reading as plain value
  const raw = await kv.get(key)
  if (raw == null) return

  // Build a normalized record from the old value
  const now = Date.now()
  let patch: any = {}
  if (typeof raw === 'string') patch = guessFromString(raw)
  else if (typeof raw === 'object' && raw) patch = { ...raw }
  else return

  // Remove old value type key and write as hash
  await kv.del(key)
  await kv.hset(key, {
    id: creatorId,
    handle: (patch.handle || creatorId)?.toString().toLowerCase(),
    displayName: patch.displayName || creatorId,
    avatarUrl: patch.avatarUrl || '',
    bio: patch.bio || '',
    address: patch.address || '',
    fid: Number(patch.fid || 0),
    createdAt: Number(patch.createdAt || now),
    updatedAt: now,
  })
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

    // Make sure the key is a hash (migrate legacy string values if needed)
    await ensureHashKey(creatorId)

    // Validate inputs
    const patch: Record<string, unknown> = {}
    if (typeof bio === 'string') {
      const words = bio.trim().split(/\s+/).filter(Boolean)
      if (words.length > MAX_BIO_WORDS) {
        return NextResponse.json(
          { ok: false, error: `Bio must be ${MAX_BIO_WORDS} words or less` },
          { status: 400 }
        )
      }
      patch.bio = bio
    }
    if (typeof avatarUrl === 'string') {
      // Light sanity (optional)
      if (avatarUrl && avatarUrl.length > 1024) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL too long' },
          { status: 400 }
        )
      }
      if (avatarUrl && !isLikelyUrl(avatarUrl)) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL must be http(s) or ipfs' },
          { status: 400 }
        )
      }
      patch.avatarUrl = avatarUrl
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 })
    }

    // Always bump updatedAt
    patch.updatedAt = Date.now()

    await kv.hset(`creator:${creatorId}`, patch)

    // Revalidate for both id-based and handle-based routes
    revalidatePath(`/creator/${creatorId}`)
    const cur = await kv.hgetall<Record<string, string>>(`creator:${creatorId}`)
    const handle = cur?.handle?.toLowerCase?.()
    if (handle) revalidatePath(`/creator/${handle}`)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Update failed' },
      { status: 500 }
    )
  }
}
