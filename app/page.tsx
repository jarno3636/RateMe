import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Shield, Ticket, Timer, Users } from 'lucide-react'
import CreatorGrid from '@/components/CreatorGrid'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const MINIAPP_DOMAIN = (() => { try { return new URL(SITE).hostname } catch { return 'localhost' } })()

const fcMiniApp = {
  version: '1',
  imageUrl: `${SITE}/miniapp-card.png`,
  button: {
    title: 'Rate Me',
    action: {
      type: 'launch_frame',
      name: 'Rate Me',
      url: `${SITE}/mini`,
      splashImageUrl: `${SITE}/icon-192.png`,
      splashBackgroundColor: '#0b1220'
    }
  }
}

export const metadata: Metadata = {
  openGraph: {
    title: 'Rate Me — Creator subscriptions & paid posts on Base',
    description: 'Launch subscriptions, paid posts, and custom requests with instant on-chain settlement.',
    url: SITE,
    images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }]
  },
  twitter: { card: 'summary_large_image', images: [`${SITE}/miniapp-card.png`] },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${SITE}/miniapp-card.png`,
    'fc:frame:post_url': `${SITE}/api/frame?screen=home`,
    'fc:frame:button:1': 'Open Rate Me',
    'fc:frame:button:1:action': 'post',
    'fc:frame:button:2': 'Browse Creators',
    'fc:frame:button:2:action': 'post',
    'fc:frame:button:3': 'Create Offer',
    'fc:frame:button:3:action': 'post',
    'fc:miniapp': JSON.stringify(fcMiniApp),
    'fc:miniapp:domain': MINIAPP_DOMAIN
  }
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-950 p-8 md:p-12 shadow-xl" aria-labelledby="hero-title">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
            on @base
          </div>
          <h1 id="hero-title" className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Rate&nbsp;Me</h1>
          <p className="mt-3 text-lg text-slate-300">A creator monetization mini app with subscriptions, paid posts, and custom requests—settled on-chain.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/#creators" className="btn">Top Creators</Link>
            <Link href="/#how" className="btn-secondary">How it works</Link>
            <Link href="/products" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Explore Widgets &amp; SDK</Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <Stat icon={<Shield className="h-4 w-4" />} label="Fairness" value="Commit–reveal options for pools" />
            <Stat icon={<Ticket className="h-4 w-4" />} label="Monetization" value="Subscriptions • Paid posts • Requests" />
            <Stat icon={<Timer className="h-4 w-4" />} label="Payout" value="Instant, transparent on-chain settlement" />
          </div>
        </div>
      </section>

      <section id="creators" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Users className="h-5 w-5" /> Top &amp; Recent Creators</h2>
          <Link href="/discover" className="text-sm text-cyan-300 underline decoration-cyan-300/40 hover:text-cyan-200">Discover more →</Link>
        </div>
        <CreatorGrid />
      </section>

      <section id="how" className="card" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Step n={1} title="Creators" points={['Offer subscriptions (ETH/USDC)', 'Launch paid posts with gated access', 'Accept custom requests with escrow']} />
          <Step n={2} title="Fans" points={['Pay once for post access', 'Subscribe to unlock everything', 'Request custom content securely']} />
          <Step n={3} title="Trust" points={['Optional commit–reveal fairness for pools', 'Instant, non-custodial payouts', 'Platform fee: 1% to the hub']} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/instructions" className="btn-secondary">Full instructions</Link>
          <Link href="/about" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Learn more about Rate Me</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-center">
        <div className="mx-auto max-w-3xl">
          <h3 className="text-2xl font-semibold">Ready to create?</h3>
          <p className="mt-2 text-slate-300">Spin up plans and posts in minutes. Monetize transparently on Base.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/creator" className="btn"><Sparkles className="mr-2 h-4 w-4" /> Launch as Creator</Link>
            <Link href="/products" className="btn-secondary">Integrate the SDK</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">{icon}{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function Step({ n, title, points }: { n: number; title: string; points: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/30">{n}</div>
        <div className="font-medium">{title}</div>
      </div>
      <ul className="mt-2 list-disc pl-6 text-sm text-slate-300">
        {points.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  )
}
