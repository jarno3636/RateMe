// /app/api/top3/route.ts
import { NextResponse } from "next/server"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { computeTop3 } from "@/lib/top3"

const KEY = "onlystars:top3:ids"

// Force Node runtime (avoids some edge/env quirks)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // best-effort KV read
    const cached = await kvGetJSON<number[]>(KEY)
    if (cached?.length) {
      return NextResponse.json({ ids: cached, cached: true })
    }

    const ids = await computeTop3(50)

    // best-effort KV write
    void kvSetJSON(KEY, ids, 60).catch(() => {})

    return NextResponse.json({ ids, cached: false })
  } catch (e: any) {
    // Return 200 with empty ids so the client never explodes on status != 200
    return NextResponse.json({ ids: [], cached: false, error: e?.message || "top3 failed" })
  }
}
