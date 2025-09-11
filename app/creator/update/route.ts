// app/api/creator/update/route.ts
import { NextResponse } from 'next/server';
import { getCreator, createCreatorUnique } from '@/lib/kv';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

type Body = {
  id: string;                 // creator id (handle or id you show in page url)
  avatarUrl?: string | null;  // optional
  bio?: string | null;        // optional
};

const CREATOR_KEY = (id: string) => `creator:${id.trim().toLowerCase()}`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const id = String(body.id || '').trim().toLowerCase();
    if (!id) {
      return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });
    }

    const existing = await getCreator(id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'creator not found' }, { status: 404 });
    }

    // Minimal patch (ownership/auth can be added later via signed message).
    const patch: Record<string, unknown> = {};
    if (typeof body.avatarUrl !== 'undefined') patch.avatarUrl = body.avatarUrl || '';
    if (typeof body.bio !== 'undefined') patch.bio = (body.bio || '').slice(0, 280);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
    }

    await kv.hset(CREATOR_KEY(id), patch);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}
