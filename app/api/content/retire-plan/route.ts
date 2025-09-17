// app/api/content/retire-plan/route.ts
import { NextResponse } from "next/server"

let kv: any = null
try {
  kv = require("@/lib/kv").kv
} catch {}

export async function POST(req: Request) {
  if (!kv) return NextResponse.json({ error: "KV not configured" }, { status: 501 })
  const body = await req.json().catch(() => null)
  const id = body?.id as string | undefined
  const name = body?.name as string | undefined
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  const key = `retired:plan:${id}`
  await kv.set(key, { retired: true, at: Date.now(), name: name || "" })
  return NextResponse.json({ ok: true })
}
