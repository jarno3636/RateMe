// /lib/top3.ts
import { publicClient } from "./chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import Ratings from "@/abi/Ratings" // <-- TS ABI module (not JSON)

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

/**
 * Fetch first N profiles (flat) then compute rating averages for each owner.
 * Returns up to 3 profile IDs with highest avg (ties/recency rules can be layered later).
 */
export async function computeTop3(maxScan = 50) {
  // listProfilesFlat(uint256 cursor, uint256 size)
  // Returns:
  // [outIds, owners, handles, displayNames, avatarURIs, bios, fids, createdAts, nextCursor]
  const res = (await publicClient.readContract({
    address: PROFILE_REGISTRY,
    abi: ProfileRegistry as any,
    functionName: "listProfilesFlat",
    args: [0n, BigInt(maxScan)],
  })) as unknown as [
    bigint[],          // outIds
    `0x${string}`[],   // owners
    string[],          // handles
    string[],          // displayNames
    string[],          // avatarURIs
    string[],          // bios
    bigint[],          // fids
    bigint[],          // createdAts
    bigint             // nextCursor
  ]

  const ids = res?.[0] ?? []
  const owners = res?.[1] ?? []

  // getAverage(address ratee) -> avg x100 (0 if none)
  const entries = await Promise.all(
    ids.map(async (id, i) => {
      const owner = owners[i]
      let avgX100 = 0n
      try {
        avgX100 = (await publicClient.readContract({
          address: RATINGS,
          abi: Ratings as any,
          functionName: "getAverage",
          args: [owner],
        })) as bigint
      } catch {
        // treat as unrated
      }
      return { id: Number(id), owner, avgX100: Number(avgX100) }
    })
  )

  const ranked = entries
    .filter((e) => e.avgX100 > 0)
    .sort((a, b) => b.avgX100 - a.avgX100)
    .slice(0, 3)

  return ranked.map((r) => r.id)
}
