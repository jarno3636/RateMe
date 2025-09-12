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
import { createPublicClient, http } from 'viem'
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

async function fetchOnchainById(idNum: bigint) {
  const r = (await pub.readContract({
    address: REGISTRY_ADDRESS as Address,
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
}

async function fetchOnchainByHandle(handle: string) {
  const r = (await pub.readContract({
    address: REGISTRY_ADDRESS as Address,
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
}

export default async function CreatorPage({ params }: Params) {
  const raw = params.id || ''
  const idParam = raw.toLowerCase()

  // KV first (fast path for freshly registered creators)
  let creator =
    (await getCreator(idParam).catch(() => null)) ||
    (await getCreatorByHandle(normalizeHandle(idParam)).catch(() => null))

  // On-chain fallback
  if (!creator) {
    if (isNumericId(idParam)) {
      creator = await fetchOnchainById(BigInt(idParam)).catch(() => null)
    } else {
      creator = await fetchOnchainByHandle(normalizeHandle(idParam)).catch(
        () => null
      )
    }
  }

  if (!creator) return notFound()

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

  // Cache-bust avatar when updated
  const updatedAt = Number(creator.updatedAt || 0)
  const avatarBase = creator.avatarUrl || '/icon-192.png'
  const avatarSrc =
    updatedAt && avatarBase.startsWith('http')
      ? `${avatarBase}${avatarBase.includes('?') ? '&' : '?'}v=${updatedAt}`
      : avatarBase

  const bio =
    (creator.bio || '').toString().slice(0, 280) +
    ((creator.bio || '').length > 280 ? '…' : '')

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <section className="flex flex-col items-center text-center space-y-4">
        {/* Big centered avatar */}
        <div className="h-48 w-48 overflow-hidden rounded-full ring-2 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt={`${creator.displayName || creator.handle} avatar`}
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <div className="text-2xl font-semibold">
            {creator.displayName || creator.handle}{' '}
            <span className="text-base text-slate-400">@{creator.handle}</span>
          </div>

          {bio ? (
            <div className="mt-2 text-sm text-slate-300">{bio}</div>
          ) : null}

          <div className="mt-2 flex justify-center items-center gap-1 text-sm text-slate-400">
            <Star className="h-4 w-4 text-yellow-400" />
            <span>{avgText}</span>
          </div>

          {/* Share + wallet + subscription badge */}
          <div className="mt-3 flex flex-wrap justify-center items-center gap-2">
            <ShareBar creatorId={creator.id} handle={creator.handle} />
            {hasAddress && (
              <a
                href={`${BASESCAN}/address/${creator.address}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                title={creator.address || ''}
              >
                {short(creator.address)} <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
            {/* lights up after SubscribeButton dispatches rm:subscribed */}
            {hasAddress ? <SubscriptionBadge /> : null}
          </div>

          {/* Owner tools (edit profile, plans, posts) */}
          <div className="mt-4">
            <OwnerInline
              creatorAddress={(creator.address || null) as `0x${string}` | null}
              creatorId={creator.id}
              currentAvatar={creator.avatarUrl}
              currentBio={creator.bio}
            />
          </div>
        </div>
      </section>

      {/* On-chain sections (plans + posts rendered with SafeMedia/PaidPostCard/AccessBadge inside) */}
      {hasAddress ? (
        <OnchainSections creatorAddress={creator.address as `0x${string}`} />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">On-chain</div>
          <p className="mt-1 text-sm text-slate-400">
            This creator hasn’t connected a wallet yet. Subscriptions and paid
            posts will show here once they do.
          </p>
        </section>
      )}

      {/* Ratings */}
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
