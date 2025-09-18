// /app/api/check-handle/route.ts
import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

// Registry-aware namespace so preview checks don't collide across deployments
const REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY || "unknown"

// Reason strings are user-safe (shown in UI)
const RESERVED = new Set([
  "admin", "moderator", "owner", "onlystars", "support", "help",
  "root", "team", "staff", "about", "contact", "api",
])

const MIN = 3
const MAX = 24
const allowed = /^[a-z0-9._-]+$/
const badEdges = /^[._-]|[._-]$/
const dblSep = /[._-]{2,}/

function sanitize(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")
}

// NOTE: This API is advisory-only. You still MUST verify on-chain (`canRegister`).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get("handle") || ""
    const handle = sanitize(raw)

    // Basic shape validation
    if (!handle) {
      return NextResponse.json({ ok: false, reason: "No handle", sanitized: "" }, { status: 400 })
    }
    if (handle.length < MIN || handle.length > MAX) {
      return NextResponse.json({
        ok: false,
        reason: `Handle must be ${MIN}-${MAX} chars`,
        sanitized: handle,
      }, { status: 422 })
    }
    if (!allowed.test(handle)) {
      return NextResponse.json({
        ok: false,
        reason: "Only letters, numbers, dot, dash, underscore",
        sanitized: handle,
      }, { status: 422 })
    }
    if (badEdges.test(handle) || dblSep.test(handle)) {
      return NextResponse.json({
        ok: false,
        reason: "No leading/trailing or repeated separators",
        sanitized: handle,
      }, { status: 422 })
    }
    if (RESERVED.has(handle)) {
      return NextResponse.json({
        ok: false,
        reason: "Reserved handle",
        sanitized: handle,
      }, { status: 409 })
    }

    // KV quick check (advisory)
    const kvKey = `onlystars:${REGISTRY}:handle:${handle}`
    let exists = false
    try {
      const v = await kv.get<string>(kvKey)
      exists = Boolean(v)
    } catch {
      // KV misconfig or transient error — fall back to advisory "unknown"
      return NextResponse.json({
        ok: true,
        advisoryOnly: true,  // surface to client that on-chain check matters even more
        sanitized: handle,
        reason: "KV unavailable; will rely on on-chain check",
      })
    }

    if (exists) {
      return NextResponse.json({
        ok: false,
        reason: "Already registered",
        sanitized: handle,
      }, { status: 409 })
    }

    // Success (still advisory)
    return NextResponse.json({
      ok: true,
      advisoryOnly: true,
      sanitized: handle,
    }, {
      headers: { "cache-control": "no-store" },
    })
  } catch {
    return NextResponse.json(
      { ok: true, advisoryOnly: true, reason: "Validation service soft-failed" },
      { headers: { "cache-control": "no-store" } },
    )
  }
}
