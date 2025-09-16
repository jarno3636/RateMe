// /lib/profileCache.ts
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import { publicClient } from "@/lib/chain"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
type Snap = { id: number; owner: `0x${string}`; handle: string; name: string; avatar: string }

export async function getProfileSnaps(ids: number[]): Promise<Snap[]> {
  if (ids.length === 0) return []
  const ttlSec = 120

  const snaps: Snap[] = []
  const misses: number[] = []

  // try KV first
  for (const id of ids) {
    const s = await kvGetJSON<Snap>(`onlystars:profile:${id}`)
    if (s) snaps.push(s)
    else misses.push(id)
  }

  if (misses.length) {
    const res = (await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "getProfilesFlat",
      args: [misses.map(BigInt)],
    })) as unknown as [
      bigint[], string[], string[], string[], string[], string[], bigint[], bigint[]
    ]

    const outIds  = res?.[0] ?? []
    const owners  = res?.[1] ?? []
    const handles = res?.[2] ?? []
    const names   = res?.[3] ?? []
    const avatars = res?.[4] ?? []

    const fresh = outIds.map((id, i) => ({
      id: Number(id),
      owner: owners[i] as `0x${string}`,
      handle: String(handles[i] ?? ""),
      name: String(names[i] ?? `Profile #${Number(id)}`),
      avatar: String(avatars[i] ?? ""),
    }))

    // save to KV
    await Promise.all(
      fresh.map((s) => kvSetJSON(`onlystars:profile:${s.id}`, s, ttlSec))
    )

    snaps.push(...fresh)
  }

  // return in original order
  const map = new Map(snaps.map((s) => [s.id, s]))
  return ids.map((id) => map.get(id)!).filter(Boolean)
}
