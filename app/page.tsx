// app/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Shield, Ticket, Timer, Users, Star, ArrowRight } from 'lucide-react'
import CreatorGrid from '@/components/CreatorGrid'

// Try to use centralized Farcaster config (recommended).
// If it's not there yet, the fallback block below will compute the same values.
let SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
let MINIAPP_DOMAIN = (() => { try { return new URL(SITE).hostname } catch { return 'localhost' } })()
let fcMiniApp: { version: string; imageUrl: string; button: any }

try {
  // Optional import — if you already have lib/farcaster.ts it will be used.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const far = require('@/lib/farcaster')
  SITE = (far.SITE as string) || SITE
  MINIAPP_DOMAIN = (far.MINIAPP_DOMAIN as string) || MINIAPP_DOMAIN
  fcMiniApp = far.fcMiniApp || {
    version: '1',
    imageUrl: `${SITE}/miniapp-card.png`,
    button: {
      title: 'Rate Me',
      action: {
        type: 'launch_frame',
        name: 'Rate Me',
        url: `${SITE}/mini`,
        splashImageUrl: `${SITE}/icon-192.png`,
        splashBackgroundColor: '#0b1220',
      },
    },
  }
} catch {
  // Fallback (works even if lib/farcaster.ts doesn’t exist yet)
  fcMiniApp = {
    version: '1',
    imageUrl: `${SITE}/miniapp-card.png`,
    button: {
      title: 'Rate Me',
      action: {
        type: 'launch_frame',
        name: 'Rate Me',
        url: `${SITE}/mini`,
        splashImageUrl: `${SITE}/icon-192.png`,
        splashBackgroundColor: '#0b1220',
      },
    },
  }
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rate Me — Creator subscriptions & paid posts on Base',
  description:
    'Launch subscriptions, paid posts, and custom requests with instant on-chain settlement.',
  openGraph: {
    title: 'Rate Me — Creator subscriptions & paid posts on Base',
    description:
      'Launch subscriptions, paid posts, and custom requests with instant on-chain settlement.',
    url: SITE,
    images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: [`${SITE}/miniapp-card.png`] },
  other: {
    // Farcaster Frames vNext
    'fc:frame': 'vNext',
    'fc:frame:image': `${SITE}/miniapp-card.png`,
    'fc:frame:post_url': `${SITE}/api/frame?screen=home`,
    'fc:frame:button:1': 'Open Rate Me',
    'fc:frame:button:1:action': 'post',
    'fc:frame:button:2': 'Top Creators',
    'fc:frame:button:2:action': 'post',
    'fc:frame:button:3': 'How it Works',
    'fc:frame:button:3:action': 'post',

    // Farcaster Mini App
    'fc:miniapp': JSON.stringify(fcMiniApp),
    'fc:miniapp:domain': MINIAPP_DOMAIN,
  },
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      {/* HERO */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(168,85,247,0.18),transparent),radial-gradient(1000px_500px_at_120%_10%,rgba(56,189,248,0.18),transparent)] from-slate-900 to-slate-950 p-8 shadow-xl md:p-14"
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
        <div className="relative text-center">
          <div
            aria-label="Base network"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200"
          >
            on @base
          </div>

          <h1 id="hero-title" className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            Rate&nbsp;
            <span className="text-transparent bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text">
              Me
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            A premium monetization mini app for creators. Subscriptions, paid posts, and custom
            requests—settled instantly on-chain.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/creator" className="btn" aria-label="Become a Creator">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Become a Creator
            </Link>
            <Link href="/#creators" className="btn-secondary" aria-label="Browse creators section">
              Browse Creators
            </Link>
            <Link
              href="/mini"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              aria-label="Open Mini App"
            >
              Open Mini App <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* quick stats */}
          <div className="mt-10 grid grid-cols-1 gap-3 text-left md:grid-cols-3">
            <Stat
              icon={<Shield className="h-4 w-4" aria-hidden="true" />}
              label="Trust"
              value="Non-custodial • Instant payouts"
            />
            <Stat
              icon={<Ticket className="h-4 w-4" aria-hidden="true" />}
              label="Monetize"
              value="Subscriptions • Paid posts • Requests"
            />
            <Stat
              icon={<Timer className="h-4 w-4" aria-hidden="true" />}
              label="Speed"
              value="Fast settlement on Base"
            />
          </div>
        </div>
      </section>

      {/* TOP / RECENT CREATORS */}
      <section id="creators" className="space-y-5" aria-labelledby="creators-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="creators-title" className="flex items-center gap-2 text-xl font-semibold">
            <Users className="h-5 w-5" aria-hidden="true" />
            Top &amp; Recent Creators
          </h2>
          <Link
            href="/discover"
            className="text-sm text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
            aria-label="Discover more creators"
          >
            Discover more →
          </Link>
        </div>
        <CreatorGrid />
      </section>

      {/* VALUE STRIP */}
      <section aria-label="Highlights" className="grid gap-4 md:grid-cols-3">
        <BadgeCard
          icon={<Star className="h-4 w-4" aria-hidden="true" />}
          title="Beautiful creator pages"
          desc="Clean profiles with featured content, tiers, and link-in-bio friendly share cards."
        />
        <BadgeCard
          icon={<Shield className="h-4 w-4" aria-hidden="true" />}
          title="Transparent by default"
          desc="On-chain receipts for every purchase; optional escrow for custom requests."
        />
        <BadgeCard
          icon={<Timer className="h-4 w-4" aria-hidden="true" />}
          title="Frictionless for fans"
          desc="Pay once to unlock a post or subscribe to everything—no confusing flows."
        />
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="card" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Step
            n={1}
            title="Creators"
            points={[
              'Offer subscriptions with simple periods',
              'Publish paid posts (ETH or USDC)',
              'Accept custom requests with escrow',
            ]}
          />
          <Step
            n={2}
            title="Fans"
            points={[
              'Unlock single posts with one payment',
              'Subscribe to access more content',
              'Request bespoke content securely',
            ]}
          />
          <Step
            n={3}
            title="Trust"
            points={[
              'Non-custodial settlement on Base',
              'Transparent receipts on-chain',
              'Platform fee: 1% to the hub',
            ]}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/creator" className="btn">Start creating</Link>
          <Link href="/mini" className="btn-secondary">Open in Mini App</Link>
        </div>
      </section>

      {/* CTA SPLIT */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">For Creators</h3>
          <p className="mt-2 text-slate-300">
            Set your tiers, publish content, and get paid instantly. No lock-in, no dark patterns.
          </p>
          <div className="mt-4">
            <Link href="/creator" className="btn">Launch your page</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">For Fans</h3>
          <p className="mt-2 text-slate-300">
            Follow your favorite creators, unlock posts with one tap, or subscribe for full access.
          </p>
          <div className="mt-4">
            <Link href="/discover" className="btn-secondary">Find creators</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

/* ---------- tiny presentational helpers ---------- */

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function BadgeCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-white/10 p-2 text-cyan-300">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-slate-300">{desc}</p>
    </div>
  )
}

function Step({ n, title, points }: { n: number; title: string; points: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/30">
          {n}
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <ul className="mt-2 list-disc pl-6 text-sm text-slate-300">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  )
}
