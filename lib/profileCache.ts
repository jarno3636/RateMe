// /lib/profileCache.ts
import "server-only"

import ProfileRegistry from "@/abi/ProfileRegistry.json"
import { publicServerClient } from "@/lib/chainServer"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { REGISTRY as PROFILE_REGISTRY } from "@/lib/addresses"

export type Snap = {
  id: number
  owner: `0x${string}`
  handle: string
  name: string
  avatar: string
  /** Optional Farcaster fid if registry stores it */
  fid?: number
  /** Convenience link when fid is available */
  fcUrl?: string
}

const TTL_SEC = 120
const DEFAULT_AVATAR = "/avatar.png"

// KV key (registry-scoped so different deployments don’t collide)
const keyFor = (id: number) =>
  `profile:${PROFILE_REGISTRY ?? "unknown"}:${id}`

/** Fetch a single profile snapshot (cached). */
export async function getProfileSnap(id: number): Promise<Snap | null> {
  const out = await getProfileSnaps([id])
  return out[0] ?? null
}

/** Fetch multiple profile snapshots (cached; preserves input order). */
export async function getProfileSnaps(ids: number[]): Promise<Snap[]> {
  if (!ids?.length) return []
  if (!PROFILE_REGISTRY) {
    console.warn("[profileCache] REGISTRY address missing")
    return []
  }

  // 1) KV lookups
  const cached: Array<Snap | null> = await Promise.all(
    ids.map(async (id) => {
      try {
        return (await kvGetJSON<Snap>(keyFor(id))) ?? null
      } catch {
        return null
      }
    })
  )

  const snaps: Snap[] = []
  const misses: number[] = []

  // Option 1: non-null assertion since cached derives from ids.map(...)
  cached.forEach((snap, i) => {
    if (snap) snaps.push(snap)
    else misses.push(ids[i]!)
  })

  // 2) Chain read for cache misses (batched call to getProfilesFlat)
  if (misses.length) {
    try {
      const res = (await publicServerClient.readContract({
        address: PROFILE_REGISTRY,
        abi: ProfileRegistry as any,
        functionName: "getProfilesFlat",
        args: [misses.map((n) => BigInt(n))],
      })) as unknown as [
        bigint[],          // outIds
        `0x${string}`[],   // owners
        string[],          // handles
        string[],          // displayNames
        string[],          // avatarURIs
        string[],          // bios (unused here)
        bigint[],          // fids
        bigint[]           // createdAts (unused here)
      ]

      const outIds  = res?.[0] ?? []
      const owners  = res?.[1] ?? []
      const handles = res?.[2] ?? []
      const names   = res?.[3] ?? []
      const avatars = res?.[4] ?? []
      const fidsArr = res?.[6] ?? []

      const len = Math.min(
        outIds.length,
        owners.length,
        handles.length,
        names.length,
        avatars.length,
        fidsArr.length
      )

      const fresh: Snap[] = []
      for (let i = 0; i < len; i++) {
        const bid    = outIds[i]
        const id     = Number(bid)
        const owner  = owners[i] || "0x0000000000000000000000000000000000000000"
        const handle = String(handles[i] ?? "")
        const name   = String(names[i] ?? (Number.isFinite(id) ? `Profile #${id}` : "Profile"))
        const avatar = String(avatars[i] || DEFAULT_AVATAR)
        const fidBn  = fidsArr[i]
        const fid    = typeof fidBn === "bigint" ? Number(fidBn) : 0

        fresh.push({
          id,
          owner: owner as `0x${string}`,
          handle,
          name,
          avatar: avatar || DEFAULT_AVATAR,
          ...(fid > 0 ? { fid, fcUrl: `https://warpcast.com/~/profiles/${fid}` } : {}),
        })
      }

      // 3) Cache fresh results (best effort)
      await Promise.all(
        fresh.map((s) => kvSetJSON(keyFor(s.id), s, TTL_SEC).catch(() => null))
      )

      snaps.push(...fresh)
    } catch (err) {
      console.warn("[profileCache] chain read failed:", err)
      // continue with whatever we had
    }
  }

  // 4) Preserve input order & drop holes
  const byId = new Map(snaps.map((s) => [s.id, s]))
  return ids.map((id) => byId.get(id)).filter((x): x is Snap => Boolean(x))
}

/**
 * Force-refresh specific ids from chain and update cache.
 * Returns the fresh snaps (same shape as getProfileSnaps).
 */
export async function refreshProfileSnaps(ids: number[]): Promise<Snap[]> {
  if (!ids?.length) return []
  if (!PROFILE_REGISTRY) {
    console.warn("[profileCache] REGISTRY address missing (refresh)")
    return []
  }
  try {
    const res = (await publicServerClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "getProfilesFlat",
      args: [ids.map((n) => BigInt(n))],
    })) as unknown as [
      bigint[],          // outIds
      `0x${string}`[],   // owners
      string[],          // handles
      string[],          // displayNames
      string[],          // avatarURIs
      string[],          // bios
      bigint[],          // fids
      bigint[]           // createdAts
    ]

    const outIds  = res?.[0] ?? []
    const owners  = res?.[1] ?? []
    const handles = res?.[2] ?? []
    const names   = res?.[3] ?? []
    const avatars = res?.[4] ?? []
    const fidsArr = res?.[6] ?? []

    const len = Math.min(
      outIds.length,
      owners.length,
      handles.length,
      names.length,
      avatars.length,
      fidsArr.length
    )

    const fresh: Snap[] = []
    for (let i = 0; i < len; i++) {
      const bid    = outIds[i]
      const id     = Number(bid)
      const owner  = owners[i] || "0x0000000000000000000000000000000000000000"
      const handle = String(handles[i] ?? "")
      const name   = String(names[i] ?? (Number.isFinite(id) ? `Profile #${id}` : "Profile"))
      const avatar = String(avatars[i] || DEFAULT_AVATAR)
      const fidBn  = fidsArr[i]
      const fid    = typeof fidBn === "bigint" ? Number(fidBn) : 0

      fresh.push({
        id,
        owner: owner as `0x${string}`,
        handle,
        name,
        avatar: avatar || DEFAULT_AVATAR,
        ...(fid > 0 ? { fid, fcUrl: `https://warpcast.com/~/profiles/${fid}` } : {}),
      })
    }

    await Promise.all(
      fresh.map((s) => kvSetJSON(keyFor(s.id), s, TTL_SEC).catch(() => null))
    )

    // Return in the same order as input ids
    const byId = new Map(fresh.map((s) => [s.id, s]))
    return ids.map((id) => byId.get(id)).filter((x): x is Snap => Boolean(x))
  } catch (err) {
    console.warn("[profileCache] refresh failed:", err)
    return []
  }
}
