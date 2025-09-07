// lib/kv.ts
import { kv } from '@vercel/kv';

export type Creator = {
  id: string;            // primary key (lowercased handle or address)
  handle: string;        // @handle (unique)
  address: `0x${string}` | null;
  fid?: number;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: number;
};

export type Rating = {
  creatorId: string;     // Creator.id
  raterFid?: number;
  score: number;         // 1..5
  comment?: string;
  createdAt: number;
};

const CREATOR_KEY = (id: string) => `creator:${id}`;
const HANDLE_KEY = (handle: string) => `handle:${handle.toLowerCase()}`; // setnx for uniqueness
const CREATOR_LIST = 'creator:list'; // zset score=timestamp
const RATING_KEY = (creatorId: string, raterKey: string) => `rating:${creatorId}:${raterKey}`;
const RATING_SUMMARY = (creatorId: string) => `rating:summary:${creatorId}`; // {count,sum}
const RATING_RECENT = (creatorId: string) => `rating:recent:${creatorId}`; // list

export async function createCreatorUnique(c: Creator) {
  // enforce unique handle
  const ok = await kv.set(HANDLE_KEY(c.handle), c.id, { nx: true, ex: 60 * 60 * 24 * 365 });
  if (!ok) throw new Error('Handle is taken');
  await kv.hset(CREATOR_KEY(c.id), c);
  await kv.zadd(CREATOR_LIST, { member: c.id, score: c.createdAt });
  return c;
}

export async function getCreator(id: string): Promise<Creator | null> {
  const data = await kv.hgetall<Creator>(CREATOR_KEY(id));
  return data && Object.keys(data).length ? data : null;
}

export async function getCreatorByHandle(handle: string) {
  const id = await kv.get<string | null>(HANDLE_KEY(handle));
  return id ? getCreator(id) : null;
}

export async function listCreators(limit = 12): Promise<Creator[]> {
  const ids = await kv.zrevrange<string[]>(CREATOR_LIST, 0, limit - 1);
  if (!ids?.length) return [];
  const pipe = kv.pipeline();
  ids.forEach((id) => pipe.hgetall<Creator>(CREATOR_KEY(id)));
  const rows = (await pipe.exec()).filter(Boolean) as Creator[];
  return rows;
}

export async function putRating(r: Rating, raterKey: string) {
  // prevent duplicate rating per raterKey
  const wrote = await kv.set(RATING_KEY(r.creatorId, raterKey), JSON.stringify(r), { nx: true });
  if (!wrote) return false;

  // update summary atomically
  const summaryKey = RATING_SUMMARY(r.creatorId);
  const current = (await kv.hgetall<{ count?: number; sum?: number }>(summaryKey)) || {};
  const count = (current.count ?? 0) + 1;
  const sum = (current.sum ?? 0) + r.score;
  await kv.hset(summaryKey, { count, sum });

  // recent list (cap 50)
  await kv.lpush(RATING_RECENT(r.creatorId), JSON.stringify(r));
  await kv.ltrim(RATING_RECENT(r.creatorId), 0, 49);
  return true;
}

export async function getRatingSummary(creatorId: string) {
  const s = (await kv.hgetall<{ count?: number; sum?: number }>(RATING_SUMMARY(creatorId))) || {};
  const count = s.count ?? 0;
  const sum = s.sum ?? 0;
  const avg = count ? sum / count : 0;
  return { count, sum, avg };
}

export async function getRecentRatings(creatorId: string, limit = 10) {
  const items = await kv.lrange<string[]>(RATING_RECENT(creatorId), 0, limit - 1);
  return (items || []).map((x) => JSON.parse(x) as Rating);
}
