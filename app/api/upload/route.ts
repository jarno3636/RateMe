// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs' // keep Node runtime for reliable uploads

const ACCEPT_PREFIXES = ['image/', 'video/']
const MAX_MB = 25

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    // TS on Vercel sometimes loses DOM lib types; cast to any so `.get` is recognized
    const file = (form as any).get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate type & size
    if (!ACCEPT_PREFIXES.some((p) => file.type?.startsWith(p))) {
      return NextResponse.json({ ok: false, error: 'Unsupported file type' }, { status: 400 })
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: `File too large (max ${MAX_MB}MB)` }, { status: 400 })
    }

    const cleanName = (file.name || 'upload').replace(/[^a-z0-9._-]/gi, '_')
    const key = `uploads/${Date.now()}-${cleanName}`

    const { url } = await put(key, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || undefined,
      cacheControl: 'public, max-age=31536000, immutable',
    })

    return NextResponse.json({ ok: true, url })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Upload failed' },
      { status: 500 },
    )
  }
}
