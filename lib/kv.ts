// lib/kv.ts
import { kv } from '@vercel/kv'
import { isAddress, getAddress } from 'viem'

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
  updatedAt?: number
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
/**
 * IMPORTANT: Use checksum for owner index to avoid duplicates.
 * We also keep a legacy lowercase key reader for backward compatibility.
 */
const OWNER_KEY_CHECKSUM = (addr: `0x${string}`) => `owner:${getAddress(addr)}`
const OWNER_KEY_LEGACY   = (addr: string) => `owner:${addr.toLowerCase()}`
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

function coerceNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}
function checksumOrNull(addr?: string | null): `0x${string}` | null {
  if (!addr) return null
  try {
    if (!isAddress(addr)) return null
    return getAddress(addr) as `0x${string}`
  } catch {
    return null
  }
}

/** --------- Creators --------- */
export async function createCreatorUnique(c: Creator) {
  const handle = normHandle(c.handle)
  const id = lc(c.id)

  const ok = await kv.set(HANDLE_KEY(handle), id, {
    nx: true,
    ex: 60 * 60 * 24 * 365,
  })
  if (!ok) throw new Error('Handle is taken')

  const address = checksumOrNull(c.address)
  const now = Date.now()
  const row: Creator = {
    ...c,
    id,
    handle,
    address,
    createdAt: coerceNum(c.createdAt) ?? now,
    updatedAt: coerceNum(c.updatedAt) ?? now,
  }

  await kv.hset(CREATOR_KEY(id), row)
  await kv.zadd(CREATOR_LIST, { member: id, score: row.createdAt })
  if (address) {
    await kv.set(OWNER_KEY_CHECKSUM(address), id)
    // optional: remove any legacy lowercase index for same address
    await kv.del(OWNER_KEY_LEGACY(address))
  }

  return row
}

export async function getCreator(id: string): Promise<Creator | null> {
  const data = await kv.hgetall<Creator>(CREATOR_KEY(lc(id)))
  if (!data || !Object.keys(data).length) return null
  // normalize updatedAt for cache-busting
  const updatedAt = coerceNum(data.updatedAt) ?? Date.now()
  return { ...data, updatedAt }
}

export async function getCreatorByHandle(handle: string) {
  const id = await kv.get<string | null>(HANDLE_KEY(handle))
  return id ? getCreator(id) : null
}

/**
 * Owner lookup that first tries checksum index, then legacy lowercase.
 * If it finds only legacy, it self-heals by writing checksum and removing legacy.
 */
export async function getCreatorByOwner(address: string): Promise<Creator | null> {
  if (!address) return null
  if (!isAddress(address)) return null
  const checksum = getAddress(address) as `0x${string}`

  // Try checksum index
  let id = await kv.get<string | null>(OWNER_KEY_CHECKSUM(checksum))
  if (!id) {
    // Try legacy, then heal
    const legacyId = await kv.get<string | null>(OWNER_KEY_LEGACY(address))
    if (legacyId) {
      // heal: set checksum index and remove legacy
      await kv.set(OWNER_KEY_CHECKSUM(checksum), legacyId)
      await kv.del(OWNER_KEY_LEGACY(address))
      id = legacyId
    }
  }
  return id ? getCreator(id) : null
}

/**
 * Update only the connected wallet address for a creator id or handle.
 * Cleans up legacy lowercase owner index and writes checksum index.
 */
export async function setCreatorAddress(
  idOrHandle: string,
  address: `0x${string}` | null
): Promise<Creator | null> {
  const existing =
    (await getCreator(idOrHandle)) ||
    (await getCreatorByHandle(idOrHandle))
  if (!existing) return null

  // remove old indexes (handle later re-set if needed)
  if (existing.address) {
    const old = existing.address as `0x${string}`
    await kv.del(OWNER_KEY_CHECKSUM(old))
    await kv.del(OWNER_KEY_LEGACY(old))
  }

  const nextAddr = checksumOrNull(address)
  const next: Creator = { ...existing, address: nextAddr, updatedAt: Date.now() }
  await kv.hset(CREATOR_KEY(existing.id), next)

  if (nextAddr) {
    await kv.set(OWNER_KEY_CHECKSUM(nextAddr), existing.id)
    await kv.del(OWNER_KEY_LEGACY(nextAddr)) // ensure no duplicate legacy index
  }

  return next
}

/**
 * Upsert creator profile fields (bio, avatarUrl, displayName, handle, address, fid).
 * Maintains handle → id and owner → id indexes.
 * Returns the normalized updated row with a fresh updatedAt timestamp.
 */
export async function updateCreatorKV(
  input: Partial<Creator> & { id: string }
): Promise<Creator> {
  const id = lc(input.id)
  const key = CREATOR_KEY(id)
  const existing = await kv.hgetall<Creator>(key)

  // Base
  const now = Date.now()
  const prevHandle = existing?.handle
  const nextHandle = input.handle ? normHandle(input.handle) : prevHandle || id
  const nextAddress = checksumOrNull((input.address ?? existing?.address) as string | undefined)
  const next: Creator = {
    id,
    handle: nextHandle,
    address: nextAddress,
    fid: input.fid ?? existing?.fid,
    displayName: input.displayName ?? existing?.displayName ?? nextHandle,
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl ?? null as any,
    bio: input.bio ?? existing?.bio ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  // Persist main row
  await kv.hset(key, next)

  // Maintain handle index
  if (nextHandle) {
    await kv.set(HANDLE_KEY(nextHandle), id)
    // If handle changed, we might want to keep the old key pointing (optional).
    if (prevHandle && prevHandle !== nextHandle) {
      await kv.set(HANDLE_KEY(prevHandle), id) // keep old pointing for now (or kv.del to retire it)
    }
  }

  // Maintain owner index (checksum)
  if (existing?.address) {
    // clear both checksum + legacy for previous
    await kv.del(OWNER_KEY_CHECKSUM(existing.address as `0x${string}`))
    await kv.del(OWNER_KEY_LEGACY(existing.address))
  }
  if (nextAddress) {
    await kv.set(OWNER_KEY_CHECKSUM(nextAddress), id)
    await kv.del(OWNER_KEY_LEGACY(nextAddress)) // remove legacy dup if any
  }

  return next
}

/** --------- Migration + Preflight --------- */

/**
 * Migrate a creator key if it was accidentally stored as a string instead of a hash.
 */
export async function migrateCreator(idOrHandle: string): Promise<{ migrated: boolean; creator: Creator | null }> {
  const id = lc(idOrHandle)
  const key = CREATOR_KEY(id)

  const raw = await kv.get(key)
  if (raw && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Creator
      await kv.del(key)
      // normalize updatedAt on write
      const updatedAt = coerceNum(parsed.updatedAt) ?? Date.now()
      await kv.hset(key, { ...parsed, updatedAt })
      return { migrated: true, creator: { ...parsed, updatedAt } }
    } catch {
      return { migrated: false, creator: null }
    }
  }

  const existing = await getCreator(id)
  return { migrated: false, creator: existing }
}

/**
 * Always call this before hgetall/hset to guarantee the key is a hash.
 */
export async function ensureCreator(idOrHandle: string): Promise<Creator | null> {
  const { creator } = await migrateCreator(idOrHandle)
  return creator
}

/** --------- Paging --------- */
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

  const creators = (rows || [])
    .filter((x): x is Creator => !!x && Object.keys(x).length > 0)
    .map((c) => ({ ...c, updatedAt: coerceNum(c.updatedAt) ?? Date.now() }))

  const nextCursor = creators.length < safeLimit ? null : start + creators.length
  return { creators, nextCursor }
}

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

/** Optional alias */
export { kv as store }
