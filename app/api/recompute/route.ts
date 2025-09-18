// /app/api/recompute/route.ts
import { NextResponse } from "next/server"
import { kvGetJSON, kvSetJSON } from "@/lib/kv"
import { computeTop3 } from "@/lib/top3"

export const dynamic = "force-dynamic"

// Single source of truth for the leaderboard key
const TOP3_KEY = "onlystars:top3:ids"

// Optional: protect this endpoint with a simple secret
// Set RECOMPUTE_SECRET in your env; if not set, the route is open.
function checkAuth(req: Request) {
  const secret = process.env.RECOMPUTE_SECRET
  if (!secret) return true
  const header = req.headers.get("authorization") || ""
  // Accept either "Bearer <token>" or raw token
  const token = header.startsWith("Bearer ") ? header.slice(7) : header
  return token === secret
}

// GET -> read current cached top3
export async function GET() {
  try {
    const payload = await kvGetJSON<{ ids: string[] }>(TOP3_KEY)
    const ids = payload?.ids ?? []
    return NextResponse.json({ ok: true, ids }, {
      headers: { "cache-control": "no-store" },
    })
  } catch (err) {
    console.error("[api/recompute][GET] error:", err)
    return NextResponse.json({ ok: false, ids: [] }, {
      status: 200,
      headers: { "cache-control": "no-store" },
    })
  }
}

// POST -> recompute and write to KV
export async function POST(req: Request) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }

    // computeTop3(n) should be pure/read-only; scan first 100 profiles
    const raw = await computeTop3(100)

    // Normalize ids (tolerate bigint/number/string)
    const ids = (raw ?? []).map((v: unknown) => {
      if (typeof v === "bigint") return v.toString()
      if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v).toString()
      return String(v ?? "")
    }).filter(Boolean)

    // Persist as a small JSON blob (consistent with the rest of your KV usage)
    await kvSetJSON(TOP3_KEY, { ids })

    return NextResponse.json({ ok: true, ids }, {
      headers: { "cache-control": "no-store" },
    })
  } catch (err) {
    console.error("[api/recompute][POST] error:", err)
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 })
  }
}
