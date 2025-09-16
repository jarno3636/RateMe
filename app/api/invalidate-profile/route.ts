// /app/api/invalidate-profile/route.ts
import { NextResponse } from "next/server"
import { kvDel } from "@/lib/kv"

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 })
  await kvDel(`onlystars:profile:${id}`, "onlystars:top3:ids")
  return NextResponse.json({ ok: true })
}
