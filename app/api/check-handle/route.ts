// /app/api/check-handle/route.ts
import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

/** Force dynamic (depends on live KV/env), and enable fast Edge runtime */
export const dynamic = "force-dynamic";
export const runtime = "edge";

/** Registry-aware namespace so checks don't collide across deployments */
const REGISTRY = (process.env.NEXT_PUBLIC_PROFILE_REGISTRY || "unknown").toLowerCase();

/** Reason strings are user-safe (shown in UI) */
const RESERVED = new Set<string>([
  "admin",
  "moderator",
  "owner",
  "support",
  "help",
  "root",
  "team",
  "staff",
  "about",
  "contact",
  "api",
  "settings",
  "create",
  "dashboard",
  "discover",
  "profile",
  "profiles",
  "pricing",
  "terms",
  "privacy",
  "login",
  "logout",
  "signup",
]);

const MIN = 3;
const MAX = 24;
/** allowed chars; we also ban leading/trailing sep and doubles */
const allowed = /^[a-z0-9._-]+$/;
const badEdges = /^[._-]|[._-]$/; // leading or trailing ., _, -
const dblSep = /[._-]{2,}/; // repeated separators

function sanitize(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
}

function json(
  body: Record<string, unknown>,
  init?: ResponseInit & { noStore?: boolean }
) {
  const headers = new Headers(init?.headers || {});
  if (init?.noStore !== false) headers.set("cache-control", "no-store");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-onlystars-advisory", "true"); // remind clients this is advisory-only
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

/**
 * NOTE: This API is advisory-only. You MUST still verify on-chain via `canRegister`.
 *
 * Wire format:
 * {
 *   ok: boolean,
 *   reason?: string,         // user-safe reason if ok=false or degraded
 *   advisoryOnly: true,      // always true (client UI can display subtle banner)
 *   sanitized: string        // server-side normalized handle (lowercase etc)
 * }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // accept both ?handle= and ?h=
    const raw = searchParams.get("handle") ?? searchParams.get("h") ?? "";
    const handle = sanitize(raw);

    if (!handle) {
      return json(
        { ok: false, reason: "No handle provided", advisoryOnly: true, sanitized: "" },
        { status: 400 }
      );
    }
    if (handle.length < MIN || handle.length > MAX) {
      return json(
        {
          ok: false,
          reason: `Handle must be ${MIN}-${MAX} chars`,
          advisoryOnly: true,
          sanitized: handle,
        },
        { status: 422 }
      );
    }
    if (!allowed.test(handle)) {
      return json(
        {
          ok: false,
          reason: "Only letters, numbers, dot, dash, underscore",
          advisoryOnly: true,
          sanitized: handle,
        },
        { status: 422 }
      );
    }
    if (badEdges.test(handle) || dblSep.test(handle)) {
      return json(
        {
          ok: false,
          reason: "No leading/trailing or repeated separators",
          advisoryOnly: true,
          sanitized: handle,
        },
        { status: 422 }
      );
    }
    if (RESERVED.has(handle)) {
      return json(
        { ok: false, reason: "Reserved handle", advisoryOnly: true, sanitized: handle },
        { status: 409 }
      );
    }

    // KV quick check (advisory).
    // Convention: `onlystars:${REGISTRY}:handle:${handle}` -> JSON/owner string
    const kvKey = `onlystars:${REGISTRY}:handle:${handle}`;
    try {
      const exists = Boolean(await kv.get<string>(kvKey));
      if (exists) {
        return json(
          { ok: false, reason: "Already registered", advisoryOnly: true, sanitized: handle },
          { status: 409 }
        );
      }
    } catch {
      // KV misconfig or transient error — degrade gracefully; client will still rely on on-chain check
      return json({
        ok: true,
        advisoryOnly: true,
        sanitized: handle,
        reason: "KV unavailable; will rely on on-chain check",
      });
    }

    // Success (still advisory)
    return json({ ok: true, advisoryOnly: true, sanitized: handle });
  } catch {
    // Soft-fail: do not block UX; make sure the client knows to rely on on-chain result
    return json(
      {
        ok: true,
        advisoryOnly: true,
        reason: "Validation service soft-failed",
        sanitized: "",
      },
      { status: 200 }
    );
  }
}

/** Optional: lightweight health/allow preflight */
export async function HEAD() {
  return json({ ok: true, advisoryOnly: true, sanitized: "" });
}
