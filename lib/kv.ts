// /lib/kv.ts
import "server-only"
import { Redis } from "@upstash/redis"

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

export const KV_ENABLED = Boolean(URL && TOKEN)

type ShimRecord = Map<string, string>
const globalAny = globalThis as any
globalAny.__KV_SHIM__ = globalAny.__KV_SHIM__ || (new Map() as ShimRecord)
const SHIM: ShimRecord = globalAny.__KV_SHIM__

// Minimal interface we actually use
type KVLike = {
  get<T = string>(key: string): Promise<T | null>
  set(key: string, val: string, opts?: { ex?: number }): Promise<"OK" | number | null>
  del(...keys: string[]): Promise<number>
}

export const kv: KVLike = KV_ENABLED
  ? new Redis({ url: URL, token: TOKEN })
  : {
      async get<T = string>(key: string) {
        return ((SHIM.get(key) as any) ?? null) as T | null
      },
      async set(key: string, val: string) {
        SHIM.set(key, val)
        return "OK"
      },
      async del(...keys: string[]) {
        let n = 0
        for (const k of keys) if (SHIM.delete(k)) n++
        return n
      },
    }

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
    console.warn("[kvGetJSON] failed:", err)
    return null
  }
}

export async function kvSetJSON(key: string, value: unknown, ttlSec?: number) {
  try {
    const s = jsonStringifySafe(value)
    if (ttlSec && KV_ENABLED) {
      return await kv.set(key, s, { ex: ttlSec })
    }
    return await kv.set(key, s)
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

if (!KV_ENABLED) {
  console.warn(
    "[kv] Upstash KV not configured. Falling back to in-memory shim. " +
      "Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel."
  )
}
