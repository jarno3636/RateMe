// /app/api/creator-stats/route.ts
import { NextResponse } from "next/server"
import { publicClient } from "@/lib/chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import CreatorHub from "@/abi/CreatorHub.json"
import Ratings from "@/abi/Ratings"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
const CREATOR_HUB     = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}`
const RATINGS         = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idStr = searchParams.get("id") || ""
    if (!idStr) {
      return NextResponse.json(
        { subs: 0, mrr: 0, sales: 0, ratingAvgX100: 0, ratingCount: 0 },
        { status: 200 }
      )
    }

    let id: bigint
    try { id = BigInt(idStr) } catch { id = 0n }

    // getProfile(id) -> (owner_, handle_, displayName_, avatarURI_, bio_, fid_, createdAt_)
    const prof = await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "getProfile",
      args: [id],
    }) as unknown as [ `0x${string}`, ...unknown[] ]

    const owner = prof?.[0] as `0x${string}` | undefined
    if (!owner || owner === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { subs: 0, mrr: 0, sales: 0, ratingAvgX100: 0, ratingCount: 0 },
        { status: 200 }
      )
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
    const ratingCount = Number((stats?.[0] ?? 0n))

    // Estimate MRR as sum of pricePerPeriod for active plans
    // plans(id) -> [creator, token, pricePerPeriod, periodDays, active, name, metadataURI]
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

    // Convert 6dp USDC units → decimal number
    const mrr = Number(mrrUnits) / 1e6

    // We cannot read true subscriber count or post sales count from state without indexing events.
    // Keep them as 0 so the UI remains stable.
    return NextResponse.json({
      subs: 0,
      sales: 0,
      mrr,
      ratingAvgX100,
      ratingCount,
      // (optional extras you can use later if desired)
      planCount: planIds?.length ?? 0,
      postCount: postIds?.length ?? 0,
    })
  } catch (e) {
    console.error("creator-stats api error:", e)
    return NextResponse.json(
      { subs: 0, mrr: 0, sales: 0, ratingAvgX100: 0, ratingCount: 0 },
      { status: 200 }
    )
  }
}
