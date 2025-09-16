// /app/api/discover/route.ts
import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { publicClient } from "@/lib/chain"
import ProfileRegistry from "@/abi/ProfileRegistry.json"

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`
const DEFAULT_TTL_SECONDS = 45 // tweak as you like

export const dynamic = "force-dynamic" // so we can control our own caching

// JSON can't carry bigint, so we stringify arrays of bigints.
// We return the SAME tuple order as listProfilesFlat:
// [ids, owners, handles, displayNames, avatarURIs, bios, fids, createdAts, nextCursor]
// with bigint fields encoded as strings.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cursor = BigInt(searchParams.get("cursor") ?? "0")
    const size = BigInt(searchParams.get("size") ?? "12")
    const key = `discover:${PROFILE_REGISTRY}:c${cursor}:s${size}`

    // 1) Try KV
    const cached = await kv.get<string>(key)
    if (cached) {
      return new NextResponse(cached, {
        headers: { "content-type": "application/json; charset=utf-8" },
      })
    }

    // 2) Read from chain
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

    // 3) Encode bigints as strings so JSON is valid
    const payload = JSON.stringify({
      data: [
        res[0].map(String), // ids
        res[1],             // owners
        res[2],             // handles
        res[3],             // displayNames
        res[4],             // avatarURIs
        res[5],             // bios
        res[6].map(String), // fids
        res[7].map(String), // createdAts
        String(res[8]),     // nextCursor
      ],
    })

    // 4) Store in KV with TTL
    await kv.set(key, payload, { ex: DEFAULT_TTL_SECONDS })

    return new NextResponse(payload, {
      headers: { "content-type": "application/json; charset=utf-8" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "discover failed" }, { status: 500 })
  }
}
