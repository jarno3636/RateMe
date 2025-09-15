// /app/api/recompute/route.ts
import { NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { computeTop3 } from "@/lib/top3"

export async function POST() {
  const ids = await computeTop3(100)
  await kv.set("creator:top3", ids)
  return NextResponse.json({ ok: true, ids })
}
