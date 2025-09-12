import { kv } from '@vercel/kv'

/** --------- Types --------- */
export type Creator = {
  id: string            // primary key (lowercased handle or address)
  handle: string        // @handle (unique) – we store/compare in lowercase
  address: `0x${string}` | null
  fid?: number
  displayName?: string
  avatarUrl?: string
  bio?: string
  createdAt: number
}

export type Rating = {
  creatorId: string     // Creator.id
  raterFid?: number
  score: number         // 1..5
  comment?: string
  createdAt: number
}

/** --------- Keys --------- */
const CREATOR_KEY  = (id: string) => `creator:${id}`
const HANDLE_KEY   = (handle: string) => `handle:${handle.toLowerCase()}`
const OWNER_KEY    = (addr: string) => `owner:${addr.toLowerCase()}`
const CREATOR_LIST = 'creator:list' // zset score = createdAt

const RATING_KEY = (creatorId: string, raterKey: string) =>
  `rating:${creatorId}:${raterKey}`
const RATING_SUMMARY = (creatorId: string) =>
  `rating:summary:${creatorId}` // {count,sum}
const RATING_RECENT = (creatorId: string) =>
  `rating:recent:${creatorId}` // list (newest first)

/** --------- Helpers --------- */
const lc = (s: string) => s.trim().toLowerCase()
const normHandle = (s: string) => lc(s.replace(/^@+/, ''))

const isWrongType = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'message' in err &&
  String((err as any).message).toUpperCase().includes('WRONGTYPE')

/** Normalize a possibly-legacy creator payload into the current shape */
function normalizeCreator(raw: any): Creator | null {
  if (!raw || typeof raw !== 'object') return null
  const handle = normHandle(raw.handle ?? raw.id ?? '')
  const id = lc(raw.id ?? handle)
  if (!id || !handle) return null
  return {
    id,
    handle,
    address: raw.address ?? null,
    fid: raw.fid !== undefined ? Number(raw.fid) : undefined,
    displayName: raw.displayName ?? raw.name ?? handle,
    avatarUrl: raw.avatarUrl ?? raw.avatarURI ?? '',
    bio: raw.bio ?? '',
    createdAt: Number(raw.createdAt ?? Date.now()),
  }
}

/**
 * Try HGETALL; if WRONGTYPE, read legacy string → migrate to hash → return normalized.
 * Returns null if the key doesn't exist or couldn't be normalized.
 */
async function safeHGetallCreator(key: string): Promise<Creator | null> {
  try {
    const h = await kv.hgetall<Creator>(key)
    return h && Object.keys(h).length ? h : null
  } catch (e) {
    if (!isWrongType(e)) throw e

    // Legacy string or JSON object stored as a string
    const legacy = await kv.get<string | Record<string, unknown>>(key)
    let parsed: any = legacy
    if (typeof legacy === 'string') {
      try {
        parsed = JSON.parse(legacy)
      } catch {
        parsed = { displayName: legacy }
      }
    }

    const normalized = normalizeCreator(parsed)
    if (!normalized) {
      await kv.del(key) // remove corrupt value to stop future WRONGTYPEs
      return null
    }

    // Overwrite with canonical hash
    await kv.del(key)
    await kv.hset(key, normalized)

    // Ensure handle index points at this id
    await kv.set(HANDLE_KEY(normalized.handle), normalized.id)

    // Ensure list index exists
    await kv.zadd(CREATOR_LIST, { member: normalized.id, score: normalized.createdAt })

    return normalized
  }
}

/** Exported: migrate a creator by *id key* directly (used by the API) */
export async function migrateCreatorKey(key: string) {
  const before = await kv.type(key) // "hash" | "string" | "none" | ...
  const migrated = before && before !== 'hash'
  const c = await safeHGetallCreator(key) // triggers migration if needed
  return { ok: true as const, migrated: Boolean(migrated), creator: c }
}

/** Exported: migrate by id OR handle (human-friendly) */
export async function migrateCreator(idOrHandle: string) {
  const asId = lc(idOrHandle)
  const asHandle = normHandle(idOrHandle)

  // First, try as an id
  const byId = await migrateCreatorKey(CREATOR_KEY(asId))
  if (byId.creator) return byId

  // If not found, try resolving handle → id
  const id = await kv.get<string | null>(HANDLE_KEY(asHandle))
  if (id) {
    return migrateCreatorKey(CREATOR_KEY(lc(id)))
  }

  // Last chance: some installs used handle as id directly
  const byHandleId = await migrateCreatorKey(CREATOR_KEY(asHandle))
  return byHandleId
}

/** --------- Creators --------- */
export async function createCreatorUnique(c: Creator) {
  // normalize
  const handle = normHandle(c.handle)
  const id = lc(c.id)

  // 1) enforce unique handle via SETNX with TTL
  const ok = await kv.set(HANDLE_KEY(handle), id, {
    nx: true,
    ex: 60 * 60 * 24 * 365, // 1 year
  })
  if (!ok) throw new Error('Handle is taken')

  // 2) store creator hash
  const row: Creator = { ...c, id, handle }
  await kv.hset(CREATOR_KEY(id), row)

  // 3) index in recency zset (score = createdAt)
  await kv.zadd(CREATOR_LIST, { member: id, score: c.createdAt })

  // 4) index by owner address
  if (c.address) await kv.set(OWNER_KEY(c.address), id)

  return row
}

export async function getCreator(id: string): Promise<Creator | null> {
  const key = CREATOR_KEY(lc(id))
  return safeHGetallCreator(key)
}

export async function getCreatorByHandle(handle: string) {
  const id = await kv.get<string | null>(HANDLE_KEY(handle))
  return id ? getCreator(id) : null
}

/** Lookup by owner wallet address */
export async function getCreatorByOwner(address: string): Promise<Creator | null> {
  if (!address) return null
  const id = await kv.get<string | null>(OWNER_KEY(address))
  return id ? getCreator(id) : null
}

/** Set or update a creator's linked address and keep the index in sync */
export async function setCreatorAddress(
  idOrHandle: string,
  address: `0x${string}` | null
): Promise<Creator | null> {
  const existing =
    (await getCreator(idOrHandle)) ||
    (await getCreatorByHandle(idOrHandle))
  if (!existing) return null

  if (existing.address) await kv.del(OWNER_KEY(existing.address))

  const next: Creator = { ...existing, address }
  await kv.hset(CREATOR_KEY(existing.id), next)

  if (address) await kv.set(OWNER_KEY(address), existing.id)

  return next
}

/** Page through creators (newest first) */
export async function listCreatorsPage({
  limit = 12,
  cursor = 0,
}: {
  limit?: number
  cursor?: number
}): Promise<{ creators: Creator[]; nextCursor: number | null }> {
  const start = Math.max(0, cursor)
  const safeLimit = Math.max(1, Math.min(50, limit))
  const end = start + safeLimit - 1

  const ids = await kv.zrange(CREATOR_LIST, start, end, { rev: true })
  if (!ids?.length) return { creators: [], nextCursor: null }

  const pipe = kv.pipeline()
  ids.forEach((id: string) => pipe.hgetall<Creator>(CREATOR_KEY(id)))
  const rows = (await pipe.exec()) as (Creator | null | undefined)[]

  const creators = (rows || []).filter((x): x is Creator => !!x && Object.keys(x).length > 0)
  const nextCursor = creators.length < safeLimit ? null : start + creators.length
  return { creators, nextCursor }
}

/** Back-compat: first page only */
export async function listCreators(limit = 12): Promise<Creator[]> {
  const { creators } = await listCreatorsPage({ limit, cursor: 0 })
  return creators
}

/** --------- Ratings --------- */
export async function putRating(r: Rating, raterKey: string) {
  const score = Math.max(1, Math.min(5, Number(r.score) || 0))

  const wrote = await kv.set(
    RATING_KEY(r.creatorId, raterKey),
    JSON.stringify({ ...r, score }),
    { nx: true }
  )
  if (!wrote) return false

  const summaryKey = RATING_SUMMARY(r.creatorId)
  const current =
    (await kv.hgetall<{ count?: number; sum?: number }>(summaryKey)) || {}
  const count = (current.count ?? 0) + 1
  const sum = (current.sum ?? 0) + score
  await kv.hset(summaryKey, { count, sum })

  await kv.lpush(RATING_RECENT(r.creatorId), JSON.stringify({ ...r, score }))
  await kv.ltrim(RATING_RECENT(r.creatorId), 0, 49)

  return true
}

export async function getRatingSummary(creatorId: string) {
  const s =
    (await kv.hgetall<{ count?: number; sum?: number }>(
      RATING_SUMMARY(creatorId)
    )) || {}
  const count = s.count ?? 0
  const sum = s.sum ?? 0
  const avg = count ? sum / count : 0
  return { count, sum, avg }
}

export async function getRecentRatings(creatorId: string, limit = 10) {
  const items = await kv.lrange(
    RATING_RECENT(creatorId),
    0,
    Math.max(0, limit - 1)
  )
  return (items || []).map((x: string) => JSON.parse(x) as Rating)
}

/** Optional alias so older code `import { store } from '@/lib/kv'` keeps working */
export { kv as store }
