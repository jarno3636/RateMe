// app/api/gate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { CREATOR_HUB_ADDR, CREATOR_HUB_ABI, BASE } from '@/lib/creatorHub'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Build a viem public client for Base (uses your RPC env if set)
function getClient() {
  // Prefer explicit RPC, otherwise viem’s default for BASE
  const rpc =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    process.env.BASE_RPC_URL || // optional alt key
    undefined
  return createPublicClient({
    chain: BASE,
    transport: http(rpc),
  })
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

export async function GET() {
  const client = getClient()
  return json({
    ok: true,
    hub: CREATOR_HUB_ADDR,
    chainId: client.chain?.id,
  })
}

/**
 * POST body (choose one mode):
 * - { mode: "post", user: "0x...", postId: number|string }
 * - { mode: "sub",  user: "0x...", creator: "0x..." }
 */
export async function POST(req: NextRequest) {
  let body: any = null
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const mode = (body?.mode || 'post') as 'post' | 'sub'
  const user = String(body?.user || '')
  const client = getClient()

  if (!isAddress(user)) {
    return json({ ok: false, error: 'Invalid user address' }, { status: 400 })
  }

  try {
    if (mode === 'post') {
      const postId = BigInt(body?.postId ?? 0)
      if (postId <= 0n) {
        return json({ ok: false, error: 'Missing/invalid postId' }, { status: 400 })
      }

      const allowed = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'hasPostAccess',
        args: [user as `0x${string}`, postId],
      })) as boolean

      return json({
        ok: true,
        mode,
        user,
        postId: postId.toString(),
        allowed,
        reason: allowed ? 'hasAccess' : 'noAccess',
      })
    }

    if (mode === 'sub') {
      const creator = String(body?.creator || '')
      if (!isAddress(creator)) {
        return json({ ok: false, error: 'Invalid creator address' }, { status: 400 })
      }

      const active = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'isActive',
        args: [user as `0x${string}`, creator as `0x${string}`],
      })) as boolean

      return json({
        ok: true,
        mode,
        user,
        creator,
        allowed: active,
        reason: active ? 'activeSubscription' : 'inactive',
      })
    }

    return json({ ok: false, error: 'Unknown mode' }, { status: 400 })
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || String(err)
    return json({ ok: false, error: msg }, { status: 500 })
  }
}
