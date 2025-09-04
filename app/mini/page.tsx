// app/mini/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Users, Lock, MessageSquare } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rate-me.vercel.app').replace(/\/$/, '')

function detectFarcaster() {
  if (typeof window === 'undefined') return false
  try {
    const ua = navigator.userAgent || ''
    const inWarpcast = /Warpcast/i.test(ua)
    const inIframe = window.self !== window.top
    return Boolean(inWarpcast || inIframe)
  } catch {
    return false
  }
}

export default function MiniPage() {
  const search = useSearchParams()
  const screen = (search?.get('screen') ?? 'home').toLowerCase()

  const isInFarcaster = useMemo(detectFarcaster, [])
  const [ready, setReady] = useState(false)
  const [sdkDetected, setSdkDetected] = useState(false)
  const scrolledRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    ;(async () => {
      if (!isInFarcaster) { setReady(true); return }
      try {
        const mod = await import('@farcaster/miniapp-sdk').catch(() => null)
        let sdk: any = (mod as any)?.sdk
        if (!sdk) {
          const Ctor = (mod as any)?.default || (mod as any)?.MiniAppSDK
          if (typeof Ctor === 'function') {
            try { sdk = new Ctor() } catch {}
          }
        }
        const readyPromise =
          typeof sdk?.ready === 'function' ? sdk.ready()
          : typeof sdk?.actions?.ready === 'function' ? sdk.actions.ready()
          : Promise.resolve()
        const timeout = new Promise<void>(r => { timer = setTimeout(() => r(), 1200) })
        await Promise.race([readyPromise, timeout])
        if (!cancelled) {
          setSdkDetected(Boolean(sdk))
          setReady(true)
        }
      } catch {
        if (!cancelled) { setReady(true) }
      } finally {
        if (timer) clearTimeout(timer)
      }
    })()

    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [isInFarcaster])

  // smooth-scroll to section if a screen query is present
  useEffect(() => {
    if (!ready || scrolledRef.current) return
    scrolledRef.current = true
    const id = screen === 'creators' ? 'mini-creators' : screen === 'cta' ? 'mini-cta' : 'mini-home'
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [ready, screen])

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* hero */}
      <section
        id="mini-home"
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-slate-900 to-slate-950 p-6 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-200">
          on @base
        </div>
        <h1 className="mt-3 text-3xl font-extrabold">Rate&nbsp;Me</h1>
        <p className="mt-2 text-sm text-slate-300">
          Subscriptions, paid posts, and custom requests — instant, transparent, on-chain.
        </p>

        {!isInFarcaster && (
          <div className="mt-4 flex justify-center">
            <a
              href={SITE}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Open full site
            </a>
          </div>
        )}
        {isInFarcaster && (
          <div className="mt-3 text-[11px] text-slate-400">
            {sdkDetected ? 'Mini App ready in Warpcast' : 'Mini view • limited features'}
          </div>
        )}
      </section>

      {/* quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <MiniAction href="/discover" icon={<Users className="h-4 w-4" />} label="Top Creators" />
        <MiniAction href="/creator/demo" icon={<Sparkles className="h-4 w-4" />} label="Become a Creator" />
        <MiniAction href="/posts" icon={<Lock className="h-4 w-4" />} label="Paid Posts" />
        <MiniAction href="/requests" icon={<MessageSquare className="h-4 w-4" />} label="Requests" />
      </section>

      {/* creators strip */}
      <section id="mini-creators" className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-sm text-slate-300">Top &amp; Recent Creators</div>
        <div className="grid grid-cols-3 gap-3">
          {['@lana', '@james', '@noah', '@ivy', '@sofia', '@kai'].map((h) => (
            <a
              key={h}
              href={`/creator/${h.replace('@','')}`}
              className="group rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/[0.07]"
            >
              <div className="aspect-square w-full rounded-md bg-gradient-to-br from-fuchsia-500/20 to-sky-500/20" />
              <div className="mt-2 truncate text-xs text-slate-300 group-hover:text-slate-200">{h}</div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="mini-cta" className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center">
        <h3 className="text-lg font-semibold">Start earning in minutes</h3>
        <p className="mt-2 text-sm text-slate-300">Launch plans & posts, accept requests, get paid in USDC/ETH.</p>
        <div className="mt-3 flex justify-center">
          <Link href="/creator/new" className="btn">
            <Sparkles className="mr-2 h-4 w-4" /> Launch as Creator
          </Link>
        </div>
      </section>
    </main>
  )
}

function MiniAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/[0.07]"
    >
      {icon}<span>{label}</span>
    </a>
  )
}
