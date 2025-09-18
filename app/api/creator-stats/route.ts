// /app/api/creator-stats/route.ts
import { NextResponse } from "next/server"
import { publicClient } from "@/lib/chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import CreatorHub from "@/abi/CreatorHub.json"
// NOTE: make sure the Ratings ABI path matches your repo (.json)
import Ratings from "@/abi/Ratings.json"

import { kvGetJSON, kvSetJSON } from "@/lib/kv"

export const dynamic = "force-dynamic" // we decide caching via KV

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined
const CREATOR_HUB     = process.env.NEXT_PUBLIC_CREATOR_HUB     as `0x${string}` | undefined
const RATINGS         = process.env.NEXT_PUBLIC_RATINGS         as `0x${string}` | undefined

// TTL for KV cache (seconds)
const TTL_SEC = 45

type StatsPayload = {
  subs: number
  sales: number
  mrr: number
  ratingAvgX100: number
  ratingCount: number
  planCount?: number
  postCount?: number
}

function empty(): StatsPayload {
  return { subs: 0, mrr: 0, sales: 0, ratingAvgX100: 0, ratingCount: 0 }
}

export async function GET(req: Request) {
  try {
    // Basic input parse + guard
    const { searchParams } = new URL(req.url)
    const idStr = (searchParams.get("id") || "").trim()
    let id = 0n
    try { id = idStr ? BigInt(idStr) : 0n } catch { id = 0n }

    // If no id, return benign zeros (UI expects stable shape)
    if (!id) {
      return NextResponse.json(empty(), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      })
    }

    // Missing envs? Don’t explode — return zeros (but log once)
    if (!PROFILE_REGISTRY || !CREATOR_HUB || !RATINGS) {
      return NextResponse.json(empty(), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      })
    }

    // KV cache first
    const cacheKey = `onlystars:creator-stats:id:${idStr}`
    const cached = await kvGetJSON<StatsPayload>(cacheKey).catch(() => null)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          // Client may still re-hit; we keep API “dynamic” but OK to hint
          "cache-control": "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
        },
      })
    }

    // getProfile(id) -> (owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_)
    const prof = (await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "getProfile",
      args: [id],
    })) as unknown as [`0x${string}`, ...unknown[]]

    const owner = prof?.[0] as `0x${string}` | undefined
    if (!owner || owner === "0x0000000000000000000000000000000000000000") {
      const payload = empty()
      // cache empty too so we don’t spam chain when an id is invalid
      await kvSetJSON(cacheKey, payload, TTL_SEC).catch(() => null)
      return NextResponse.json(payload, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
        },
      })
    }

    // Parallel reads: ratings + creator plan/post ids
    const [avgX100Bn, stats, planIds, postIds] = await Promise.all([
      publicClient.readContract({
        address: RATINGS,
        abi: Ratings as any,
        functionName: "getAverage",
        args: [owner],
      }) as Promise<bigint>,
      publicClient.readContract({
        address: RATINGS,
        abi: Ratings as any,
        functionName: "getStats",
        args: [owner],
      }) as Promise<[bigint, bigint]>, // [count, totalScore]
      publicClient.readContract({
        address: CREATOR_HUB,
        abi: CreatorHub as any,
        functionName: "getCreatorPlanIds",
        args: [owner],
      }) as Promise<bigint[]>,
      publicClient.readContract({
        address: CREATOR_HUB,
        abi: CreatorHub as any,
        functionName: "getCreatorPostIds",
        args: [owner],
      }) as Promise<bigint[]>,
    ])

    const ratingAvgX100 = Number(avgX100Bn ?? 0n)
    const ratingCount   = Number(stats?.[0] ?? 0n)

    // Estimate MRR as sum of active plan pricePerPeriod (USDC has 6dp)
    let mrrUnits = 0n
    if (Array.isArray(planIds) && planIds.length > 0) {
      const plans = await Promise.all(
        planIds.map((pid) =>
          publicClient.readContract({
            address: CREATOR_HUB,
            abi: CreatorHub as any,
            functionName: "plans",
            args: [pid],
          }) as Promise<[ `0x${string}`, `0x${string}`, bigint, bigint, boolean, string, string ]>
        )
      )
      for (const p of plans) {
        const active = Boolean(p?.[4])
        const pricePerPeriod = BigInt(p?.[2] ?? 0n)
        if (active) mrrUnits += pricePerPeriod
      }
    }

    const payload: StatsPayload = {
      subs: 0,               // needs indexer; keep UI stable
      sales: 0,              // needs indexer; keep UI stable
      mrr: Number(mrrUnits) / 1e6,
      ratingAvgX100,
      ratingCount,
      planCount: planIds?.length ?? 0,
      postCount: postIds?.length ?? 0,
    }

    // Cache (best-effort)
    await kvSetJSON(cacheKey, payload, TTL_SEC).catch(() => null)

    return NextResponse.json(payload, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
      },
    })
  } catch (e) {
    console.error("creator-stats api error:", e)
    // Return stable shape so UI never explodes
    return NextResponse.json(empty(), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    })
  }
}
