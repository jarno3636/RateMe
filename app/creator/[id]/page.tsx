// app/creator/[id]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeDollarSign, Lock, Calendar, MessageSquare } from 'lucide-react'

type Params = { params: { id: string } }

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rate-me.vercel.app').replace(/\/$/, '')

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = params.id
  const title = `@${id} — Rate Me`
  return {
    title,
    openGraph: {
      title,
      url: `${SITE}/creator/${id}`,
      images: [{ url: `${SITE}/miniapp-card.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', images: [`${SITE}/miniapp-card.png`] },
  }
}

export default function CreatorPage({ params }: Params) {
  const id = params.id
  if (!id) return notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* profile header */}
      <section className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-sky-500/30 ring-2 ring-white/10" />
        <div>
          <div className="text-xl font-semibold">@{id}</div>
          <div className="text-sm text-slate-400">Creator on Base • 0x…{id.slice(0,4)}</div>
        </div>
        <div className="flex-1" />
        <Link href={`/creator/${id}/subscribe`} className="btn">Subscribe</Link>
      </section>

      {/* subscriptions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscription Plans</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { name: 'Supporter', price: '5 USDC / mo', perks: ['Early posts', 'DM priority'] },
            { name: 'Fan', price: '15 USDC / mo', perks: ['All supporter perks', 'Exclusive posts'] },
            { name: 'Superfan', price: '40 USDC / mo', perks: ['All perks', '1 request / mo'] },
          ].map((p) => (
            <div key={p.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-slate-300">{p.price}</div>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
                {p.perks.map(x => <li key={x}>{x}</li>)}
              </ul>
              <Link href="#" className="btn mt-3 w-full">Subscribe</Link>
            </div>
          ))}
        </div>
      </section>

      {/* posts */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Lock className="h-4 w-4" /> Posts</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1,2,3,4,5,6].map((n) => (
            <article key={n} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900" />
              <div className="mt-2 text-sm font-medium">Locked post #{n}</div>
              <div className="text-xs text-slate-400">Unlock via purchase or subscription</div>
              <div className="mt-2 flex gap-2">
                <button className="btn-secondary flex-1"><BadgeDollarSign className="mr-2 h-4 w-4" /> Buy 2 USDC</button>
                <button className="btn flex-1">Subscribe</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* requests */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-4 w-4" /> Requests</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-slate-300">
            Want something custom? Send a request with escrow and a deadline.
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span className="w-24 text-slate-400">Amount</span>
              <input className="flex-1 bg-transparent outline-none" placeholder="e.g. 10 USDC" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <span className="w-24 text-slate-400">Deadline</span>
              <input type="date" className="flex-1 bg-transparent outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm sm:col-span-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input className="flex-1 bg-transparent outline-none" placeholder="Describe your request…" />
            </label>
          </div>
          <button className="btn mt-3">Send Request</button>
        </div>
      </section>
    </div>
  )
}
