import { NextRequest, NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  verifyMessage,
  type Address,
} from 'viem'
import { CREATOR_HUB_ADDR, CREATOR_HUB_ABI, BASE } from '@/lib/creatorHub'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/* ------------------------ chain + response helpers ------------------------ */

const RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  'https://mainnet.base.org'

function getClient() {
  return createPublicClient({ chain: BASE, transport: http(RPC) })
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    headers: { 'cache-control': 'no-store' },
    ...init,
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    },
  })
}

/* ------------------------------ nonce helpers ----------------------------- */

const NONCE_TTL = 60 * 10 // 10 minutes

type NonceScope = {
  mode?: 'post' | 'sub'
  postId?: string
  creator?: Address
}

function nonceKey(user: Address, nonce: string) {
  return `auth:nonce:${user.toLowerCase()}:${nonce}`
}

async function issueNonce(user: Address, scope?: NonceScope) {
  const nonce = crypto.randomUUID().replace(/-/g, '')
  const payload = JSON.stringify({
    t: Date.now(),
    scope: scope || null,
  })
  await kv.set(nonceKey(user, nonce), payload, { ex: NONCE_TTL })
  return nonce
}

async function consumeNonce(user: Address, nonce: string, scope?: NonceScope) {
  const key = nonceKey(user, nonce)
  const raw = await kv.get<string>(key)
  if (!raw) return { ok: false as const, reason: 'badNonce' as const }
  await kv.del(key)

  try {
    const parsed = JSON.parse(raw) as { t: number; scope: NonceScope | null }
    if (!parsed.scope) return { ok: true as const }
    const a = parsed.scope
    const b = scope || {}
    if (a.mode && a.mode !== b.mode) return { ok: false as const, reason: 'scopeMismatch' as const }
    if (a.postId && a.postId !== b.postId) return { ok: false as const, reason: 'scopeMismatch' as const }
    if (a.creator && a.creator.toLowerCase() !== (b.creator || ('' as Address)).toLowerCase()) {
      return { ok: false as const, reason: 'scopeMismatch' as const }
    }
    return { ok: true as const }
  } catch {
    return { ok: false as const, reason: 'badNonce' as const }
  }
}

/* ------------------------- signature verification ------------------------- */

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
  message?: string
}) {
  if (!opts.signature || !opts.nonce) return { ok: false, reason: 'missingSig' as const }

  const scope: NonceScope = {
    mode: opts.mode,
    postId: opts.postId ? opts.postId.toString() : undefined,
    creator: opts.creator,
  }
  const nonceCheck = await consumeNonce(opts.user, opts.nonce, scope)
  if (!nonceCheck.ok) return { ok: false, reason: nonceCheck.reason }

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
      headers: { 'api_key': apiKey, accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false as const, reason: 'neynarError' as const }
    const data = await res.json()
    const u = (data?.users?.[0]) || {}

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const nonceFor = (url.searchParams.get('nonce') || '').trim()
  const scopeMode = (url.searchParams.get('mode') || '').trim() as 'post' | 'sub' | ''
  const scopePostId = (url.searchParams.get('postId') || '').trim()
  const scopeCreator = (url.searchParams.get('creator') || '').trim()

  if (nonceFor) {
    if (!isAddress(nonceFor)) {
      return json({ ok: false, error: 'Invalid address' }, { status: 400 })
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const rlKey = `rl:gate-nonce:${getAddress(nonceFor)}:${ip}`
    const ok = await kv.set(rlKey, '1', { nx: true, ex: 5 })
    if (!ok) return json({ ok: false, error: 'Slow down' }, { status: 429 })

    let scope: NonceScope | undefined
    try {
      if (scopeMode === 'post' || scopeMode === 'sub') {
        const scoped: NonceScope = { mode: scopeMode }
        if (scopeMode === 'post') {
          if (scopePostId) {
            const n = BigInt(scopePostId)
            if (n <= 0n) throw new Error('postId must be > 0')
            scoped.postId = n.toString()
          }
        }
        if (scopeCreator) {
          if (!isAddress(scopeCreator)) throw new Error('Invalid creator')
          scoped.creator = getAddress(scopeCreator)
        }
        scope = scoped
      }
    } catch (e: any) {
      return json({ ok: false, error: e?.message || 'Invalid scope' }, { status: 400 })
    }

    const nonce = await issueNonce(getAddress(nonceFor), scope)
    return json({ ok: true, nonce, expiresInSeconds: NONCE_TTL, scoped: !!scope })
  }

  const client = getClient()
  return json({ ok: true, hub: CREATOR_HUB_ADDR, chainId: client.chain?.id ?? BASE.id })
}

/* --------------------------------- POST ----------------------------------- */

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const rawMode = String(body?.mode || 'post')
  const mode = rawMode === 'sub' ? 'sub' : 'post'

  const rawUser = String(body?.user || '')
  if (!isAddress(rawUser)) return json({ ok: false, error: 'Invalid user address' }, { status: 400 })
  const user = getAddress(rawUser)

  const client = getClient()

  try {
    if (mode === 'post') {
      const pidRaw = body?.postId
      const pidStr = typeof pidRaw === 'string' ? pidRaw : String(pidRaw ?? '')
      let postId: bigint
      try {
        postId = BigInt(pidStr)
        if (postId <= 0n) throw new Error()
      } catch {
        return json({ ok: false, error: 'Missing/invalid postId' }, { status: 400 })
      }

      const allowed = (await client.readContract({
        address: CREATOR_HUB_ADDR,
        abi: CREATOR_HUB_ABI,
        functionName: 'hasPostAccess',
        args: [user, postId],
      })) as boolean

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
        reason: allowed ? 'hasAccess' : 'noAccess',
        auth: {
          signature: sigProof.ok,
          signatureReason: sigProof.ok ? undefined : sigProof.reason,
          farcaster: fcProof.ok,
          farcasterReason: fcProof.ok ? undefined : fcProof.reason,
        },
      })
    }

    const rawCreator = String(body?.creator || '')
    if (!isAddress(rawCreator)) return json({ ok: false, error: 'Invalid creator address' }, { status: 400 })
    const creator = getAddress(rawCreator)

    const active = (await client.readContract({
      address: CREATOR_HUB_ADDR,
      abi: CREATOR_HUB_ABI,
      functionName: 'isActive',
      args: [user, creator],
    })) as boolean

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
  } catch (err: any) {
    const msg = err?.shortMessage || err?.message || String(err)
    return json({ ok: false, error: msg }, { status: 500 })
  }
}
