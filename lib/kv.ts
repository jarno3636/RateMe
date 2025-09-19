// /lib/kv.ts
import "server-only"
import { Redis } from "@upstash/redis"

/* ────────────────────────────── Env & Namespacing ───────────────────────────── */

const URL =
  process.env.KV_REST_API_URL ||
  process.env.KV_REST_API_KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  ""

const TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.KV_REST_API_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_KV_REST_API_READ_ONLY_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  ""

// Build a stable, environment-aware key prefix so preview/prod/local don’t collide.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
let host = "localhost"
try {
  host = new URL(SITE).hostname
} catch { /* noop */ }

const STAGE =
  process.env.VERCEL_ENV || // "production" | "preview" | "development"
  process.env.NODE_ENV ||   // "production" | "development" | "test"
  "development"

const KEY_PREFIX = `onlystars:${host}:${STAGE}:` // e.g., onlystars:app.tld:production:

/** Prefix helper (accepts already-prefixed keys without double prefixing) */
export function withNs(key: string) {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`
}

/* ─────────────────────────────── Client Selection ───────────────────────────── */

export const KV_ENABLED = Boolean(URL && TOKEN)

/** Minimal interface we rely on */
type KVLike = {
  get<T = string>(key: string): Promise<T | null>
  set(
    key: string,
    val: string,
    opts?: { ex?: number }
  ): Promise<any> // Upstash returns "OK"; keep it loose
  del(...keys: string[]): Promise<number>
  hset?(key: string, map: Record<string, string>): Promise<any>
  hgetall?<T = Record<string, string>>(key: string): Promise<T | null>
}

/* In-memory shim for local / missing envs (persists per serverless instance) */
type ShimRecord = Map<string, string>
const globalAny = globalThis as any
globalAny.__KV_SHIM__ = globalAny.__KV_SHIM__ || (new Map() as ShimRecord)
const SHIM: ShimRecord = globalAny.__KV_SHIM__

const shim: KVLike = {
  async get<T = string>(key: string) {
    return ((SHIM.get(withNs(key)) as any) ?? null) as T | null
  },
  async set(key: string, val: string) {
    SHIM.set(withNs(key), val)
    return "OK"
  },
  async del(...keys: string[]) {
    let n = 0
    for (const k of keys) if (SHIM.delete(withNs(k))) n++
    return n
  },
  async hset(key: string, map: Record<string, string>) {
    const ns = withNs(key)
    // Store as a JSON string of a flat object to keep the shim simple
    const prev = SHIM.get(ns)
    const next = { ...(prev ? JSON.parse(prev) : {}), ...map }
    SHIM.set(ns, JSON.stringify(next))
    return 1
  },
  async hgetall<T = Record<string, string>>(key: string) {
    const v = SHIM.get(withNs(key))
    return v ? (JSON.parse(v) as T) : null
  },
}

const real: KVLike = new Redis({ url: URL, token: TOKEN }) as unknown as KVLike

export const kv: KVLike = KV_ENABLED ? real : shim

/* One-time notice when running without real KV */
if (!KV_ENABLED) {
  console.warn(
    "[kv] Upstash KV not configured. Using in-memory shim. Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel."
  )
}

/* ───────────────────────────── JSON Utilities ───────────────────────────── */

function jsonStringifySafe(value: unknown) {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  try {
    const v = await kv.get<string>(withNs(key))
    if (!v) return null
    try {
      return JSON.parse(v) as T
    } catch {
      return null
    }
  } catch (err) {
    console.warn("[kvGetJSON] failed:", err)
    return null
  }
}

export async function kvSetJSON(key: string, value: unknown, ttlSec?: number) {
  try {
    const s = jsonStringifySafe(value)
    if (ttlSec && KV_ENABLED) {
      return await kv.set(withNs(key), s, { ex: ttlSec })
    }
    return await kv.set(withNs(key), s)
  } catch (err) {
    console.warn("[kvSetJSON] failed:", err)
    return null
  }
}

export async function kvDel(...keys: string[]) {
  try {
    return await kv.del(...keys.map(withNs))
  } catch (err) {
    console.warn("[kvDel] failed:", err)
    return 0
  }
}

/* Hash helpers for compact structured storage (supported by real KV, shim emulates) */
export async function kvHSetJSON(key: string, map: Record<string, unknown>) {
  try {
    const enc: Record<string, string> = {}
    for (const [k, v] of Object.entries(map)) enc[k] = jsonStringifySafe(v)
    return await kv.hset?.(withNs(key), enc)
  } catch (err) {
    console.warn("[kvHSetJSON] failed:", err)
    return null
  }
}

export async function kvHGetJSON<T extends Record<string, unknown> = Record<string, unknown>>(key: string) {
  try {
    const raw = (await kv.hgetall?.<Record<string, string>>(withNs(key))) || null
    if (!raw) return null
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) {
      try {
        out[k] = JSON.parse(v)
      } catch {
        out[k] = v
      }
    }
    return out as T
  } catch (err) {
    console.warn("[kvHGetJSON] failed:", err)
    return null
  }
}

/* ─────────────────────────── Retry & Memo Helpers ─────────────────────────── */

/** Tiny linear backoff (2 tries total by default) */
async function withRetry<T>(fn: () => Promise<T>, tries = 2, delayMs = 120) {
  let last: any
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw last
}

/** Coalesce concurrent getOrCompute(key) calls in the same runtime */
const inflight = new Map<string, Promise<any>>()

/**
 * Read-through memoizer:
 * - Try KV
 * - If miss, compute(), store with optional TTL, return
 * - Concurrent calls for the same key are coalesced
 */
export async function kvGetOrCompute<T>(
  key: string,
  compute: () => Promise<T>,
  ttlSec?: number
): Promise<T> {
  const nsKey = withNs(key)
  // 1) Try KV
  const cached = await kvGetJSON<T>(nsKey)
  if (cached !== null) return cached

  // 2) Coalesce concurrent producers
  if (inflight.has(nsKey)) return inflight.get(nsKey) as Promise<T>

  const p = (async () => {
    try {
      const val = await withRetry(compute)
      await kvSetJSON(nsKey, val, ttlSec)
      return val
    } finally {
      inflight.delete(nsKey)
    }
  })()

  inflight.set(nsKey, p)
  return p
}
