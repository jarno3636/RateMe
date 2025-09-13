// lib/kv.ts
import { kv } from '@vercel/kv'
import { getAddress, isAddress } from 'viem'

/** --------- Types --------- */
export type Creator = {
  id: string            // primary key (lowercased handle or address)
  handle: string        // unique handle, stored lowercase (no leading @)
  address: `0x${string}` | null
  fid?: number
  displayName?: string
  avatarUrl?: string
  bio?: string
  createdAt: number     // milliseconds
  updatedAt?: number    // milliseconds
}

export type Rating = {
  creatorId: string     // Creator.id
  raterFid?: number
  score: number         // 1..5
  comment?: string
  createdAt: number     // ms
}

/** --------- Keys --------- */
const CREATOR_KEY  = (id: string) => `creator:${id}`
const HANDLE_KEY   = (handle: string) => `handle:${handle.toLowerCase()}`
const OWNER_KEY    = (addr: string) => `owner:${addr.toLowerCase()}`
const CREATOR_LIST = 'creator:list' // zset score = createdAt (ms)

const RATING_KEY = (creatorId: string, raterKey: string) =>
  `rating:${creatorId}:${raterKey}`
const RATING_SUMMARY = (creatorId: string) =>
  `rating:summary:${creatorId}` // hash {count,sum}
const RATING_RECENT = (creatorId: string) =>
  `rating:recent:${creatorId}` // list json (newest first)

/** --------- Helpers --------- */
const lc = (s: string) => s.trim().toLowerCase()
const normHandle = (s: string) => lc(s.replace(/^@+/, ''))

/** --------- Creators: create & read --------- */
export async function createCreatorUnique(c: Creator) {
  const handle = normHandle(c.handle)
  const id = lc(c.id)

  const ok = await kv.set(HANDLE_KEY(handle), id, {
    nx: true,
    ex: 60 * 60 * 24 * 365,
  })
  if (!ok) throw new Error('Handle is taken')

  const row: Creator = {
    ...c,
    id,
    handle,
    createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
  }
  await kv.hset(CREATOR_KEY(id), row)
  await kv.zadd(CREATOR_LIST, { member: id, score: row.createdAt })
  if (row.address) {
    // store owner index with checksummed address for consistency
    const owner = isAddress(row.address) ? getAddress(row.address) : row.address
    await kv.set(OWNER_KEY(owner), id)
  }
  return row
}

/** If a creator key was accidentally stored as a string (JSON), convert to HASH */
export async function migrateCreator(idOrHandle: string): Promise<{ migrated: boolean; creator: Creator | null }> {
  const id = lc(idOrHandle)
  const key = CREATOR_KEY(id)

  const raw = await kv.get(key)
  if (raw && typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Creator
      await kv.del(key)
      await kv.hset(key, parsed)
      return { migrated: true, creator: parsed }
    } catch {
      return { migrated: false, creator: null }
    }
  }

  const existing = await kv.hgetall<Creator>(key)
  return { migrated: false, creator: existing && Object.keys(existing).length ? existing : null }
}

/** Always call this before hgetall/hset to guarantee the key is a hash. */
export async function ensureCreator(idOrHandle: string): Promise<Creator | null> {
  const id = lc(idOrHandle)
  const { creator } = await migrateCreator(id)
  return creator
}

/** Read by id (lowercased) */
export async function getCreator(id: string): Promise<Creator | null> {
  const ensured = await ensureCreator(id)
  return ensured
}

export async function getCreatorByHandle(handle: string) {
  const id = await kv.get<string | null>(HANDLE_KEY(normHandle(handle)))
  return id ? getCreator(id) : null
}

export async function getCreatorByOwner(address: string): Promise<Creator | null> {
  if (!address) return null
  const addr = isAddress(address) ? getAddress(address) : address
  const id = await kv.get<string | null>(OWNER_KEY(addr))
  return id ? getCreator(id) : null
}

/** --------- Update helper (use in /api/creator/update etc.) --------- */
export async function updateCreatorKV(input: {
  id: string
  handle?: string
  address?: `0x${string}` | null
  displayName?: string
  avatarUrl?: string
  bio?: string
  fid?: number
}): Promise<Creator> {
  const id = lc(input.id)
  const existing =
    (await getCreator(id)) ||
    (input.handle ? await getCreatorByHandle(input.handle) : null)
  if (!existing) throw new Error('creator not found')

  // Handle change → update secondary index atomically
  let nextHandle = existing.handle
  if (typeof input.handle === 'string' && normHandle(input.handle) !== existing.handle) {
    const newHandle = normHandle(input.handle)
    const ok = await kv.set(HANDLE_KEY(newHandle), existing.id, {
      nx: true,
      ex: 60 * 60 * 24 * 365,
    })
    if (!ok) throw new Error('Handle is taken')
    if (existing.handle) await kv.del(HANDLE_KEY(existing.handle))
    nextHandle = newHandle
  }

  // Address normalization + owner index maintenance
  const incomingAddr =
    input.address == null
      ? input.address // preserve null if explicitly null
      : (isAddress(input.address) ? (getAddress(input.address) as `0x${string}`) : input.address)

  if (existing.address && existing.address !== incomingAddr) {
    await kv.del(OWNER_KEY(existing.address))
  }
  if (incomingAddr) {
    await kv.set(OWNER_KEY(incomingAddr), existing.id)
  }

  const updatedAt = Date.now()
  const next: Creator = {
    ...existing,
    handle: nextHandle,
    address: incomingAddr !== undefined ? incomingAddr : existing.address,
    displayName: input.displayName !== undefined ? input.displayName : existing.displayName,
    avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl,
    bio: input.bio !== undefined ? input.bio : existing.bio,
    fid: input.fid !== undefined ? input.fid : existing.fid,
    updatedAt,
  }

  await kv.hset(CREATOR_KEY(existing.id), next)

  // Make sure they stay in the zset for discovery (score = createdAt)
  if (existing.createdAt) {
    await kv.zadd(CREATOR_LIST, { member: existing.id, score: existing.createdAt })
  }

  return next
}

/** --------- Address convenience (normalizes & reindexes) --------- */
export async function setCreatorAddress(
  idOrHandle: string,
  address: `0x${string}` | null
): Promise<Creator | null> {
  const existing =
    (await getCreator(idOrHandle)) ||
    (await getCreatorByHandle(idOrHandle))
  if (!existing) return null

  const nextAddr =
    address && isAddress(address) ? (getAddress(address) as `0x${string}`) : null

  if (existing.address && existing.address !== nextAddr) {
    await kv.del(OWNER_KEY(existing.address))
  }

  const next: Creator = { ...existing, address: nextAddr, updatedAt: Date.now() }
  await kv.hset(CREATOR_KEY(existing.id), next)

  if (nextAddr) {
    await kv.set(OWNER_KEY(nextAddr), existing.id)
  }

  return next
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

  const creators = (rows || []).filter((x): x is Creator => !!x && Object.keys(x).length > 0)
  const nextCursor = creators.length < safeLimit ? null : start + creators.length

  return { creators, nextCursor }
}

export async function listCreators(limit = 12): Promise<Creator[]> {
  const { creators } = await listCreatorsPage({ limit, cursor: 0 })
  return creators
}

/** --------- Ratings --------- */
export async function putRating(r: Rating, raterKey: string) {
  // Clamp score 1..5
  const score = Math.max(1, Math.min(5, Number(r.score) || 0))

  // First-write wins per (creatorId, raterKey)
  const wrote = await kv.set(
    RATING_KEY(r.creatorId, raterKey),
    JSON.stringify({ ...r, score }),
    { nx: true }
  )
  if (!wrote) return false

  // Summary (hash): count/sum
  const summaryKey = RATING_SUMMARY(r.creatorId)
  const current = (await kv.hgetall<{ count?: number; sum?: number }>(summaryKey)) || {}
  const count = (current.count ?? 0) + 1
  const sum = (current.sum ?? 0) + score
  await kv.hset(summaryKey, { count, sum })

  // Recent list (cap 50)
  await kv.lpush(RATING_RECENT(r.creatorId), JSON.stringify({ ...r, score }))
  await kv.ltrim(RATING_RECENT(r.creatorId), 0, 49)

  return true
}

export async function getRatingSummary(creatorId: string) {
  const s = (await kv.hgetall<{ count?: number; sum?: number }>(RATING_SUMMARY(creatorId))) || {}
  const count = s.count ?? 0
  const sum = s.sum ?? 0
  const avg = count ? sum / count : 0
  return { count, sum, avg }
}

export async function getRecentRatings(creatorId: string, limit = 10) {
  const items = await kv.lrange(RATING_RECENT(creatorId), 0, Math.max(0, limit - 1))
  return (items || []).map((x: string) => JSON.parse(x) as Rating)
}

/** --------- Export raw store if needed --------- */
export { kv as store }
