// scripts/migrateCreators.ts
import 'dotenv/config'
import { kv } from '@vercel/kv'

const prefix = 'creator:'

function normalizeHandle(s: string) {
  return String(s || '').trim().replace(/^@+/, '').toLowerCase()
}

function guessFromString(s: string) {
  const t = String(s || '').trim()
  if (!t) return {}
  if (/^https?:\/\//i.test(t) || /^ipfs:\/\//i.test(t)) return { avatarUrl: t }
  if (!/\s/.test(t) && t.length <= 64) return { displayName: t }
  return { bio: t }
}

async function run() {
  const keys = await kv.keys(`${prefix}*`)
  for (const key of keys) {
    const existing = (await kv.hgetall<Record<string, unknown>>(key)) || {}
    if (existing && Object.keys(existing).length > 0) {
      console.log('skip(hash):', key)
      continue
    }

    const raw = await kv.get(key)
    if (raw == null) {
      console.log('skip(null):', key)
      continue
    }

    const id = key.slice(prefix.length)
    const handle = normalizeHandle(id)
    let patch: any = {}

    if (typeof raw === 'string') patch = guessFromString(raw)
    else if (typeof raw === 'object' && raw) patch = { ...raw }
    else {
      console.log('skip(unknown-type):', key, typeof raw)
      continue
    }

    const now = Date.now()
    const newHash = {
      id: handle,
      handle,
      displayName: patch.displayName || handle,
      avatarUrl: patch.avatarUrl || '',
      bio: patch.bio || '',
      address: patch.address || '',
      fid: Number(patch.fid || 0),
      createdAt: Number(patch.createdAt || now),
      updatedAt: now,
    }

    await kv.del(key)
    await kv.hset(key, newHash)
    console.log('migrated:', key)
  }
}

run().then(() => {
  console.log('done')
  process.exit(0)
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
