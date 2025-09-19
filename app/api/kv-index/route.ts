// /app/api/kv-index/route.ts
import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import * as ADDR from "@/lib/addresses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isHexAddr(v: unknown): v is `0x${string}` {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
}
function isHttpLike(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function normalizeIpfs(u?: string | null) {
  if (!u) return "";
  return u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u;
}

const FALLBACK_AVATAR = "/avatar.png";

/**
 * POST /api/kv-index
 * Body:
 * {
 *   id: string | number | bigint,        // profile id (required)
 *   handle: string,                       // normalized lowercase handle (required)
 *   owner: "0x...",                       // EOA address (required)
 *   name?: string,                        // display name (<= 80 chars)
 *   avatar?: string,                      // http(s) or ipfs://
 *   bio?: string                          // <= 1200 chars
 * }
 *
 * Writes the following KV records (all namespaced by registry):
 * - onlystars:{REG}:profile:{id} -> { handle, name, avatar, bio, owner }
 * - onlystars:{REG}:handle:{handle} -> id
 * - onlystars:{REG}:owner:{ownerLc} -> id
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      id?: string | number | bigint;
      handle?: string;
      owner?: string;
      name?: string;
      avatar?: string;
      bio?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Missing JSON body" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    // --- Validate & normalize id ---
    const idStr =
      typeof body.id === "bigint"
        ? body.id.toString()
        : typeof body.id === "number" && Number.isFinite(body.id)
        ? Math.trunc(body.id).toString()
        : typeof body.id === "string"
        ? body.id.trim()
        : "";
    if (!/^[0-9]+$/.test(idStr)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    // --- Validate & normalize handle ---
    const normHandle = String(body.handle ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "");
    if (!normHandle) {
      return NextResponse.json(
        { ok: false, error: "Invalid handle" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }

    // --- Validate & normalize owner ---
    const owner = String(body.owner ?? "").trim();
    if (!isHexAddr(owner)) {
      return NextResponse.json(
        { ok: false, error: "Invalid owner address" },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }
    const ownerLc = owner.toLowerCase() as `0x${string}`;

    // --- Sanitize text ---
    const name = String(body.name ?? "").slice(0, 80);
    const bio = String(body.bio ?? "").slice(0, 1200);

    // --- Avatar normalization + SSR-safe fallback ---
    const rawAvatar = String(body.avatar ?? "").trim();
    const normAvatar = normalizeIpfs(rawAvatar);
    const avatar =
      normAvatar && (normAvatar.startsWith("https://ipfs.io/ipfs/") || isHttpLike(normAvatar))
        ? normAvatar
        : FALLBACK_AVATAR;

    // Namespace keys by active registry so multiple deployments don’t collide
    const REG = ADDR.PROFILE_REGISTRY || "unknown";

    const profileKey = `onlystars:${REG}:profile:${idStr}`;
    const handleKey = `onlystars:${REG}:handle:${normHandle}`;
    const ownerKey = `onlystars:${REG}:owner:${ownerLc}`;

    const doc = { handle: normHandle, name, avatar, bio, owner: ownerLc };

    // Some KV clients expose hset; others don't. Fall back to set(JSON).
    const maybeHset = (kv as any).hset as
      | undefined
      | ((key: string, map: Record<string, unknown>) => Promise<unknown>);

    await Promise.all([
      kv.set(handleKey, idStr),
      kv.set(ownerKey, idStr),
      maybeHset ? maybeHset(profileKey, doc) : kv.set(profileKey, JSON.stringify(doc)),
    ]);

    return NextResponse.json(
      { ok: true, id: idStr, handle: normHandle, owner: ownerLc },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[api/kv-index] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "index failed" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
