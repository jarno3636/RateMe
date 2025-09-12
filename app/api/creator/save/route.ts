// app/api/creator/save/route.ts
import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ------------------------------- CORS ------------------------------- */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/* ------------------------------ helpers ----------------------------- */
const isNumeric = (s: string) => /^\d+$/.test(s)
const MAX_BIO_WORDS = 250

function normalize(s: string) {
  return String(s || '').trim().toLowerCase()
}
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

/** Resolve a creator id from id or handle (supports legacy storage). */
async function resolveId(idOrHandle: string): Promise<string | null> {
  const key = normalize(idOrHandle)
  if (!key) return null

  // numeric id directly
  if (isNumeric(key)) {
    const exists = await kv.exists(`creator:${key}`)
    return exists ? key : null
  }

  // handle map
  const mapped = (await kv.get<string | null>(`handle:${key}`)) || null
  if (mapped) return mapped

  // legacy: some records used the handle directly as the id
  const legacy = await kv.exists(`creator:${key}`)
  return legacy ? key : null
}

/** Ensure creator:{id} is a hash; migrate legacy plain values if needed. */
async function ensureHashKey(creatorId: string): Promise<void> {
  const key = `creator:${creatorId}`

  // Already a hash?
  const asHash = await kv.hgetall<Record<string, unknown>>(key)
  if (asHash && Object.keys(asHash).length > 0) return

  // Maybe a plain value (legacy)
  const raw = await kv.get(key)
  if (raw == null) return

  const now = Date.now()
  let patch: any = {}
  if (typeof raw === 'string') patch = guessFromString(raw)
  else if (typeof raw === 'object' && raw) patch = { ...raw }
  else return

  // Rewrite as normalized hash
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

/* -------------------------------- POST ------------------------------ */
/**
 * POST /api/creator/save
 * Body: { id: string | handle, bio?: string, avatarUrl?: string }
 */
export async function POST(req: Request) {
  try {
    const { id, bio, avatarUrl } = await req.json()

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Missing id' },
        { status: 400, headers: corsHeaders }
      )
    }

    const creatorId = await resolveId(id)
    if (!creatorId) {
      return NextResponse.json(
        { ok: false, error: 'Creator not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Make sure storage is normalized
    await ensureHashKey(creatorId)

    // Validate patch
    const patch: Record<string, unknown> = {}
    if (typeof bio === 'string') {
      const words = bio.trim().split(/\s+/).filter(Boolean)
      if (words.length > MAX_BIO_WORDS) {
        return NextResponse.json(
          { ok: false, error: `Bio must be ${MAX_BIO_WORDS} words or less` },
          { status: 400, headers: corsHeaders }
        )
      }
      patch.bio = bio
    }
    if (typeof avatarUrl === 'string') {
      if (avatarUrl && avatarUrl.length > 1024) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL too long' },
          { status: 400, headers: corsHeaders }
        )
      }
      if (avatarUrl && !isLikelyUrl(avatarUrl)) {
        return NextResponse.json(
          { ok: false, error: 'Avatar URL must be http(s) or ipfs' },
          { status: 400, headers: corsHeaders }
        )
      }
      patch.avatarUrl = avatarUrl
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Nothing to update' },
        { status: 400, headers: corsHeaders }
      )
    }

    patch.updatedAt = Date.now()
    await kv.hset(`creator:${creatorId}`, patch)

    // Revalidate both /creator/:id and /creator/:handle
    revalidatePath(`/creator/${creatorId}`)
    const cur = await kv.hgetall<Record<string, string>>(`creator:${creatorId}`)
    const handle = cur?.handle?.toLowerCase?.()
    if (handle) revalidatePath(`/creator/${handle}`)

    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Update failed' },
      { status: 500, headers: corsHeaders }
    )
  }
}
