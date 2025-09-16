// /app/api/check-handle/route.ts
import { kv } from "@/lib/kv"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get("handle")?.toLowerCase()
  if (!handle) return NextResponse.json({ ok: false, reason: "No handle" })

  const exists = await kv.get(`handle:${handle}`)
  if (exists) return NextResponse.json({ ok: false, reason: "Already registered" })

  return NextResponse.json({ ok: true })
}
