"use client"

import { useParams } from "next/navigation"
import { useAccount } from "wagmi"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useGetProfile } from "@/hooks/useProfileRegistry"
import { useCreatorPlanIds, useCreatorPostIds, usePlan, usePost, useIsActive, useHasPostAccess, useSubscribe, useBuyPost } from "@/hooks/useCreatorHub"
import { useSpendApproval } from "@/hooks/useSpendApproval"
import { useUSDCAllowance } from "@/hooks/useUsdc"
import RatingWidget from "@/components/RatingWidget"

const USDC = process.env.NEXT_PUBLIC_USDC as `0x${string}`
const HUB  = process.env.NEXT_PUBLIC_CREATOR_HUB as `0x${string}`

function PlanRow({ id }: { id: bigint }) {
  const { data: plan } = usePlan(id)
  // expect tuple like: [token, pricePerPeriod, periodDays, name, metadataURI, creator, active]
  const token   = plan?.[0] as `0x${string}` | undefined
  const price   = plan?.[1] as bigint | undefined
  const days    = Number(plan?.[2] ?? 30)
  const name    = String(plan?.[3] ?? "Plan")
  const active  = Boolean(plan?.[6] ?? true)

  const { approveExact, hasAllowance, isPending } = useSpendApproval(HUB, price ?? 0n)
  const { subscribe, wait } = useSubscribe()
  const [periods, setPeriods] = useState(1)

  const subscribeFlow = async () => {
    if (!price || !active) return
    if (!hasAllowance) await approveExact()
    const tx = await subscribe(id, periods)
    await wait.wait
  }

  return (
    <div className="card flex items-center gap-3">
      <div className="flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-sm opacity-70">
          {(Number(price ?? 0n) / 1e6).toFixed(2)} USDC / {days}d
        </div>
      </div>
      <input
        type="number" min={1} value={periods}
        onChange={(e)=>setPeriods(Math.max(1, Number(e.target.value)))}
        className="w-20"
      />
      <button className="btn" onClick={subscribeFlow} disabled={!active || isPending}>
        {hasAllowance ? "Subscribe" : "Approve & Subscribe"}
      </button>
    </div>
  )
}

function PostCard({ id, creator }: { id: bigint, creator: `0x${string}` }) {
  const { address } = useAccount()
  const { data: post } = usePost(id)
  // expect: [token, price, accessViaSub, uri, creator, active] (adjust as per ABI)
  const token   = post?.[0] as `0x${string}` | undefined
  const price   = post?.[1] as bigint | undefined
  const subGate = Boolean(post?.[2] ?? false)
  const uri     = String(post?.[3] ?? "")
  const active  = Boolean(post?.[5] ?? true)

  const { data: hasSub } = useIsActive(address as `0x${string}` | undefined, creator)
  const { data: hasAccess } = useHasPostAccess(address as `0x${string}` | undefined, id)

  const canView = !!hasAccess || (!!hasSub && subGate) || (!subGate && (price ?? 0n) === 0n)

  const { approveExact, hasAllowance, isPending } = useSpendApproval(HUB, price ?? 0n)
  const { buy, wait } = useBuyPost()

  const buyFlow = async () => {
    if (!price || !active) return
    if (!hasAllowance) await approveExact()
    const tx = await buy(id)
    await wait.wait
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Post #{id.toString()}</div>
        <div className="text-sm opacity-70">
          {subGate ? "Sub-gated" : "One-off"} · {(Number(price ?? 0n) / 1e6).toFixed(2)} USDC
        </div>
      </div>

      <div className={`rounded-xl overflow-hidden border border-white/10 ${canView ? "" : "blur-sm"}`}>
        {/* Basic renderer: if it's an image/video URL it will show; else just link */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {uri.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
          <img src={uri} alt="" className="w-full h-auto" />
        ) : (
          <a className="block p-4 bg-black/40" href={uri} target="_blank" rel="noreferrer">
            {uri || "No content URI"}
          </a>
        )}
      </div>

      {!canView && (
        <div className="flex items-center gap-3">
          {subGate ? (
            <Link className="btn" href="#plans">See plans</Link>
          ) : (
            <button className="btn" onClick={buyFlow} disabled={isPending}>
              {hasAllowance ? "Buy post" : "Approve & Buy"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CreatorPublicPage() {
  const params = useParams<{ id: string }>()
  const id = BigInt(params.id)
  const { data: prof } = useGetProfile(id)

  const creator = (prof?.[0] as `0x${string}` | undefined) || ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  const handle = String(prof?.[1] ?? "")
  const name   = String(prof?.[2] ?? `Profile #${params.id}`)
  const avatar = String(prof?.[3] ?? "")
  const bio    = String(prof?.[4] ?? "")

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
        <div className="flex-1">
          <div className="text-2xl font-semibold">{name}</div>
          <div className="opacity-70">@{handle}</div>
        </div>
      </section>

      {/* Bio */}
      {bio && (
        <section className="card whitespace-pre-wrap">{bio}</section>
      )}

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
