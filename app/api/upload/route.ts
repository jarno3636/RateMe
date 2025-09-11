// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'edge' // or 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    // TS sometimes loses lib.dom types on Vercel builds; cast to any to unblock
    const file = (form as any).get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    // Optional: validate type/size (example allows images & video up to 25MB)
    const accept = ['image/', 'video/']
    if (!accept.some((p) => file.type?.startsWith(p))) {
      return NextResponse.json({ ok: false, error: 'Unsupported file type' }, { status: 400 })
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'File too large (max 25MB)' }, { status: 400 })
    }

    const key = `uploads/${Date.now()}-${file.name}`
    // use `access: 'public'` for public assets (avatars/teasers); use 'private' for gated content
    const { url } = await put(key, file, { access: 'public' })

    return NextResponse.json({ ok: true, url })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
