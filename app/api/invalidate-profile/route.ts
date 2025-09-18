import { NextResponse } from "next/server"
import { kvDel } from "@/lib/kv"

/**
 * POST /api/invalidate-profile?id=123
 * - Removes cached KV entries for a profile.
 * - Useful after profile updates, deletions, or moderation.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid profile id" },
        { status: 400 },
      )
    }

    // Delete specific profile + related caches (expandable if needed)
    await kvDel(
      `onlystars:profile:${id}`,
      "onlystars:top3:ids",
      `discover:*:${id}` // optional: wipe from discover pages if you store per-profile cache
    )

    return NextResponse.json(
      { ok: true, id },
      { status: 200 }
    )
  } catch (err: any) {
    console.error("[invalidate-profile]", err)
    return NextResponse.json(
      { ok: false, error: err?.message || "invalidate-profile failed" },
      { status: 500 },
    )
  }
}
