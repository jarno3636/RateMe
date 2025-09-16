// /lib/kv.ts
import { Redis } from "@upstash/redis"

// Accept both your env naming and the standard Upstash/Vercel naming.
// (Some projects end up with KV_REST_API_KV_REST_API_* via copy/paste.)
const URL =
  process.env.KV_REST_API_URL ||
  process.env.KV_REST_API_KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL || // fallback if someone used the older var names
  ""

const TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.KV_REST_API_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_KV_REST_API_READ_ONLY_TOKEN || // RO token still lets us read
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  ""

export const KV_ENABLED = Boolean(URL && TOKEN)

/**
 * If env is missing, we provide a tiny in-memory shim so imports don't throw.
 * This persists only for the lifetime of a serverless instance (best-effort),
 * but it's enough to keep pages working while KV is misconfigured.
 */
type ShimRecord = Map<string, string>
const globalAny = globalThis as any
globalAny.__KV_SHIM__ = globalAny.__KV_SHIM__ || (new Map() as ShimRecord)
const SHIM: ShimRecord = globalAny.__KV_SHIM__

// Real client if configured, otherwise a shim that matches the minimal surface.
export const kv = KV_ENABLED
  ? new Redis({ url: URL, token: TOKEN })
  : ({
      async get<T = string>(key: string): Promise<T | null> {
        return (SHIM.get(key) as any) ?? null
      },
      async set(key: string, val: string, _opts?: { ex?: number }) {
        SHIM.set(key, val)
        return "OK"
      },
      async del(...keys: string[]) {
        let n = 0
        for (const k of keys) if (SHIM.delete(k)) n++
        return n
      },
    } as unknown as Redis)

/* -------------------------- tiny helpers -------------------------- */

// JSON.stringify that won't choke on bigint
function jsonStringifySafe(value: unknown) {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  try {
    const v = await kv.get<string>(key)
    if (!v) return null
    try {
      return JSON.parse(v) as T
    } catch {
      return null
    }
  } catch (err) {
    // Never throw from helper; callers can decide fallbacks.
    console.warn("[kvGetJSON] failed:", err)
    return null
  }
}

export async function kvSetJSON(key: string, value: unknown, ttlSec?: number) {
  try {
    const s = jsonStringifySafe(value)
    if (ttlSec && KV_ENABLED) {
      // Only pass EX to real Upstash; the shim ignores TTL (best-effort).
      return await kv.set(key, s, { ex: ttlSec })
    }
    return await kv.set(key, s as any)
  } catch (err) {
    console.warn("[kvSetJSON] failed:", err)
    return null
  }
}

export async function kvDel(...keys: string[]) {
  try {
    return await kv.del(...keys)
  } catch (err) {
    console.warn("[kvDel] failed:", err)
    return 0
  }
}

// Log once if KV is disabled — super helpful on Vercel.
if (!KV_ENABLED) {
  console.warn(
    "[kv] Upstash KV not configured. Falling back to in-memory shim. " +
      "Set KV_REST_API_URL and KV_REST_API_TOKEN (or your KV_REST_API_KV_REST_API_* vars) in Vercel."
  )
}
