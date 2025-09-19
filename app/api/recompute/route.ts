// /app/api/recompute/route.ts
import { NextResponse } from "next/server";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";
import { computeTop3 } from "@/lib/top3";
import * as ADDR from "@/lib/addresses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Namespace by registry so multiple deployments don't collide
const REG = ADDR.PROFILE_REGISTRY || "unknown";
const TOP3_KEY = `onlystars:${REG}:top3:ids`;

/** Optional bearer secret guard. If RECOMPUTE_SECRET is unset, the route is open. */
function checkAuth(req: Request) {
  const secret = process.env.RECOMPUTE_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return token === secret;
}

/** GET -> read current cached top3 ids (strings) */
export async function GET() {
  try {
    const payload = await kvGetJSON<{ ids: string[] }>(TOP3_KEY);
    const ids = Array.isArray(payload?.ids) ? payload!.ids : [];
    return NextResponse.json(
      { ok: true, ids },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/recompute][GET] error:", err);
    return NextResponse.json(
      { ok: false, ids: [] },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }
}

/**
 * POST -> recompute leaderboard and write to KV.
 * Optional query: ?maxScan=100  (default 100, min 10, max 500)
 */
export async function POST(req: Request) {
  try {
    if (!checkAuth(req)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let maxScan = Number(searchParams.get("maxScan") ?? 100);
    if (!Number.isFinite(maxScan)) maxScan = 100;
    maxScan = Math.max(10, Math.min(500, Math.floor(maxScan)));

    // computeTop3 is pure/read-only; it already guards missing envs internally
    const raw = await computeTop3(maxScan);

    // Normalize ids to strings and drop empties
    const ids = (raw ?? [])
      .map((v: unknown) =>
        typeof v === "bigint"
          ? v.toString()
          : typeof v === "number" && Number.isFinite(v)
          ? Math.trunc(v).toString()
          : typeof v === "string"
          ? v.trim()
          : ""
      )
      .filter((s) => /^[0-9]+$/.test(s));

    // Persist the small blob (no TTL so it's stable until the next recompute)
    await kvSetJSON(TOP3_KEY, { ids });

    return NextResponse.json(
      { ok: true, ids },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/recompute][POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "failed" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
