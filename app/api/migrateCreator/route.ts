// app/api/migrateCreator/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function lc(s = '') { return s.trim().toLowerCase() }
const isNumeric = (s: string) => /^\d+$/.test(s)

async function resolveId(source: string): Promise<string | null> {
  const key = lc(source)
  if (isNumeric(key)) {
    const exists = await kv.exists(`creator:${key}`)
    return exists ? key : null
  }
  const byHandle = await kv.get<string | null>(`handle:${key}`)
  if (byHandle) return byHandle
  const legacy = await kv.exists(`creator:${key}`)
  return legacy ? key : null
}

function html(body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8" />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <style>
       body{background:#0b1220;color:#e5e7eb;font:14px/1.45 ui-sans-serif,system-ui,Segoe UI,Roboto}
       .card{max-width:720px;margin:48px auto;padding:24px;border-radius:16px;
             border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05)}
       code,pre{font-family:ui-monospace, SFMono-Regular, Menlo, monospace}
       .ok{color:#86efac}.err{color:#fca5a5}
     </style>
     <div class="card">${body}</div>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
  )
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const raw = url.searchParams.get('id') || url.searchParams.get('handle') || ''
    const mode = (url.searchParams.get('mode') || 'repair').toLowerCase()

    if (!raw) {
      return html(`<h2 class="err">Missing ?id= or ?handle=</h2>`, 400)
    }
    const id = await resolveId(raw)
    if (!id) {
      return html(`<h2 class="err">Creator not found for "${raw}"</h2>`, 404)
    }

    const key = `creator:${id}`

    // Inspect current state
    const asHash = await kv.hgetall<Record<string, unknown>>(key)
    let before: 'hash' | 'string' | 'none' = 'none'
    if (asHash && Object.keys(asHash).length) before = 'hash'
    else {
      const rawVal = await kv.get(key)
      before = rawVal == null ? 'none' : 'string'
    }

    let migrated = false
    if (mode === 'repair' && before === 'string') {
      const rawVal = await kv.get(key)
      // Safe normalize
      const now = Date.now()
      let patch: Record<string, unknown> = {}
      if (typeof rawVal === 'string') {
        const t = rawVal.trim()
        const urlish = /^https?:\/\//i.test(t) || /^ipfs:\/\//i.test(t)
        if (urlish) patch.avatarUrl = t
        else if (!/\s/.test(t) && t.length <= 64) patch.displayName = t
        else patch.bio = t
      } else if (rawVal && typeof rawVal === 'object') {
        patch = { ...(rawVal as any) }
      }
      await kv.del(key)
      await kv.hset(key, {
        id,
        handle: (patch.handle || id).toString().toLowerCase(),
        displayName: patch.displayName || id,
        avatarUrl: patch.avatarUrl || '',
        bio: patch.bio || '',
        address: patch.address || '',
        fid: Number(patch.fid || 0),
        createdAt: Number(patch.createdAt || now),
        updatedAt: now,
      })
      migrated = true
    }

    const afterHash = await kv.hgetall<Record<string, unknown>>(key)
    const after = afterHash && Object.keys(afterHash).length ? 'hash' : 'string'

    const wantsJson = /application\/json/i.test(req.headers.get('accept') || '')
    const payload = { ok: true, id, mode, before, after, migrated, sample: afterHash || null }

    if (wantsJson) {
      return NextResponse.json(payload, { headers: { 'cache-control': 'no-store' } })
    }

    return html(`
      <h1>Creator migrate: <code>${id}</code></h1>
      <p>Status: <strong class="${migrated ? 'ok' : ''}">${migrated ? 'migrated' : 'no change needed'}</strong></p>
      <p>Before: <code>${before}</code> → After: <code>${after}</code></p>
      <pre>${JSON.stringify(payload, null, 2)}</pre>
      <p><a href="/creator/${id}">Back to creator page</a></p>
    `)
  } catch (e: any) {
    const msg = String(e?.message || e)
    const wantsJson = /application\/json/i.test(req.headers.get('accept') || '')
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
    return html(`<h2 class="err">Error</h2><pre>${msg}</pre>`, 500)
  }
}
