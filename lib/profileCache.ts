// /lib/profileCache.ts
import "server-only";

import ProfileRegistry from "@/abi/ProfileRegistry.json";
import { publicClient } from "@/lib/chain";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";

export type Snap = {
  id: number;
  owner: `0x${string}`;
  handle: string;
  name: string;
  avatar: string;
};

const PROFILE_REGISTRY = process.env
  .NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined;

const TTL_SEC = 120;
const keyFor = (id: number) =>
  `onlystars:${PROFILE_REGISTRY ?? "unknown"}:profile:${id}`;

export async function getProfileSnaps(ids: number[]): Promise<Snap[]> {
  if (!ids?.length) return [];
  if (!PROFILE_REGISTRY) {
    console.warn("[profileCache] NEXT_PUBLIC_PROFILE_REGISTRY not set");
    return [];
  }

  const snaps: Snap[] = [];
  const misses: number[] = [];

  // 1) Try KV cache (namespaced by registry)
  for (const id of ids) {
    try {
      const cached = await kvGetJSON<Snap>(keyFor(id));
      if (cached) snaps.push(cached);
      else misses.push(id);
    } catch {
      // If KV is misconfigured, just treat as a miss.
      misses.push(id);
    }
  }

  // 2) Fetch chain for cache misses (batch)
  if (misses.length) {
    try {
      const res = (await publicClient.readContract({
        address: PROFILE_REGISTRY,
        abi: ProfileRegistry as any,
        functionName: "getProfilesFlat", // expects uint256[] -> flat arrays
        args: [misses.map((n) => BigInt(n))],
      })) as unknown as [
        bigint[], // outIds
        string[], // owners
        string[], // handles
        string[], // displayNames
        string[], // avatarURIs
        string[], // bios
        bigint[], // fids
        bigint[]  // createdAts
      ];

      const outIds = res?.[0] ?? [];
      const owners = res?.[1] ?? [];
      const handles = res?.[2] ?? [];
      const names = res?.[3] ?? [];
      const avatars = res?.[4] ?? [];

      const fresh: Snap[] = outIds.map((bid, i) => ({
        id: Number(bid),
        owner: ((owners[i] ??
          "0x0000000000000000000000000000000000000000") as string) as `0x${string}`,
        handle: String(handles[i] ?? ""),
        name: String(names[i] ?? `Profile #${Number(bid)}`),
        avatar: String(avatars[i] ?? ""),
      }));

      // 3) Cache fresh in KV (best-effort; ignore failures)
      await Promise.all(
        fresh.map((s) => kvSetJSON(keyFor(s.id), s, TTL_SEC).catch(() => null))
      );

      snaps.push(...fresh);
    } catch (err) {
      console.warn("[profileCache] chain read failed:", err);
      // fall through with whatever we already have from cache
    }
  }

  // 4) Preserve input order & drop holes
  const byId = new Map(snaps.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter((x): x is Snap => Boolean(x));
}
