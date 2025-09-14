// app/api/creator/update/route.ts
import { NextResponse } from 'next/server'
import {
  getCreator,
  getCreatorByHandle,
  createCreatorUnique,
  updateCreatorKV,
  type Creator,
} from '@/lib/kv'
import type { Abi, Address } from 'viem'
import { createPublicClient, http, isAddress, getAddress } from 'viem'
import { base } from 'viem/chains'
import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi'
import { REGISTRY_ADDRESS } from '@/lib/profileRegistry/constants'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const MAX_BIO_WORDS = 250
const lc = (s: string) => String(s || '').trim().toLowerCase()
const normalizeHandle = (s: string) => lc(s).replace(/^@+/, '')
const isUrlish = (s: string) => {
  if (s.startsWith('ipfs://')) return true
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}

const pub = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      process.env.BASE_RPC_URL ||
      'https://mainnet.base.org'
  ),
})

async function fetchOnchainById(idNum: bigint): Promise<Creator | null> {
  const addr = REGISTRY_ADDRESS as Address
  if (!addr || !isAddress(addr)) return null
  try {
    const r = (await pub.readContract({
      address: addr,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfile',
      args: [idNum],
    })) as any
    if (!r) return null
    const owner = r[0] as Address
    const handle = String(r[1] || '')
    const displayName = String(r[2] || '')
    const avatarUrl = String(r[3] || '')
    const bio = String(r[4] || '')
    const fid = Number(BigInt(r[5] || 0))
    const createdAt = Number(BigInt(r[6] || 0)) * 1000
    return {
      id: handle || idNum.toString(),
      handle: handle || idNum.toString(),
      displayName: displayName || handle || idNum.toString(),
      avatarUrl,
      bio,
      fid,
      address: getAddress(owner) as `0x${string}`,
      createdAt,
      updatedAt: createdAt,
    }
  } catch { return null }
}
async function fetchOnchainByHandle(handle: string): Promise<Creator | null> {
  const addr = REGISTRY_ADDRESS as Address
  if (!addr || !isAddress(addr)) return null
  try {
    const r = (await pub.readContract({
      address: addr,
      abi: PROFILE_REGISTRY_ABI as Abi,
      functionName: 'getProfileByHandle',
      args: [handle],
    })) as any
    if (!r?.[0]) return null
    return {
      id: handle,
      handle,
      displayName: String(r[4] || handle),
      avatarUrl: String(r[5] || ''),
      bio: String(r[6] || ''),
      fid: Number(BigInt(r[7] || 0)),
      address: getAddress((r[2] || r[3]) as Address) as `0x${string}`,
      createdAt: Number(BigInt(r[8] || 0)) * 1000,
      updatedAt: Date.now(),
    }
  } catch { return null }
}

async function resolveOrBootstrap(idOrHandleRaw: string): Promise<Creator | null> {
  const key = lc(idOrHandleRaw)
  if (!key) return null

  const byId = await getCreator(key).catch(() => null)
  if (byId) return byId

  const handle = normalizeHandle(key)
  const byHandle = await getCreatorByHandle(handle).catch(() => null)
  if (byHandle) return byHandle

  let onchain: Creator | null = null
  if (/^\d+$/.test(key)) onchain = await fetchOnchainById(BigInt(key))
  else onchain = await fetchOnchainByHandle(handle)

  if (!onchain) return null

  const now = Date.now()
  const seed: Creator = {
    id: normalizeHandle(onchain.handle || onchain.id),
    handle: normalizeHandle(onchain.handle || onchain.id),
    address: onchain.address || null,
    fid: onchain.fid,
    displayName: onchain.displayName || onchain.handle,
    avatarUrl: onchain.avatarUrl,
    bio: onchain.bio,
    createdAt: onchain.createdAt || now,
    updatedAt: now,
  }

  await createCreatorUnique(seed).catch(() => null)
  return seed
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}))

    const idOrHandle = String(b?.id || '').trim()
    if (!idOrHandle) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 })

    const bio = typeof b?.bio === 'string' ? b.bio : undefined
    const avatarUrlRaw = typeof b?.avatarUrl === 'string' ? b.avatarUrl.trim() : undefined
    const handleRaw = typeof b?.handle === 'string' ? b.handle : undefined
    const address = typeof b?.address === 'string' ? b.address : undefined
    const displayName = typeof b?.displayName === 'string' ? b.displayName : undefined
    const fid = typeof b?.fid === 'number' ? b.fid : undefined

    if (bio) {
      const wc = bio.trim().split(/\s+/).filter(Boolean).length
      if (wc > MAX_BIO_WORDS) return NextResponse.json({ ok: false, error: 'bio > 250 words' }, { status: 400 })
    }
    if (avatarUrlRaw && !(avatarUrlRaw.startsWith('ipfs://') || isUrlish(avatarUrlRaw))) {
      return NextResponse.json({ ok: false, error: 'bad avatarUrl' }, { status: 400 })
    }

    const handle = handleRaw ? normalizeHandle(handleRaw) : undefined

    const ensured = await resolveOrBootstrap(idOrHandle)
    if (!ensured) return NextResponse.json({ ok: false, error: 'creator not found' }, { status: 404 })

    const updated = await updateCreatorKV({
      id: ensured.id,
      bio,
      avatarUrl: avatarUrlRaw,
      handle,
      address,
      displayName,
      fid,
    })

    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath(`/creator/${updated.id}`)
      if (updated.handle) revalidatePath(`/creator/${updated.handle}`)
    } catch { /* edge-safe */ }

    return NextResponse.json({ ok: true, creator: updated }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server error' }, { status: 500 })
  }
}
