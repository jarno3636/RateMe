import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/** Same convention as lib/kv.ts */
const CREATOR_KEY = (id: string) => `creator:${id}`;
const HANDLE_KEY = (handle: string) => `handle:${handle.toLowerCase()}`;

const lc = (s: string) => s.trim().toLowerCase();
const normHandle = (s: string) => lc(String(s || '').replace(/^@+/, ''));

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { id, handle, displayName, avatarUrl, bio, address, fid } = body || {};

    if (!id && handle) id = normHandle(handle);
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing creator id' }, { status: 400 });
    }
    const creatorId = lc(id);

    // Load existing
    const existing = await kv.hgetall<Record<string, any>>(CREATOR_KEY(creatorId));
    if (!existing || !Object.keys(existing).length) {
      return NextResponse.json({ ok: false, error: 'Creator not found' }, { status: 404 });
    }

    // Build partial update; only allow specific fields
    const patch: Record<string, any> = {};
    if (typeof displayName === 'string') patch.displayName = displayName;
    if (typeof avatarUrl === 'string') patch.avatarUrl = avatarUrl;
    if (typeof bio === 'string') patch.bio = bio;
    if (typeof fid === 'number') patch.fid = fid;
    if (typeof address === 'string') patch.address = address as `0x${string}`;
    if (typeof handle === 'string' && normHandle(handle) !== existing.handle) {
      // If handle is changing (rare), update both the record and the handle index
      const newHandle = normHandle(handle);
      patch.handle = newHandle;
      await kv.set(HANDLE_KEY(newHandle), creatorId, { ex: 60 * 60 * 24 * 365 });
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: true, creator: { ...existing, id: creatorId } });
    }

    await kv.hset(CREATOR_KEY(creatorId), patch);

    const updated = {
      ...existing,
      ...patch,
      id: creatorId,
    };

    return NextResponse.json({ ok: true, creator: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Update failed' },
      { status: 500 }
    );
  }
}
