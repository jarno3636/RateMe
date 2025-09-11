// app/creator/@[handle]/route.ts
import { NextResponse } from 'next/server';
import type { Abi, Address } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi';
import { REGISTRY_ADDRESS } from '@/lib/profileRegistry/constants';

export const runtime = 'edge';

const pub = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

function norm(h: string) { return (h || '').trim().replace(/^@+/, '').toLowerCase(); }

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const handle = norm(params.handle);
  if (!handle) return NextResponse.redirect(new URL('/discover', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));

  try {
    const id = await pub.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getIdByHandle',
      args: [handle],
    }) as bigint;

    if (id && id > 0n) {
      return NextResponse.redirect(new URL(`/creator/${id.toString()}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
    }
  } catch {
    // ignore and fall back
  }

  // Fall back to handle-based page (works with KV-only creators)
  return NextResponse.redirect(new URL(`/creator/${encodeURIComponent(handle)}`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
