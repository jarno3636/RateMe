// app/creator/[id]/subscribe/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCreator } from '@/lib/kv'
import { BASE_USDC } from '@/lib/registry'

export default async function SubscribePage({ params }: { params: { id: string } }) {
  const id = (params.id || '').replace(/^@/, '').toLowerCase()
  const creator = await getCreator(id)
  if (!creator) return notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-4 flex items-center gap-3">
        <img
          src={creator.avatarUrl || '/icon-192.png'}
          alt=""
          className="h-12 w-12 rounded-full ring-2 ring-white/10"
        />
        <div>
          <h1 className="text-2xl font-semibold">Support @{creator.handle}</h1>
          {creator.displayName && (
            <p className="text-sm text-slate-400">{creator.displayName}</p>
          )}
        </div>
        <div className="flex-1" />
        <Link href={`/creator/${creator.id}`} className="btn">Back to profile</Link>
      </header>

      {!creator.address ? (
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-200">
          This creator doesn’t have an on-chain address set yet. Plans & posts will appear once it’s connected.
        </div>
      ) : (
        <ClientSubscribe creatorAddress={creator.address as `0x${string}`} />
      )}
    </main>
  )
}

/* ------------------------------ Client part ------------------------------ */
'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useCreatorHub, type Plan, type Post } from '@/hooks/useCreatorHub'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'

function shortAddr(a: Address) { return `${a.slice(0, 6)}…${a.slice(-4)}` }
function formatTokenLabel(token: Address) {
  if (token.toLowerCase() === '0x0000000000000000000000000000000000000000') return 'ETH'
  if (token.toLowerCase() === BASE_USDC.toLowerCase()) return 'USDC'
  return `ERC20 (${shortAddr(token)})`
}
function formatPrice(p: bigint, token: Address) {
  if (token.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    const eth = Number(p) / 1e18
    return `${eth.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`
  }
  if (token.toLowerCase() === BASE_USDC.toLowerCase()) {
    const usdc = Number(p) / 1e6
    return `${usdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
  }
  const val = Number(p) / 1e18
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
}
function PeriodBadge({ days }: { days: number }) {
  const label = days === 1 ? 'day' : days === 7 ? 'week' : days === 30 ? 'month' : `${days} days`
  return <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-300">{label}</span>
}

type GateResp = { ok: boolean; allowed?: boolean; reason?: string; error?: string }

function ClientSubscribe({ creatorAddress }: { creatorAddress: `0x${string}` }) {
  const { address } = useAccount()
  const {
    // plans
    getCreatorPlanIds, readPlan, subscribe,
    // posts
    getCreatorPostIds, readPost, buyPost,
  } = useCreatorHub()

  // ---- plans state
  const [plansLoading, setPlansLoading] = useState(true)
  const [planIds, setPlanIds] = useState<bigint[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [periodsById, setPeriodsById] = useState<Record<string, number>>({})
  const [busyPlanId, setBusyPlanId] = useState<bigint | null>(null)

  // verification state (subscription)
  const [verifyingPlan, setVerifyingPlan] = useState(false)
  const [hasActiveSub, setHasActiveSub] = useState<boolean | null>(null)

  // ---- posts state
  const [postsLoading, setPostsLoading] = useState(true)
  const [postIds, setPostIds] = useState<bigint[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [busyPostId, setBusyPostId] = useState<bigint | null>(null)

  // verification state (per post)
  const [verifyingPostId, setVerifyingPostId] = useState<bigint | null>(null)
  const [postAccess, setPostAccess] = useState<Record<string, boolean>>({})

  // Load plans
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setPlansLoading(true)
        const ids = await getCreatorPlanIds(creatorAddress)
        const out: Plan[] = []
        for (const id of ids) {
          const p = await readPlan(id)
          if (p.active) out.push(p)
        }
        if (!alive) return
        setPlanIds(ids)
        setPlans(out)
        const defaults: Record<string, number> = {}
        ids.forEach((id) => (defaults[id.toString()] = 1))
        setPeriodsById(defaults)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load plans')
      } finally { if (alive) setPlansLoading(false) }
    })()
    return () => { alive = false }
  }, [creatorAddress, getCreatorPlanIds, readPlan])

  // Load posts
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setPostsLoading(true)
        const ids = await getCreatorPostIds(creatorAddress)
        const out: Post[] = []
        for (const id of ids) {
          const p = await readPost(id)
          if (p.active) out.push(p)
        }
        if (!alive) return
        setPostIds(ids)
        setPosts(out)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load posts')
      } finally { if (alive) setPostsLoading(false) }
    })()
    return () => { alive = false }
  }, [creatorAddress, getCreatorPostIds, readPost])

  const changePeriods = (planId: bigint, v: string) => {
    const n = Math.max(1, Math.min(36, Number(v || 1)))
    setPeriodsById((s) => ({ ...s, [planId.toString()]: n }))
  }

  const doSubscribe = async (planId: bigint, pricePerPeriod: bigint, token: Address) => {
    try {
      setBusyPlanId(planId)
      const n = periodsById[planId.toString()] || 1
      await subscribe(planId, n) // hook handles ETH vs ERC20 + approvals
      toast.success('Subscription complete')
      setHasActiveSub(true)
    } catch (err: any) {
      toast.error(err?.shortMessage || err?.message || 'Failed to subscribe')
    } finally {
      setBusyPlanId(null)
    }
  }

  const doBuyPost = async (postId: bigint) => {
    try {
      setBusyPostId(postId)
      await buyPost(postId) // hook handles ETH vs ERC20 + approvals
      toast.success('Post unlocked')
      setPostAccess((m) => ({ ...m, [postId.toString()]: true }))
    } catch (err: any) {
      toast.error(err?.shortMessage || err?.message || 'Failed to purchase')
    } finally {
      setBusyPostId(null)
    }
  }

  // --- Gate checks via /api/gate (server reads from the contract) ---
  async function gateCheckSub(user: Address, creator: Address): Promise<GateResp> {
    const res = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'sub', user, creator }),
    })
    return res.json()
  }
  async function gateCheckPost(user: Address, postId: bigint): Promise<GateResp> {
    const res = await fetch('/api/gate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'post', user, postId: postId.toString() }),
    })
    return res.json()
  }

  const verifyPlanAccess = async () => {
    try {
      if (!address) throw new Error('Connect wallet')
      setVerifyingPlan(true)
      const out = await gateCheckSub(address, creatorAddress)
      if (!out.ok) throw new Error(out.error || 'Gate error')
      setHasActiveSub(!!out.allowed)
      toast[out.allowed ? 'success' : 'error'](
        out.allowed ? '✅ Subscription is active' : '❌ No active subscription'
      )
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify subscription')
    } finally {
      setVerifyingPlan(false)
    }
  }

  const verifyPostAccess = async (postId: bigint) => {
    try {
      if (!address) throw new Error('Connect wallet')
      setVerifyingPostId(postId)
      const out = await gateCheckPost(address, postId)
      if (!out.ok) throw new Error(out.error || 'Gate error')
      setPostAccess((m) => ({ ...m, [postId.toString()]: !!out.allowed }))
      toast[out.allowed ? 'success' : 'error'](
        out.allowed ? '✅ Post access granted' : '❌ You don’t have access'
      )
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify post access')
    } finally {
      setVerifyingPostId(null)
    }
  }

  const hasPlans = plans.length > 0
  const hasPosts = posts.length > 0

  return (
    <section className="space-y-10">
      {/* PLANS */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Subscription plans</h2>
        {plansLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">Loading plans…</div>
        ) : !hasPlans ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-slate-200">No active plans yet.</div>
            <div className="mt-2 text-sm text-slate-400">
              Check back soon, or <Link href="#" className="underline">return to profile</Link>.
            </div>
          </div>
        ) : (
          <>
            {/* inline badge after a successful verify */}
            {hasActiveSub !== null && (
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
                hasActiveSub
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                  : 'border-rose-400/40 bg-rose-400/10 text-rose-300'
              }`}>
                {hasActiveSub ? 'Access confirmed: active subscription' : 'No active subscription'}
              </div>
            )}

            <ul className="grid gap-4 md:grid-cols-2">
              {plans.map((p, i) => {
                const planId = planIds[i] // index-preserving
                const total = useMemo(
                  () => p.pricePerPeriod * BigInt(Math.max(1, periodsById[planId.toString()] || 1)),
                  // eslint-disable-next-line react-hooks/exhaustive-deps
                  [p.pricePerPeriod, periodsById[planId.toString()]]
                )
                const busy = busyPlanId !== null && planId === busyPlanId
                return (
                  <li key={planId.toString()} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{p.name || 'Plan'}</div>
                        <div className="mt-1 text-sm text-slate-300">
                          {formatPrice(p.pricePerPeriod, p.token)} / <PeriodBadge days={p.periodDays} />
                        </div>
                        {p.metadataURI ? (
                          <div className="mt-1 break-all text-xs text-slate-400">{p.metadataURI}</div>
                        ) : null}
                        <div className="mt-2 text-xs text-slate-400">Currency: {formatTokenLabel(p.token)}</div>
                      </div>

                      <div className="text-right">
                        <label className="text-xs text-slate-400">Periods</label>
                        <input
                          type="number"
                          min={1}
                          max={36}
                          value={periodsById[planId.toString()] || 1}
                          onChange={(e) => changePeriods(planId, e.target.value)}
                          className="ml-2 w-20 rounded-lg border border-white/10 bg-transparent px-2 py-1 text-right outline-none"
                        />
                        <div className="mt-1 text-xs text-slate-400">Total</div>
                        <div className="text-sm font-medium">{formatPrice(total, p.token)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        disabled={busy}
                        onClick={() => doSubscribe(planId, p.pricePerPeriod, p.token)}
                        className="btn disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? 'Subscribing…' : 'Subscribe'}
                      </button>

                      <button
                        disabled={!address || verifyingPlan}
                        onClick={verifyPlanAccess}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {verifyingPlan ? 'Verifying…' : 'Verify access'}
                      </button>

                      <span className="text-xs text-slate-400">Plan ID: {planId.toString()}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* POSTS */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Paid posts</h2>
        {postsLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">Loading posts…</div>
        ) : !hasPosts ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-slate-200">No paid posts yet.</div>
            <div className="mt-2 text-sm text-slate-400">When the creator publishes paid posts, you’ll see them here.</div>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {posts.map((p, i) => {
              const postId = postIds[i]
              const busy = busyPostId !== null && postId === busyPostId
              const confirmed = postAccess[postId.toString()] === true
              return (
                <li key={postId.toString()} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">Post #{postId.toString()}</div>
                      <div className="mt-1 text-sm text-slate-300">{formatPrice(p.price, p.token)}</div>
                      <div className="mt-2 text-xs text-slate-400">Currency: {formatTokenLabel(p.token)}</div>
                      {p.accessViaSub && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">
                          Accessible with active subscription
                        </div>
                      )}
                      {confirmed && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                          Access confirmed
                        </div>
                      )}
                      {p.uri && (
                        <div className="mt-2 break-all text-xs text-slate-400">URI: {p.uri}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      disabled={busy}
                      onClick={() => doBuyPost(postId)}
                      className="btn disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? 'Purchasing…' : 'Buy post'}
                    </button>

                    <button
                      disabled={!address || verifyingPostId === postId}
                      onClick={() => verifyPostAccess(postId)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {verifyingPostId === postId ? 'Verifying…' : 'Verify access'}
                    </button>

                    <span className="text-xs text-slate-400">Post ID: {postId.toString()}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
