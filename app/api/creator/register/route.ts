// app/api/creator/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createCreatorUnique, getCreatorByHandle } from '@/lib/kv';
import { fetchNeynarUserByHandle } from '@/lib/neynar';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const handleRaw: string = (body?.handle || '').trim().replace(/^@/, '');
    if (!handleRaw) return NextResponse.json({ error: 'Missing handle' }, { status: 400 });

    // already registered?
    const exists = await getCreatorByHandle(handleRaw);
    if (exists) return NextResponse.json({ error: 'Handle already registered' }, { status: 409 });

    // fetch neynar profile
    const neynar = await fetchNeynarUserByHandle(handleRaw);
    if (!neynar) return NextResponse.json({ error: 'Neynar lookup failed' }, { status: 422 });

    const id = handleRaw.toLowerCase(); // primary id
    const creator = await createCreatorUnique({
      id,
      handle: handleRaw,
      address: null,
      fid: neynar.fid,
      displayName: neynar.display_name || handleRaw,
      avatarUrl: neynar.pfp_url,
      bio: neynar.bio?.text,
      createdAt: Date.now(),
    });

    return NextResponse.json({ ok: true, creator });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
