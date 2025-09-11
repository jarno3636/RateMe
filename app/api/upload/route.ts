// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'

const MAX_MB = 10

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const kind = (searchParams.get('kind') || 'content').toLowerCase() // 'avatar' | 'content'

    const form = await req.formData()
    const file = (form as any).get('file') as File | null
    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 })
    }

    // Kind-based type checks
    const isImage = file.type?.startsWith('image/')
    const isVideo = file.type?.startsWith('video/')

    if (kind === 'avatar') {
      if (!isImage) {
        return NextResponse.json({ ok: false, error: 'Avatar must be an image' }, { status: 400 })
      }
    } else {
      if (!(isImage || isVideo)) {
        return NextResponse.json({ ok: false, error: 'Unsupported file type' }, { status: 400 })
      }
    }

    // Size limit
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: `File too large (max ${MAX_MB}MB)` }, { status: 400 })
    }

    const cleanName = (file.name || 'upload').replace(/[^a-z0-9._-]/gi, '_')
    const key = `uploads/${kind}/${Date.now()}-${cleanName}`

    const { url } = await put(key, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || undefined,
    })

    return NextResponse.json({ ok: true, url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
