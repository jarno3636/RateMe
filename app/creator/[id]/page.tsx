// /app/creator/[id]/page.tsx
"use client"

import { useParams } from "next/navigation"
import { useAccount } from "wagmi"
import Link from "next/link"
import { useMemo, useState } from "react"

import { useGetProfile } from "@/hooks/useProfileRegistry"
import {
  useCreatorPlanIds,
  useCreatorPostIds,
  usePlan,
  usePost,
  useIsActive,
  useHasPostAccess,
  useSubscribe,
  useBuyPost,
} from "@/hooks/useCreatorHub"
import { useSpendApproval } from "@/hooks/useSpendApproval"
import RatingWidget from "@/components/RatingWidget"

const HUB = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}` | undefined

/* ----------------------------- Small helpers ----------------------------- */
const isImg = (u: string) => !!u && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u)
const fmt6 = (v: bigint) => (Number(v) / 1e6).toFixed(2)

/* ----------------------------- Plans ----------------------------- */
// plans(id) -> [creator, token, pricePerPeriod, periodDays, active, name, metadataURI]
function PlanRow({ id }: { id: bigint }) {
  const { data: plan } = usePlan(id, { watch: true }) // live refresh per block
  const price   = (plan?.[2] as bigint | undefined) ?? 0n
  const days    = Number(plan?.[3] ?? 30)
  const active  = Boolean(plan?.[4] ?? true)
  const name    = String(plan?.[5] ?? "Plan")

  const [periods, setPeriods] = useState(1)
  const { subscribe, isPending: subscribing } = useSubscribe()

  // Only request allowance if there’s a price and HUB is set
  const { approveExact, hasAllowance, isPending: approving } = useSpendApproval(
    price > 0n && HUB ? HUB : undefined,
    price > 0n ? price : undefined
  )

  const subscribeFlow = async () => {
    if (!active || periods < 1) return
    if (price > 0n && !hasAllowance) await approveExact?.()
    await subscribe(id, periods)
  }

  return (
    <div className="card flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{name}</div>
        <div className="text-sm opacity-70">
          {fmt6(price)} USDC / {days}d {active ? "" : "· inactive"}
        </div>
      </div>
      <input
        type="number"
        min={1}
        value={periods}
        onChange={(e) => setPeriods(Math.max(1, Number(e.target.value) || 1))}
        className="w-20"
      />
      <button
        className="btn"
        onClick={subscribeFlow}
        disabled={!active || approving || subscribing || (price > 0n && !HUB)}
        title={!HUB ? "Missing HUB contract address" : (!active ? "Plan inactive" : "")}
      >
        {price === 0n ? "Subscribe" : hasAllowance ? "Subscribe" : "Approve & Subscribe"}
      </button>
    </div>
  )
}

/* ----------------------------- Posts ----------------------------- */
// posts(id) -> [creator, token, price, active, accessViaSub, uri]
function PostCard({ id, creator }: { id: bigint; creator: `0x${string}` }) {
  const { address } = useAccount()
  const { data: post } = usePost(id, { watch: true })
  const price   = (post?.[2] as bigint | undefined) ?? 0n
  const active  = Boolean(post?.[3] ?? true)
  const subGate = Boolean(post?.[4] ?? false)
  const uri     = String(post?.[5] ?? "")

  const { data: hasSub } = useIsActive(address as `0x${string}` | undefined, creator, { watch: true })
  const { data: hasAccess } = useHasPostAccess(address as `0x${string}` | undefined, id, { watch: true })

  const canView = !!hasAccess || (!!hasSub && subGate) || (!subGate && price === 0n)

  const { buy, isPending: buying } = useBuyPost()
  const { approveExact, hasAllowance, isPending: approving } = useSpendApproval(
    price > 0n && HUB ? HUB : undefined,
    price > 0n ? price : undefined
  )

  const buyFlow = async () => {
    if (!active || price === 0n) return
    if (!hasAllowance) await approveExact?.()
    await buy(id)
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="text-sm opacity-70">
          {subGate ? "Sub-gated" : price === 0n ? "Free" : "One-off"} · {fmt6(price)} USDC {active ? "" : "· inactive"}
        </div>
      </div>

      <div className={`overflow-hidden rounded-xl border border-white/10 ${canView ? "" : "blur-sm"}`}>
        {/* Basic rendering: inline image or a link */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {isImg(uri) ? (
          <img
            src={uri}
            alt=""
            className="h-auto w-full"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
          />
        ) : (
          <a className="block truncate bg-black/40 p-4" href={uri || "#"} target="_blank" rel="noreferrer">
            {uri || "No content URI"}
          </a>
        )}
      </div>

      {!canView && (
        <div className="flex items-center gap-3">
          {subGate ? (
            <Link className="btn" href="#plans">See plans</Link>
          ) : price === 0n ? null : (
            <button
              className="btn"
              onClick={buyFlow}
              disabled={!active || approving || buying || !HUB}
              title={!HUB ? "Missing HUB contract address" : (!active ? "Post inactive" : "")}
            >
              {hasAllowance ? "Buy post" : "Approve & Buy"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ----------------------------- Page ----------------------------- */
export default function CreatorPublicPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => {
    try { return BigInt(params.id) } catch { return 0n }
  }, [params.id])

  // Profile live-read; watch=true ensures avatar/name/bio changes show up automatically.
  const {
    data: prof,
    isLoading: profLoading,
    isFetching: profFetching,
    error: profError,
  } = useGetProfile(id, { watch: true })

  // Decode tuple
  const creator = (prof?.[0] as `0x${string}` | undefined) ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  const handle  = String(prof?.[1] ?? "")
  const name    = String(prof?.[2] ?? (id ? `Profile #${id}` : "Profile"))
  const avatar  = String(prof?.[3] ?? "")
  const bio     = String(prof?.[4] ?? "")

  // Children data
  const { data: planIds, isLoading: plansLoading } = useCreatorPlanIds(creator, { watch: true })
  const { data: postIds, isLoading: postsLoading } = useCreatorPostIds(creator, { watch: true })

  const plans = (planIds as bigint[] | undefined) ?? []
  const posts = (postIds as bigint[] | undefined) ?? []

  const badId = id === 0n

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="card flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar || "/favicon.ico"}
          alt=""
          className="h-16 w-16 rounded-full object-cover"
          loading="eager"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/favicon.ico" }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-semibold">
            {profLoading ? "Loading…" : name}
          </div>
          <div className="truncate opacity-70">@{handle}</div>
        </div>
      </section>

      {/* Errors / invalid state */}
      {badId && <div className="card border-red-500/40 text-red-200">Invalid profile id.</div>}
      {profError && !profLoading && <div className="card border-red-500/40 text-red-200">Failed to load profile.</div>}

      {/* Bio */}
      {bio && <section className="card whitespace-pre-wrap">{bio}</section>}

      {/* Ratings */}
      <RatingWidget creator={creator} />

      {/* Posts */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Posts</h2>
        {(postsLoading || profFetching) && <div className="card">Loading posts…</div>}
        {!postsLoading && posts.length === 0 && <div className="opacity-70">No posts yet.</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((pid) => (
            <PostCard key={`${pid}`} id={pid} creator={creator} />
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="space-y-3">
        <h2 className="text-xl font-semibold">Subscription plans</h2>
        {(plansLoading || profFetching) && <div className="card">Loading plans…</div>}
        {!plansLoading && plans.length === 0 && <div className="opacity-70">No plans yet.</div>}
        <div className="grid gap-4">
          {plans.map((plid) => (
            <PlanRow key={`${plid}`} id={plid} />
          ))}
        </div>
      </section>
    </div>
  )
}
