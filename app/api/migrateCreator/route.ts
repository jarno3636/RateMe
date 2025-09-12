// app/api/migrateCreator/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const lc = (s: string) => String(s || '').trim().toLowerCase()
const isNumeric = (s: string) => /^\d+$/.test(s)
const CREATOR_KEY  = (id: string) => `creator:${id}`
const HANDLE_KEY   = (handle: string) => `handle:${lc(handle)}`
const OWNER_KEY    = (addr: string) => `owner:${lc(addr)}`

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

async function resolveToId(idOrHandle: string): Promise<string | null> {
  const key = lc(idOrHandle)
  if (isNumeric(key)) {
    const exists = await kv.exists(CREATOR_KEY(key))
    return exists ? key : null
  }
  const mapped = await kv.get<string | null>(HANDLE_KEY(key))
  if (mapped) return lc(mapped)
  const exists = await kv.exists(CREATOR_KEY(key))
  return exists ? key : null
}

async function migrateToHash(creatorId: string) {
  const key = CREATOR_KEY(creatorId)

  // 1) Try as hash
  let asHash: Record<string, any> | null = null
  try {
    const h = await kv.hgetall<Record<string, any>>(key)
    if (h && Object.keys(h).length) asHash = h
  } catch (e: any) {
    // WRONGTYPE => fall through to raw get
  }

  if (asHash) {
    // Already a hash; just make sure indexes exist & normalize a bit.
    const normalized = {
      ...asHash,
      id: creatorId,
      handle: lc(asHash.handle || creatorId),
      address: asHash.address ? lc(asHash.address) : null,
    }
    await kv.hset(key, { ...normalized, updatedAt: Date.now() })
    // rebind handle if missing
    if (normalized.handle) await kv.set(HANDLE_KEY(normalized.handle), creatorId)
    // rebind owner if present
    if (normalized.address) await kv.set(OWNER_KEY(normalized.address), creatorId)
    return { beforeType: 'hash', afterType: 'hash', data: normalized }
  }

  // 2) Read raw legacy value
  const raw = await kv.get(key)
  if (raw == null) {
    // nothing there; initialize a minimal hash
    const now = Date.now()
    const row = {
      id: creatorId,
      handle: creatorId,
      displayName: creatorId,
      avatarUrl: '',
      bio: '',
      address: null,
      fid: 0,
      createdAt: now,
      updatedAt: now,
    }
    await kv.hset(key, row)
    await kv.set(HANDLE_KEY(row.handle), creatorId)
    return { beforeType: 'missing', afterType: 'hash', data: row }
  }

  // 3) Convert raw (string/object/whatever) -> normalized hash
  const now = Date.now()
  let patch: any = {}
  if (typeof raw === 'string') patch = guessFromString(raw)
  else if (typeof raw === 'object' && raw) patch = { ...raw }

  // overwrite the key as a proper hash
  await kv.del(key)
  const row = {
    id: creatorId,
    handle: lc(patch.handle || creatorId),
    displayName: patch.displayName || creatorId,
    avatarUrl: patch.avatarUrl || '',
    bio: patch.bio || '',
    address: patch.address ? lc(patch.address as string) : null,
    fid: Number(patch.fid || 0),
    createdAt: Number(patch.createdAt || now),
    updatedAt: now,
  }
  await kv.hset(key, row)
  if (row.handle) await kv.set(HANDLE_KEY(row.handle), creatorId)
  if (row.address) await kv.set(OWNER_KEY(row.address), creatorId)

  return { beforeType: typeof raw, afterType: 'hash', data: row }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const raw = lc(url.searchParams.get('id') || url.searchParams.get('handle') || '')
    const mode = (url.searchParams.get('mode') || 'repair').toLowerCase()

    if (!raw) return NextResponse.json({ ok: false, error: 'Missing id/handle' }, { status: 400 })

    const id = await resolveToId(raw)
    const canonicalId = id || raw

    if (mode !== 'repair') {
      return NextResponse.json({ ok: false, error: 'Unsupported mode' }, { status: 400 })
    }

    const result = await migrateToHash(canonicalId)

    return NextResponse.json({
      ok: true,
      id: canonicalId,
      mode,
      result,
    }, { headers: { 'cache-control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
