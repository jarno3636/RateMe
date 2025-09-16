// /lib/top3.ts
import { publicClient } from "./chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import Ratings from "@/abi/Ratings"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

/**
 * Fetch first N profiles (flat) then compute rating averages for each owner.
 * Returns up to 3 profile IDs with highest avg. Safe: never throws, returns [] on error.
 */
export async function computeTop3(maxScan = 50): Promise<number[]> {
  try {
    // listProfilesFlat(uint256 cursor, uint256 size)
    // [outIds, owners, handles, displayNames, avatarURIs, bios, fids, createdAts, nextCursor]
    const res = (await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [0n, BigInt(maxScan)],
    })) as unknown as [
      bigint[],            // outIds
      `0x${string}`[],     // owners
      string[],            // handles
      string[],            // displayNames
      string[],            // avatarURIs
      string[],            // bios
      bigint[],            // fids
      bigint[],            // createdAts
      bigint               // nextCursor
    ]

    const ids = (res?.[0] ?? []) as bigint[]
    const owners = (res?.[1] ?? []) as `0x${string}`[]
    if (!ids.length || !owners.length) return []

    // Compute averages (x100) per owner
    const entries = await Promise.all(
      ids.map(async (id, i) => {
        const owner = owners[i]
        if (!owner) return { id: Number(id), owner: "0x0" as `0x${string}`, avgX100: 0 }
        let avg: bigint = 0n
        try {
          avg = (await publicClient.readContract({
            address: RATINGS,
            abi: Ratings as any,
            functionName: "getAverage",
            args: [owner],
          })) as bigint
        } catch {
          // unrated or ABI mismatch — treat as 0
        }
        return { id: Number(id), owner, avgX100: Number(avg) }
      })
    )

    return entries
      .filter((e) => Number.isFinite(e.avgX100) && e.avgX100 > 0)
      .sort((a, b) => b.avgX100 - a.avgX100)
      .slice(0, 3)
      .map((r) => r.id)
  } catch (err) {
    console.error("computeTop3 failed:", err)
    return []
  }
}
