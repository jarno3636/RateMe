// /app/api/recompute/route.ts
import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { computeTop3 } from "@/lib/top3"

export const dynamic = "force-dynamic"

// Recompute top3 leaderboard and store in KV
export async function POST() {
  try {
    const ids = await computeTop3(100) // scan first 100 profiles
    await kv.set("creator:top3", ids)
    return NextResponse.json({ ok: true, ids })
  } catch (err) {
    console.error("Recompute error", err)
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 })
  }
}
