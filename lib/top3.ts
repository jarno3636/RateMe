// /lib/top3.ts
import "server-only"
import { publicClient } from "./chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import RatingsAbi from "@/abi/Ratings.json"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined
const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}` | undefined

export async function computeTop3(maxScan = 50): Promise<number[]> {
  if (!PROFILE_REGISTRY || !RATINGS) return []
  try {
    const res = (await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [0n, BigInt(maxScan)],
    })) as unknown as [
      bigint[], `0x${string}`[], string[], string[], string[], string[], bigint[], bigint[], bigint
    ]

    const ids = (res?.[0] ?? []) as bigint[]
    const owners = (res?.[1] ?? []) as `0x${string}`[]
    const n = Math.min(ids.length, owners.length)
    const idsN = ids.slice(0, n)
    const ownersN = owners.slice(0, n)

    const avgs = await Promise.all(
      ownersN.map(async (owner) => {
        try {
          const avg = (await publicClient.readContract({
            address: RATINGS!,
            abi: RatingsAbi as any,
            functionName: "getAverage",
            args: [owner],
          })) as bigint
          return Number(avg)
        } catch { return 0 }
      })
    )

    return idsN
      .map((id, i) => ({ id: Number(id), avgX100: avgs[i] ?? 0 }))
      .filter((e) => Number.isFinite(e.avgX100) && e.avgX100 > 0)
      .sort((a, b) => b.avgX100 - a.avgX100)
      .slice(0, 3)
      .map((e) => e.id)
  } catch { return [] }
}
export default computeTop3
