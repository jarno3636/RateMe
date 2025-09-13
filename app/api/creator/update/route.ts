import { NextResponse } from 'next/server';

// Optional imports (guarded)
let prisma: any = null;
try {
  // If your app has prisma at this path, this will work; otherwise it’ll be null and we’ll fall back.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  prisma = require('@/lib/prisma')?.prisma ?? require('@/lib/prisma')?.default ?? null;
} catch { /* ignore */ }

let kv: any = null;
try {
  // If you have @vercel/kv configured, we can fall back to it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  kv = require('@vercel/kv');
} catch { /* ignore */ }

function isUrlLike(s: unknown) {
  if (typeof s !== 'string') return false;
  if (s.startsWith('ipfs://')) return true;
  try {
    // Allow http(s) only
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl.trim() : '';
    const bio = typeof body?.bio === 'string' ? body.bio : '';

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing creator id' }, { status: 400 });
    }
    if (bio && wordCount(bio) > 250) {
      return NextResponse.json({ ok: false, error: 'Bio exceeds 250 words' }, { status: 400 });
    }
    if (avatarUrl && !(isUrlLike(avatarUrl))) {
      return NextResponse.json({ ok: false, error: 'avatarUrl must be http(s):// or ipfs://' }, { status: 400 });
    }

    let updated: any = null;

    // 1) Try Prisma first (if present)
    if (prisma?.creator) {
      updated = await prisma.creator.update({
        where: { id },
        data: {
          avatarUrl: avatarUrl || null,
          bio: bio || '',
        },
      });
    }

    // 2) Fall back to KV if Prisma unavailable or failed
    if (!updated && kv) {
      const key = `creator:${id}`;
      const existing = await kv.get(key);
      const nextValue = {
        ...(existing || {}),
        id,
        avatarUrl: avatarUrl || null,
        bio: bio || '',
        updatedAt: Date.now(),
      };
      await kv.set(key, nextValue);
      updated = nextValue;
    }

    if (!updated) {
      // If neither backend is available, return OK but tell the dev what to enable.
      return NextResponse.json({
        ok: false,
        error:
          'No data backend found. Provide prisma (lib/prisma.ts) or @vercel/kv to persist creator updates.',
      }, { status: 500 });
    }

    // Revalidate the creator page (works in Next 14/15 with App Router)
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath(`/creator/${id}`);
    } catch {
      // non-fatal
    }

    // Normalize a minimal return shape for the client
    const payload = {
      id: String(updated.id ?? id),
      avatarUrl: updated.avatarUrl ?? null,
      bio: typeof updated.bio === 'string' ? updated.bio : '',
      updatedAt: Number(updated.updatedAt ?? Date.now()),
    };

    return NextResponse.json({ ok: true, creator: payload }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
