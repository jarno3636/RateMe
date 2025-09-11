// app/api/creator/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient, http, isAddress, getAddress } from 'viem'
import { base } from 'viem/chains'
import { kv } from '@vercel/kv'

import { createCreatorUnique, getCreator, getCreatorByHandle } from '@/lib/kv'
import { fetchNeynarUserByHandle, fetchNeynarUserByFid } from '@/lib/neynar'

// ✅ New registry imports (replaces "@/lib/registry")
import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi'
import { REGISTRY_ADDRESS as PROFILE_REGISTRY_ADDR } from '@/lib/profileRegistry/constants'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/* ------------------------------ helpers ------------------------------ */

const Handle = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@/, '').toLowerCase())
  .refine((h) => h.length >= 3 && h.length <= 32 && /^[a-z0-9._-]+$/.test(h), {
    message: 'Invalid handle',
  })

const BodySchema = z.object({
  handle: Handle,
  address: z
    .string()
    .optional()
    .nullable()
    .transform((a) => (a ? a.trim() : null))
    .refine((a) => a === null || isAddress(a), { message: 'Invalid address' })
    .transform((a) => (a ? (getAddress(a) as `0x${string}`) : null)),
  fid: z.number().int().positive().optional(),
  // optional UI override; we'll still try Neynar
  displayName: z.string().trim().min(1).max(64).optional(),
})

const BASE_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  'https://mainnet.base.org'

const pub = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
})

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

/* ------------------------------- GET --------------------------------- */
/**
 * Idempotent availability check.
 *   /api/creator/register?handle=alice
 *   /api/creator/register?id=alice
 *
 * Response:
 *   { ok: true, exists: boolean, onchainTaken: boolean, creator?: {...} }
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const rawHandle = url.searchParams.get('handle')
    const rawId = url.searchParams.get('id')
    const source = (rawHandle ?? rawId ?? '').trim()

    if (!source) return json({ error: 'Missing handle or id' }, { status: 400 })

    const parsed = Handle.safeParse(source)
    if (!parsed.success) {
      return json(
        { ok: true, exists: false, onchainTaken: false, error: 'invalid' },
        { status: 200 },
      )
    }
    const id = parsed.data // normalized lowercase

    // KV lookup (by id and by handle mapping)
    let creator = await getCreator(id)
    if (!creator) creator = await getCreatorByHandle(id)

    // On-chain handleTaken check (best-effort)
    let onchainTaken = false
    try {
      onchainTaken = (await pub.readContract({
        address: PROFILE_REGISTRY_ADDR,
        abi: PROFILE_REGISTRY_ABI,
        functionName: 'handleTaken',
        args: [id],
      })) as boolean
    } catch (e) {
      console.warn('handleTaken read failed:', e)
    }

    return json({
      ok: true,
      exists: !!creator,
      onchainTaken,
      creator: creator || null,
    })
  } catch (e: any) {
    return json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

/* ------------------------------- POST -------------------------------- */
/**
 * Create a creator record (KV) after validating handle and soft anti-abuse.
 * Also performs a best-effort on-chain pre-check and optional Neynar enrichment.
 */
export async function POST(req: NextRequest) {
  try {
    // Parse & validate
    const raw = await req.json().catch(() => ({}))
    const body = BodySchema.safeParse(raw)
    if (!body.success) {
      const first = body.error.issues[0]
      return json({ error: first?.message || 'Bad request' }, { status: 400 })
    }
    const { handle: handleId, address, fid: fidInput, displayName: displayNameFromBody } = body.data

    // Simple per-IP + handle rate-limit
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const rlKey = `rl:creator-register:${handleId}:${ip}`
    const okRL = await kv.set(rlKey, '1', { nx: true, ex: 15 }) // 15s window
    if (!okRL) return json({ error: 'Slow down, please retry shortly' }, { status: 429 })

    // On-chain pre-check (don’t hard fail if RPC errors)
    try {
      const exists = (await pub.readContract({
        address: PROFILE_REGISTRY_ADDR,
        abi: PROFILE_REGISTRY_ABI,
        functionName: 'handleTaken',
        args: [handleId],
      })) as boolean
      if (exists) return json({ error: 'Handle already registered on-chain' }, { status: 409 })
    } catch (e) {
      console.warn('pre-check handleTaken failed:', e)
    }

    // Neynar enrichment (best-effort, prefer FID if provided)
    let displayName = displayNameFromBody
    let avatarUrl: string | undefined
    let bio: string | undefined
    let fid = fidInput

    try {
      if (fidInput) {
        const u = await fetchNeynarUserByFid(fidInput)
        if (u) {
          fid = u.fid
          displayName ||= u.display_name || undefined
          avatarUrl = u.pfp_url || undefined
          bio = u.bio?.text || undefined
        }
      } else {
        const u = await fetchNeynarUserByHandle(handleId)
        if (u) {
          fid = u.fid
          displayName ||= u.display_name || undefined
          avatarUrl = u.pfp_url || undefined
          bio = u.bio?.text || undefined
        }
      }
    } catch (e) {
      console.warn('Neynar enrichment failed:', e)
    }

    // Atomic create (KV SETNX inside guarantees uniqueness)
    const creator = await createCreatorUnique({
      id: handleId,                // primary key (lowercased)
      handle: handleId,            // stored lowercase; UI renders "@"
      address: address ?? null,
      fid,
      displayName: displayName || handleId,
      avatarUrl,
      bio,
      createdAt: Math.floor(Date.now() / 1000), // ✅ unix seconds
    })

    // Optional tiny audit log (non-blocking)
    try {
      await kv.lpush('creator:events', JSON.stringify({ t: Date.now(), type: 'register', handleId, ip }))
      await kv.ltrim('creator:events', 0, 199)
    } catch {}

    return json({ ok: true, creator }, { status: 201 })
  } catch (e: any) {
    const msg = String(e?.message || e)

    if (msg.includes('Handle is taken') || msg.includes('already exists')) {
      return json({ error: 'Handle already registered' }, { status: 409 })
    }

    console.error('creator/register failed:', e)
    return json({ error: 'Server error' }, { status: 500 })
  }
}
