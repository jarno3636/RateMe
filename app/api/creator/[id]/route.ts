// app/api/creator/[id]/route.ts
import { NextResponse } from 'next/server';
import { getCreator, updateCreatorKV } from '@/lib/kv';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const MAX_BIO_WORDS = 250;

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
function isUrlish(s: string) {
  if (s.startsWith('ipfs://')) return true;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id || '').trim().toLowerCase();
    if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });

    const creator = await getCreator(id);
    if (!creator) {
      return NextResponse.json({ ok: false, error: 'creator not found' }, { status: 404, headers: { 'cache-control': 'no-store' } });
    }

    return NextResponse.json({ ok: true, creator }, { headers: { 'cache-control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id || '').trim().toLowerCase();
    if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });

    const b = await req.json().catch(() => ({}));
    const bio = typeof b?.bio === 'string' ? b.bio : undefined;
    const avatarUrlRaw = typeof b?.avatarUrl === 'string' ? b.avatarUrl.trim() : undefined;
    const handleRaw = typeof b?.handle === 'string' ? b.handle : undefined;
    const address = typeof b?.address === 'string' ? b.address : undefined;
    const displayName = typeof b?.displayName === 'string' ? b.displayName : undefined;
    const fid = typeof b?.fid === 'number' ? b.fid : undefined;

    if (bio && wordCount(bio) > MAX_BIO_WORDS) {
      return NextResponse.json({ ok: false, error: 'bio > 250 words' }, { status: 400 });
    }
    if (avatarUrlRaw && !(avatarUrlRaw.startsWith('ipfs://') || isUrlish(avatarUrlRaw))) {
      return NextResponse.json({ ok: false, error: 'bad avatarUrl' }, { status: 400 });
    }

    const handle = handleRaw
      ? handleRaw.trim().replace(/^@+/, '').toLowerCase()
      : undefined;

    const updated = await updateCreatorKV({
      id,
      bio,
      avatarUrl: avatarUrlRaw,
      handle,
      address,
      displayName,
      fid,
    });

    // Best-effort revalidate (safe to ignore on Edge)
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath(`/creator/${id}`);
      if (updated.handle) revalidatePath(`/creator/${updated.handle}`);
    } catch { /* noop for Edge runtime */ }

    return NextResponse.json({ ok: true, creator: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}
