import { NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { getCreatorByOwner } from '@/lib/kv';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const addrParam = (url.searchParams.get('address') || '').trim();

    if (!isAddress(addrParam)) {
      return NextResponse.json({ ok: false, error: 'bad address' }, { status: 400 });
    }

    // Checksum normalize so all callers get the same shape
    const owner = getAddress(addrParam) as `0x${string}`;

    const creator = await getCreatorByOwner(owner).catch(() => null);
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: 'creator not found for owner' },
        { status: 404, headers: { 'cache-control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { ok: true, creator },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'server error' },
      { status: 500 }
    );
  }
}
