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
const OWNER_KEY    = (addr: string) => `owner:${addr.toLowerCase()}`   // << new
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
  // normalize
  const handle = normHandle(c.handle)
  const id = lc(c.id)

  // 1) enforce unique handle via SETNX with a long-ish TTL
  const ok = await kv.set(HANDLE_KEY(handle), id, {
    nx: true,
    ex: 60 * 60 * 24 * 365, // 1 year
  })
  if (!ok) throw new Error('Handle is taken')

  // 2) store creator hash
  const row: Creator = {
    ...c,
    id,
    handle, // store lowercased handle (UI can render with @)
  }
  await kv.hset(CREATOR_KEY(id), row)

  // 3) index in recency zset (score = createdAt)
  await kv.zadd(CREATOR_LIST, { member: id, score: c.createdAt })

  // 4) NEW: index by owner address (so we can find by wallet quickly)
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

/** NEW: lookup creator by owner wallet address (checks the owner index) */
export async function getCreatorByOwner(address: string): Promise<Creator | null> {
  if (!address) return null
  const id = await kv.get<string | null>(OWNER_KEY(address))
  return id ? getCreator(id) : null
}

/** NEW: set or update a creator's linked address and keep the index in sync */
export async function setCreatorAddress(
  idOrHandle: string,
  address: `0x${string}` | null
): Promise<Creator | null> {
  // accept either creator id or handle
  const existing =
    (await getCreator(idOrHandle)) ||
    (await getCreatorByHandle(idOrHandle))
  if (!existing) return null

  // remove old owner index if present
  if (existing.address) {
    await kv.del(OWNER_KEY(existing.address))
  }

  const next: Creator = { ...existing, address }

  // update record
  await kv.hset(CREATOR_KEY(existing.id), next)

  // add new owner index if present
  if (address) {
    await kv.set(OWNER_KEY(address), existing.id)
  }

  return next
}

/** New: page through creators (newest first). cursor is index into the recency zset. */
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

  // newest first
  const ids = await kv.zrange(CREATOR_LIST, start, end, { rev: true })
  if (!ids?.length) return { creators: [], nextCursor: null }

  // batch fetch profiles
  const pipe = kv.pipeline()
  ids.forEach((id: string) => pipe.hgetall<Creator>(CREATOR_KEY(id)))
  const rows = (await pipe.exec()) as (Creator | null | undefined)[]

  const creators = (rows || []).filter((x): x is Creator => !!x && Object.keys(x).length > 0)

  // if fewer than requested, we've hit the end
  const nextCursor =
    creators.length < safeLimit ? null : start + creators.length

  return { creators, nextCursor }
}

/** Back-compat: first page only */
export async function listCreators(limit = 12): Promise<Creator[]> {
  const { creators } = await listCreatorsPage({ limit, cursor: 0 })
  return creators
}

/** --------- Ratings --------- */
export async function putRating(r: Rating, raterKey: string) {
  // clamp score 1..5 for safety
  const score = Math.max(1, Math.min(5, Number(r.score) || 0))

  // prevent duplicate rating by same rater for the same creator
  const wrote = await kv.set(
    RATING_KEY(r.creatorId, raterKey),
    JSON.stringify({ ...r, score }),
    { nx: true }
  )
  if (!wrote) return false

  // update summary
  const summaryKey = RATING_SUMMARY(r.creatorId)
  const current =
    (await kv.hgetall<{ count?: number; sum?: number }>(summaryKey)) || {}
  const count = (current.count ?? 0) + 1
  const sum = (current.sum ?? 0) + score
  await kv.hset(summaryKey, { count, sum })

  // maintain recent list (cap 50)
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
