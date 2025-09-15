// /lib/top3.ts
import { publicClient } from './chain'
import ProfileRegistry from '@/abi/ProfileRegistry.json'
import Ratings from '@/abi/Ratings.json'

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
const RATINGS = process.env.NEXT_PUBLIC_RATINGS as `0x${string}`

/**
 * Fetch first N profiles (flat) then compute rating averages for each owner.
 * Returns up to 3 profile IDs with highest avg (ties by count / recency could be added later).
 */
export async function computeTop3(maxScan = 50) {
  // listProfilesFlat(uint256 cursor, uint256 size)
  const [ids, owners] = await publicClient.readContract({
    address: PROFILE_REGISTRY,
    abi: ProfileRegistry as any,
    functionName: 'listProfilesFlat',
    args: [0n, BigInt(maxScan)],
  }) as unknown as [bigint[], string[], string[], string[], string[], string[], bigint[], bigint[], bigint]

  // getAverage(address ratee) -> avg x100 (0 if none)
  const entries = await Promise.all(
    ids.map(async (id, i) => {
      const owner = owners[i] as `0x${string}`
      const avgX100 = await publicClient.readContract({
        address: RATINGS,
        abi: Ratings as any,
        functionName: 'getAverage',
        args: [owner],
      }) as bigint
      return { id: Number(id), owner, avgX100: Number(avgX100) }
    })
  )

  const ranked = entries
    .filter(e => e.avgX100 > 0)
    .sort((a, b) => b.avgX100 - a.avgX100)
    .slice(0, 3)

  return ranked.map(r => r.id)
}
