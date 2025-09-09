// app/creator/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE } from '@/lib/config'
import { getCreator, getRatingSummary, getRecentRatings } from '@/lib/kv'
import ShareBar from '@/components/ShareBar'
import RateBox from '@/components/RateBox'
import OnchainSections from '@/components/OnchainSections'
import { Star, ExternalLink } from 'lucide-react'
import { creatorShareLinks } from '@/lib/farcaster'

type Params = { params: { id: string } }

function siteUrl() {
  return (SITE || 'http://localhost:3000').replace(/\/$/, '')
}
const BASESCAN = 'https://basescan.org'

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = params.id.toLowerCase()
  const site = siteUrl()
  const creator = await getCreator(id)

  const title = creator
    ? `${creator.displayName || creator.handle} (@${creator.handle}) — Rate Me`
    : `@${id} — Rate Me`

  const url = `${site}/creator/${encodeURIComponent(id)}`
  const og = `${site}/api/og/creator?id=${encodeURIComponent(id)}`

  return {
    title,
    alternates: { canonical: url },
    openGraph: {
      title,
      url,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [og],
      title,
    },
  }
}

export default async function CreatorPage({ params }: Params) {
  const id = params.id.toLowerCase()
  const creator = await getCreator(id)
  if (!creator) return notFound()

  const rating = await getRatingSummary(id)
  const recent = await getRecentRatings(id)

  const hasAddress = !!creator.address
  const avgText = rating.count ? `${rating.avg.toFixed(2)} • ${rating.count} ratings` : 'No ratings yet'
  const bio =
    (creator.bio || '').toString().slice(0, 280) +
    ((creator.bio || '').length > 280 ? '…' : '')

  // Share links
  const shares = creatorShareLinks(creator.id, `${creator.displayName || creator.handle} on Rate Me`)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <section className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creator.avatarUrl || '/icon-192.png'}
            alt={`${creator.displayName || creator.handle} avatar`}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="text-xl font-semibold">
            {creator.displayName || creator.handle}{' '}
            <span className="text-sm text-slate-400">@{creator.handle}</span>
          </div>

          {bio ? <div className="mt-1 text-sm text-slate-300">{bio}</div> : null}

          <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
            <Star className="h-4 w-4 text-yellow-400" />
            <span>{avgText}</span>
          </div>

          {!hasAddress && (
            <div className="mt-2 inline-flex items-center rounded-md border border-amber-300/20 bg-amber-200/10 px-2 py-1 text-xs text-amber-200">
              No on-chain address linked yet. You can still rate this creator.
            </div>
          )}

          {/* Social share row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={shares.cast}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Cast this page
            </a>
            <a
              href={shares.tweet}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Tweet this page
            </a>
            <ShareBar creatorId={creator.id} handle={creator.handle} />
          </div>
        </div>

        <div className="flex-1" />
      </section>

      {/* On-chain plans & posts */}
      {hasAddress ? (
        <>
          {/* Trust box: wallet + BaseScan */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-medium">Creator wallet:</span>
              <code className="rounded bg-black/30 px-1.5 py-0.5">
                {creator.address}
              </code>
              <a
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                href={`${BASESCAN}/address/${creator.address}`}
                target="_blank"
                rel="noreferrer"
              >
                View on BaseScan <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>

          <OnchainSections creatorAddress={creator.address as `0x${string}`} />
        </>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">On-chain</div>
          <p className="mt-1 text-sm text-slate-400">
            This creator hasn’t connected a wallet yet. Subscriptions and paid posts will show here once they do.
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
