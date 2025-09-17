// app/api/content/delete/route.ts
import { NextResponse } from "next/server"

let kv: any = null
try {
  // If you already have a kv client here, this will work.
  // e.g., export const kv = new KV(...) or upstash client
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  kv = require("@/lib/kv").kv
} catch {}

export async function POST(req: Request) {
  if (!kv) return NextResponse.json({ error: "KV not configured" }, { status: 501 })
  const body = await req.json().catch(() => null)
  const id = body?.id as string | undefined
  const kind = body?.kind as "post" | "plan" | undefined
  if (!id || !kind) return NextResponse.json({ error: "Missing id/kind" }, { status: 400 })
  const key = `deleted:${kind}:${id}`
  await kv.set(key, true)
  return NextResponse.json({ ok: true })
}
