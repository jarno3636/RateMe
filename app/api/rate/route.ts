// app/api/rate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { putRating } from '@/lib/kv';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const creatorId: string = (body?.creatorId || '').toLowerCase();
    const score = Number(body?.score);
    const comment = (body?.comment || '').toString().slice(0, 400);
    const raterFid = body?.raterFid ? Number(body.raterFid) : undefined;

    if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 });
    if (!(score >= 1 && score <= 5)) return NextResponse.json({ error: 'score 1..5 required' }, { status: 400 });

    // Best-effort dedupe key: FID if present, else anonymous by UA/IP hash (weak)
    let raterKey = raterFid ? `fid:${raterFid}` : '';
    if (!raterKey) {
      const ip = req.headers.get('x-forwarded-for') || '0.0.0.0';
      const ua = req.headers.get('user-agent') || '';
      raterKey = `anon:${await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(ip + ua))
        .then((a) => Buffer.from(a).toString('hex').slice(0, 16))}`;
    }

    const ok = await putRating(
      { creatorId, raterFid, score, comment, createdAt: Date.now() },
      raterKey
    );
    if (!ok) return NextResponse.json({ error: 'Already rated' }, { status: 409 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
