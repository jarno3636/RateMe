// lib/kv.ts
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

/** --------- Creators --------- */
export async function createCreatorUnique(c: Creator) {
  const handle = normHandle(c.handle)
  const id = lc(c.id)

  const ok = await kv.set(HANDLE_KEY(handle), id, {
    nx: true,
    ex: 60 * 60 * 24 * 365,
  })
  if (!ok) throw new Error('Handle is taken')

  const row: Creator = { ...c, id, handle }
  await kv.hset(CREATOR_KEY(id), row)
  await kv.zadd(CREATOR_LIST, { member: id, score: c.createdAt })
  if (c.address) {
    await kv.set(OWNER_KEY(c.address), id)
  }

  return row
}

export async function getCreator(id: string): Promise<Creator | null> {
  const data = await kv.hgetall<Creator>(CREATOR_KEY(lc(id)))
  return data && Object.keys(data).length ? data : null
}

export async function getCreatorByHandle(handle: string) {
  const id = await kv.get<string | null>(HANDLE_KEY(handle))
  return id ? getCreator(id) : null
}

export async function getCreatorByOwner(address: string): Promise<Creator | null> {
  if (!address) return null
  const id = await kv.get<string | null>(OWNER_KEY(address))
  return id ? getCreator(id) : null
}

export async function setCreatorAddress(
  idOrHandle: string,
  address: `0x${string}` | null
): Promise<Creator | null> {
  const existing =
    (await getCreator(idOrHandle)) ||
    (await getCreatorByHandle(idOrHandle))
  if (!existing) return null

  if (existing.address) {
    await kv.del(OWNER_KEY(existing.address))
  }

  const next: Creator = { ...existing, address, updatedAt: Date.now() }
  await kv.hset(CREATOR_KEY(existing.id), next)

  if (address) {
    await kv.set(OWNER_KEY(address), existing.id)
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
      await kv.hset(key, parsed)
      return { migrated: true, creator: parsed }
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
