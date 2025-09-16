// /app/creator/[id]/page.tsx
"use client"

import { useParams } from "next/navigation"
import { useAccount } from "wagmi"
import Link from "next/link"
import { useState } from "react"
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

const HUB = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}`

/* ----------------------------- Plans ----------------------------- */
// plans(id) -> [creator, token, pricePerPeriod, periodDays, active, name, metadataURI]
function PlanRow({ id }: { id: bigint }) {
  const { data: plan } = usePlan(id)
  const price   = (plan?.[2] as bigint | undefined) ?? 0n
  const days    = Number(plan?.[3] ?? 30)
  const active  = Boolean(plan?.[4] ?? true)
  const name    = String(plan?.[5] ?? "Plan")

  const [periods, setPeriods] = useState(1)

  // USDC approval for HUB only if price > 0
  const { approveExact, hasAllowance, isPending } = useSpendApproval(
    price > 0n ? HUB : undefined,
    price > 0n ? price : undefined
  )
  const { subscribe } = useSubscribe()

  const subscribeFlow = async () => {
    if (!active || periods < 1) return
    if (price > 0n && !hasAllowance) {
      await approveExact?.()
    }
    await subscribe(id, periods) // waits inside hook
  }

  return (
    <div className="card flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{name}</div>
        <div className="text-sm opacity-70">
          {(Number(price) / 1e6).toFixed(2)} USDC / {days}d {active ? "" : "· inactive"}
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
        disabled={!active || isPending}
        title={!active ? "Plan inactive" : ""}
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
  const { data: post } = usePost(id)

  const price   = (post?.[2] as bigint | undefined) ?? 0n
  const active  = Boolean(post?.[3] ?? true)
  const subGate = Boolean(post?.[4] ?? false)
  const uri     = String(post?.[5] ?? "")

  const { data: hasSub } = useIsActive(address as `0x${string}` | undefined, creator)
  const { data: hasAccess } = useHasPostAccess(address as `0x${string}` | undefined, id)
  const canView = !!hasAccess || (!!hasSub && subGate) || (!subGate && price === 0n)

  // Approve HUB to spend USDC only if price > 0
  const { approveExact, hasAllowance, isPending } = useSpendApproval(
    price > 0n ? HUB : undefined,
    price > 0n ? price : undefined
  )
  const { buy } = useBuyPost()

  const buyFlow = async () => {
    if (!active || price === 0n) return
    if (!hasAllowance) await approveExact?.()
    await buy(id) // waits inside hook
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="text-sm opacity-70">
          {subGate ? "Sub-gated" : price === 0n ? "Free" : "One-off"} · {(Number(price) / 1e6).toFixed(2)} USDC {active ? "" : "· inactive"}
        </div>
      </div>

      <div className={`overflow-hidden rounded-xl border border-white/10 ${canView ? "" : "blur-sm"}`}>
        {/* Simple renderer: image URLs render inline; otherwise show a link */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {uri && /\.(png|jpe?g|gif|webp)$/i.test(uri) ? (
          <img src={uri} alt="" className="h-auto w-full" />
        ) : (
          <a className="block bg-black/40 p-4 truncate" href={uri || "#"} target="_blank" rel="noreferrer">
            {uri || "No content URI"}
          </a>
        )}
      </div>

      {!canView && (
        <div className="flex items-center gap-3">
          {subGate ? (
            <Link className="btn" href="#plans">See plans</Link>
          ) : price === 0n ? null : (
            <button className="btn" onClick={buyFlow} disabled={isPending || !active}>
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
  let id: bigint = 0n
  try {
    id = BigInt(params.id)
  } catch {
    id = 0n
  }

  const { data: prof } = useGetProfile(id)
  const creator = (prof?.[0] as `0x${string}` | undefined) ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  const handle  = String(prof?.[1] ?? "")
  const name    = String(prof?.[2] ?? `Profile #${params.id}`)
  const avatar  = String(prof?.[3] ?? "")
  const bio     = String(prof?.[4] ?? "")

  const { data: planIds } = useCreatorPlanIds(creator)
  const { data: postIds } = useCreatorPostIds(creator)

  const plans = (planIds as bigint[] | undefined) ?? []
  const posts = (postIds as bigint[] | undefined) ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="card flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar || "/favicon.ico"} alt="" className="h-16 w-16 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="truncate text-2xl font-semibold">{name}</div>
          <div className="truncate opacity-70">@{handle}</div>
        </div>
      </section>

      {/* Bio */}
      {bio && <section className="card whitespace-pre-wrap">{bio}</section>}

      {/* Ratings */}
      <RatingWidget creator={creator} />

      {/* Posts */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Posts</h2>
        {posts.length === 0 && <div className="opacity-70">No posts yet.</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((pid) => (
            <PostCard key={`${pid}`} id={pid} creator={creator} />
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="space-y-3">
        <h2 className="text-xl font-semibold">Subscription plans</h2>
        {plans.length === 0 && <div className="opacity-70">No plans yet.</div>}
        <div className="grid gap-4">
          {plans.map((plid) => (
            <PlanRow key={`${plid}`} id={plid} />
          ))}
        </div>
      </section>
    </div>
  )
}
