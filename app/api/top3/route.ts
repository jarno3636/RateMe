// /app/api/top3/route.ts
import { NextResponse } from "next/server";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";
import { computeTop3 } from "@/lib/top3";
import * as ADDR from "@/lib/addresses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Namespace by registry to avoid cross-deploy collisions
const REG = ADDR.PROFILE_REGISTRY || "unknown";
const KEY = `onlystars:${REG}:top3:ids`;

// Normalize any prior KV shapes to number[]
function toNumIds(input: unknown): number[] {
  if (!input) return [];
  // v1 shape: { ids: string[] }
  if (typeof input === "object" && input !== null && Array.isArray((input as any).ids)) {
    return (input as any).ids
      .map((v: unknown) =>
        typeof v === "string" && /^[0-9]+$/.test(v) ? Number(v) : Number.NaN
      )
      .filter(Number.isFinite);
  }
  // v0 shape: number[]
  if (Array.isArray(input)) {
    return input
      .map((v) =>
        typeof v === "number" && Number.isFinite(v)
          ? Math.trunc(v)
          : typeof v === "string" && /^[0-9]+$/.test(v)
          ? Number(v)
          : Number.NaN
      )
      .filter(Number.isFinite);
  }
  return [];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fresh = searchParams.get("fresh") === "1";
    let maxScan = Number(searchParams.get("maxScan") ?? 50);
    if (!Number.isFinite(maxScan)) maxScan = 50;
    maxScan = Math.max(10, Math.min(200, Math.floor(maxScan)));

    if (!fresh) {
      const cached = await kvGetJSON<unknown>(KEY).catch(() => null);
      const idsFromCache = toNumIds(cached);
      if (idsFromCache.length) {
        return NextResponse.json(
          { ids: idsFromCache, cached: true },
          { headers: { "cache-control": "public, max-age=10, s-maxage=10, stale-while-revalidate=30" } }
        );
      }
    }

    // Fallback to on-chain compute
    const computed = await computeTop3(maxScan); // returns number[] (by our lib)
    const ids = (computed ?? []).filter((n) => Number.isFinite(n) && n > 0);

    // Best-effort KV write; store as an object to align with /api/recompute
    void kvSetJSON(KEY, { ids }, 60).catch(() => null);

    return NextResponse.json(
      { ids, cached: false },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    // Never blow up the client; return stable shape
    return NextResponse.json(
      { ids: [], cached: false, error: e?.message ?? "top3 failed" },
      { headers: { "cache-control": "no-store" } }
    );
  }
}
