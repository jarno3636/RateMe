// /lib/top3.ts
import "server-only"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import RatingsAbi from "@/abi/Ratings.json"
import { publicServerClient } from "@/lib/chainServer"
import { REGISTRY as PROFILE_REGISTRY, RATINGS } from "@/lib/addresses"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"

type TopEntry = {
  id: number
  owner: `0x${string}`
  avgX100: number   // e.g. 423 => 4.23
  count: number
}

/** KV key scoped by contract addresses + params */
const keyFor = (maxScan: number, minCount: number) =>
  `top3:${PROFILE_REGISTRY ?? "unknown"}:${RATINGS ?? "unknown"}:${maxScan}:${minCount}`

/**
 * Page through the registry until we hit `maxScan` or run out.
 */
async function fetchOwnersFromRegistry(
  maxScan: number
): Promise<{ ids: number[]; owners: `0x${string}`[] }> {
  if (!PROFILE_REGISTRY) return { ids: [], owners: [] }

  const pageSize = Math.min(Math.max(10, maxScan), 100)
  let cursor = 0n
  const ids: number[] = []
  const owners: `0x${string}`[] = []

  while (ids.length < maxScan) {
    const res = (await publicServerClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [cursor, BigInt(pageSize)],
    })) as unknown as [
      bigint[],           // 0: ids
      `0x${string}`[],    // 1: owners
      string[],           // 2: handles
      string[],           // 3: displayNames
      string[],           // 4: avatarURIs
      string[],           // 5: bios
      bigint[],           // 6: fids
      bigint[],           // 7: createdAts
      bigint              // 8: nextCursor
    ]

    const batchIds = (res?.[0] ?? []).map((b) => Number(b))
    const batchOwners = (res?.[1] ?? []) as `0x${string}`[]
    const nextCursor = (res?.[8] ?? 0n) as bigint

    const n = Math.min(batchIds.length, batchOwners.length)
    for (let i = 0; i < n && ids.length < maxScan; i++) {
      ids.push(batchIds[i]!)        // non-null: bounded by n
      owners.push(batchOwners[i]!)  // non-null: bounded by n
    }

    if (!nextCursor || nextCursor === 0n) break
    cursor = nextCursor
  }

  return { ids, owners }
}

/**
 * Read averages & counts for a set of owners via multicall.
 * Returns entries aligned to `ids/owners` input order.
 */
async function readRatingsForOwners(
  ids: number[],
  owners: `0x${string}`[]
): Promise<TopEntry[]> {
  if (!RATINGS || !ids.length) return []

  // Build a single multicall batch: first all averages, then all stats.
  const avgCalls = owners.map((owner) => ({
    address: RATINGS as `0x${string}`,
    abi: RatingsAbi as any,
    functionName: "getAverage",
    args: [owner],
  } as const))

  const statCalls = owners.map((owner) => ({
    address: RATINGS as `0x${string}`,
    abi: RatingsAbi as any,
    functionName: "getStats",
    args: [owner],
  } as const))

  // viem@^2 returns an array, not { results }
  const results = await publicServerClient.multicall({
    allowFailure: true,
    contracts: [...avgCalls, ...statCalls],
  })

  const entries: TopEntry[] = []

  for (let i = 0; i < owners.length; i++) {
    // avgX100: bigint -> number
    const avgRes = results[i]
    const avgVal =
      avgRes?.status === "success" ? Number((avgRes.result as bigint) ?? 0n) : 0

    // getStats -> (count, totalScore) — we use count as tie-breaker
    const statRes = results[owners.length + i]
    let count = 0
    if (statRes?.status === "success" && Array.isArray(statRes.result)) {
      const cnt = Number(statRes.result[0] ?? 0)
      count = Number.isFinite(cnt) ? cnt : 0
    }

    entries.push({
      id: ids[i]!,           // non-null: same length as owners in fetch step
      owner: owners[i]!,
      avgX100: Number.isFinite(avgVal) ? avgVal : 0,
      count,
    })
  }

  return entries
}

/**
 * Detailed Top list (unsliced) for UI/leaderboards.
 * - Filters out entries with avg = 0
 * - Applies `minCount` threshold
 * - Sorts by avg desc, then count desc, then id asc
 */
export async function computeTopDetailed(
  maxScan = 50,
  minCount = 1
): Promise<TopEntry[]> {
  if (!PROFILE_REGISTRY || !RATINGS) return []

  const { ids, owners } = await fetchOwnersFromRegistry(maxScan)
  if (!ids.length) return []

  const entries = await readRatingsForOwners(ids, owners)

  return entries
    .filter((e) => e.avgX100 > 0 && e.count >= Math.max(0, minCount))
    .sort((a, b) => {
      if (b.avgX100 !== a.avgX100) return b.avgX100 - a.avgX100
      if (b.count !== a.count) return b.count - a.count
      return a.id - b.id
    })
}

/**
 * Cached Top-3 (ids only).
 * - 60s TTL caching via Upstash KV (falls back to memory shim).
 * - Uses `minCount=1` by default (at least one rating).
 */
export async function computeTop3(maxScan = 50, minCount = 1): Promise<number[]> {
  if (!PROFILE_REGISTRY || !RATINGS) return []

  const key = keyFor(maxScan, minCount)
  const cached = await kvGetJSON<number[]>(key)
  if (cached && Array.isArray(cached)) return cached

  try {
    const full = await computeTopDetailed(maxScan, minCount)
    const top3 = full.slice(0, 3).map((e) => e.id)
    await kvSetJSON(key, top3, 60) // 60s TTL
    return top3
  } catch {
    return []
  }
}

export default computeTop3
