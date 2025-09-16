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

    // Defensive: align lengths
    const n = Math.min(ids.length, owners.length)
    const idsN = ids.slice(0, n)
    const ownersN = owners.slice(0, n)

    // Build calls (lightly typed to avoid deep generic expansion)
    const calls: any[] = ownersN.map((owner) => ({
      address: RATINGS,
      abi: Ratings as any,
      functionName: "getAverage",
      args: [owner],
    }))

    // Allow failure; coarse result typing to keep TS happy on Vercel
    const results = (await publicClient.multicall({
      contracts: calls as any,
      allowFailure: true,
    })) as Array<{ status: "success" | "failure"; result?: unknown }>

    const entries = idsN.map((id, i) => {
      const r = results[i]
      const avg = r && r.status === "success" ? (r.result as bigint) : 0n
      return { id: Number(id), owner: ownersN[i], avgX100: Number(avg) }
    })

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
