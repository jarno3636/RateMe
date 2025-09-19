// /app/api/kv-index/route.ts
import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

function isHexAddr(v: unknown) {
  return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)
}
function isHttpLike(u: string) {
  try { const url = new URL(u); return url.protocol === "http:" || url.protocol === "https:" } catch { return false }
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

    if (!body) return NextResponse.json({ ok: false, error: "Missing JSON body" }, { status: 400 })

    // ---- Validate & normalize inputs ----
    const idStr =
      typeof body.id === "bigint" ? body.id.toString()
      : typeof body.id === "number" && Number.isFinite(body.id) ? Math.trunc(body.id).toString()
      : typeof body.id === "string" ? body.id.trim()
      : ""
    if (!/^[0-9]+$/.test(idStr)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 })

    const normHandle = String(body.handle ?? "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")
    if (!normHandle) return NextResponse.json({ ok: false, error: "Invalid handle" }, { status: 400 })

    const owner = String(body.owner ?? "").trim()
    if (!isHexAddr(owner)) return NextResponse.json({ ok: false, error: "Invalid owner address" }, { status: 400 })
    const ownerLc = owner.toLowerCase()

    // Sanitize text
    const name = String(body.name ?? "").slice(0, 80)
    const bio  = String(body.bio ?? "").slice(0, 1200)

    // Avatar normalization + SSR-safe fallback
    const rawAvatar  = String(body.avatar ?? "").trim()
    const normAvatar = normalizeIpfs(rawAvatar)
    const avatar =
      (normAvatar && (normAvatar.startsWith("https://ipfs.io/ipfs/") || isHttpLike(normAvatar)))
        ? normAvatar
        : FALLBACK_AVATAR

    // ---- KV writes ----
    const profileKey = `profile:${idStr}`
    const profileObj = { handle: normHandle, name, avatar, bio, owner: ownerLc }

    // Some @vercel/kv type versions mark hset as optional.
    const hset = (kv as any).hset as undefined | ((key: string, data: Record<string, unknown>) => Promise<unknown>)

    await Promise.all([
      kv.set(`handle:${normHandle}`, idStr),
      kv.set(`owner:${ownerLc}`, idStr),
      hset ? hset(profileKey, profileObj) : kv.set(profileKey, JSON.stringify(profileObj)),
    ])

    return NextResponse.json({ ok: true, id: idStr, handle: normHandle })
  } catch (e: any) {
    console.error("[api/kv-index] error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "index failed" }, { status: 500 })
  }
}
