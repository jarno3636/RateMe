// /app/api/top3/route.ts
import { NextResponse } from "next/server"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { computeTop3 } from "@/lib/top3"

const KEY = "onlystars:top3:ids"

export async function GET() {
  try {
    const cached = await kvGetJSON<number[]>(KEY)
    if (cached && cached.length) {
      return NextResponse.json({ ids: cached, cached: true })
    }
    const ids = await computeTop3(50)
    await kvSetJSON(KEY, ids, 60) // cache for 60s
    return NextResponse.json({ ids, cached: false })
  } catch (e: any) {
    return NextResponse.json({ ids: [] }, { status: 200 })
  }
}
