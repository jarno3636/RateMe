// app/api/content/retire-plan/route.ts
import { NextResponse } from "next/server";
import { kvSetJSON } from "@/lib/kv";

/** Retire-plan is advisory (KV marker), depends on live KV */
export const dynamic = "force-dynamic";
export const runtime = "edge";

/** Namespace by registry to avoid cross-env collisions */
const REGISTRY = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY || "unknown").toLowerCase();

type Body = {
  id?: string;                 // stringified bigint planId
  name?: string;               // optional: plan display name snapshot
  by?: `0x${string}` | string; // optional: who requested (for audit UI)
  reason?: string;             // optional: UI-safe reason
  ttlDays?: number;            // optional: 1..365 (default 180)
};

const MAX_REASON = 240;

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

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const id = sanitizeId(body?.id);
    if (!id) return json({ error: "Missing or invalid id" }, { status: 400 });

    const ttlDays = clamp(
      Number.isFinite(body?.ttlDays as number) ? Number(body!.ttlDays) : 180,
      1,
      365
    );
    const ttlSec = ttlDays * 24 * 60 * 60;

    const by = String(body?.by ?? "");
    const name = String(body?.name ?? "");
    const reason = String(body?.reason ?? "").slice(0, MAX_REASON);

    // light audit metadata (non-sensitive)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("fly-client-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "";
    const ua = req.headers.get("user-agent") || "";

    const key = `onlystars:${REGISTRY}:retired:plan:${id}`;
    await kvSetJSON(
      key,
      {
        id,
        retired: true,
        at: Date.now(),
        by,
        name,
        reason,
        meta: { ip, ua },
        version: 1,
      },
      ttlSec
    );

    return json({ ok: true, key, ttlDays, registry: REGISTRY });
  } catch (e: any) {
    return json({ error: e?.message || "retire failed" }, { status: 500 });
  }
}

export async function GET() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
