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

// Extend interface with hset
type KVLike = {
  get<T = string>(key: string): Promise<T | null>
  set(key: string, val: string, opts?: { ex?: number }): Promise<"OK" | number | null>
  del(...keys: string[]): Promise<number>
  hset?(key: string, map: Record<string, string>): Promise<number | "OK">
}

// Real Upstash client supports hset out of the box
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
      async hset(key: string, map: Record<string, string>) {
        SHIM.set(key, JSON.stringify(map))
        return 1
      },
    }
