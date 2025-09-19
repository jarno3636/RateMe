// app/api/content/delete/route.ts
import { NextResponse } from "next/server";
import { kvSetJSON } from "@/lib/kv";

/** Dynamic (depends on live KV) + Edge for snappy latency */
export const dynamic = "force-dynamic";
export const runtime = "edge";

/** Namespace deletes by deployed registry to avoid cross-env collisions */
const REGISTRY = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY || "unknown").toLowerCase();

type Kind = "post" | "plan";

type Body = {
  /** Single id (stringified bigint) OR use `ids` for bulk */
  id?: string;
  /** Bulk support (up to 50) */
  ids?: string[];
  kind?: Kind;
  /** Optional: who requested (for audit UI) */
  by?: `0x${string}` | string;
  /** Optional: short reason (UI-safe) */
  reason?: string;
  /** Optional: retention days (1..90), default 30 */
  ttlDays?: number;
};

const MAX_BULK = 50;
const MAX_REASON = 240;

/* ---------------- utils ---------------- */

const DIGITS = /^[0-9]+$/;
function sanitizeId(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return DIGITS.test(s) ? s : null;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function json(body: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

/* --------------- handler ---------------- */

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const kind = body?.kind;
    if (kind !== "post" && kind !== "plan") {
      return json({ error: "Invalid or missing kind (post|plan)" }, { status: 400 });
    }

    // normalize ids (single or bulk)
    const single = body?.id ? [body.id] : [];
    const bulk = Array.isArray(body?.ids) ? body!.ids! : [];
    const combined = [...single, ...bulk].slice(0, MAX_BULK);

    const ids = combined
      .map((v) => sanitizeId(v))
      .filter((v): v is string => Boolean(v));

    if (ids.length === 0) {
      return json({ error: "Missing valid id(s)" }, { status: 400 });
    }

    const ttlDays = clamp(
      Number.isFinite(body?.ttlDays as number) ? Number(body!.ttlDays) : 30,
      1,
      90
    );
    const ttlSec = ttlDays * 24 * 60 * 60;

    // request metadata (for audit convenience)
    const now = Date.now();
    const by = String(body?.by ?? "");
    const reason = String(body?.reason ?? "").slice(0, MAX_REASON);

    // capture soft client hints (Edge-safe)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("fly-client-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "";
    const ua = req.headers.get("user-agent") || "";

    // Write each key independently; do not fail the whole request if one set fails
    const results = await Promise.allSettled(
      ids.map((id) => {
        const key = `onlystars:${REGISTRY}:deleted:${kind}:${id}`;
        return kvSetJSON(
          key,
          {
            id,
            kind,
            at: now,
            by,
            reason,
            // light audit data (non-sensitive)
            meta: { ip, ua },
            version: 1,
          },
          ttlSec
        ).then(() => ({ key }));
      })
    );

    const ok = results
      .map((r, i) => (r.status === "fulfilled" ? { id: ids[i], ...(r.value as any) } : null))
      .filter(Boolean) as Array<{ id: string; key: string }>;
    const failed = results
      .map((r, i) => (r.status === "rejected" ? { id: ids[i], error: (r as any).reason ?? "kvSetJSON failed" } : null))
      .filter(Boolean) as Array<{ id: string; error: unknown }>;

    // If some succeeded, return 207 Multi-Status-like JSON (but 200 is friendlier for clients)
    return json({
      ok: failed.length === 0,
      registry: REGISTRY,
      kind,
      ttlDays,
      count: ids.length,
      succeeded: ok,
      failed,
    });
  } catch (e: any) {
    return json({ error: e?.message || "delete failed" }, { status: 500 });
  }
}

/** Optional: reject other methods loudly (helps avoid accidental GETs) */
export async function GET() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
