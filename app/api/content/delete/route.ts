// app/api/content/delete/route.ts
import { NextResponse } from "next/server"
import { kvSetJSON } from "@/lib/kv"

// Namespace deletes by deployed registry to avoid cross-env collisions
const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY || "unknown"

type Body = {
  id?: string
  kind?: "post" | "plan"
  by?: `0x${string}` | string           // optional: who requested (for audit UI)
  reason?: string                       // optional: short reason
  ttlDays?: number                      // optional: retention
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null
    const id = body?.id?.trim()
    const kind = body?.kind

    if (!id || !kind) {
      return NextResponse.json({ error: "Missing id/kind" }, { status: 400 })
    }

    // Soft-delete record
    const ttlDays = Number.isFinite(body?.ttlDays) ? Math.max(1, Math.min(90, body!.ttlDays!)) : 30
    const ttlSec = ttlDays * 24 * 60 * 60

    const key = `onlystars:${REGISTRY}:deleted:${kind}:${id}`

    await kvSetJSON(key, {
      id,
      kind,
      at: Date.now(),
      by: body?.by || "",
      reason: (body?.reason || "").slice(0, 240),
      version: 1,
    }, ttlSec)

    return NextResponse.json(
      { ok: true, key, ttlDays },
      { headers: { "cache-control": "no-store" } },
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "delete failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    )
  }
}

// Optional: guard unsupported methods if you add a GET later.
