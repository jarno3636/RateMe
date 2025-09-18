// /app/api/kv-index/route.ts
import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

function isHexAddr(v: unknown) {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)
}
function isHttpLike(u: string) {
  try {
    const url = new URL(u)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
function normalizeIpfs(u?: string | null) {
  if (!u) return ""
  return u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u
}
const FALLBACK_AVATAR = "/avatar.png"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as {
      id?: string | number | bigint
      handle?: string
      owner?: string
      name?: string
      avatar?: string
      bio?: string
    } | null

    if (!body) {
      return NextResponse.json({ ok: false, error: "Missing JSON body" }, { status: 400 })
    }

    // ---- Validate & normalize inputs ----
    const idStr =
      typeof body.id === "bigint" ? body.id.toString()
      : typeof body.id === "number" && Number.isFinite(body.id) ? Math.trunc(body.id).toString()
      : typeof body.id === "string" ? body.id.trim()
      : ""

    if (!/^[0-9]+$/.test(idStr)) {
      return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 })
    }

    const normHandle = String(body.handle ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "")

    if (!normHandle) {
      return NextResponse.json({ ok: false, error: "Invalid handle" }, { status: 400 })
    }

    const owner = String(body.owner ?? "").trim()
    if (!isHexAddr(owner)) {
      return NextResponse.json({ ok: false, error: "Invalid owner address" }, { status: 400 })
    }
    const ownerLc = owner.toLowerCase()

    // Premium: sanitize text fields to avoid trashy KV entries
    const name = String(body.name ?? "").slice(0, 80)
    const bio = String(body.bio ?? "").slice(0, 1200)

    // Avatar normalization + SSR-safe fallback
    const rawAvatar = String(body.avatar ?? "").trim()
    const normAvatar = normalizeIpfs(rawAvatar)
    const avatar =
      (normAvatar && (normAvatar.startsWith("https://ipfs.io/ipfs/") || isHttpLike(normAvatar)))
        ? normAvatar
        : FALLBACK_AVATAR

    // ---- KV writes ----
    // Minimal keys for fast lookups:
    //  - handle:<handle> -> id
    //  - owner:<owner>   -> id
    //  - profile:<id>    -> hash of denormalized metadata (speeds up discover/profile header)
    await Promise.all([
      kv.set(`handle:${normHandle}`, idStr),
      kv.set(`owner:${ownerLc}`, idStr),
      kv.hset(`profile:${idStr}`, {
        handle: normHandle,
        name,
        avatar, // already normalized with fallback
        bio,
        owner: ownerLc,
      }),
    ])

    return NextResponse.json({ ok: true, id: idStr, handle: normHandle })
  } catch (e: any) {
    // Don’t leak internals; keep a clean error shape
    console.error("[api/kv-index] error:", e)
    return NextResponse.json(
      { ok: false, error: e?.message || "index failed" },
      { status: 500 }
    )
  }
}
