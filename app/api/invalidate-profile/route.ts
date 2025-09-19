// /app/api/invalidate-profile/route.ts
import { NextResponse } from "next/server";
import { kvDel } from "@/lib/kv";
import * as ADDR from "@/lib/addresses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/invalidate-profile?id=123
 * body (JSON) also supported:
 * {
 *   "id": "123",
 *   "handle": "alice" // optional, if you changed the handle
 * }
 *
 * Clears KV entries related to a profile so the UI re-fetches fresh data.
 * - profile snapshots (/lib/profileCache.ts)
 * - discover pages (/app/api/discover)
 * - creator stats (/app/api/creator-stats)
 * - handle checks (/app/api/check-handle)
 * - handle resolver (/app/creator/resolve/[handle])
 * - top3 results (/api/top3 if present in your codebase)
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get("id") || "";
    const queryHandle = (url.searchParams.get("handle") || "").trim();
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      handle?: string;
    };

    const id = String(body?.id ?? queryId).trim();
    const handle = String(body?.handle ?? queryHandle).trim();

    if (!id || !/^[0-9]+$/.test(id)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid profile id" },
        { status: 400 }
      );
    }

    // Namespace by active registry so multiple deployments don't collide.
    const REG = ADDR.PROFILE_REGISTRY || "unknown";

    // Known keys we use elsewhere:
    // - profile snapshots: onlystars:{REG}:profile:{id}
    // - discover cache pages: onlystars:{REG}:discover:v2:c{cursor}:s{size}
    // - creator stats: onlystars:creator-stats:id:{id}
    // - handle quick-check: onlystars:{REG}:handle:{handle}
    // - handle resolve:    onlystars:resolve:{REG}:{handle}
    // - leaderboard/top3:  onlystars:{REG}:top3:ids   (and a legacy fallback)
    const keys: string[] = [
      // Profile snapshot (server cache)
      `onlystars:${REG}:profile:${id}`,

      // Creator stats for this profile id
      `onlystars:creator-stats:id:${id}`,

      // Top3 variants (new + possible legacy)
      `onlystars:${REG}:top3:ids`,
      "onlystars:top3:ids", // legacy fallback key if it exists in older deployments
    ];

    // If handle provided, clear handle-related caches too.
    if (handle) {
      keys.push(
        // Fast availability check from /api/check-handle
        `onlystars:${REG}:handle:${handle.toLowerCase()}`,
        // Resolve cache from /app/creator/resolve/[handle]
        `onlystars:resolve:${REG}:${handle.toLowerCase()}`
      );
    }

    // Discover pages don’t store per-profile rows; we invalidate a small window
    // of popular cursor/size combos so the list refreshes quickly. This is a
    // best-effort sweep and safe to no-op if keys don’t exist.
    const cursors = ["0"]; // expand if you page from other cursors
    const sizes = ["12", "24", "36", "48"];
    for (const c of cursors) {
      for (const s of sizes) {
        keys.push(`onlystars:${REG}:discover:v2:c${c}:s${s}`);
      }
    }

    // Perform deletes (best-effort; kvDel already guards and returns count)
    await kvDel(...keys);

    return NextResponse.json(
      { ok: true, id, handle: handle || null, deletedKeysTried: keys.length },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[invalidate-profile]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "invalidate-profile failed" },
      { status: 500 }
    );
  }
}
