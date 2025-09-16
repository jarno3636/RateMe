// /app/api/kv-index/route.ts
import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

export async function POST(req: Request) {
  try {
    const { id, handle, owner, name, avatar, bio } = await req.json()

    if (!id || !handle || !owner) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const norm = String(handle).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")

    // Main lookups
    await kv.set(`handle:${norm}`, String(id))
    await kv.set(`owner:${String(owner).toLowerCase()}`, String(id))

    // Cache profile metadata for faster reads (optional)
    await kv.hset(`profile:${id}`, {
      handle: norm,
      name: String(name ?? ""),
      avatar: String(avatar ?? ""),
      bio: String(bio ?? ""),
      owner: String(owner).toLowerCase(),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "index failed" }, { status: 500 })
  }
}
