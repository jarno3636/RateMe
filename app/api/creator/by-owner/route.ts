// app/api/creator/by-owner/route.ts
import { NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { getCreatorByOwner } from '@/lib/kv'; // implement to read your secondary index if you have one

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const addr = url.searchParams.get('address') || '';
  if (!isAddress(addr)) return NextResponse.json({ error: 'bad address' }, { status: 400 });

  const owner = getAddress(addr) as `0x${string}`;
  const creator = await getCreatorByOwner(owner).catch(() => null);
  return NextResponse.json({ ok: true, creator });
}
