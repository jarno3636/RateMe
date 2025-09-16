// /lib/top3.ts
import { publicClient } from "./chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import Ratings from "@/abi/Ratings"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined
const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}` | undefined

/**
 * Fetch first N profiles (flat) then compute rating averages for each owner.
 * Returns up to 3 profile IDs with highest avg. Safe: never throws, returns [] on error.
 */
export async function computeTop3(maxScan = 50): Promise<number[]> {
  if (!PROFILE_REGISTRY || !RATINGS) {
    console.error("computeTop3: missing env (PROFILE_REGISTRY or RATINGS)")
    return []
  }

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

    // Align lengths just in case
    const n = Math.min(ids.length, owners.length)
    const idsN = ids.slice(0, n)
    const ownersN = owners.slice(0, n)

    // Parallel on-chain reads without multicall (avoids TS deep instantiation)
    const avgs = await Promise.all(
      ownersN.map(async (owner) => {
        try {
          const avg = (await publicClient.readContract({
            address: RATINGS,
            abi: Ratings as any,
            functionName: "getAverage",
            args: [owner],
          })) as bigint
          return Number(avg)
        } catch {
          return 0
        }
      })
    )

    const entries = idsN.map((id, i) => ({
      id: Number(id),
      owner: ownersN[i],
      avgX100: avgs[i] ?? 0,
    }))

    return entries
      .filter((e) => Number.isFinite(e.avgX100) && e.avgX100 > 0)
      .sort((a, b) => b.avgX100 - a.avgX100)
      .slice(0, 3)
      .map((e) => e.id)
  } catch (err) {
    console.error("computeTop3 failed:", err)
    return []
  }
}
