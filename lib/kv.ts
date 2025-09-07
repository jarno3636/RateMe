// lib/kv.ts
import { kv } from '@vercel/kv'

/** --------- Types --------- */
export type Creator = {
  id: string            // primary key (lowercased handle or address)
  handle: string        // @handle (unique)
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
const CREATOR_KEY = (id: string) => `creator:${id}`
const HANDLE_KEY = (handle: string) => `handle:${handle.toLowerCase()}`
const CREATOR_LIST = 'creator:list' // zset score = createdAt

const RATING_KEY = (creatorId: string, raterKey: string) =>
  `rating:${creatorId}:${raterKey}`
const RATING_SUMMARY = (creatorId: string) =>
  `rating:summary:${creatorId}` // {count,sum}
const RATING_RECENT = (creatorId: string) =>
  `rating:recent:${creatorId}` // list (newest first)

/** --------- Creators --------- */
export async function createCreatorUnique(c: Creator) {
  // 1) enforce unique handle via SETNX with a long-ish TTL (renewable by updates)
  const ok = await kv.set(HANDLE_KEY(c.handle), c.id, {
    nx: true,
    ex: 60 * 60 * 24 * 365, // 1 year
  })
  if (!ok) throw new Error('Handle is taken')

  // 2) store creator hash
  await kv.hset(CREATOR_KEY(c.id), c)

  // 3) index in recency zset (score = createdAt, so we can fetch newest first)
  await kv.zadd(CREATOR_LIST, { member: c.id, score: c.createdAt })

  return c
}

export async function getCreator(id: string): Promise<Creator | null> {
  const data = await kv.hgetall<Creator>(CREATOR_KEY(id))
  return data && Object.keys(data).length ? data : null
}

export async function getCreatorByHandle(handle: string) {
  const id = await kv.get<string | null>(HANDLE_KEY(handle))
  return id ? getCreator(id) : null
}

export async function listCreators(limit = 12): Promise<Creator[]> {
  // newest first: use ZRANGE with REV flag
  const ids = await kv.zrange<string>(CREATOR_LIST, 0, Math.max(0, limit - 1), {
    rev: true,
  })
  if (!ids?.length) return []

  // batch fetch profiles
  const pipe = kv.pipeline()
  ids.forEach((id) => pipe.hgetall<Creator>(CREATOR_KEY(id)))
  const rows = (await pipe.exec()) as (Creator | null | undefined)[]

  return (rows || []).filter((x): x is Creator => !!x && Object.keys(x).length > 0)
}

/** --------- Ratings --------- */
export async function putRating(r: Rating, raterKey: string) {
  // prevent duplicate rating by same rater for the same creator
  const wrote = await kv.set(RATING_KEY(r.creatorId, raterKey), JSON.stringify(r), {
    nx: true,
  })
  if (!wrote) return false

  // update summary atomically-ish (KV doesn’t do Lua; this is adequate here)
  const summaryKey = RATING_SUMMARY(r.creatorId)
  const current =
    (await kv.hgetall<{ count?: number; sum?: number }>(summaryKey)) || {}
  const count = (current.count ?? 0) + 1
  const sum = (current.sum ?? 0) + r.score
  await kv.hset(summaryKey, { count, sum })

  // maintain recent list (cap 50)
  await kv.lpush(RATING_RECENT(r.creatorId), JSON.stringify(r))
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
  // NOTE: generic must be <string>, not <string[]>
  const items = await kv.lrange<string>(
    RATING_RECENT(creatorId),
    0,
    Math.max(0, limit - 1)
  )
  return (items || []).map((x) => JSON.parse(x) as Rating)
}

/** Optional alias so older code `import { store } from '@/lib/kv'` keeps working */
export { kv as store }
