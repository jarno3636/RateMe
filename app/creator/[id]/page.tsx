// app/creator/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE } from '@/lib/config'
import {
  getCreator,
  getCreatorByHandle,
  getRatingSummary,
  getRecentRatings,
} from '@/lib/kv'
import ShareBar from '@/components/ShareBar'
import RateBox from '@/components/RateBox'
import OnchainSections from '@/components/OnchainSections'
import SubscriptionBadge from '@/components/SubscriptionBadge'
import { Star, ExternalLink } from 'lucide-react'

import type { Abi, Address } from 'viem'
import { createPublicClient, http, isAddress } from 'viem'
import { base } from 'viem/chains'
import { PROFILE_REGISTRY_ABI } from '@/lib/profileRegistry/abi'
import { REGISTRY_ADDRESS } from '@/lib/profileRegistry/constants'
import OwnerInline from './OwnerInline'

// 🔒 ensure no stale HTML or data
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type Params = { params: { id: string } }

const BASESCAN = 'https://basescan.org'
const SITE_CLEAN = (SITE || 'http://localhost:3000').replace(/\/$/, '')

const pub = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      process.env.BASE_RPC_URL ||
      'https://mainnet.base.org'
  ),
})

const isNumericId = (s: string) => /^\d+$/.test(s)
const normalizeHandle = (s: string) => s.trim().replace(/^@+/, '').toLowerCase()
const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

// --- helpers for safety/caching ---
const safeNumber = (v: any, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : fallback
}
const withVersion = (url: string, v?: number) => {
  if (!url) return url
  if (!/^https?:\/\//i.test(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${v ?? Date.now()}`
}
const REG_ADDR: Address | undefined =
  isAddress(REGISTRY_ADDRESS as any) ? (REGISTRY_ADDRESS as Address) : undefined
const isZeroAddr = (a?: string) =>
  !a || /^0x0{40}$/i.test(a.replace(/^0x/i, ''))

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const idParam = params.id.toLowerCase()
  const kv = await getCreator(idParam).catch(() => null)
  const title = kv
    ? `${kv.displayName || kv.handle} (@${kv.handle}) — Rate Me`
    : `@${idParam} — Rate Me`

  const url = `${SITE_CLEAN}/creator/${encodeURIComponent(idParam)}`
  const og = `${SITE_CLEAN}/api/og/creator?id=${encodeURIComponent(idParam)}`
  return {
    title,
    alternates: { canonical: url },
    openGraph: { title, url, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', images: [og], title },
  }
}

/** On-chain fallbacks (bio usually comes from KV) */
async function fetchOnchainById(idNum: bigint) {
  if (!REG_ADDR || isZeroAddr(REG_ADDR)) return null
  try {
    const r = (await pub.readContract({
      address: REG_ADDR,
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
      address: owner as `0x${string}`,
      createdAt,
    }
  } catch {
    return null
  }
}
async function fetchOnchainByHandle(handle: string) {
  if (!REG_ADDR || isZeroAddr(REG_ADDR)) return null
  try {
    const r = (await pub.readContract({
      address: REG_ADDR,
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
      address: (r[2] || r[3]) as `0x${string}`,
      createdAt: Number(BigInt(r[8] || 0)) * 1000,
    }
  } catch {
    return null
  }
}

export default async function CreatorPage({ params }: Params) {
  const raw = params.id || ''
  const idParam = raw.toLowerCase()

  // 1) KV (authoritative for bio/avatar)
  let creator =
    (await getCreator(idParam).catch(() => null)) ||
    (await getCreatorByHandle(normalizeHandle(idParam)).catch(() => null))

  // 2) Fallback to chain only if KV missing
  if (!creator) {
    creator = isNumericId(idParam)
      ? await fetchOnchainById(BigInt(idParam))
      : await fetchOnchainByHandle(normalizeHandle(idParam))
  }
  if (!creator) return notFound()

  // Ratings (KV)
  const rating = await getRatingSummary(creator.id).catch(() => ({
    count: 0,
    sum: 0,
    avg: 0,
  }))
  const recent = await getRecentRatings(creator.id).catch(() => [])

  const hasAddress = !!creator.address
  const avgText = rating.count
    ? `${rating.avg.toFixed(2)} • ${rating.count} ratings`
    : 'No ratings yet'

  // Cache-bust avatar when updated; coerce updatedAt safely (could be string from KV)
  const updatedAt = safeNumber((creator as any).updatedAt, 0)
  const avatarBase = creator.avatarUrl || '/icon-192.png'
  const avatarSrc = avatarBase.startsWith('http')
    ? withVersion(avatarBase, updatedAt || undefined)
    : avatarBase

  // Show bio (truncate to 280, preserve newlines)
  const rawBio = (creator.bio || '').toString()
  const bio =
    rawBio.slice(0, 280) + (rawBio.length > 280 ? '…' : '')

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* ------------------- Polished Header ------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center gap-5">
          {/* Avatar with glow */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl" aria-hidden />
            <div className="h-40 w-40 overflow-hidden rounded-full ring-2 ring-white/15 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt={`${creator.displayName || creator.handle} avatar`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Name / handle / rating */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {creator.displayName || creator.handle}{' '}
              <span className="text-base font-normal text-slate-400">@{creator.handle}</span>
            </h1>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-slate-200">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>{avgText}</span>
            </div>

            {bio ? (
              <p className="mx-auto max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {bio}
              </p>
            ) : null}
          </div>

          {/* Actions row: share, address, subscription badge */}
          <div className="w-full">
            <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
              <ShareBar creatorId={creator.id} handle={creator.handle} />
              {hasAddress && (
                <a
                  href={`${BASESCAN}/address/${creator.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                  title={creator.address || ''}
                >
                  <span className="font-mono">{short(creator.address)}</span>
                  <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-80" />
                </a>
              )}
              {hasAddress ? (
                <div className="ml-1">
                  <SubscriptionBadge creatorAddress={creator.address as `0x${string}`} />
                </div>
              ) : null}
            </div>
          </div>

          {/* Owner tools */}
          <div className="w-full">
            <div className="mx-auto max-w-xl">
              <OwnerInline
                creatorAddress={(creator.address || null) as `0x${string}` | null}
                creatorId={creator.id}
                currentAvatar={creator.avatarUrl}
                currentBio={creator.bio}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------- On-chain sections ------------------- */}
      {hasAddress ? (
        <OnchainSections creatorAddress={creator.address as `0x${string}`} />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">On-chain</div>
          <p className="mt-1 text-sm text-slate-400">
            This creator hasn’t connected a wallet yet. Subscriptions and paid posts will show here once they do.
          </p>
        </section>
      )}

      {/* ------------------- Ratings ------------------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <RateBox creatorId={creator.id} />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Recent feedback</div>
          {!recent.length ? (
            <div className="mt-2 text-sm text-slate-400">No reviews yet.</div>
          ) : (
            <ul className="mt-2 space-y-2">
              {recent.map((r) => (
                <li
                  key={`${r.createdAt}-${r.score}-${r.comment ?? ''}`}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-yellow-400">
                      {'★'.repeat(r.score)}
                      <span className="text-slate-400">
                        {'★'.repeat(Math.max(0, 5 - r.score))}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {r.comment ? (
                    <div className="mt-1 whitespace-pre-wrap text-slate-200">
                      {r.comment}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
