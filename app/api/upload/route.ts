// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs'; // Blob requires Node runtime

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    // A simple, unique-ish filename; feel free to tweak
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_').toLowerCase()}`;

    // Upload to Vercel Blob (public URL)
    const blob = await put(filename, await file.arrayBuffer(), {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
