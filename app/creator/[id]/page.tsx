// app/creator/[id]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BadgeDollarSign,
  Calendar,
  Lock,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'

type PageParams = { params: { id: string } }

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rate-me.vercel.app').replace(/\/$/, '')

const sanitizeId = (raw: string) =>
  (raw || '').trim().replace(/^@/, '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 42)

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const id = sanitizeId(params.id)
  const title = `@${id} — Rate Me`
  const url = `${SITE}/creator/${id}`
  return {
    title,
    openGraph: {
      title,
      url,
      images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [`${SITE}/miniapp-card.png`] },
    alternates: { canonical: url },
  }
}

export default function CreatorPage({ params }: PageParams) {
  const id = sanitizeId(params.id)
  if (!id) return notFound()

  // Fake sample data (replace with real reads later)
  const plans: Array<{ name: string; price: string; perks: string[] }> = [
    { name: 'Supporter', price: '5 USDC / mo', perks: ['Early posts', 'DM priority'] },
    { name: 'Fan', price: '15 USDC / mo', perks: ['All supporter perks', 'Exclusive posts'] },
    { name: 'Superfan', price: '40 USDC / mo', perks: ['All perks', '1 request / mo'] },
  ]
  const posts = Array.from({ length: 6 }, (_, i) => i + 1)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      {/* Breadcrumbs / page landmarks */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-400">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-slate-200 underline decoration-dotted">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/discover" className="hover:text-slate-200 underline decoration-dotted">
              Discover
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-300" aria-current="page">
            @{id}
          </li>
        </ol>
      </nav>

      {/* Header / Profile */}
      <header
        className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-slate-900 to-slate-950 p-6 sm:p-8"
        aria-labelledby="creator-title"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div
            aria-hidden="true"
            className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500/60 to-indigo-500/60 ring-2 ring-white/10 shadow-inner"
          />
          <div className="min-w-0">
            <h1 id="creator-title" className="truncate text-2xl font-extrabold tracking-tight">
              @{id}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> Creator on Base
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-cyan-300" /> Fans-friendly pricing
              </span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-300" /> Trusted payouts
              </span>
            </p>
          </div>

          <div className="flex-1" />

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row">
            <Link
              href={`/creator/${id}/subscribe`}
              className="btn w-full sm:w-auto"
              aria-label={`Subscribe to @${id}`}
            >
              Subscribe
            </Link>
            <Link
              href={`/#how`}
              className="btn-secondary w-full sm:w-auto"
              aria-label="How subscriptions and posts work"
            >
              How it works
            </Link>
          </div>
        </div>
      </header>

      {/* Plans */}
      <section
        aria-labelledby="plans-title"
        className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="plans-title" className="text-lg font-semibold">
            Subscription Plans
          </h2>
          <p className="text-sm text-slate-400">Cancel anytime • Instant, on-chain receipts</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3" role="list">
          {plans.map((p) => (
            <li key={p.name} className="group focus-within:outline-none">
              <article
                className="h-full rounded-xl border border-white/10 bg-slate-900/60 p-5 ring-0 transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-cyan-400/40"
                aria-labelledby={`plan-${p.name}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 id={`plan-${p.name}`} className="font-medium">
                    {p.name}
                  </h3>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
                    {p.price}
                  </div>
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-300">
                  {p.perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <Link
                  href="#"
                  className="btn mt-4 w-full"
                  aria-label={`Subscribe to the ${p.name} plan for ${p.price}`}
                >
                  Subscribe
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Posts */}
      <section aria-labelledby="posts-title" className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="posts-title" className="flex items-center gap-2 text-lg font-semibold">
            <Lock className="h-4 w-4" /> Posts
          </h2>
          <p className="text-sm text-slate-400">Unlock with a one-time purchase or any active plan</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3" role="list">
          {posts.map((n) => (
            <li key={n} className="group focus-within:outline-none">
              <article
                className="rounded-xl border border-white/10 bg-white/5 p-3 ring-0 transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-cyan-400/40"
                aria-labelledby={`post-${n}`}
              >
                <div
                  className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900"
                  aria-hidden="true"
                />
                <h3 id={`post-${n}`} className="mt-2 text-sm font-medium">
                  Locked post #{n}
                </h3>
                <p className="text-xs text-slate-400">Unlock via purchase or subscription</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    className="btn-secondary inline-flex items-center justify-center"
                    type="button"
                    aria-label={`Buy post #${n} for 2 USDC`}
                  >
                    <BadgeDollarSign className="mr-2 h-4 w-4" />
                    Buy 2 USDC
                  </button>
                  <button
                    className="btn inline-flex items-center justify-center"
                    type="button"
                    aria-label="Open subscription options"
                  >
                    Subscribe
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Requests */}
      <section
        aria-labelledby="requests-title"
        className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
      >
        <h2 id="requests-title" className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-4 w-4" /> Requests
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Want something custom? Send a request with escrow and a deadline.
        </p>

        <form className="mt-4" onSubmit={(e) => e.preventDefault()} aria-describedby="request-hint">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <label htmlFor="amount" className="block text-xs text-slate-400">
                Amount
              </label>
              <input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="e.g. 10 USDC"
                className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                aria-describedby="amount-help"
              />
              <p id="amount-help" className="mt-1 text-[11px] text-slate-500">
                Payable in USDC or ETH on Base.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <label htmlFor="deadline" className="block text-xs text-slate-400">
                Deadline
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:col-span-3">
              <label htmlFor="description" className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="h-4 w-4" />
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Describe your request…"
                className="mt-1 w-full resize-y bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <p id="request-hint" className="mt-2 text-xs text-slate-500">
            Funds are held in escrow. The creator can accept & deliver, or you can refund after the deadline.
          </p>

          <div className="mt-3">
            <button type="submit" className="btn" aria-label={`Send request to @${id}`}>
              Send Request
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
