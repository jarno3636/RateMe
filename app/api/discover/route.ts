// /app/api/discover/route.ts
import { NextResponse } from "next/server"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { publicClient } from "@/lib/chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}` | undefined
const DEFAULT_TTL_SECONDS = 45 // cache small windows for snappy UX

export const dynamic = "force-dynamic" // we decide cache via KV

type WireTuple = [
  string[],        // ids
  `0x${string}`[], // owners
  string[],        // handles
  string[],        // displayNames
  string[],        // avatarURIs
  string[],        // bios
  string[],        // fids
  string[],        // createdAts
  string           // nextCursor
]

export async function GET(req: Request) {
  try {
    if (!PROFILE_REGISTRY) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_PROFILE_REGISTRY" },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(req.url)

    // Parse + bound inputs
    const cursorStr = searchParams.get("cursor") ?? "0"
    const sizeStr   = searchParams.get("size") ?? "12"

    let cursor: bigint
    let size: bigint
    try {
      cursor = BigInt(cursorStr)
      size   = BigInt(sizeStr)
    } catch {
      return NextResponse.json({ error: "Invalid cursor/size" }, { status: 400 })
    }
    if (cursor < 0n) cursor = 0n
    // Keep page size sensible; contract will handle bigger, but let’s be nice
    if (size < 1n) size = 1n
    if (size > 48n) size = 48n

    const cacheKey = `discover:${PROFILE_REGISTRY}:c${cursor}:s${size}`

    // 1) KV cache
    const cached = await kvGetJSON<{ data: WireTuple }>(cacheKey)
    if (cached?.data) {
      return NextResponse.json(cached, {
        headers: { "content-type": "application/json; charset=utf-8" },
      })
    }

    // 2) Chain read
    const res = (await publicClient.readContract({
      address: PROFILE_REGISTRY,
      abi: ProfileRegistry as any,
      functionName: "listProfilesFlat",
      args: [cursor, size],
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

    // 3) Encode bigints → strings for JSON
    const payload = {
      data: [
        res[0].map(String),
        res[1],
        res[2],
        res[3],
        res[4],
        res[5],
        res[6].map(String),
        res[7].map(String),
        String(res[8]),
      ] as WireTuple,
    }

    // 4) KV store (cache empty pages too)
    await kvSetJSON(cacheKey, payload, DEFAULT_TTL_SECONDS)

    return NextResponse.json(payload, {
      headers: { "content-type": "application/json; charset=utf-8" },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "discover failed" },
      { status: 500 },
    )
  }
}
