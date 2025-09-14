// lib/gate.ts
import { createPublicClient, createWalletClient, custom, http, getAddress } from 'viem'
import { base } from 'viem/chains'

const RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  process.env.BASE_RPC_URL ||
  'https://mainnet.base.org'

export const publicClient = createPublicClient({ chain: base, transport: http(RPC) })

/** Cache “allowed” for a short time to avoid re-signing on every render */
const MEMO_TTL_MS = 2 * 60 * 1000 // 2 minutes
const memo = new Map<string, { ok: boolean; until: number }>()
function setMemo(key: string, ok: boolean) { memo.set(key, { ok, until: Date.now() + MEMO_TTL_MS }) }
function getMemo(key: string): boolean | null {
  const v = memo.get(key); if (!v) return null
  if (Date.now() > v.until) { memo.delete(key); return null }
  return v.ok
}

/** Quick read: /api/gate/check */
export async function cheapCheck(params: { user: `0x${string}`; creator?: `0x${string}`; postId?: bigint }) {
  const url = new URL('/api/gate/check', window.location.origin)
  url.searchParams.set('user', params.user)
  if (params.creator) url.searchParams.set('creator', params.creator)
  if (params.postId) url.searchParams.set('postId', params.postId.toString())
  const res = await fetch(url, { cache: 'no-store' })
  return (await res.json()) as {
    ok: boolean; subActive: boolean | null; hasAccess: boolean | null
  }
}

/** Ask API for a one-time nonce (optionally scoped) */
async function getNonce(user: `0x${string}`, scope: { mode: 'post' | 'sub'; postId?: bigint; creator?: `0x${string}` }){
  const url = new URL('/api/gate', window.location.origin)
  url.searchParams.set('nonce', user)
  url.searchParams.set('mode', scope.mode)
  if (scope.postId) url.searchParams.set('postId', scope.postId.toString())
  if (scope.creator) url.searchParams.set('creator', scope.creator)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  const j = await res.json()
  if (!res.ok || !j?.ok || !j?.nonce) throw new Error(j?.error || 'nonce failed')
  return String(j.nonce)
}

/** Canonical message (must match server) */
function buildMessage(p: { mode: 'post'|'sub'; user: `0x${string}`; nonce: string; postId?: bigint; creator?: `0x${string}` }) {
  return [
    'RateMe Gate',
    `mode=${p.mode}`,
    `user=${p.user}`,
    p.postId !== undefined ? `postId=${p.postId.toString()}` : '',
    p.creator ? `creator=${p.creator}` : '',
    `nonce=${p.nonce}`,
  ].filter(Boolean).join('\n')
}

/** Sign with the connected EOA via window.ethereum */
async function signMessage(message: string): Promise<`0x${string}`> {
  if (!window.ethereum) throw new Error('Wallet not found')
  const wallet = createWalletClient({ chain: base, transport: custom(window.ethereum) })
  const [account] = await wallet.getAddresses()
  const sig = await wallet.signMessage({ account, message })
  return sig
}

/** Full verify (signature path). Falls back to cheap check first and caches result. */
export async function verifyPostAccess(user: `0x${string}`, postId: bigint) {
  const k = `post:${user}:${postId}`
  const memoed = getMemo(k); if (memoed !== null) return memoed

  // quick read
  try {
    const chk = await cheapCheck({ user, postId })
    if (chk.ok && chk.hasAccess) { setMemo(k, true); return true }
  } catch {}

  // signed proof
  const nonce = await getNonce(user, { mode: 'post', postId })
  const message = buildMessage({ mode: 'post', user, postId, nonce })
  const sig = await signMessage(message)

  const res = await fetch('/api/gate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'post', user, postId: postId.toString(), sig, nonce, message }),
  })
  const j = await res.json()
  const ok = !!j?.ok && !!j?.allowed
  setMemo(k, ok)
  return ok
}

export async function verifySubActive(user: `0x${string}`, creator: `0x${string}`) {
  const k = `sub:${user}:${creator.toLowerCase()}`
  const memoed = getMemo(k); if (memoed !== null) return memoed

  try {
    const chk = await cheapCheck({ user, creator })
    if (chk.ok && chk.subActive) { setMemo(k, true); return true }
  } catch {}

  const nonce = await getNonce(user, { mode: 'sub', creator })
  const message = buildMessage({ mode: 'sub', user, creator, nonce })
  const sig = await signMessage(message)

  const res = await fetch('/api/gate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'sub', user, creator, sig, nonce, message }),
  })
  const j = await res.json()
  const ok = !!j?.ok && !!j?.allowed
  setMemo(k, ok)
  return ok
}

/** Helper for normalizing an address */
export function toChecksum(a?: string | null) {
  try { return a ? getAddress(a) : null } catch { return null }
}
