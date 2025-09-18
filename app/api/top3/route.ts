// /app/api/top3/route.ts
import { NextResponse } from "next/server"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { computeTop3 } from "@/lib/top3"

const KEY = "onlystars:top3:ids"

export const runtime = "nodejs"          // avoid edge/env quirks
export const dynamic = "force-dynamic"   // compute on demand

export async function GET() {
  try {
    const cached = await kvGetJSON<number[]>(KEY)
    if (cached?.length) {
      return NextResponse.json({ ids: cached, cached: true })
    }

    const ids = await computeTop3(50)
    // best-effort cache; don’t block response if KV fails
    void kvSetJSON(KEY, ids, 60).catch(() => {})
    return NextResponse.json({ ids, cached: false })
  } catch (e: any) {
    // Return 200 with an empty list so the client never crashes
    return NextResponse.json({ ids: [], cached: false, error: e?.message ?? "top3 failed" })
  }
}
