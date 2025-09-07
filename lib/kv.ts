// lib/kv.ts
// Edge-safe KV helper with a tiny, non-crypto hash (no Node 'crypto' import)

type KVLike = {
  lpush: (key: string, value: string) => Promise<void>
  lrange: (key: string, start: number, stop: number) => Promise<string[]>
}

const hasUpstash =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN

let kv: KVLike | null = null

if (hasUpstash) {
  // Upstash REST client (Edge-friendly)
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
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`KV error ${res.status}`)
    return res.json()
  }
  kv = {
    lpush: async (key, value) => { await call('lpush', [key, value]) },
    lrange: async (key, start, stop) => {
      const out = await call('lrange', [key, start, stop])
      return out.result as string[]
    },
  }
}

// Dev fallback (not persistent on serverless)
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

// Small djb2-based hash for anonymizing IPs (Edge-safe, deterministic)
export const ipHash = (ip: string | null | undefined) => {
  const s = ip || 'null'
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i)
  // return 16 chars hex
  const n = (h >>> 0).toString(16).padStart(8, '0')
  return (n + n).slice(0, 16)
}
