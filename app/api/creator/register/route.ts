// app/api/creator/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCreatorUnique } from '@/lib/kv'
import { fetchNeynarUserByHandle, fetchNeynarUserByFid } from '@/lib/neynar'

import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { PROFILE_REGISTRY_ABI, PROFILE_REGISTRY_ADDR } from '@/lib/registry'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function normalizeHandle(s: string) {
  return s.trim().replace(/^@/, '').toLowerCase()
}
function isValidHandle(h: string) {
  return h.length >= 3 && h.length <= 32 && /^[a-z0-9._-]+$/.test(h)
}

const pub = createPublicClient({
  chain: base,
  transport: http(), // respects NEXT_PUBLIC_VERCEL_ env networking
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Normalize + validate handle
    const rawInput = String(body?.handle ?? '')
    const handleId = normalizeHandle(rawInput)
    if (!handleId) {
      return NextResponse.json({ error: 'Missing handle' }, { status: 400 })
    }
    if (!isValidHandle(handleId)) {
      return NextResponse.json({ error: 'Invalid handle' }, { status: 400 })
    }

    // Optional inputs
    const address = (body?.address ?? null) as `0x${string}` | null
    const fidInput = typeof body?.fid === 'number' ? (body.fid as number) : undefined

    // Soft rate limit per IP + handle to prevent spam
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const rlKey = `ratelimit:creator:${handleId}:${ip}`
    const rlOk = await kv.set(rlKey, '1', { nx: true, ex: 10 })
    if (!rlOk) {
      return NextResponse.json({ error: 'Slow down, please retry shortly' }, { status: 429 })
    }

    // On-chain check: reject if handle already exists on Base (your verified contract)
    try {
      const exists = (await pub.readContract({
        address: PROFILE_REGISTRY_ADDR,
        abi: PROFILE_REGISTRY_ABI,
        functionName: 'handleTaken',
        args: [handleId],
      })) as boolean

      if (exists) {
        return NextResponse.json(
          { error: 'Handle already registered on-chain' },
          { status: 409 }
        )
      }
    } catch {
      // If RPC hiccups, don’t block — KV uniqueness + UI flow will still be safe.
    }

    // Neynar enrichment (best-effort)
    let displayName: string | undefined
    let avatarUrl: string | undefined
    let bio: string | undefined
    let fid: number | undefined = fidInput

    try {
      if (fidInput) {
        const u = await fetchNeynarUserByFid(fidInput)
        if (u) {
          fid = u.fid
          displayName = u.display_name || undefined
          avatarUrl = u.pfp_url || undefined
          bio = u.bio?.text || undefined
        }
      } else {
        const u = await fetchNeynarUserByHandle(handleId)
        if (u) {
          fid = u.fid
          displayName = u.display_name || undefined
          avatarUrl = u.pfp_url || undefined
          bio = u.bio?.text || undefined
        }
      }
    } catch {
      // ignore enrichment errors
    }

    // Create atomically; KV setnx inside createCreatorUnique guarantees uniqueness
    const creator = await createCreatorUnique({
      id: handleId,                 // primary key (lowercased)
      handle: handleId,             // store lowercase; UI can render with @
      address,
      fid,
      displayName: displayName ?? handleId,
      avatarUrl,
      bio,
      createdAt: Date.now(),
    })

    return NextResponse.json({ ok: true, creator }, { status: 201 })
  } catch (e: any) {
    const msg = String(e?.message || e)

    if (msg.includes('Handle is taken') || msg.includes('already exists')) {
      return NextResponse.json({ error: 'Handle already registered' }, { status: 409 })
    }

    console.error('creator/register failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
