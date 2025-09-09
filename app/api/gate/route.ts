// app/api/gate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  isAddress,
  verifyMessage,
  type Address,
} from 'viem'
import { CREATOR_HUB_ADDR, CREATOR_HUB_ABI, BASE } from '@/lib/creatorHub'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/* ------------------------ chain + response helpers ------------------------ */

function getClient() {
  const rpc =
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    process.env.BASE_RPC_URL ||
    undefined
  return createPublicClient({ chain: BASE, transport: http(rpc) })
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

/* ------------------------------ nonce helpers ----------------------------- */

const NONCE_TTL = 60 * 10 // 10 minutes

function nonceKey(user: Address, nonce: string) {
  return `auth:nonce:${user.toLowerCase()}:${nonce}`
}

/** Generate a nonce and store in KV (one-time use) */
async function issueNonce(user: Address) {
  const nonce = crypto.randomUUID().replace(/-/g, '')
  await kv.set(nonceKey(user, nonce), Date.now(), { ex: NONCE_TTL })
  return nonce
}

/** Consume a nonce (returns false if missing/expired) */
async function consumeNonce(user: Address, nonce: string) {
  const key = nonceKey(user, nonce)
  const exists = await kv.get(key)
  if (!exists) return false
  await kv.del(key)
  return true
}

/* ------------------------- signature verification ------------------------- */

/** Canonical message that the client must sign */
function gateMessage(params: {
  mode: 'post' | 'sub'
  user: Address
  postId?: bigint
  creator?: Address
  nonce: string
}) {
  const lines = [
    'RateMe Gate',
    `mode=${params.mode}`,
    `user=${params.user}`,
    params.postId !== undefined ? `postId=${params.postId.toString()}` : '',
    params.creator ? `creator=${params.creator}` : '',
    `nonce=${params.nonce}`,
  ].filter(Boolean)
  return lines.join('\n')
}

async function verifySig(opts: {
  mode: 'post' | 'sub'
  user: Address
  postId?: bigint
  creator?: Address
  nonce?: string
  signature?: `0x${string}`
  message?: string // optional; if omitted, we build it from the canonical format
}) {
  if (!opts.signature || !opts.nonce) return { ok: false, reason: 'missingSig' as const }

  // Nonce must exist (one-time); consume to prevent replay
  const okNonce = await consumeNonce(opts.user, opts.nonce)
  if (!okNonce) return { ok: false, reason: 'badNonce' as const }

  const msg = opts.message || gateMessage({
    mode: opts.mode,
    user: opts.user,
    postId: opts.postId,
    creator: opts.creator,
    nonce: opts.nonce,
  })

  const ok = await verifyMessage({
    address: opts.user,
    message: msg,
    signature: opts.signature,
  }).catch(() => false)

  return ok ? { ok: true as const } : { ok: false as const, reason: 'badSignature' as const }
}

/* --------------------------- farcaster verification ----------------------- */

async function verifyFarcasterCustody(fid: number, user: Address) {
  const apiKey = process.env.NEYNAR_API_KEY
  if (!apiKey) return { ok: false as const, reason: 'neynarMissing' as const }

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`
    const res = await fetch(url, {
      headers: { 'api_key': apiKey, 'accept': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false as const, reason: 'neynarError' as const }
    const data = await res.json()
    const u = (data?.users?.[0]) || {}

    // Two ways to match:
    // 1) current custody address
    // 2) verified addresses (eth_addresses)
    const custody = (u.custody_address || u.custodyAddress || '').toLowerCase()
    const verified: string[] = (u.verified_addresses?.eth_addresses || u.verified_addresses?.ethAddresses || []) as string[]
    const luv = user.toLowerCase()
    const ok = custody === luv || verified.some((a) => a.toLowerCase() === luv)

    return ok ? { ok: true as const } : { ok: false as const, reason: 'fidMismatch' as const }
  } catch {
    return { ok: false as const, reason: 'neynarError' as const }
  }
}

/* --------------------------------- GET ------------------------------------ */
/**
 * GET
 * - /api/gate                      -> health
 * - /api/gate?nonce=0xUserAddress  -> issue one-time nonce (for signing)
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const nonceFor = sp.get('nonce') || ''

  if (nonceFor) {
    if (!isAddress(nonceFor)) return json({ ok: false, error: 'Invalid address' }, { status: 400 })
    const nonce = await issueNonce(nonceFor as Address)
    return json({ ok: true, nonce, expiresInSeconds: NONCE_TTL })
  }

  const client = getClient()
  return json({ ok: true, hub: CREATOR_HUB_ADDR, chainId: client.chain?.id })
}

/* --------------------------------- POST ----------------------------------- */
/**
 * POST body (choose one mode) and optional proofs:
 * - { mode:"post", user:"0x...", postId:number, sig?, nonce?, message?, fid? }
 * - { mode:"sub",  user:"0x...", creator:"0x...", sig?, nonce?, message?, fid? }
 *
 * Proof options:
 *  A) Signature: include `sig` + `nonce` (+ optional `message` if not using the canonical format)
 *  B) Farcaster: include `fid` (we’ll verify custody/verified address via Neynar)
 *  Either proof is accepted; if both provided, both are checked and surfaced.
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const mode = (body?.mode || 'post') as 'post' | 'sub'
  const user = String(body?.user || '') as Address
  if (!isAddress(user)) return json({ ok: false, error: 'Invalid user address' }, { status: 400 })

  const client = getClient()

  try {
    let allowed = false
    let reason = 'noAccess'

    // ----- On-chain gate
    if (mode === 'post') {
      const postId = BigInt(body?.postId ?? 0)
      if (postId <= 0n) return json({ ok: false, error: 'Missing/invalid postId' }, { status: 400 })
      allowed = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'hasPostAccess',
        args: [user, postId],
      })) as boolean
      reason = allowed ? 'hasAccess' : 'noAccess'

      // proofs (optional)
      const sigProof = await verifySig({
        mode, user, postId,
        nonce: body?.nonce, signature: body?.sig, message: body?.message,
      })
      const fcProof = typeof body?.fid === 'number'
        ? await verifyFarcasterCustody(body.fid, user)
        : { ok: false as const, reason: 'noFid' as const }

      return json({
        ok: true,
        mode,
        user,
        postId: postId.toString(),
        allowed,
        reason,
        auth: {
          signature: sigProof.ok,
          signatureReason: sigProof.ok ? undefined : sigProof.reason,
          farcaster: fcProof.ok,
          farcasterReason: fcProof.ok ? undefined : fcProof.reason,
        },
      })
    }

    if (mode === 'sub') {
      const creator = String(body?.creator || '') as Address
      if (!isAddress(creator)) return json({ ok: false, error: 'Invalid creator address' }, { status: 400 })

      const active = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'isActive',
        args: [user, creator],
      })) as boolean

      // proofs (optional)
      const sigProof = await verifySig({
        mode, user, creator,
        nonce: body?.nonce, signature: body?.sig, message: body?.message,
      })
      const fcProof = typeof body?.fid === 'number'
        ? await verifyFarcasterCustody(body.fid, user)
        : { ok: false as const, reason: 'noFid' as const }

      return json({
        ok: true,
        mode,
        user,
        creator,
        allowed: active,
        reason: active ? 'activeSubscription' : 'inactive',
        auth: {
          signature: sigProof.ok,
          signatureReason: sigProof.ok ? undefined : sigProof.reason,
          farcaster: fcProof.ok,
          farcasterReason: fcProof.ok ? undefined : fcProof.reason,
        },
      })
    }

    return json({ ok: false, error: 'Unknown mode' }, { status: 400 })
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || String(err)
    return json({ ok: false, error: msg }, { status: 500 })
  }
}
