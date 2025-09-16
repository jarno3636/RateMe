/// /app/api/check-handle/route.ts
import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get("handle") || ""
  const handle = raw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")
  if (!handle) return NextResponse.json({ ok: false, reason: "No handle" }, { status: 400 })

  // KV quick check
  const exists = await kv.get<string>(`handle:${handle}`)
  if (exists) return NextResponse.json({ ok: false, reason: "Already registered" })

  return NextResponse.json({ ok: true })
}
