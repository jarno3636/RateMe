// lib/kv.ts
import crypto from 'crypto'

type KVLike = {
  lpush: (key: string, value: string) => Promise<void>
  lrange: (key: string, start: number, stop: number) => Promise<string[]>
}

const hasUpstash =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

let kv: KVLike | null = null

if (hasUpstash) {
  // Upstash REST client (lightweight – no extra dep)
  const base = process.env.KV_REST_API_URL!
  const token = process.env.KV_REST_API_TOKEN!
  const call = async (path: string, body: any[]) => {
    const res = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Edge-friendly
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`KV error ${res.status}`)
    return res.json()
  }
  kv = {
    lpush: async (key, value) => {
      await call('lpush', [key, value])
    },
    lrange: async (key, start, stop) => {
      const out = await call('lrange', [key, start, stop])
      return out.result as string[]
    },
  }
} else if (process.env.REDIS_URL) {
  // (Optional) Redis protocol URL if you prefer a serverful Redis — you can extend this.
  console.warn('REDIS_URL provided but not wired. Prefer Upstash KV for serverless.')
}

// Fallback in-memory (dev only, not persistent on serverless lambdas)
const memory: Record<string, string[]> = {}
const memKV: KVLike = {
  async lpush(key, value) {
    memory[key] = memory[key] || []
    memory[key].unshift(value)
  },
  async lrange(key, start, stop) {
    const arr = memory[key] || []
    const end = stop === -1 ? undefined : stop + 1
    return arr.slice(start, end)
  },
}

export const store: KVLike = kv ?? memKV

export const ipHash = (ip: string | null | undefined) =>
  crypto.createHash('sha256').update(ip || 'null').digest('hex').slice(0, 16)
