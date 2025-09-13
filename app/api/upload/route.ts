// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { kv } from '@vercel/kv'

export const runtime = 'nodejs' // required by @vercel/blob put()

const MAX_MB = 10
const MAX_BYTES = MAX_MB * 1024 * 1024

type Detected =
  | { family: 'image'; subtype: 'jpeg' | 'png' | 'gif' | 'webp'; mime: string; ext: 'jpg' | 'png' | 'gif' | 'webp' }
  | { family: 'video'; subtype: 'mp4' | 'webm'; mime: string; ext: 'mp4' | 'webm' }

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

function cleanName(name: string) {
  return (name || 'upload').replace(/[^a-z0-9._-]/gi, '_')
}

function detectType(buf: Uint8Array): Detected | null {
  // JPEG
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { family: 'image', subtype: 'jpeg', mime: 'image/jpeg', ext: 'jpg' }
  }
  // PNG
  if (
    buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { family: 'image', subtype: 'png', mime: 'image/png', ext: 'png' }
  }
  // GIF87a / GIF89a
  if (
    buf.length > 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 &&
    buf[3] === 0x38 && (buf[4] === 0x39 || buf[4] === 0x37) && buf[5] === 0x61
  ) {
    return { family: 'image', subtype: 'gif', mime: 'image/gif', ext: 'gif' }
  }
  // WebP RIFF header: "RIFF....WEBP"
  if (
    buf.length > 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { family: 'image', subtype: 'webp', mime: 'image/webp', ext: 'webp' }
  }
  // MP4 (ftyp)
  if (
    buf.length > 12 &&
    buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
  ) {
    return { family: 'video', subtype: 'mp4', mime: 'video/mp4', ext: 'mp4' }
  }
  // WebM: EBML header 0x1A 0x45 0xDF 0xA3
  if (
    buf.length > 4 &&
    buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3
  ) {
    return { family: 'video', subtype: 'webm', mime: 'video/webm', ext: 'webm' }
  }
  return null
}

async function rateLimit(req: Request, bucket: string, limit = 10, windowSec = 60) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const key = `rl:upload:${bucket}:${ip}`
    const n = await kv.incr(key)
    if (n === 1) await kv.expire(key, windowSec)
    return n <= limit
  } catch {
    // If KV is unavailable, skip RL rather than failing uploads
    return true
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const kind = (searchParams.get('kind') || 'content').toLowerCase() // 'avatar' | 'content'

    // Rate limit: 10 uploads/min per IP per kind
    const allowed = await rateLimit(req, kind, 10, 60)
    if (!allowed) {
      return json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }

    // Parse multipart
    const form = await req.formData().catch(() => null)
    if (!form) {
      return json({ ok: false, error: 'Invalid form-data' }, { status: 400 })
    }
    const file = form.get('file') as File | null
    if (!file) {
      return json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    // Size check
    if (file.size > MAX_BYTES) {
      return json({ ok: false, error: `File too large (max ${MAX_MB}MB)` }, { status: 400 })
    }

    // Read small header to detect type
    const ab = await file.arrayBuffer()
    const buf = new Uint8Array(ab)
    const detected = detectType(buf)
    if (!detected) {
      return json({ ok: false, error: 'Unsupported or unknown file type' }, { status: 400 })
    }

    // Kind-specific policy
    if (kind === 'avatar' && detected.family !== 'image') {
      return json({ ok: false, error: 'Avatar must be an image' }, { status: 400 })
    }
    if (kind !== 'avatar' && !(detected.family === 'image' || detected.family === 'video')) {
      return json({ ok: false, error: 'Unsupported file type' }, { status: 400 })
    }

    // Build a safe, deterministic key with correct extension
    const original = cleanName((file as any).name || 'upload')
    const extFromName = (original.split('.').pop() || '').toLowerCase()
    const ext = detected.ext
    const baseName =
      extFromName && extFromName === ext
        ? original.replace(/\.[^.]+$/, '') // strip once; keep base
        : original

    const key = `uploads/${kind}/${Date.now()}-${baseName}.${ext}`

    // Upload to Vercel Blob
    const { url } = await put(key, new Blob([buf], { type: detected.mime }), {
      access: 'public',
      addRandomSuffix: false,
      contentType: detected.mime,
    })

    return json({
      ok: true,
      kind,
      url,
      contentType: detected.mime,
      bytes: file.size,
    })
  } catch (e: any) {
    return json({ ok: false, error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
