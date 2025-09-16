// /lib/kv.ts
import { Redis } from "@upstash/redis"

export const kv = new Redis({
  url: process.env.KV_REST_API_URL!,         // set in Vercel
  token: process.env.KV_REST_API_TOKEN!,     // set in Vercel
})

// tiny helpers
export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const v = await kv.get<string>(key)
  if (!v) return null
  try { return JSON.parse(v) as T } catch { return null }
}
export async function kvSetJSON(key: string, value: unknown, ttlSec?: number) {
  const s = JSON.stringify(value)
  return ttlSec ? kv.set(key, s, { ex: ttlSec }) : kv.set(key, s)
}
export async function kvDel(...keys: string[]) { return kv.del(...keys) }
