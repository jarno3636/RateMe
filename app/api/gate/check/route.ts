import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress, isAddress } from 'viem';
import { BASE } from '@/lib/creatorHub';
import { CREATOR_HUB_ADDR, CREATOR_HUB_ABI } from '@/lib/creatorHub';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { headers: { 'cache-control': 'no-store' }, ...init });
}

const RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  'https://mainnet.base.org';

const client = createPublicClient({
  chain: BASE,
  transport: http(RPC),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const userRaw = (u.searchParams.get('user') || '').trim();
    const creatorRaw = (u.searchParams.get('creator') || '').trim();
    const postIdRaw = (u.searchParams.get('postId') || '').trim();

    if (!isAddress(userRaw)) return json({ ok: false, error: 'bad user' }, { status: 400 });
    const user = getAddress(userRaw);

    let postId: bigint | null = null;
    if (postIdRaw) {
      try {
        postId = BigInt(postIdRaw);
        if (postId <= 0n) throw new Error();
      } catch {
        return json({ ok: false, error: 'bad postId' }, { status: 400 });
      }
    }

    let subActive: boolean | null = null;
    let hasAccess: boolean | null = null;

    if (isAddress(creatorRaw)) {
      const creator = getAddress(creatorRaw);
      subActive = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'isActive',
        args: [user, creator],
      })) as boolean;
    }

    if (postId) {
      hasAccess = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'hasPostAccess',
        args: [user, postId],
      })) as boolean;
    }

    return json({
      ok: true,
      user,
      creator: isAddress(creatorRaw) ? getAddress(creatorRaw) : null,
      postId: postId ? postId.toString() : null,
      subActive,
      hasAccess,
      chainId: client.chain?.id ?? BASE.id,
      hub: CREATOR_HUB_ADDR,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || 'server error' }, { status: 500 });
  }
}
