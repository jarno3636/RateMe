// app/api/creator/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreator, createCreatorUnique } from '@/lib/kv';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

// NOTE: This is a simple demo route. In production, you should verify the caller
// truly owns the creator (e.g., siwe signature). This example trusts the client.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, avatarUrl, bio } = body as { id: string; avatarUrl?: string; bio?: string };

    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    const key = `creator:${id.toLowerCase()}`;
    const current = await kv.hgetall(key);

    if (!current) {
      return NextResponse.json({ ok: false, error: 'Creator not found' }, { status: 404 });
    }

    // Persist the updates (only provided fields)
    const updates: Record<string, any> = {};
    if (typeof avatarUrl === 'string') updates.avatarUrl = avatarUrl;
    if (typeof bio === 'string') updates.bio = bio.slice(0, 1000);

    if (!Object.keys(updates).length) {
      return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
    }

    await kv.hset(key, updates);
    return NextResponse.json({ ok: true, creator: { ...current, ...updates } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Update failed' }, { status: 500 });
  }
}
