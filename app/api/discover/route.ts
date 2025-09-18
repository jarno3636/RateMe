// /app/api/discover/route.ts
import { NextResponse } from "next/server"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { publicClient } from "@/lib/chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"
import CreatorHub from "@/abi/CreatorHub.json"
import Ratings from "@/abi/Ratings"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined
const CREATOR_HUB      = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}` | undefined
const RATINGS          = process.env.NEXT_PUBLIC_RATINGS as `0x${string}` | undefined

const DEFAULT_TTL_SECONDS = 45 // short TTL for snappy UX
export const dynamic = "force-dynamic" // caching handled via KV

type WireTuple = [
  string[],        // ids (as strings)
  `0x${string}`[], // owners
  string[],        // handles
  string[],        // displayNames
  string[],        // avatarURIs
  string[],        // bios
  string[],        // fids (as strings)
  string[],        // createdAts (unix, as strings)
  string           // nextCursor
]

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*")
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Content-Type")
  res.headers.set("Vary", "Origin")
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function GET(req: Request) {
  try {
    if (!PROFILE_REGISTRY) {
      return cors(NextResponse.json({ ok: false, error: "Missing NEXT_PUBLIC_PROFILE_REGISTRY" }, { status: 500 }))
    }

    const { searchParams } = new URL(req.url)
    const cursorStr = (searchParams.get("cursor") ?? "0").trim()
    const sizeStr   = (searchParams.get("size") ?? "12").trim()

    let cursor = 0n
    let size   = 12n
    try { cursor = BigInt(cursorStr) } catch { /* keep default */ }
    try { size   = BigInt(sizeStr)   } catch { /* keep default */ }

    if (cursor < 0n) cursor = 0n
    if (size   < 1n) size = 1n
    if (size   > 48n) size = 48n

    const cacheKey = `discover:v2:${PROFILE_REGISTRY}:c${cursor}:s${size}`

    // 1) KV cache
    const cached = await kvGetJSON<{ data: WireTuple; badges: string[][]; meta: any }>(cacheKey)
    if (cached?.data) {
      const res = NextResponse.json({ ok: true, ...cached }, {
        headers: { "content-type": "application/json; charset=utf-8", "x-kv-cache": "HIT" },
      })
      return cors(res)
    }

    // 2) Chain read: list page
    const res = await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [cursor, size],
    }) as unknown as [
      bigint[],            // ids
      `0x${string}`[],     // owners
      string[],            // handles
      string[],            // displayNames
      string[],            // avatarURIs
      string[],            // bios
      bigint[],            // fids
      bigint[],            // createdAts (unix)
      bigint               // nextCursor
    ]

    const idsBn       = (res?.[0] ?? [])
    const owners      = (res?.[1] ?? [])
    const handles     = (res?.[2] ?? [])
    const names       = (res?.[3] ?? [])
    const avatars     = (res?.[4] ?? [])
    const fidsBn      = (res?.[6] ?? [])
    const createdBn   = (res?.[7] ?? [])
    const nextCursorBn= (res?.[8] ?? 0n)

    const data: WireTuple = [
      idsBn.map(String),
      owners,
      handles,
      names,
      avatars,
      (res?.[5] ?? []),
      fidsBn.map(String),
      createdBn.map(String),
      String(nextCursorBn),
    ]

    // 3) Optional premium badge data (parallel requests — safe to skip if envs missing)
    // Plan counts (pro) and rating average (top / rising)
    const wantPlans   = Boolean(CREATOR_HUB)
    const wantRatings = Boolean(RATINGS)

    const planCounts: number[] = await (async () => {
      if (!wantPlans) return Array(owners.length).fill(0)
      const reads = owners.map((owner) =>
        publicClient.readContract({
          address: CREATOR_HUB!,
          abi: CreatorHub as any,
          functionName: "getCreatorPlanIds",
          args: [owner],
        }).then((arr: bigint[]) => arr?.length ?? 0).catch(() => 0)
      )
      return await Promise.all(reads)
    })()

    const avgX100s: number[] = await (async () => {
      if (!wantRatings) return Array(owners.length).fill(0)
      const reads = owners.map((owner) =>
        publicClient.readContract({
          address: RATINGS!,
          abi: Ratings as any,
          functionName: "getAverage",
          args: [owner],
        }).then((v: bigint) => Number(v ?? 0n)).catch(() => 0)
      )
      return await Promise.all(reads)
    })()

    // 4) Compute badges per profile (ids-aligned)
    const nowSec = Math.floor(Date.now() / 1000)
    const badges: string[][] = owners.map((_, i) => {
      const out: string[] = []
      const createdSec = Number(createdBn[i] ?? 0n)
      const fid = Number(fidsBn[i] ?? 0n)
      const avg = avgX100s[i] ?? 0
      const plans = planCounts[i] ?? 0

      if (fid > 0) out.push("verified")
      if (createdSec > 0 && (nowSec - createdSec) <= 14 * 24 * 3600) out.push("new")
      if (plans >= 1) out.push("pro")
      if (avg >= 480) out.push("top")
      if ((nowSec - createdSec) <= 60 * 24 * 3600 && avg >= 420) out.push("rising")

      return out
    })

    const payload = { data, badges, meta: { planCounts, avgX100s } }

    // 5) KV cache
    await kvSetJSON(cacheKey, payload, DEFAULT_TTL_SECONDS)

    const out = NextResponse.json({ ok: true, ...payload }, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-kv-cache": "MISS",
        "Cache-Control": "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
      },
    })
    return cors(out)
  } catch (err: any) {
    const res = NextResponse.json(
      { ok: false, error: err?.message || "discover failed" },
      { status: 500 }
    )
    return cors(res)
  }
}
